#!/usr/bin/env bash
# Publish wiki/*.md to https://github.com/rodeostar219/Property-Book-App/wiki
# The GitHub wiki git repo does not exist until a collaborator saves the first
# page in the web UI. After that, this script clones, replaces pages, and pushes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/wiki"
WIKI_URL="${WIKI_URL:-https://github.com/rodeostar219/Property-Book-App.wiki.git}"
WORKDIR="${WORKDIR:-/tmp/property-book-app.wiki}"

if [[ ! -d "$SRC" ]]; then
  echo "WIKI_MISSING: no ${SRC} directory" >&2
  exit 2
fi

rm -rf "$WORKDIR"
if ! git clone "$WIKI_URL" "$WORKDIR" 2>/tmp/wiki-clone.err; then
  echo "WIKI_MISSING: wiki git repo not initialized (clone failed)." >&2
  echo "Create the first page while signed in as a collaborator:" >&2
  echo "  https://github.com/rodeostar219/Property-Book-App/wiki/_new" >&2
  cat /tmp/wiki-clone.err >&2 || true
  exit 3
fi

# Replace published pages with the in-repo mirror (keep .git).
find "$WORKDIR" -maxdepth 1 -type f -name '*.md' -delete
cp -f "$SRC"/*.md "$WORKDIR"/
# GitHub wiki sidebar
if [[ -f "$SRC/_Sidebar.md" ]]; then
  cp -f "$SRC/_Sidebar.md" "$WORKDIR/_Sidebar.md"
fi

git -C "$WORKDIR" add -A
if git -C "$WORKDIR" diff --cached --quiet; then
  echo "WIKI_PUSHED: already up to date"
  exit 0
fi

git -C "$WORKDIR" -c user.email='cursor@users.noreply.github.com' -c user.name='Cursor Agent' \
  commit -m "Mirror docs/ living pages into the project wiki"
if git -C "$WORKDIR" push origin HEAD:master || git -C "$WORKDIR" push origin HEAD:main; then
  echo "WIKI_PUSHED: https://github.com/rodeostar219/Property-Book-App/wiki"
  exit 0
fi

echo "WIKI_MISSING: push failed" >&2
exit 4
