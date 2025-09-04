# MCP Project Context Manager - Development Guidelines

## Project Overview
This is an MCP (Model Context Protocol) server implementation that provides Claude Desktop with advanced project context management capabilities similar to Claude Code.

## Architecture Principles
- **Modular Design**: Separate concerns into distinct handlers
- **Type Safety**: Full TypeScript with strict mode
- **Performance First**: Optimize for <2s discovery, <1s context loading
- **Memory Efficient**: Keep memory usage under 200MB
- **Error Resilient**: Graceful degradation and recovery

## Code Standards
- Use ES modules (import/export)
- Async/await for all asynchronous operations
- Comprehensive error handling with try-catch
- Meaningful variable and function names
- Document complex logic with comments

## Directory Structure
- `/src` - Source code
  - `/discovery` - Project analysis and detection
  - `/storage` - Memory and persistence layer
  - `/context` - Context generation and management
  - `/handlers` - MCP protocol handlers
- `/dist` - Compiled JavaScript output
- `/tests` - Test files (when added)

## Key Components

### ProjectDiscovery
- Detects project type, language, framework
- Finds git information and project structure
- Locates CLAUDE.md files hierarchically

### MemoryManager
- Persistent knowledge graph storage
- Project-specific memory isolation
- User preference management
- Automatic cleanup of old memories

### ContextManager
- Generates optimized context for Claude
- Manages file cache and imports
- Tracks session interactions
- Handles @import directives

### Handlers
- **FileHandler**: File system operations and watching
- **GitHandler**: Git repository operations
- **ToolHandler**: MCP tool implementations
- **ResourceHandler**: MCP resource providers
- **PromptHandler**: MCP prompt templates

## Development Workflow
1. Make changes in `/src`
2. Run `npm run build` to compile
3. Test with Claude Desktop
4. Monitor console for debug output

## Testing Strategy
- Unit tests for core logic (memory, discovery)
- Integration tests for handlers
- End-to-end tests with mock MCP client

## Performance Targets
- Project discovery: <2 seconds
- Context generation: <1 second
- Memory operations: <500ms
- File operations: <200ms
- Total memory usage: <200MB

## Security Considerations
- Never expose sensitive files (.env, keys)
- Validate all file paths
- Sanitize user inputs
- Use read-only operations by default

## Future Enhancements
- [ ] Advanced import resolution
- [ ] Project template system
- [ ] Multi-project support
- [ ] Context compression
- [ ] Smart caching strategies
- [ ] Plugin system
- [ ] Web UI for configuration

## Debugging
Enable verbose logging by setting environment variable:
```
DEBUG=mcp:* node dist/index.js
```

## Contributing
Please ensure:
- TypeScript compilation passes
- No linting errors
- Tests pass (when implemented)
- Performance targets are met
- Security guidelines followed
