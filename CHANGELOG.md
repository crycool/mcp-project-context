# Changelog

All notable changes to MCP Project Context Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-01

### Added
- Initial release
- Project discovery engine with multi-language support
- Hierarchical memory system with knowledge graph
- Context management with smart filtering
- File operations (read, write, create, delete, move)
- Git integration (status, diff, commit, etc.)
- CLAUDE.md file support with @import system
- MCP tools, resources, and prompts implementation
- Real-time file watching
- Cross-conversation memory persistence
- User preference management

### Features
- Automatic project type detection (JavaScript, Python, Java, Go, Rust)
- Framework detection (React, Vue, Angular, Django, Flask, etc.)
- Package manager identification
- Build tool detection
- Git repository integration
- Token budget management for context generation
- Memory importance scoring and cleanup
- Secure file operations with sandboxing

### Performance
- Project discovery: <2 seconds
- Context loading: <1 second
- Memory operations: <500ms
- File operations: <200ms
- Memory usage: <200MB

### Security
- Local-only data storage
- Sensitive file filtering
- Read-only default operations
- Path validation and sanitization

## [Unreleased]

### Planned
- Advanced import resolution with wildcards
- Project template system
- Multi-project support
- Context compression algorithms
- Smart caching strategies
- Plugin system for extensions
- Web UI for configuration
- Enhanced testing coverage
- Performance optimizations
- Documentation improvements
