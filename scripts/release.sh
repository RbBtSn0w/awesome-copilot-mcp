#!/bin/bash

# Release script for Awesome Copilot MCP
# Usage: ./release.sh [patch|minor|major]

set -e

# Ensure we are in the project root
cd "$(dirname "$0")/.."

if [ -z "$1" ]; then
  echo "Usage: ./release.sh [patch|minor|major]"
  exit 1
fi

# 1. Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working directory is not clean. Commit or stash your changes."
  exit 1
fi

# 2. Run CI checks
echo "Running CI checks..."
npm run ci

# 3. Versioning
echo "Updating version..."
npm version $1 -m "chore: release %s"

# 4. Build
echo "Building..."
npm run build

echo "Success! Version updated and tagged."
echo "Now run: git push origin main --tags && npm publish"
