---
name: testing-workflows-locally
description: Run GitHub Actions workflows locally using act — validate CI changes without pushing to GitHub
---

`act` runs GitHub Actions workflows locally inside Docker containers. Use it whenever you change `.github/workflows/*.yml` to verify behaviour before pushing.

## Prerequisites

- Docker running locally
- `act` installed (see below)
- `.actrc` present at repo root (already committed — sets the default runner image)

## Install act

```bash
# macOS
brew install act

# Linux / WSL — use the GitHub release binary, not the pipe-to-bash installer
LATEST=$(curl -s https://api.github.com/repos/nektos/act/releases/latest | grep tag_name | cut -d '"' -f4)
curl -L "https://github.com/nektos/act/releases/download/${LATEST}/act_Linux_x86_64.tar.gz" -o /tmp/act.tar.gz
tar -xzf /tmp/act.tar.gz -C /usr/local/bin act
```

Verify: `act --version`

## Running the CI Workflow

```bash
# Simulate a push event (runs the full CI workflow)
act push

# Simulate a pull_request event
act pull_request

# Run a single job
act push -j lint
act push -j build
act push -j test
```

The `--artifact-server-path` flag is required when any job uses `upload-artifact` or `download-artifact`:

```bash
act push --artifact-server-path /tmp/act-artifacts
```

## Service Containers (PostgreSQL)

The `test` job uses a PostgreSQL service container. `act` supports service containers natively — no extra flags needed. The container starts automatically when the job runs.

If the postgres service fails to start, increase Docker's memory limit to at least 4 GB in Docker Desktop settings.

## Secrets

The Pluma CI workflow has no required secrets. If you add secrets later, create a `.secrets` file at the repo root:

```
MY_SECRET=value
```

Pass it to act:

```bash
act push --secret-file .secrets
```

`.secrets` is gitignored — never commit it.

## Fast Iteration Pattern

```bash
# Lint-only pass (fastest, no Docker pull needed after first run)
act push -j lint

# Full CI pass with artifacts
act push --artifact-server-path /tmp/act-artifacts
```

## Common Failure Signatures

| Symptom | Fix |
|---|---|
| `Cannot connect to Docker` | Start Docker Desktop or the Docker daemon |
| `image not found` | Run `act push` once to pull the runner image (may take a few minutes the first time) |
| `pnpm: command not found` | The runner image is too minimal — `.actrc` already sets the correct image; confirm it is present |
| `Multiple versions of pnpm specified` | `pnpm/action-setup@v4` has a `version:` key AND `package.json` has `packageManager` — remove `version:` from the workflow step |
| Artifact actions fail | Add `--artifact-server-path /tmp/act-artifacts` |
| Service container not ready | Increase Docker memory limit; check `--health-cmd` in the workflow |

## When to Invoke This Skill

Invoke this skill when:
- Adding or modifying any file under `.github/workflows/`
- Debugging a CI failure that cannot be reproduced from logs alone
- Validating a workflow before opening a PR
