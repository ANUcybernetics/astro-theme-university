#!/usr/bin/env bash
# Release helper for astro-theme-university (single package at the repo
# root).
#
# Bumps the package version, commits the bump, creates an annotated
# v<version> tag, and pushes commit + tag to origin. Refuses to run if the
# working tree is dirty, the current branch is not main, or local main is
# not in sync with origin/main.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [[ $# -lt 1 ]]; then
  cat <<EOF >&2
Usage: $0 <patch|minor|major|x.y.z> [reason]

Examples:
  $0 patch
  $0 minor "brand palette API: derived semantic tokens"
EOF
  exit 1
fi

bump="$1"
reason="${2:-}"

[[ -n "$(git status --porcelain)" ]] && { echo "Working tree not clean." >&2; exit 1; }
branch="$(git rev-parse --abbrev-ref HEAD)"
[[ "$branch" == "main" ]] || { echo "Not on main (currently '$branch')." >&2; exit 1; }

git fetch --quiet
read -r behind ahead < <(git rev-list --left-right --count origin/main...HEAD)
[[ "$behind" == "0" && "$ahead" == "0" ]] \
  || { echo "Local main is $behind behind / $ahead ahead of origin/main. Sync first." >&2; exit 1; }

# A tag is immediately consumable by pinned consumers, so never cut one from
# a commit that doesn't pass the full check suite.
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test

old="$(jq -r .version package.json)"
pnpm version "$bump" --no-git-tag-version >/dev/null
new="$(jq -r .version package.json)"
tag="v${new}"

if git rev-parse "$tag" >/dev/null 2>&1; then
  git checkout -- package.json
  echo "Tag $tag already exists. Aborting." >&2
  exit 1
fi

echo "astro-theme-university: $old -> $new (tag: $tag)"

git add package.json
git commit -m "chore(release): astro-theme-university $tag"

msg="astro-theme-university $new"
[[ -n "$reason" ]] && msg="$msg"$'\n\n'"$reason"
git tag -a "$tag" -m "$msg"

git push origin main "$tag"
echo "Released $tag."
