# Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### Error: npm install fails
**Solution:**
- Ensure Node.js version 18.0.0 or higher is installed
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and package-lock.json, then retry

#### Error: TypeScript compilation fails
**Solution:**
- Check TypeScript version: `npm ls typescript`
- Ensure all type definitions are installed
- Run `npm install --save-dev @types/node`

### Configuration Issues

#### Claude Desktop doesn't recognize the MCP server
**Solution:**
1. Verify config file location:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/claude/claude_desktop_config.json`
2. Check JSON syntax is valid
3. Ensure paths use proper separators (backslash for Windows, forward slash for Unix)
4. Restart Claude Desktop after configuration changes

#### MCP server starts but doesn't discover project
**Solution:**
- Verify the `cwd` in config points to your project directory
- Check project has recognizable markers (package.json, .git, etc.)
- Ensure read permissions for project directory

### Runtime Issues

#### Error: "Project info not available"
**Solution:**
- Server needs to be started from a valid project directory
- Update the `cwd` field in Claude Desktop config
- Ensure project discovery completes (check console output)

#### High memory usage
**Solution:**
- Clear old memories: memories older than 30 days are auto-cleaned
- Reduce file cache size in large projects
- Limit the number of files tracked

#### File watching not working
**Solution:**
- Check file system permissions
- Verify watcher limits on Linux: `cat /proc/sys/fs/inotify/max_user_watches`
- Increase if needed: `echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf`

### Debug Mode

Enable verbose logging for troubleshooting:

**Windows:**
```cmd
set DEBUG=mcp:*
node dist\index.js
```

**Unix/macOS:**
```bash
DEBUG=mcp:* node dist/index.js
```

### Performance Issues

#### Slow project discovery
**Causes & Solutions:**
- Large repositories: Add .mcpignore file to exclude directories
- Network drives: Move project to local disk
- Many node_modules: Already excluded by default

#### Context generation taking too long
**Solutions:**
- Reduce token budget in requests
- Limit number of tracked files
- Clear file cache periodically

### Git Integration Issues

#### Git commands not working
**Solution:**
- Ensure git is installed and in PATH
- Verify project is a git repository
- Check git permissions

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `EACCES: permission denied` | Insufficient permissions | Run with appropriate permissions or fix file ownership |
| `ENOENT: no such file or directory` | File/directory not found | Verify paths in configuration |
| `SyntaxError: Unexpected token` | Invalid JSON | Check configuration file syntax |
| `Cannot find module` | Missing dependency | Run `npm install` |
| `Memory limit exceeded` | Too much data cached | Restart server, reduce cache size |

### Getting Help

If issues persist:
1. Check the [GitHub Issues](https://github.com/yourusername/mcp-project-context/issues)
2. Enable debug mode and collect logs
3. Create a new issue with:
   - Error messages
   - Debug logs
   - System information
   - Steps to reproduce

### Quick Fixes

**Reset everything:**
```bash
# Windows
rmdir /s /q node_modules
del package-lock.json
rmdir /s /q %USERPROFILE%\.mcp-project-context
npm install
npm run build

# Unix/macOS
rm -rf node_modules package-lock.json
rm -rf ~/.mcp-project-context
npm install
npm run build
```

**Validate setup:**
```bash
node quickstart.js
```
