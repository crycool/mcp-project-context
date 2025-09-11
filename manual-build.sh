#!/bin/bash
cd "/Users/yusufkamil/Desktop/SurpriseBox"
echo "Building MCP Project Context..."
npm run build
echo "Build completed!"
echo "Checking dist directory..."
ls -la dist/
echo "Ready to test with Claude Desktop!"
