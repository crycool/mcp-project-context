@echo off
echo 🔧 Enhanced MCP Project Context Manager - Build Script
echo ================================================

echo 📦 Installing dependencies...
call npm install

echo 🏗️  Building TypeScript...
call npm run build

if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed! Check TypeScript errors above.
    pause
    exit /b 1
)

echo ✅ Build successful!
echo 📊 Checking output files...

if exist "dist\enhancedIndex.js" (
    echo   ✓ dist\enhancedIndex.js created
) else (
    echo   ❌ dist\enhancedIndex.js not found
)

if exist "dist\context\enhancedContextManager.js" (
    echo   ✓ Enhanced Context Manager compiled
) else (
    echo   ❌ Enhanced Context Manager not compiled
)

if exist "dist\handlers\enhancedToolHandler.js" (
    echo   ✓ Enhanced Tool Handler compiled
) else (
    echo   ❌ Enhanced Tool Handler not compiled
)

echo 🎉 Enhanced MCP Project Context Manager v1.1.0 ready!
echo.
echo 📋 Next steps:
echo 1. Update Claude Desktop configuration to use: dist\enhancedIndex.js
echo 2. Restart Claude Desktop
echo 3. Test with get_context tool
echo.

pause
