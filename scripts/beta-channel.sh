#!/usr/bin/env bash
# Puts a manifest on the rolling `channel-beta` release as beta.json, the file Beta copies of Studio read
# (ADR 0046). The release workflow runs it for each Beta, and beta-channel.yml for each Stable release a
# maintainer publishes, so a Beta copy is always offered the newest of either.
# scripts/beta-channel.sh <manifest>
set -euo pipefail
manifest="$1"
repo="${GITHUB_REPOSITORY:?}"
if ! gh release view channel-beta --repo "$repo" >/dev/null 2>&1; then
  gh release create channel-beta --repo "$repo" --prerelease --title "Beta channel" \
    --notes "What Beta copies of Tutors Studio read to learn of a newer version. Download Studio from a numbered release, not from here."
fi
cp "$manifest" "$RUNNER_TEMP/beta.json"
gh release upload channel-beta "$RUNNER_TEMP/beta.json" --repo "$repo" --clobber
