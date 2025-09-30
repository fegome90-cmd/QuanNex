#!/usr/bin/env bash
set -Eeuo pipefail

# Simple release helper: SemVer bump, artifact + checksum, changelog stub
# Toyota: minimal, safe defaults; explicit actions for tagging/pushing.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
ok() { echo -e "${GREEN}OK${NC} $*"; }
info() { echo -e "${YELLOW}INFO${NC} $*"; }
fail() {
  echo -e "${RED}ERR${NC} $*"
  exit 1
}

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

VERSION_FILE="VERSION"
INIT_FILE="claude-project-init.sh"
DIST_DIR="dist"
CHANGELOG="CHANGELOG.md"

usage() {
  cat <<USAGE
Usage: scripts/release.sh [options]
  --bump <major|minor|patch>   Bump from current VERSION
  --version <x.y.z>            Set an explicit SemVer
  --update-init-version        Also update VERSION variable in claude-project-init.sh
  --tag                        Create a git tag vX.Y.Z (no push)
  --dry-run                    Show plan without writing
  -h, --help                   Show this help
USAGE
}

is_valid_semver() { [[ $1 =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; }

current_version() {
  if [[ -f $VERSION_FILE ]]; then cat "$VERSION_FILE" | tr -d '\n'; else echo "0.0.0"; fi
}

next_version_bump() {
  local cur="$1"
  local kind="$2"
  IFS='.' read -r MA MI PA <<<"$cur"
  case "$kind" in
    major) echo "$((MA + 1)).0.0" ;;
    minor) echo "$MA.$((MI + 1)).0" ;;
    patch) echo "$MA.$MI.$((PA + 1))" ;;
    *) fail "Unknown bump kind: $kind" ;;
  esac
}

DRY=0
BUMP=""
SETV=""
UPDATE_INIT=0
DO_TAG=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --bump)
      BUMP=${2:-}
      shift 2
      ;;
    --version)
      SETV=${2:-}
      shift 2
      ;;
    --update-init-version)
      UPDATE_INIT=1
      shift
      ;;
    --tag)
      DO_TAG=1
      shift
      ;;
    --dry-run)
      DRY=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *) fail "Unknown option: $1" ;;
  esac
done

CUR=$(current_version)
NEW="$CUR"

if [[ -n $SETV ]]; then
  is_valid_semver "$SETV" || fail "Invalid SemVer: $SETV"
  NEW="$SETV"
elif [[ -n $BUMP ]]; then
  NEW=$(next_version_bump "$CUR" "$BUMP")
else
  info "No bump specified; using current version: $CUR"
fi

is_valid_semver "$NEW" || fail "Invalid SemVer result: $NEW"
echo "Release version: $CUR -> $NEW"

# Preview changes
echo "Plan:"
echo "  - Write VERSION=$NEW"
if [[ $UPDATE_INIT -eq 1 ]]; then
  echo "  - Update VERSION variable in $INIT_FILE"
fi
echo "  - Create archive + SHA256SUMS in $DIST_DIR"
echo "  - Append entry to $CHANGELOG"
if [[ $DO_TAG -eq 1 ]]; then
  echo "  - Create tag v$NEW (no push)"
fi

if [[ $DRY -eq 1 ]]; then
  info "Dry run mode: no changes written"
  exit 0
fi

echo "$NEW" >"$VERSION_FILE"
ok "VERSION updated"

if [[ $UPDATE_INIT -eq 1 ]]; then
  if [[ -f $INIT_FILE ]]; then
    # Replace VERSION="x.y.z" line
    if sed -E -i.bak "s/^(VERSION=\")[0-9]+\.[0-9]+\.[0-9]+(\")(.*)$/\\1$NEW\\2/" "$INIT_FILE"; then
      rm -f "$INIT_FILE.bak"
      ok "Updated VERSION in $INIT_FILE"
    else
      fail "Failed updating VERSION in $INIT_FILE"
    fi
  else
    info "$INIT_FILE not found; skipping init version update"
  fi
fi

mkdir -p "$DIST_DIR"
ARCHIVE="$DIST_DIR/claude-project-init-kit-v$NEW.tar.gz"

# Create archive excluding VCS and build artifacts
tar --exclude-vcs \
  --exclude "$DIST_DIR" \
  --exclude "node_modules" \
  -czf "$ARCHIVE" .
ok "Archive created: $ARCHIVE"

# Compute SHA256 checksum
if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$ARCHIVE" >"$DIST_DIR/SHA256SUMS"
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$ARCHIVE" >"$DIST_DIR/SHA256SUMS"
else
  fail "No shasum/sha256sum available to compute checksum"
fi
ok "Checksums written: $DIST_DIR/SHA256SUMS"

# Append simple changelog entry (since last tag if available)
DATE="$(date +%Y-%m-%d)"
echo -e "\n## v$NEW - $DATE" >>"$CHANGELOG"
if git tag | grep -q .; then
  LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)
  if [[ -n $LAST_TAG ]]; then
    echo "Changes since $LAST_TAG:" >>"$CHANGELOG"
    git log "$LAST_TAG"..HEAD --pretty=format:'- %s' >>"$CHANGELOG" || echo "- Changes TBD" >>"$CHANGELOG"
  else
    git log --pretty=format:'- %s' >>"$CHANGELOG" || echo "- Changes TBD" >>"$CHANGELOG"
  fi
else
  echo "- Initial release notes stub" >>"$CHANGELOG"
fi
ok "Changelog updated: $CHANGELOG"

if [[ $DO_TAG -eq 1 ]]; then
  git tag -a "v$NEW" -m "Release v$NEW" || fail "Failed to create tag"
  ok "Tag created: v$NEW (not pushed)"
fi

echo
ok "Release $NEW prepared successfully"
