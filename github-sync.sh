#!/usr/bin/env bash
set -euo pipefail

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "ERROR: GITHUB_TOKEN secret is not set. Please add it in the Replit Secrets panel."
  exit 1
fi

git config --global user.email "replit-autosync@users.noreply.github.com" 2>/dev/null || true
git config --global user.name "Replit Auto-Sync" 2>/dev/null || true

BRANCH=$(git rev-parse --abbrev-ref HEAD)

CREDFILE=$(mktemp)
chmod 600 "$CREDFILE"
printf "https://x-access-token:%s@github.com\n" "$GITHUB_TOKEN" > "$CREDFILE"
cleanup() { rm -f "$CREDFILE"; }
trap cleanup EXIT

if [ -n "$(git status --porcelain)" ]; then
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
if ! git -c credential.helper="store --file=${CREDFILE}" push origin "HEAD:refs/heads/${BRANCH}"; then
  echo "Push failed. If the remote has diverged (e.g., changes were made directly on GitHub),"
  echo "run 'git pull --rebase origin ${BRANCH}' in the shell to reconcile, then sync again."
  exit 1
fi
echo "Successfully synced to GitHub!"
