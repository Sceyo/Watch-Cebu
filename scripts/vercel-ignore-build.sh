#!/usr/bin/env bash
# Watch Cebu — Vercel Ignored Build Step
#
# Prevents scheduled data commits (data/*.json) from triggering Vercel builds.
# Under Vercel's Hobby tier (100 deployments/day limit), scheduled 10-minute
# earthquake heartbeats (144 commits/day) would otherwise exhaust the deployment cap.
#
# Exit 0 = Skip deployment (only data/ files changed)
# Exit 1 = Proceed with deployment (code, styles, components, or docs changed)

# If HEAD^ doesn't exist (e.g. initial commit or shallow clone without history), proceed with build
if ! git rev-parse --verify HEAD^ >/dev/null 2>&1; then
  echo "[vercel-ignore] HEAD^ not found (initial commit or shallow clone); proceeding with build."
  exit 1
fi

# Compare changes between previous commit and current commit excluding data/
if git diff --quiet HEAD^ HEAD -- . ':(exclude)data'; then
  echo "[vercel-ignore] Only data/ snapshot files changed. Skipping deployment to preserve Hobby quota."
  exit 0
else
  echo "[vercel-ignore] Application files changed outside data/. Proceeding with deployment."
  exit 1
fi
