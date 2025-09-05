# MCP Project Context Manager

A Model Context Protocol (MCP) server that provides Claude Desktop with Claude Code-like project context management and persistent memory capabilities.

## Features

### 🔍 Project Discovery
- Automatic git repository detection
- Multi-language project type recognition (JavaScript, Python, Java, Go, Rust, etc.)
- Framework detection (React, Vue, Angular, Django, Flask, etc.)
- Package manager identification
- Build tool detection

### 🧠 Hierarchical Memory System
- Knowledge graph-based persistent storage
- Project-specific memory isolation
- User preference management
- Automatic memory cleanup and optimization
- Cross-conversation context preservation

### 📁 Context Management
- Automatic context loading on session start
- Real-time file change monitoring
- Git state tracking
- Smart context filtering based on relevance
- Import system with @syntax support (like Claude Code)

### 🛠 Available Tools
- File operations (read, write, create, delete, move)
- **NEW: Read multiple files** - Read contents of multiple files at once
- **NEW: Edit file** - Surgical text replacement with validation
- Git operations (status, diff, add, commit)
- Context retrieval with token budget management
- Memory search and management
- Directory operations

### 📚 Resources
- Project overview and statistics
- Directory structure visualization
- CLAUDE.md instructions access
- Important project files
- Configuration files

### 💬 Prompts
- Project context for development
- Code review with project standards
- Debug context with recent changes
- Feature development assistance
- Refactoring guidance
## Installation

1. Clone the repository:
```bash
cd C:\
git clone <repository-url> mcp-project-context
cd mcp-project-context
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

Add to your Claude Desktop configuration file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux:** `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "project-context": {
      "command": "node",
      "args": ["C:\\mcp-project-context\\dist\\index.js"],
      "cwd": "C:\\your-project-directory"
    }
  }
}
```

## Usage

1. **Start Claude Desktop** - The MCP server will automatically start when you open Claude Desktop

2. **Navigate to your project** - Set the `cwd` in configuration to your project directory

3. **Automatic Discovery** - The server will automatically:
   - Detect project type and structure
   - Load CLAUDE.md instructions
   - Initialize memory system
   - Start file watching
## CLAUDE.md Files

Create `CLAUDE.md` files in your project to provide context and instructions:

### Root CLAUDE.md
```markdown
# Project Instructions

This is a React application using TypeScript and Material-UI.

## Code Standards
- Use functional components with hooks
- Prefer async/await over promises
- Use meaningful variable names

## Architecture
- Components in src/components
- Services in src/services
- Utilities in src/utils

@import ./docs/API.md
@import ./docs/DATABASE.md
```

### Import System
- Use `@import` to include other files
- Supports relative and absolute paths
- Maximum import depth: 5 levels
- Circular imports are detected and prevented

## Available Commands

### Tools (via Claude)
- `read_file` - Read file contents
- `write_file` - Write to files
- `list_directory` - List directory contents
- `git_status` - Check git status
- `git_diff` - View changes
- `git_commit` - Create commits
- `get_context` - Get project context
- `search_memories` - Search project memories
- `add_memory` - Add new memories

### Resources (accessible in Claude)
- Project overview
- Project structure
- CLAUDE.md instructions
- Important project files

### Prompts (templates for Claude)
- `project_context` - Full project context
- `code_review` - Code review assistance
- `debug_context` - Debugging help
- `feature_development` - Feature planning
- `refactoring` - Refactoring guidance
## Development

### Running in Development Mode
```bash
npm run dev
```

### Testing
```bash
npm test
```

### Project Structure
```
mcp-project-context/
├── src/
│   ├── index.ts                 # Main server entry
│   ├── discovery/
│   │   └── projectDiscovery.ts  # Project analysis
│   ├── storage/
│   │   └── memoryManager.ts     # Memory persistence
│   ├── context/
│   │   └── contextManager.ts    # Context generation
│   └── handlers/
│       ├── fileHandler.ts       # File operations
│       ├── gitHandler.ts        # Git operations
│       ├── toolHandler.ts       # MCP tools
│       ├── resourceHandler.ts   # MCP resources
│       └── promptHandler.ts     # MCP prompts
├── dist/                         # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## Performance

- **Project Discovery**: <2 seconds for typical repositories
- **Context Loading**: <1 second for cached projects
- **Memory Operations**: <500ms for reads
- **File Operations**: <200ms for metadata
- **Memory Usage**: <200MB for typical projects

## Data Storage

Project memories and preferences are stored locally:
- **Windows**: `%USERPROFILE%\.mcp-project-context\`
- **macOS/Linux**: `~/.mcp-project-context/`

Data includes:
- Project-specific memories
- Knowledge graphs
- User preferences
- Session history

## Security

- All data stored locally (no cloud sync)
- Sensitive file filtering (.env, keys, tokens)
- Read-only by default
- Safe file operation sandboxing

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.

## New Tools Documentation

### read_multiple_files

Read contents of multiple files simultaneously:

```javascript
// Example usage
{
  "tool": "read_multiple_files",
  "arguments": {
    "paths": [
      "src/index.ts",
      "package.json",
      "README.md"
    ]
  }
}
```

**Features:**
- Parallel file reading for better performance
- Error handling for individual files
- Returns both successful and failed reads
- Automatically caches read files in context

### edit_file

Perform surgical text replacements in files:

```javascript
// Example usage
{
  "tool": "edit_file",
  "arguments": {
    "path": "src/app.ts",
    "old_content": "const port = 3000;",
    "new_content": "const port = process.env.PORT || 3000;",
    "expected_replacements": 1  // Optional, default is 1
  }
}
```

**Features:**
- Exact content matching and replacement
- Validation of expected vs actual replacements
- String similarity detection for helpful error messages
- Support for replacing all occurrences (expected_replacements: -1)
- Automatic context update after edits
- Safe operation with rollback on errors

**Use Cases:**
- Code refactoring
- Configuration updates
- Bug fixes with precise targeting
- Batch content updates
