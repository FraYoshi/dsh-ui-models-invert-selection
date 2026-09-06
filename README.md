# @furayoshi/dsh-ui-models-invert-selection

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) client plugin that adds an **"Invert selection"** button to the fetch-models dialog of the **Models** settings section. The shipped dialog preselects every fetched row that is **not** already in the model list; on a second "fetch + add" pass you usually want the inverse — keep the rows you already have, drop the rest. This plugin adds a single button that flips every checkbox in the dialog at once.

**NOTE**: as at the current state, this packages has been heavily vibecoded, including most of this README. I might rewrite it at the later date, but you have been warned :)

![thumbnail](media/thumb.webp)

## What it does

When you open **Settings → Models → Fetch / Add models**, DSH shows a list of candidates from the active provider. By default every row that is not already in your model list is pre-checked — that's almost always what you want on the first fetch. On a second pass (for example to pick up a few new models from a provider you've already configured), that default works against you: the rows that are *already* in your list start unchecked, and you have to uncheck dozens of rows you don't want.

The fetch dialog does not expose a slot or an API for flipping its checkboxes, so this plugin watches the live DOM for the dialog's action row and appends one **"Invert selection"** button — a clone of the existing ghost/sm button next to it, so the styling matches exactly. Clicking it clicks every candidate checkbox once, driving the dialog's real React state through the normal `onChange` path; nothing is bypassed, nothing is restyled, the same submit button at the bottom of the dialog adds whatever is checked.

