@echo off
echo MCP Project Context Manager - Build Script
echo ==========================================
echo.

echo Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo Error: Failed to install dependencies
    exit /b 1
)

echo.
echo Building TypeScript...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Error: TypeScript compilation failed
    exit /b 1
)

echo.
echo Build completed successfully!
echo.
echo Next steps:
echo 1. Copy the example config: claude_desktop_config.example.json
echo 2. Update the path in the config to point to your project
echo 3. Add the config to your Claude Desktop configuration
echo    Location: %%APPDATA%%\Claude\claude_desktop_config.json
echo.
echo To test the server manually:
echo   node dist\index.js
echo.
pause
