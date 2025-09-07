@echo off
echo ========================================
echo MCP Tool - Search Enhancement Rebuild
echo ========================================
echo.

cd /d C:\mcp-project-context

echo [1/3] Installing dependencies (if needed)...
call npm install

echo.
echo [2/3] Compiling TypeScript with enhanced search...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Build failed! Check for TypeScript errors.
    pause
    exit /b 1
)

echo.
echo [3/3] Build successful!
echo.
echo ========================================
echo ✅ SEARCH ENHANCEMENT COMPLETE!
echo ========================================
echo.
echo NEW FEATURES:
echo   📝 Searches ALL text files (not just code)
echo   ✅ Includes: .md, .json, .yaml, .xml, .env, .txt, .log, .csv
echo   ✅ Includes: .html, .css, .svg, config files
echo   ✅ Excludes only binary files (images, videos, executables)
echo.
echo RESTART Claude Desktop to apply changes!
echo.
pause