#!/usr/bin/env bash
set -euo pipefail

# One-shot installer: build and link `p` on your PATH
cd "$(dirname "$0")/.."

echo "Building runtime..."
pushd runtime >/dev/null
npm install
npm run build
popd >/dev/null

echo "Linking 'p' globally..."
npm link

echo "\n✓ Installed. Try:"
echo "  p --help"
echo "  p run examples/simple-task-test/pipeline.yaml"
