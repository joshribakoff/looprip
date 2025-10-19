#!/usr/bin/env bash
set -euo pipefail

# Tiny runner for the agent pipeline CLI
# Usage: p run <pipeline.yaml> [options]

if command -v tsx >/dev/null 2>&1; then
  exec tsx src/cli/index.js "$@"
else
  # Fallback to npx if tsx isn't installed globally
  exec npx -y tsx src/cli/index.js "$@"
fi
