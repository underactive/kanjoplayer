#!/bin/bash
set -e

echo "Building KanjoPlayer for Netlify deployment..."

# Clean previous build
rm -rf dist

# Build the library
echo "Building library..."
npm run build -w kanjo-player

# Build all demo apps
echo "Building Vue demo..."
npm run build -w kanjo-player-demo-vue

echo "Building React demo..."
npm run build -w kanjo-player-demo-react

echo "Building Svelte demo..."
npm run build -w kanjo-player-demo-svelte

# Create dist directory structure
echo "Assembling dist directory..."
mkdir -p dist/lib dist/vue dist/react dist/svelte

# Copy plain demo (index.html)
cp apps/demo/index.html dist/

# Copy library files for plain demo
cp packages/kanjo-player/dist/kanjo-player.css dist/lib/
cp packages/kanjo-player/dist/kanjo-player.umd.js dist/lib/

# Copy framework demo builds
cp -r apps/demo-vue/dist/* dist/vue/
cp -r apps/demo-react/dist/* dist/react/
cp -r apps/demo-svelte/dist/* dist/svelte/

echo "Build complete! Output in ./dist"
echo ""
echo "Structure:"
ls -la dist/
