# AGENTS.md — @furayoshi/dsh-ui-models-invert-selection

Technical reference for agents and maintainers. The user-facing README is [README.md](./README.md).

## Package identity

- **npm name**: `@furayoshi/dsh-ui-models-invert-selection`
- **scope owner**: `frayoshi <npmjs@furayoshi.com>`
- **GitHub**: `https://github.com/FraYoshi/dsh-ui-models-invert-selection`
- **Version**: `1.0.0` (current)
- **Node engine**: `>=22`

## Architecture

This is a **client-only** DSH plugin. The host half is a no-op.

| File | Role |
|------|------|
| `lib/index.js` | Host entry point — exports empty `apply()`. Exists only so DSH's bundle loader matches `dsh.bundle.patch`. |
| `lib/client.js` | Browser entry point — registers a factory with `window.__ModuleLoader__.load({ id })` whose `apply(ctx)` injects the button via a `MutationObserver` on `document.body`. |
| `cordis.patch.yml` | Bundle patch that inserts a host row with the plugin's id. Required for `dsh.bundle.patch` to work. |

### Three-way id sync (critical)

The following **must match exactly**:

1. `package.json#name` → `"@furayoshi/dsh-ui-models-invert-selection"`
2. `cordis.patch.yml` insert row `id` and `name` → same string
3. `lib/client.js` `window.__ModuleLoader__.load({ id: "..." })` → same string

If you fork/rename, update all three.

## How the client works

`lib/client.js` exports a single `apply(ctx)` that:

1. Creates a `MutationObserver` on `document.body` (subtree, childList).
2. On each added node, `scan()` looks for the dialog's action row: `div[class*="candidateActions"], div[class*="candidateToolbar"]`.
   - **`candidateActions`** — the action row in dsh `<= 0.1.1-rc.2`.
   - **`candidateToolbar`** — the action row in dsh `>= 0.1.2-rc.1` (the row gained a candidate search input and the select-all ghost button moved into it). Matching both spellings keeps the plugin working across that boundary.
3. For each candidate action row, `injectInto()`:
   - Skips if the row already has `data-modinv-injected="1"` (idempotent).
   - Finds the existing button in that row (`actionsDiv.querySelector("button")`).
   - Finds the sibling candidate list via `parent.querySelector('[class*="candidateList"]')`.
   - Verifies the list contains at least one `input[type="checkbox"]`.
   - Clones the original button, replaces its text node with localized label:
     - Chinese (`/[\u4e00-\u9fff]/` test on original button text): `反选` + tooltip `反选：把统计列表中每一项的勾选状态取反`
     - English: `Invert selection` + tooltip `Invert selection: flip the checkbox of every row in the list`
   - Adds `marginLeft: "8px"`, `type="button"`, click listener.
   - Inserts after the original button.
4. Click handler: `listEl.querySelectorAll('input[type="checkbox"]')` → `.click()` each (drives real React state via normal `onChange`).
5. Returns a cleanup function that disconnects the observer.

### Key implementation details

- **Marker attribute**: `data-modinv-injected` on the action row prevents double-injection when a dynamic Plugin and the bundled Plugin both attach to the same DOM.
- **Fresh read on click**: The checkbox list is queried *at click time*, not capture time, so it survives in-place re-renders of the candidate list.
- **No build step**: `lib/client.js` is shipped as-is (plain JS, no TS, no bundler). Edit → re-link → restart is the entire dev loop.

## CSS-module class dependencies (fragile)

The plugin relies on two CSS-module base names from `@deepseek-ai/dsh-client-ui-settings-models` (the package that ships the Models settings section):

| Selector | Purpose | Location in `lib/client.js` |
|----------|---------|----------------------------|
| `div[class*="candidateActions"], div[class*="candidateToolbar"]` | Dialog action row (injection target) — `candidateActions` on dsh `<= 0.1.1-rc.2`, `candidateToolbar` on dsh `>= 0.1.2-rc.1` | `scan()` → `rootNode.querySelectorAll()` |
| `div[class*="candidateList"]` | Candidate list (checkbox source) | `injectInto()` → `parent.querySelector()` |

The `*=` wildcard match is intentional: it survives hash suffix changes on rebuilds, but **breaks if the base name changes**.

### Upstream breakage protocol

After upgrading `@deepseek-ai/dsh-client-ui-settings-models`:

1. Open the fetch-models dialog and verify:
   - Button appears next to the select-all ghost button in the toolbar (same ghost/sm style)
   - Click flips all checkboxes (checked count goes all→none or none→all)
   - Submit with inverted selection adds/skips the right models
2. If any regresses: search the new `lib/client.js` of the upstream package for `candidateActions` / `candidateToolbar` / `candidateList`. If the base name changed, add the new spelling to the dual selector in `scan()` (keep the old one — the plugin must keep working on the previous dsh release) and update this table.
3. Bump version: patch for single-name fix, minor for structural change, major for API change.
4. Update the **Compatibility** table at the top of the README (if support for a DSH line is dropped, add an upper bound for that line).
5. `npm publish` (see Publishing below).

