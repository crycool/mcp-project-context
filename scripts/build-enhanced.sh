#!/bin/bash
echo "🔧 Enhanced MCP Project Context Manager - Build Script (Unix)"
echo "================================================"

echo "📦 Installing dependencies..."
npm install

echo "🏗️  Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Check TypeScript errors above."
    exit 1
fi

echo "✅ Build successful!"
echo "📊 Checking output files..."

if [ -f "dist/enhancedIndex.js" ]; then
    echo "   ✓ dist/enhancedIndex.js created"
else
    echo "   ❌ dist/enhancedIndex.js not found"
fi

if [ -f "dist/context/enhancedContextManager.js" ]; then
    echo "   ✓ Enhanced Context Manager compiled"
else
    echo "   ❌ Enhanced Context Manager not compiled"
fi

if [ -f "dist/handlers/enhancedToolHandler.js" ]; then
    echo "   ✓ Enhanced Tool Handler compiled"
else
    echo "   ❌ Enhanced Tool Handler not compiled"
fi

echo "🎉 Enhanced MCP Project Context Manager v1.1.0 ready!"
echo ""
echo "📋 Next steps:"
echo "1. Update Claude Desktop configuration to use: dist/enhancedIndex.js"
echo "2. Restart Claude Desktop"
echo "3. Test with get_context tool"
echo ""

read -p "Press enter to continue..."
