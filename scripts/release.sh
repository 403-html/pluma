#!/usr/bin/env bash
# scripts/release.sh — Create a release tag for a Pluma package.
#
# Usage:
#   bash scripts/release.sh <package> <version>
#
# Packages:
#   sdk    — bumps packages/sdk/package.json,  tags sdk/v<version>
#   types  — bumps packages/types/package.json, tags types/v<version>
#   docker — bumps apps/api + apps/app package.json, tags v<version>
#
# The script commits the version bump and creates an annotated git tag
# but does NOT push. You must push the commit and tag manually.

set -euo pipefail

# ── Helpers ──────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { printf "${GREEN}✔ %s${NC}\n" "$1"; }
warn()  { printf "${YELLOW}⚠ %s${NC}\n" "$1"; }
error() { printf "${RED}✖ %s${NC}\n" "$1" >&2; exit 1; }

# ── Argument validation ─────────────────────────────────────────────────────

VALID_PACKAGES="docker sdk types"
SEMVER_REGEX='^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$'

if [[ $# -lt 2 ]]; then
  echo "Usage: bash scripts/release.sh <package> <version>"
  echo "  package: docker | sdk | types"
  echo "  version: valid semver (e.g. 1.0.0, 1.0.0-beta.1)"
  exit 1
fi

PACKAGE="$1"
VERSION="$2"

# Validate package name
if ! echo "$VALID_PACKAGES" | grep -qw "$PACKAGE"; then
  error "Invalid package '${PACKAGE}'. Must be one of: ${VALID_PACKAGES}"
fi

# Validate semver format
if ! [[ "$VERSION" =~ $SEMVER_REGEX ]]; then
  error "Invalid version '${VERSION}'. Must be valid semver (e.g. 1.0.0, 1.0.0-beta.1)"
fi

# ── Resolve tag prefix and target files ──────────────────────────────────────

case "$PACKAGE" in
  sdk)
    TAG="sdk/v${VERSION}"
    FILES=("packages/sdk/package.json")
    ;;
  types)
    TAG="types/v${VERSION}"
    FILES=("packages/types/package.json")
    ;;
  docker)
    TAG="v${VERSION}"
    FILES=("apps/api/package.json" "apps/app/package.json")
    ;;
esac

# ── Pre-flight checks ───────────────────────────────────────────────────────

# Ensure we are in the repo root (package.json with workspaces must exist)
if [[ ! -f "package.json" ]]; then
  error "Must be run from the repository root (package.json not found)"
fi

# Ensure working tree is clean before we start
if [[ -n "$(git status --porcelain)" ]]; then
  error "Working directory is not clean. Commit or stash changes first."
fi

# Ensure the tag does not already exist
if git rev-parse "$TAG" >/dev/null 2>&1; then
  error "Tag '${TAG}' already exists. Aborting."
fi

info "Releasing ${PACKAGE} v${VERSION} (tag: ${TAG})"

# ── Bump versions ────────────────────────────────────────────────────────────

for FILE in "${FILES[@]}"; do
  if [[ ! -f "$FILE" ]]; then
    error "File not found: ${FILE}"
  fi
  RELEASE_FILE="$FILE" RELEASE_VERSION="$VERSION" node -e "
    const fs = require('fs');
    const filePath = process.env.RELEASE_FILE;
    const version  = process.env.RELEASE_VERSION;
    try {
      const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      pkg.version = version;
      fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
    } catch (err) {
      console.error('Failed to update ' + filePath + ': ' + err.message);
      process.exit(1);
    }
  "
  info "Updated ${FILE} → ${VERSION}"
done

# ── Commit the version bump ─────────────────────────────────────────────────

git add "${FILES[@]}"

# Verify there is something to commit (the version was actually changed)
if git diff --cached --quiet; then
  warn "No changes to commit — version is already ${VERSION}"
  warn "Skipping commit; tag will still be created."
else
  git commit -m "chore(release): ${PACKAGE} v${VERSION}"
  info "Committed version bump"
fi

# ── Create annotated tag ────────────────────────────────────────────────────

git tag -a "$TAG" -m "Release ${PACKAGE} v${VERSION}"
info "Created annotated tag: ${TAG}"

# ── Done — print manual push instructions ───────────────────────────────────

echo ""
echo "─────────────────────────────────────────────────────"
echo "  Release ${PACKAGE} v${VERSION} is ready locally."
echo ""
echo "  Push the commit and tag to trigger the CI workflow:"
echo ""
echo "    git push origin HEAD --follow-tags"
echo ""
echo "  Or push them separately:"
echo ""
echo "    git push origin HEAD"
echo "    git push origin ${TAG}"
echo "─────────────────────────────────────────────────────"
