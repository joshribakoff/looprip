#!/usr/bin/env bash
set -euo pipefail

# Lint across workspaces with grouped, color-coded logs
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

npx concurrently --group -n runtime,prompts -c cyan,magenta \
  "npm run -s runtime:lint" \
  "npm --prefix runtime run -s lint:prompts"
