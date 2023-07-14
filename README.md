# auto-plugin-helm-chartmuseum
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-0-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

Auto plugin for helm charts! This plugin can do the following:

- Sets helm package version to auto version
- Updates local dependencies to auto version (if version specified is `0.0.0-local` or the value specified in the `replaceVersionString` param)
- Replaces `file://....` with `repository` value if `replaceFileWithRepository` is set to `true`
- Updates documentation using `helm-docs` if `useHelmDocs` is set to `true`
- Pushes packages to chartmuseum (using `cm-push` plugin) if `push` is set to `true`

## quickstart

This plugin has the following dependencies:

- [`helm`](https://github.com/helm/helm): required
- [`helm-docs`](https://github.com/norwoodj/helm-docs): required if `HELM_PLUGIN_USE_HELM_DOCS` is set to `true`
- [`cm-push`](https://github.com/chartmuseum/helm-push): required if `HELM_PLUGIN_ENABLE_PUSH` is set to `true`

To use in your projects, add this to you `.autorc` file under `plugins` section:

```
{
  "plugins": [
    ["auto-plugin-helm", {
      "enableCanary": true,
      "enablePrelreases": true,
      "recursive": true,
      "useHelmDocs": true,
      "enablePush": true,
      "forcePush": true,
      "repository": "@myRepoAlias",
      "publishRepository": "myRepoAlias"
    }]
  ]
}
```

### github actions
You can use this with GitHub actions as follows:

```yaml
- name: Setup Helm
  uses: azure/setup-helm@v3
- name: Setup helm-docs
  run: |
    wget https://github.com/norwoodj/helm-docs/releases/download/v1.11.0/helm-docs_1.11.0_Linux_x86_64.deb
    sudo dpkg -i helm-docs_1.11.0_Linux_x86_64.deb
    rm helm-docs_1.11.0_Linux_x86_64.deb
- name: Setup Helm Push Plugin
  run: helm plugin install https://github.com/chartmuseum/helm-push
- name: Add Chartmuseum repo
  run: helm repo add local $CHARTMUSEUM_BASE_URL
- env:
    HELM_PLUGIN_ENABLE_CANARY: true
    HELM_PLUGIN_PUSH: true
    HELM_PLUGIN_REPOSITORY: "@local"
    HELM_PLUGIN_PUBLISH_REPOSITORY: local
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: npx auto shipit
```

## configuration

| setting                     | description                                                    | environment variable                       | default       |
| --------------------------- | -------------------------------------------------------------- | ------------------------------------------ | ------------- |
| `path`                      | Path to charts                                                 | `HELM_PLUGIN_PATH`                         | `.`           |
| `recursive`                 | Search for all charts in `path`                                | `HELM_PLUGIN_RECURSIVE`                    | `false`       |
| `forcePush`                 | Force push chart versions                                      | `HELM_PLUGIN_FORCE_PUSH`                   | `false`       |
| `push`                      | Push charts to repository                                      | `HELM_PLUGIN_PUSH`                         | `false`       |
| `enableCanary`              | Enable canary builds                                           | `HELM_PLUGIN_ENABLE_CANARY`                | `false`       |
| `enablePrereleases`         | Enable prelrease builds                                        | `HELM_PLUGIN_ENABLE_PRERELEASE`            | `false`       |
| `replaceVersionString`      | Replace version placeholder with current version               | `HELM_PLUGIN_REPLACE_VERSION_STRING`       | `true`        |
| `replaceFileWithRepository` | Replace local file references with remote repository reference | `HELM_PLUGIN_REPLACE_FILE_WITH_REPOSITORY` | `false`       |
| `repository`                | Repository to replace file references with                     | `HELM_PLUGIN_REPOSITORY`                   | `''`          |
| `versionString`             | Default version string to replace                              | `HELM_PLUGIN_VERSION_STRING`               | `0.0.0-local` |
| `useHelmDocs`               | Use `helm-docs` to update `README.md`                          | `HELM_PLUGIN_USE_HELM_DOCS`                | `false`       |
| `publishPath`               | Local path to use for packaged charts                          | `HELM_PLUGIN_PUBLISH_PATH`                 | `publish`     |
| `publishRepository`         | Repository to publish to                                       | `HELM_PLUGIN_PUBLISH_REPOSITORY`           | `publish`     |

If you are pushing to chart museum (set `push` or `HELM_PLUGIN_PUSH` to `true`) you can also set auth with these environment variables (additional environment variables can be found in the [docs](https://github.com/norwoodj/helm-docs)):

- `HELM_REPO_USERNAME`
- `HELM_REPO_PASSWORD`

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!