#!/usr/bin/env bash
set -euo pipefail

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "ERROR: GITHUB_TOKEN secret is not set. Please add it in the Replit Secrets panel."
  exit 1
fi

git config --global user.email "replit-autosync@users.noreply.github.com" 2>/dev/null || true
git config --global user.name "Replit Auto-Sync" 2>/dev/null || true

BRANCH=$(git rev-parse --abbrev-ref HEAD)
AUTH_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/ronb12/Holliday-Lawn-Garden.git"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Staging and committing local changes..."
  git add -A
  git commit -m "Auto-sync from Replit $(date -u '+%Y-%m-%d %H:%M UTC')"
fi

AHEAD=$(git rev-list "origin/${BRANCH}..HEAD" --count 2>/dev/null || echo "0")
if [ "$AHEAD" -eq 0 ]; then
  echo "Already up to date with GitHub. Nothing to push."
  exit 0
fi

echo "Pushing $AHEAD commit(s) to GitHub (branch: $BRANCH)..."
git push "$AUTH_URL" "HEAD:refs/heads/${BRANCH}"
echo "Successfully synced to GitHub!"
