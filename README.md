This plugin adds a "invert selection" button when adding models from the auto-fetched list of the providers, so only the ones we already have are checked.

![thumbnail](/media/thumb.webp)

# INSTALLATION
1. clone this repo, then copy its content into `/home/dshuser/.dsh/profiles/<profile>/plugins/models-invert-selection`
2. add the plugin to the `<profile>/package.json` by appending it to the dependencies and bundle like in this example:

``` json
{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": {
    "dsh-ui-models-invert": "file:./plugins/models-invert-selection"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "dsh-ui-models-invert-selection"
      ]
    }
  }
}
```
3. from the profile's directory i.e. `/home/dshuser/.dsh/profiles/web`, we run `pnpm install`, be aware that you need to be the correct user, root might fail.
4. restart the container/service

# REMOVAL
1. delete the `/home/dshuser/.dsh/profiles/<profile>/plugins/models-invert-selection`
2. rerun the `pnpm install` as in the installation
