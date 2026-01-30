#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the root directory of the project
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_DIR="$ROOT_DIR/packages/kanjo-player"

cd "$ROOT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  KanjoPlayer Publish Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Lint
echo -e "${YELLOW}[1/5]${NC} Running lint..."
if npm run lint; then
  echo -e "${GREEN}✓ Lint passed${NC}"
else
  echo -e "${RED}✗ Lint failed${NC}"
  exit 1
fi
echo ""

# Step 2: Lint fix
echo -e "${YELLOW}[2/5]${NC} Running lint:fix..."
if npm run lint:fix; then
  echo -e "${GREEN}✓ Lint fix completed${NC}"
else
  echo -e "${RED}✗ Lint fix failed${NC}"
  exit 1
fi
echo ""

# Step 3: Format
echo -e "${YELLOW}[3/5]${NC} Running format..."
# Ignore prettier exit code for svelte parser warnings
npm run format || true
echo -e "${GREEN}✓ Format completed${NC}"
echo ""

# Step 4: Typecheck
echo -e "${YELLOW}[4/5]${NC} Running typecheck..."
if npm run typecheck; then
  echo -e "${GREEN}✓ Typecheck passed${NC}"
else
  echo -e "${RED}✗ Typecheck failed${NC}"
  exit 1
fi
echo ""

# Step 5: Build
echo -e "${YELLOW}[5/5]${NC} Running build..."
if npm run build; then
  echo -e "${GREEN}✓ Build succeeded${NC}"
else
  echo -e "${RED}✗ Build failed${NC}"
  exit 1
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  All checks passed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('$PACKAGE_DIR/package.json').version")
echo -e "Current version: ${BLUE}$CURRENT_VERSION${NC}"
echo ""

# Prompt for version bump
echo "How would you like to bump the version?"
echo "  1) patch  (bug fixes)"
echo "  2) minor  (new features)"
echo "  3) major  (breaking changes)"
echo "  4) custom (enter manually)"
echo "  5) skip   (keep current version)"
echo ""
read -p "Select option [1-5]: " VERSION_CHOICE

cd "$PACKAGE_DIR"

case $VERSION_CHOICE in
  1)
    npm version patch --no-git-tag-version
    ;;
  2)
    npm version minor --no-git-tag-version
    ;;
  3)
    npm version major --no-git-tag-version
    ;;
  4)
    read -p "Enter new version: " CUSTOM_VERSION
    npm version "$CUSTOM_VERSION" --no-git-tag-version
    ;;
  5)
    echo "Keeping current version."
    ;;
  *)
    echo -e "${RED}Invalid option. Keeping current version.${NC}"
    ;;
esac

NEW_VERSION=$(node -p "require('./package.json').version")
echo ""
echo -e "Version to publish: ${BLUE}$NEW_VERSION${NC}"
echo ""

# Confirm publish
read -p "Publish to npm? [y/N]: " CONFIRM_PUBLISH

if [[ "$CONFIRM_PUBLISH" =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${YELLOW}Publishing to npm...${NC}"
  npm publish --access public
  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}  Published kanjo-player@$NEW_VERSION${NC}"
  echo -e "${GREEN}========================================${NC}"
else
  echo ""
  echo "Publish cancelled. You can publish manually with:"
  echo -e "  ${BLUE}cd packages/kanjo-player && npm publish --access public${NC}"
fi