#### Known upstream changes

| dsh version | Change | Impact |
|-------------|--------|--------|
| `0.1.2-rc.1` | Action row renamed `candidateActions` → `candidateToolbar`; gained a candidate search input; dialog gained a footer (Cancel / Adopt) | Fixed by the dual selector in `scan()` (commit history: "fix selectors for dsh 0.1.2-rc.1"). `candidateList` unchanged; preselect logic unchanged. |

## cordis.patch.yml

```yaml
# Patch layer for `@furayoshi/dsh-ui-models-invert-selection`.
- insert:
    - id: '@furayoshi/dsh-ui-models-invert-selection'
      name: '@furayoshi/dsh-ui-models-invert-selection'
```

- The `id` is the bundle key DSH uses to load the client factory.
- The `name` is cosmetic (shown in `--dump-config`).
- Removing this row (or disabling the bundle in the profile) withdraws the plugin on next boot.

## package.json fields relevant to DSH

```json
{
  "name": "@furayoshi/dsh-ui-models-invert-selection",
  "main": "lib/index.js",
  "exports": {
    ".": { "default": "./lib/index.js" },
    "./client": { "default": "./lib/client.js" },
    "./package.json": "./package.json"
  },
  "files": ["lib", "cordis.patch.yml", "README.md", "AGENTS.md", "LICENSE"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web" }
  },
  "publishConfig": { "access": "public" }
}
```

- `dsh.bundle.patch` → points to the cordis patch file.
- `dsh.client.platform: "web"` → client runs in browser only.
- `exports["/client"]` → allows `require("@furayoshi/dsh-ui-models-invert-selection/client")` (not used by DSH but standard).
- `files` whitelist → controls `npm pack` output (media/ is intentionally excluded).
- `engines.dsh` → **advisory only**. Declares the minimum DSH harness version (`>=0.1.1-rc.2`, the oldest version whose dialog markup the dual selector handles). Nothing enforces it: DSH's plugin tooling does not read `engines`, and pnpm cannot resolve a custom engine name. Do **not** switch this to `peerDependencies`/`dependencies` on `@deepseek-ai/dsh`: the harness is the host that loads the plugin, not a co-installed package — it is absent from profile `node_modules`, so a peer entry fails `pnpm install` (pnpm ≥ 10 strict peers) and a dependency entry would download a second full copy of the harness into every profile.

  Semver note: pre-releases sort below their release, so `">=0.1.2"` would *exclude* `0.1.2-rc.1`. If the floor ever needs to be the 0.1.2 line including its pre-releases, write `">=0.1.2-rc.1"` (which still excludes the also-working 0.1.1-rc.2 — a deliberate support-policy choice if made).

## Local development loop

```sh
# From the repo root:
# 1. Edit lib/client.js
# 2. In the profile directory:
rm -rf node_modules/@furayoshi && pnpm install
# 3. Restart DSH (container or service)
# 4. Open Settings → Models → Fetch dialog → verify button works
```

No `npm run build` — the file is the artifact.

## Publishing

```sh
# 1. Clean working tree on main
git checkout main && git pull

# 2. Bump version (patch/minor/major)
npm version patch   # or minor, major

# 3. Sanity-check tarball
npm pack --dry-run

# 4. Publish (must be logged in as frayoshi)
npm publish --access public

# 5. Push commit + tag
git push --follow-tags origin main
```

Typical unpacked size: ~19 kB (7 files). The `files` whitelist is the source of truth.

## Install command reference

| Source | Command |
|--------|---------|
| npmjs | `dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection` |
| GitHub tag | `dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection@github:FraYoshi/dsh-ui-models-invert-selection#v1.0.0` |
| GitHub branch | `dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection@github:FraYoshi/dsh-ui-models-invert-selection#main` |
| GitHub commit | `dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection@github:FraYoshi/dsh-ui-models-invert-selection#a1b2c3d4` |
| Local path | `dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection@file:/path/to/repo` |

All of the above run `pnpm add <spec>` in the profile, then append the package to `dsh.profile.bundles` because `package.json` declares `dsh.bundle.patch`.

## Testing checklist (manual)

- [ ] Button appears in fetch dialog (right of existing action button, 8px gap, matching style)
- [ ] Chinese UI → label `反选`, tooltip in Chinese
- [ ] English UI → label `Invert selection`, tooltip in English
- [ ] Click flips all checkboxes exactly once
- [ ] Second click flips back
- [ ] Submit with inverted selection persists correctly
- [ ] Opening/closing dialog multiple times doesn't inject duplicate buttons
- [ ] Dynamic Plugin + bundled Plugin coexistence doesn't double-inject
- [ ] `dsh web --dump-config | grep invert-selection` shows the host row

## License

MIT — `LICENSE` file (copyright 2026 Francesco Yoshi Gobbo).