#!/usr/bin/env bash
set -e

if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: GITHUB_TOKEN secret is not set. Please add it in the Replit Secrets panel."
  exit 1
fi

REPO_URL="https://${GITHUB_TOKEN}@github.com/ronb12/Holliday-Lawn-Garden.git"

git remote set-url origin "$REPO_URL"

git push origin main

git remote set-url origin "https://github.com/ronb12/Holliday-Lawn-Garden"

echo "Successfully synced to GitHub!"
