# Release Process

## Automated (normal path)

Merging a PR to `main` triggers
[`auto-release.yml`](.github/workflows/auto-release.yml) after CI passes. Each
package group is released independently when its paths changed.

**Every PR must carry at least one release label** (enforced by `Label Check`):

| Label                                             | Triggers                 | Bump                  |
| ------------------------------------------------- | ------------------------ | --------------------- |
| `api:patch/minor/major` / `app:patch/minor/major` | Docker (API + App)       | patch / minor / major |
| `sdk:patch/minor/major`                           | npm `@pluma-flags/sdk`   | patch / minor / major |
| `types:patch/minor/major`                         | npm `@pluma-flags/types` | patch / minor / major |
| `docs`                                            | GitHub Pages deploy      | —                     |

Use `no-release` for CI or chore PRs that touch no releasable paths.

Multiple labels are allowed. For direct pushes (no label) the bump falls back to
conventional-commit inference (`feat:` → minor, `feat!:` / `fix!:` etc → major,
else patch).

Job order: `detect → release-types → tag-types`,
`release-types → release-sdk → tag-sdk`,
`release-api + release-app → tag-docker`, all tag jobs → `update-main`.
`deploy-docs` runs in parallel when `apps/docs/` changed.

## Manual / Hotfix

Use [`release.yml`](.github/workflows/release.yml) via **GitHub Releases UI**
(no local scripts). Draft a new release with the correct tag prefix, target
`main`, and publish:

| Package              | Tag            | Example        |
| -------------------- | -------------- | -------------- |
| `@pluma-flags/sdk`   | `sdk/v*.*.*`   | `sdk/v1.2.0`   |
| `@pluma-flags/types` | `types/v*.*.*` | `types/v1.2.0` |
| Docker (API + App)   | `v*.*.*`       | `v1.2.0`       |

Release in dependency order when changes span packages: **Types → SDK →
Docker**. The workflow validates semver, bumps `package.json`, builds,
publishes, and commits the bump back to `main`.

## Documentation

Docs deploy automatically as part of
[`auto-release.yml`](.github/workflows/auto-release.yml) when `apps/docs/`
changed. The `deploy-docs` job runs in parallel with package releases.

Live site: `https://pluma.to/`

No versioning is required — every merge that touches `apps/docs/` re-deploys the
latest content.
