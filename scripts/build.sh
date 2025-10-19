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

# Link CLI globally
echo "→ Linking CLI globally..."
npm link

echo ""
echo "✓ Build complete!"
echo ""
echo "The 'agent-pipeline' command is now available globally."
echo ""
echo "Try it:"
echo "  agent-pipeline run examples/simple-task-test/pipeline.yaml"
