#!/bin/bash

set -e

echo "Building Agent Pipeline..."
echo ""

cd "$(dirname "$0")/.."

# Build the runtime
echo "→ Building runtime..."
cd runtime
npm install
npm run build
cd ..

# Link CLI globally (root package exposes `p`)
echo "→ Linking CLI globally..."
npm link

echo ""
echo "✓ Build complete!"
echo ""
echo "The 'p' command is now available globally."
echo ""
echo "Try it:"
echo "  p run examples/simple-task-test/pipeline.yaml"
