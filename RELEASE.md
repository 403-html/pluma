# Release Process

## Automated Releases

Releases are fully automated on push to `main`. The
[`auto-release.yml`](.github/workflows/auto-release.yml) workflow fires after
CI passes and independently releases each package group that has new commits.

### What Triggers an Automated Release

1. A pull request (or direct push) is merged to `main`.
2. The **CI** workflow runs and passes.
3. The **Auto Release** workflow starts via `workflow_run`.

No manual intervention is required. Releases happen package-by-package based on
what actually changed.

### How Changed Packages Are Detected

For each release group, the workflow compares the commit range from the last
release tag for that group to the current `HEAD`:

| Release group | Watched paths | Last-tag pattern |
|---|---|---|
| Types | `packages/types/**` | `types/v*.*.*` |
| SDK | `packages/sdk/**` | `sdk/v*.*.*` |
| Docker | `apps/api/**`, `apps/app/**`, `packages/db/**` | `v*.*.*` |

If no matching tag exists yet (first release), the diff goes back to the
repository's initial commit.

### How the Bump Type Is Determined

For each release group the workflow inspects **only the commits that touched
that group's paths** since the last tag:

| Commit signal | Bump |
|---|---|
| `BREAKING CHANGE` anywhere in message body | **major** |
| Subject matches `^[a-z]+!:` (e.g. `feat!:`) | **major** |
| Subject starts with `feat(` or `feat:` | **minor** |
| Everything else (`fix`, `chore`, `refactor`, …) | **patch** |

If no commits are found for a group's paths the default is **patch**.

### Skip-Release Guard

If the `HEAD` commit subject matches `^chore\(release\):`, the workflow exits
immediately without releasing anything. This prevents the version-bump commit
that the workflow itself pushes from triggering another release. The
`update-main` job uses the message `chore(release): bump versions [skip ci]`,
which matches this pattern.

### Job Ordering

```
detect
  ├── release-types  ────────────────────────────┐
  ├── release-types → release-sdk                │
  ├── release-api ──┐                            │
  └── release-app ──┴─ tag-docker                │
                                                 ▼
                                   update-main (always, if ≥1 succeeded)
```

- `release-sdk` always waits for `release-types` (if types was skipped it
  proceeds immediately and syncs the latest published types version from npm).
- `release-api` and `release-app` run in parallel.
- `tag-docker` waits for both image builds to succeed, then creates the shared
  git tag and GitHub Release.
- `update-main` commits all version bumps back to `main` after every successful
  release.

---

## Manual / Hotfix Release

