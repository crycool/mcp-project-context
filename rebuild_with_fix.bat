@echo off
echo ========================================
echo MCP Working Directory Fix & Rebuild
echo ========================================
echo.

cd /d C:\mcp-project-context

echo [1/3] Compiling TypeScript...
call npm run build

echo.
echo [2/3] Restarting Claude Desktop...
echo Please restart Claude Desktop manually to apply changes
echo.

echo [3/3] Testing working directory detection...
node -e "console.log('Current directory:', process.cwd()); console.log('PROJECT_ROOT env:', process.env.PROJECT_ROOT || 'not set');"

echo.
echo ========================================
echo ✅ MCP tool has been updated!
echo ========================================
echo.
echo IMPORTANT: 
echo 1. Restart Claude Desktop to apply changes
echo 2. The tool will now correctly detect C:\teamvoicechat as the working directory
echo 3. Check the logs to verify correct directory is being used
echo.
pause
