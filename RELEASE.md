# Release Process

## Prerequisites

Before starting any release:

1. CI is green on the latest `main` commit.
2. Any dependent package is already published (e.g., Types before SDK if the SDK
   depends on newer types).

## How Releases Work

All releases are triggered through the **GitHub Release UI**. There are no local
release scripts — the workflow itself handles validation, version bumping,
building, and publishing.

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

---

## Release Checklists

### 1. Types Release (`@pluma-flags/types`)

Types should be released before SDK when the SDK depends on updated type
definitions.

1. Go to **Releases → Draft a new release** and create a tag `types/v<version>`
   targeting `main`.
2. Publish the release. The
   [`release-types.yml`](.github/workflows/release-types.yml) workflow fires
   automatically.
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
3. Publish the release. The
   [`release-sdk.yml`](.github/workflows/release-sdk.yml) workflow fires
   automatically.
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
   [`release-docker.yml`](.github/workflows/release-docker.yml) workflow, which
   builds and pushes both `pluma-api` and `pluma-app` images.
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

| Package              | Tag format     | Example        | Workflow             |
| -------------------- | -------------- | -------------- | -------------------- |
| `@pluma-flags/sdk`   | `sdk/v*.*.*`   | `sdk/v1.0.0`   | `release-sdk.yml`    |
| `@pluma-flags/types` | `types/v*.*.*` | `types/v1.0.0` | `release-types.yml`  |
| Docker (API + App)   | `v*.*.*`       | `v1.0.0`       | `release-docker.yml` |
