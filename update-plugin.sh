#!/bin/bash
# Update Obsidian plugin script
# Builds the plugin and copies it to the Obsidian vault

set -e  # Exit on error

echo "Building plugin..."
pnpm --filter @semantic-glyph/obsidian-plugin build

echo "Copying files to Obsidian vault..."
cp packages/obsidian-plugin/main.js \
   packages/obsidian-plugin/manifest.json \
   packages/obsidian-plugin/styles.css \
   "/Users/brandonarmstrong/Documents/Obsidian/Mana Moderna/.obsidian/plugins/semantica/"

echo "✓ Plugin updated! Reload Obsidian (Ctrl/Cmd + R) to see changes."