The [`release.yml`](.github/workflows/release.yml) workflow remains available
as an escape hatch for hotfixes and out-of-band releases. Use it whenever you
need to release without going through the automated path (e.g. a critical
production fix that can't wait for a PR merge).

## Prerequisites

Before starting any release:

1. CI is green on the latest `main` commit.
2. Any dependent package is already published (e.g., Types before SDK if the SDK
   depends on newer types).

## How Releases Work (Manual / Hotfix)

All **manual** releases are triggered through the **GitHub Release UI**. There are no local
release scripts — a single [`release.yml`](.github/workflows/release.yml)
workflow handles validation, version bumping, building, publishing, and updating
`main` with the new version.

To start a release:

1. Go to the repository on GitHub and click **Releases** in the right sidebar.
2. Click **Draft a new release**.
3. Click **Choose a tag**, type the new tag following the naming convention
   below, and select **Create a new tag: … on publish**.
   - SDK: `sdk/v1.0.0`
   - Types: `types/v1.0.0`
   - Docker (API + App): `v1.0.0`
4. Set the target branch to **main**.
5. Fill in the release title and release notes.
6. Click **Publish release**.

The matching workflow fires automatically based on the tag prefix. Each workflow
will:

1. Extract the version from the tag name.
2. Validate the version matches semver format.
3. Bump the `version` field in the target `package.json` file(s).
4. Build and (for npm packages) run tests.
5. Publish artifacts (npm or Docker images).
6. Commit the version bump to `main` so the repo stays in sync.

---

## Release Checklists

### 1. Types Release (`@pluma-flags/types`)

Types should be released before SDK when the SDK depends on updated type
definitions.

1. Go to **Releases → Draft a new release** and create a tag `types/v<version>`
   targeting `main`.
2. Publish the release. The [`release.yml`](.github/workflows/release.yml)
   workflow fires automatically.
3. Verify the workflow completes successfully in the **Actions** tab.
4. Verify the package is live on npm
   (<https://www.npmjs.com/package/@pluma-flags/types>):
   ```bash
   npm view @pluma-flags/types version
   ```

### 2. SDK Release (`@pluma-flags/sdk`)

1. If the SDK depends on a newer `@pluma-flags/types` version, ensure that Types
   has been published first.
2. Go to **Releases → Draft a new release** and create a tag `sdk/v<version>`
   targeting `main`.
3. Publish the release. The [`release.yml`](.github/workflows/release.yml)
   workflow fires automatically.
4. Verify the workflow completes successfully in the **Actions** tab.
5. Verify the package is live on npm
   (<https://www.npmjs.com/package/@pluma-flags/sdk>):
   ```bash
   npm view @pluma-flags/sdk version
   ```

### 3. Docker Release (API + App)

A Docker release publishes both `pluma-api` and `pluma-app` images to `ghcr.io`
under the same version tag.

1. Ensure all database migrations are finalized and merged to `main`.
2. Go to **Releases → Draft a new release** and create a tag `v<version>`
   targeting `main`. This triggers the
   [`release.yml`](.github/workflows/release.yml) workflow, which builds and
   pushes both `pluma-api` and `pluma-app` images.
3. Verify the workflow completes successfully in the **Actions** tab.
4. Verify images are available on GHCR
   (<https://github.com/orgs/403-html/packages>):
   ```bash
   docker pull ghcr.io/403-html/pluma-api:v<version>
   docker pull ghcr.io/403-html/pluma-app:v<version>
   ```
5. Test a deployment with the new images (docker compose or your staging
   environment).

---

## Coordinated Release

When changes span multiple packages (e.g., a new API field, updated types, and
SDK support), release in dependency order:

1. **Types** — publish updated type definitions first.
2. **SDK** — publish SDK that depends on the new types.
3. **Docker** — publish API + App images last.

Each package gets its own version and CI workflow. There is no single "release
all" command — this is intentional to allow independent versioning.

**Example: coordinated 1.0.0 release**

1. Go to **Releases → Draft a new release**, create tag `types/v1.0.0`, publish.
2. Wait for the Types workflow to complete and verify on npm.
3. Go to **Releases → Draft a new release**, create tag `sdk/v1.0.0`, publish.
4. Wait for the SDK workflow to complete and verify on npm.
5. Go to **Releases → Draft a new release**, create tag `v1.0.0`, publish.
6. Wait for the Docker workflow to complete and verify images on ghcr.io.

---

## Hotfix Process

1. Create a branch from the release tag:
   ```bash
   git checkout -b hotfix/<package>-<version> <tag>
   ```
2. Apply the fix and add tests.
3. Cherry-pick the fix back to `main` (or merge via PR).
4. Release a new **patch** version from `main` using the normal release
   checklist above.

---

## Rollback

### npm Packages (SDK / Types)

1. Deprecate the broken version on npm:
   ```bash
   npm deprecate @pluma-flags/sdk@<version> "Known issue — use <previous>"
   ```
2. Publish a patch release with the fix.

> npm does not allow re-publishing the same version. You must increment the
> patch version.

### Docker Images

1. Delete the GitHub Release and tag if desired:
   ```bash
   gh release delete v<version> --yes
   git push --delete origin v<version>
   ```
2. Re-tag a known-good commit and re-run the Docker release workflow, or roll
   back your deployment to the previous image tag.

---

## Tag Reference

| Package              | Tag format     | Example        | Workflow           |
| -------------------- | -------------- | -------------- | ------------------ |
| `@pluma-flags/sdk`   | `sdk/v*.*.*`   | `sdk/v1.0.0`   | `auto-release.yml` / `release.yml` |
| `@pluma-flags/types` | `types/v*.*.*` | `types/v1.0.0` | `auto-release.yml` / `release.yml` |
| Docker (API + App)   | `v*.*.*`       | `v1.0.0`       | `auto-release.yml` / `release.yml` |
