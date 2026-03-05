# Release Process

## Prerequisites

Before starting any release:

1. CI is green on the latest `main` commit.
2. `CHANGELOG.md` is updated with all changes for the version being released.
3. Any dependent package is already published (e.g., Types before SDK if the
   SDK depends on newer types).

## How Releases Work

All releases are triggered through the **GitHub Actions UI** using
`workflow_dispatch`. There are no local release scripts — the workflow itself
handles validation, version bumping, building, publishing, committing, and
tagging.

To start a release:

1. Go to the **Actions** tab in GitHub.
2. Select the release workflow (e.g., *Release — SDK*).
3. Click **Run workflow**.
4. Enter the version (semver, e.g. `1.0.0` or `1.0.0-beta.1`).
5. Click **Run workflow** to start.

Each workflow will:

1. Validate the version matches semver format.
2. Verify the target tag does not already exist.
3. Bump the `version` field in the target `package.json` file(s).
4. Build and (for npm packages) run tests.
5. Publish artifacts (npm or Docker images).
6. Commit with message `chore(release): <package> v<version>`.
7. Create an annotated git tag and push.

---

## Release Checklists

### 1. Types Release (`@pluma-flags/types`)

Types should be released before SDK when the SDK depends on updated type
definitions.

1. Update `CHANGELOG.md` — add entries under the **Types** section.
2. Trigger the **Release — Types** workflow from the GitHub Actions UI with
   the desired version.
3. Verify the [`release-types.yml`](.github/workflows/release-types.yml)
   workflow completes successfully in GitHub Actions.
4. Verify the package is live on npm:
   ```bash
   npm view @pluma-flags/types version
   ```

### 2. SDK Release (`@pluma-flags/sdk`)

1. If the SDK depends on a newer `@pluma-flags/types` version, ensure that
   Types has been published first.
2. Update `CHANGELOG.md` — add entries under the **SDK** section.
3. Trigger the **Release — SDK** workflow from the GitHub Actions UI with
   the desired version.
4. Verify the [`release-sdk.yml`](.github/workflows/release-sdk.yml) workflow
   completes successfully in GitHub Actions.
5. Verify the package is live on npm:
   ```bash
   npm view @pluma-flags/sdk version
   ```

### 3. Docker Release (API + App)

A Docker release publishes both `pluma-api` and `pluma-app` images to
`ghcr.io` under the same version tag.

1. Ensure all database migrations are finalized and merged to `main`.
2. Update `CHANGELOG.md` — add entries under the **Docker (API + App)**
   section. Include migration notes if applicable.
3. Trigger the **Release — Docker** workflow from the GitHub Actions UI with
   the desired version. This builds and pushes both `pluma-api` and
   `pluma-app` images, then bumps `version` in both `apps/api/package.json`
   and `apps/app/package.json`, commits, and tags.
4. Verify the [`release-docker.yml`](.github/workflows/release-docker.yml)
   workflow completes successfully in GitHub Actions.
5. Verify images are available on ghcr.io:
   ```bash
   docker pull ghcr.io/403-html/pluma-api:v<version>
   docker pull ghcr.io/403-html/pluma-app:v<version>
   ```
6. Test a deployment with the new images (docker compose or your staging
   environment).

---

## Coordinated Release

When changes span multiple packages (e.g., a new API field, updated types, and
SDK support), release in dependency order:

1. **Types** — publish updated type definitions first.
2. **SDK** — publish SDK that depends on the new types.
3. **Docker** — publish API + App images last.

Each package gets its own version and CI workflow. There is
no single "release all" command — this is intentional to allow independent
versioning.

**Example: coordinated 1.0.0 release**

1. Go to **Actions → Release — Types → Run workflow** → enter `1.0.0`.
2. Wait for it to complete and verify on npm.
3. Go to **Actions → Release — SDK → Run workflow** → enter `1.0.0`.
4. Wait for it to complete and verify on npm.
5. Go to **Actions → Release — Docker → Run workflow** → enter `1.0.0`.
6. Wait for it to complete and verify images on ghcr.io.

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

| Package | Tag format | Example | Workflow |
| --- | --- | --- | --- |
| `@pluma-flags/sdk` | `sdk/v*.*.*` | `sdk/v1.0.0` | `release-sdk.yml` |
| `@pluma-flags/types` | `types/v*.*.*` | `types/v1.0.0` | `release-types.yml` |
| Docker (API + App) | `v*.*.*` | `v1.0.0` | `release-docker.yml` |
