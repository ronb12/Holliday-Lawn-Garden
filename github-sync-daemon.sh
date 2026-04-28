#!/usr/bin/env bash

SYNC_INTERVAL=${GITHUB_SYNC_INTERVAL:-60}

echo "GitHub Auto-Sync daemon started. Syncing every ${SYNC_INTERVAL}s."

while true; do
  bash github-sync.sh 2>&1 | sed "s|x-access-token:[^@]*@|x-access-token:***@|g"
  sleep "$SYNC_INTERVAL"
done
