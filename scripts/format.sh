#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Format source and docs using Prettier
rt_cmd="git ls-files -z -- 'runtime/**/*.{ts,tsx,js,json,md,mdx,yaml,yml}' | xargs -0 npx prettier --write"
docs_cmd="git ls-files -z -- 'docs/**/*.{md,mdx,ts,tsx}' | xargs -0 npx prettier --write"
misc_cmd="git ls-files -z -- 'examples/**/*.{md,yaml,yml}' 'prompts/**/*.md' | xargs -0 npx prettier --write"

npx concurrently --group -n prettier:rt,prettier:docs,prettier:misc -c cyan,magenta,green \
  "$rt_cmd" \
  "$docs_cmd" \
  "$misc_cmd"
