#!/bin/bash

echo "MCP Project Context Manager - Build Script"
echo "=========================================="
echo ""

echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies"
    exit 1
fi

echo ""
echo "Building TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "Error: TypeScript compilation failed"
    exit 1
fi

echo ""
echo "Build completed successfully!"
echo ""
echo "Next steps:"
echo "1. Copy the example config: claude_desktop_config.example.json"
echo "2. Update the path in the config to point to your project"
echo "3. Add the config to your Claude Desktop configuration"
echo "   macOS: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "   Linux: ~/.config/claude/claude_desktop_config.json"
echo ""
echo "To test the server manually:"
echo "  node dist/index.js"
echo ""