The button label and tooltip auto-detect Chinese (the same `\u4e00-\u9fff` test that DSH's own UI uses) and render `反选` / `反选：把统计列表中每一项的勾选状态取反` for Chinese UI; English otherwise.

A marker attribute (`data-modinv-injected`) on the action row prevents the button from being injected twice when a dynamic Plugin (created through DSH's UI) and the bundled Plugin (loaded from `cordis.patch.yml`) both attach to the same DOM. Two live versions never double-inject into one open dialog.

## Install

DSH's `plugin` subcommand forwards pnpm commands into the profile directory and reconciles the profile's `dsh.profile.bundles` array against the installed packages. So `dsh plugin --profile web add <spec>` is the canonical install path: it runs `pnpm add <spec>`, then automatically appends the package to `bundles` if (and only if) the installed `package.json` declares a `dsh.bundle.patch` — which this package does.

### From npmjs

```sh
dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection
```

The `dsh plugin add` command runs `pnpm add` to install the package into `~/.dsh/profiles/web/node_modules/`, then reconciles the `dsh.profile.bundles` array in `~/.dsh/profiles/web/package.json` to include the new bundle. The user does not need to edit `package.json` manually.

### From a GitHub URL

```sh
dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection@github:FraYoshi/dsh-ui-models-invert-selection
```

The `github:<owner>/<repo>` spec is pnpm's shorthand for `https://github.com/<owner>/<repo>.git`. To pin a specific version:

```sh
# A specific tag
dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection@github:FraYoshi/dsh-ui-models-invert-selection#v1.0.0

# A branch (e.g. main)
dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection@github:FraYoshi/dsh-ui-models-invert-selection#main

# A specific commit SHA (for reproducible installs)
dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection@github:FraYoshi/dsh-ui-models-invert-selection#a1b2c3d4
```

pnpm clones the repo, runs `npm pack` from the cloned `package.json` to build the tarball (so the `files: ["lib", "cordis.patch.yml", "README.md", "LICENSE"]` list matters), and installs it. As long as `cordis.patch.yml` is in `files`, DSH's bundle loader finds it on the next boot.

### From a local path or clone

If you have the source locally (or want to hack on it), install it directly:

```sh
dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection@file:/path/to/dsh-ui-models-invert-selection
```

The `file:` spec is pnpm's way to install from a local path. pnpm links the package's `files` into the profile's `node_modules/@furayoshi/dsh-ui-models-invert-selection/`. The profile's `pnpm-workspace.yaml` sets `nodeLinker: hoisted`, so the linked files are **copies**, not symlinks — this means a rebuild of the source does **not** automatically reflect in the installed copy. After editing `lib/` re-link the package:

```sh
# From inside the profile's directory:
rm -rf node_modules/@furayoshi && pnpm install
```

Then restart DSH to pick up the new bundle. (Unlike most published DSH plugins, this one has no TypeScript build step — `lib/client.js` is shipped as-is, so an edit-and-reinstall cycle is the entire dev loop.)

### Updating, removing, verifying

Because `dsh plugin` is just a pnpm forwarder, you can use any pnpm subcommand. From inside the profile directory:

```sh
# Update to the latest version
pnpm update @furayoshi/dsh-ui-models-invert-selection

# Re-link after editing the source
rm -rf node_modules/@furayoshi && pnpm install

# Remove the plugin (also strips the entry from dsh.profile.bundles)
dsh plugin --profile web remove @furayoshi/dsh-ui-models-invert-selection
```

### Verifying the install

Open the Web UI, click the settings cog, go to **Models**, and click the button that opens the fetch-models dialog (the one that pulls candidate rows from the active provider). You should see a new **"Invert selection"** button next to the dialog's existing action button — same size, same ghost/sm style. Click it: every checkbox in the candidate list flips once.

To verify DSH actually loaded the bundle, from inside the profile directory:

```sh
dsh web --dump-config | grep -i "invert-selection\|furayoshi"
```

You should see the host row registered under the new package name.

## How it works

The plugin is one half:

- **Host** (`lib/index.js`) is a no-op `apply()`. The host composition registers the bundle via `cordis.patch.yml`; nothing else runs server-side.
- **Client** (`lib/client.js`) is the only piece that does anything. It registers a factory with `window.__ModuleLoader__.load({ id })` whose exported `apply(ctx)` sets up a `MutationObserver` on `document.body`. The observer scans added nodes for any `div[class*="candidateActions"]` (the dialog's action row) and, on the first match that also contains a sibling `div[class*="candidateList"]` with at least one checkbox, inserts a cloned button right after the existing one.

The injection is idempotent thanks to a `data-modinv-injected` marker on the action row itself, and the click handler reads the checkbox list fresh at click time (not capture time), so it survives any in-place re-render of the candidate list — the dialog can shuffle rows without the button ever pointing at stale nodes.

The id passed to `window.__ModuleLoader__.load({ id })`, the `name` field in `package.json`, and the `id` of the `- insert` row in `cordis.patch.yml` must all match. If you fork the plugin, change the package name, or change the bundle id, update all three.

## Caveats

### The plugin relies on internal CSS-module class hashes

The dialog's action row is selected with `div[class*="candidateActions"]` and its candidate list with `div[class*="candidateList"]`. Both are CSS-Modules-generated class names from `@deepseek-ai/dsh-client-ui-models` (or whichever package ships the settings Models section). The wildcard `*=value` match is intentionally fuzzy so the selector keeps working as long as the **base name** (`candidateActions`, `candidateList`) is preserved, even if the suffix hash changes — which it does on every rebuild of that package.

After upgrading `@deepseek-ai/dsh-client-ui-models`, open the fetch-models dialog and verify:

1. The new **"Invert selection"** button appears next to the existing action button (right side, 8px gap).
2. Clicking it flips every checkbox in the candidate list once (you should see the count of checked rows go from "all unchecked" to "all checked" or vice versa).
3. Submitting the dialog with the inverted selection actually adds (or skips) the right models.

If any of those regress — the button never appears, or appears but does nothing — the upstream CSS-module base name changed. The fix is to update the two selectors in `lib/client.js` (look for `candidateActions` and `candidateList` inside `scan` and `injectInto`), then re-link the package. Bump the patch version (e.g. `1.0.0` → `1.0.1`) on the next npm publish so the upstream change propagates to installed copies.

### The plugin does not handle the case where the candidate list is empty

If the dialog opens with zero candidates (provider returned nothing, or all rows are already in your model list), there is nothing to invert, and the button is not injected — the action row is skipped on purpose when its sibling candidate list has no checkboxes. This is the right behaviour for the only fetch path that has checkboxes: a populated dialog always has at least one candidate.

### What `cordis.patch.yml` is for

The package ships a `cordis.patch.yml` (in `files: ["lib", "cordis.patch.yml", "README.md", "LICENSE"]`) that inserts a single host row into DSH's host composition. The row's `apply()` is the no-op in `lib/index.js` — its only job is to be there so DSH's bundle loader matches the `dsh.bundle.patch` declaration in `package.json` and installs the client bundle. Without the patch, the host has no idea the plugin exists, the client side is never loaded, and no button ever appears. If you fork this plugin and rename the bundle, update the `id` and `name` of the patch row to match the new `package.json#name`.

## Updating

When the upstream CSS-module base names change, the fix is mechanical but unavoidable until DSH exposes a stable public API for the Models fetch dialog. The plugin targets two CSS-module class-name bases:

- `candidateActions` — the dialog's action row (where the new button is injected)
- `candidateList` — the dialog's candidate list (whose checkboxes the button flips)

Both appear in the package that ships the Models settings section. To update:

1. Open the new `dsh-client-ui-models` (or equivalent) `lib/client.js` in your editor and search for `candidateActions` and `candidateList`. If a base name has changed, update the corresponding selector in `lib/client.js` (look for `div[class*="candidateActions"]` and `div[class*="candidateList"]`).
2. No build step — `lib/client.js` is shipped as-is.
3. Bump the version in `package.json` (the user-facing change is a patch for a single-base-name fix, minor for a structural change, major for an API change). Then `npm publish` (see the **Publishing** section below).

## License

MIT — see [LICENSE](./LICENSE).
