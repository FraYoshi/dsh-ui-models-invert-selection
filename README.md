# @furayoshi/dsh-ui-models-invert-selection

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) client plugin that adds an **"Invert selection"** button to the **Models → Fetch / Add models** dialog.

The shipped dialog pre-checks every fetched row that is **not** already in your model list. On a second "fetch + add" pass you usually want the inverse — keep the rows you already have, drop the rest. This plugin adds a single button that flips every checkbox at once.

![preview](media/thumb.webp)

## Install

DSH's `plugin` command handles the install and bundle registration automatically.

### From npmjs (recommended)

```sh
dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection
```

### From GitHub (pinned version)

```sh
# Specific tag
dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection@github:FraYoshi/dsh-ui-models-invert-selection#v1.0.0

# Branch
dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection@github:FraYoshi/dsh-ui-models-invert-selection#main

# Specific commit
dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection@github:FraYoshi/dsh-ui-models-invert-selection#a1b2c3d4
```

### From local source (for hacking)

```sh
dsh plugin --profile web add @furayoshi/dsh-ui-models-invert-selection@file:/home/<you>/work/dsh-ui-models-invert-selection
```

After editing `lib/client.js`, re-link inside the profile:

```sh
rm -rf node_modules/@furayoshi && pnpm install
```

Then restart DSH.

## Verify

Open the Web UI → **Settings → Models → Fetch / Add models**. You should see a new **"Invert selection"** button next to the existing action button. Click it — every checkbox in the candidate list flips once.

To confirm the bundle loaded:

```sh
dsh web --dump-config | grep -i "invert-selection\|furayoshi"
```

## Update / Remove

```sh
# Update to latest
pnpm update @furayoshi/dsh-ui-models-invert-selection

# Remove
dsh plugin --profile web remove @furayoshi/dsh-ui-models-invert-selection
```

## License

MIT — see [LICENSE](./LICENSE).

---

For maintainers and agents: detailed technical documentation lives in [AGENTS.md](./AGENTS.md).