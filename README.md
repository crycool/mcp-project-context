# MCP Project Context Manager v3.0

A powerful Model Context Protocol (MCP) server that provides Claude Desktop with advanced path management, configuration system, file-based persistent memory, and comprehensive project context capabilities.

## 🚀 Key Features v3.0

### 🔧 **Advanced Path Management System**
- **Desktop Commander-like Configuration**: Runtime config changes, persistent settings
- **Centralized Path Manager**: All path operations with auto-correction and validation
- **Path Recovery System**: Automatic recovery from path-related failures
- **Emergency Reset**: Complete system restore to safe, working state
- **Working Directory Auto-Detection**: Smart project root detection

### 🧠 **File-Based Memory System (Claude Code-like)**
- **Hierarchical CLAUDE.md files** for persistent memory storage
- **Always in context** - no search required, memories are immediately available
- **@import system** for including external files
- **Memory hierarchy**: Enterprise > Project > User > Local

### 🔍 **Enhanced Search Capabilities**
- **Search ALL text files** - not just code files
- Includes: `.md`, `.json`, `.yaml`, `.xml`, `.env`, `.txt`, `.log`, `.csv`, `.html`, `.css`, `.svg`
- Advanced pattern matching with regex support
- Context lines for better understanding
- Symbol search across multiple languages
- TODO/FIXME comment tracking

### 📁 **Smart Working Directory Management**
- **Automatic project root detection** - handles Claude Desktop's exe folder issue
- Environment variable support (`PROJECT_ROOT`, `MCP_PROJECT_ROOT`)
- Git repository detection with auto-navigation
- Automatic `process.chdir()` to correct directory
- Safety checks prevent dangerous directory operations

### 🛠 Comprehensive Tool Set
- **File Operations**: read, write, edit, delete, move, create directories
- **Multi-file Operations**: read multiple files simultaneously
- **Git Integration**: status, diff, add, commit
- **Search Tools**: code search, symbol search, TODO search
- **Memory Management**: add memories, list recent memories, reload memories
- **🆕 Configuration Tools**: get/set config, validate paths, debug path resolution
- **🆕 Path Management Tools**: working directory management, path validation, auto-fix
- **🆕 Debug Tools**: trace working directory, get path stats, emergency reset

## 📦 Installation

1. **Clone the repository:**
```bash
cd C:\
git clone <repository-url> mcp-project-context
cd mcp-project-context
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the project:**
```bash
npm run build
```

## ⚙️ Configuration

Add to your Claude Desktop configuration file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux:** `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "project-context": {
      "command": "node",
      "args": ["C:\\mcp-project-context\\dist\\enhancedIndex.js"],
      "env": {
        "PROJECT_ROOT": "C:\\your-project-directory",
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Configuration Notes:
- **PROJECT_ROOT**: Specify your project directory (tool auto-detects if not set)
- **enhancedIndex.js**: The enhanced version with all new features
- Tool automatically handles working directory issues

## 📝 CLAUDE.md Memory System

Create `CLAUDE.md` files in your project for persistent memory:

### Root CLAUDE.md Example
```markdown
# Project Memory

## Project Standards
- Use TypeScript with strict mode
- Follow ESLint configuration
- Write tests for all features

## Architecture Notes
- Frontend: React + TypeScript
- Backend: Node.js + Express
- Database: PostgreSQL

## Recent Decisions
- 2025-01-07: Migrated to file-based memory system
- 2025-01-06: Added WebRTC for video chat

@import ./docs/API.md
@import ./docs/DATABASE.md
```

### Memory Hierarchy
1. **Enterprise**: `C:\CLAUDE.md` - Organization-wide knowledge
2. **Project**: `C:\project\CLAUDE.md` - Project-specific information
3. **User**: `%USERPROFILE%\CLAUDE.md` - Personal preferences
4. **Local**: `.\CLAUDE.md` - Current directory context

## 🔧 Available Tools

### File Operations
- `read_file` - Read single file
- `read_multiple_files` - Read multiple files at once
- `write_file` - Write content to file
- `edit_file` - **ENHANCED** Smart text replacement with 5 strategies
  - **EXACT**: Traditional exact match (default)
  - **FUZZY**: Handles whitespace/formatting differences
  - **SECTION**: Edit between headers (perfect for markdown/docs)
  - **LINES**: Edit specific line ranges
  - **PATTERN**: Regex-based replacements
  - **BETWEEN**: Edit content between markers
- `delete_file` - Delete files
- `move_file` - Move or rename files
- `create_directory` - Create new directories
- `list_directory` - List directory contents

### Search Tools (Enhanced)
- `search_code` - Search in ALL text files (not just code)
  - Pattern matching (text or regex)
  - File type filtering
  - Context lines
  - Gitignore respect
- `search_symbols` - Find function/class definitions
- `search_todos` - Find TODO/FIXME/NOTE comments

### Git Operations
- `git_status` - Check repository status
- `git_diff` - View changes
- `git_add` - Stage files
- `git_commit` - Create commits

### Memory & Context
- `get_context` - Get project context with memory
- `add_memory` - Add to CLAUDE.md
- `add_quick_memory` - Quick note (like # in Claude Code)
- `list_recent_memories` - Show recent memory entries
- `get_memory_status` - Check memory file status
- `reload_memories` - Reload if edited externally

## 💡 Usage Examples

### Adding Memory
```javascript
// Add important project decision
add_memory("Decided to use WebSockets for real-time updates", ["architecture", "websocket"])
```

### Enhanced Search
```javascript
// Search in ALL files including configs, docs, etc.
search_code({
  pattern: "API_KEY",
  contextLines: 2
})
// Now finds matches in .env, .json, .yaml, etc.!
```

### Smart Edit Examples
```javascript
// 1. FUZZY - Handles whitespace differences
edit_file("README.md", "## Configuration", "## Setup", { 
  strategy: "fuzzy" 
})

// 2. SECTION - Edit markdown sections
edit_file("README.md", 
  { sectionStart: "## Configuration", sectionEnd: "## Usage" }, 
  "New configuration content...", 
  { strategy: "section" }
)

// 3. LINES - Edit specific lines
edit_file("app.js", 
  { startLine: 10, endLine: 15 }, 
  "// New code here", 
  { strategy: "lines" }
)

// 4. PATTERN - Regex replacements
edit_file("*.js", 
  { pattern: /console\.log\(/g }, 
  "logger.debug(", 
  { strategy: "pattern" }
)

// 5. BETWEEN - Edit between markers
edit_file("template.html", 
  { 
    startMarker: "<!-- BEGIN CONTENT -->", 
    endMarker: "<!-- END CONTENT -->" 
  }, 
  "<div>New content</div>", 
  { strategy: "between" }
)
```

### Reading Multiple Files
```javascript
read_multiple_files({
  paths: ["package.json", "README.md", ".env"]
})
```

## 📊 Performance

- **Working Directory Detection**: <100ms
- **Memory Loading**: Instant (always in context)
- **Search Operations**: <500ms for typical projects
- **Multi-file Read**: Parallel processing
- **Context Generation**: <1 second with caching

## 🗂 Project Structure

```
mcp-project-context/
├── src/
│   ├── enhancedIndex.ts         # Main enhanced server
│   ├── discovery/                # Project analysis
│   ├── storage/
│   │   └── fileBasedMemoryManager.ts  # File-based memory
│   ├── context/
│   │   └── enhancedContextManager.ts  # Enhanced context
│   ├── search/
│   │   └── codeSearcher.ts      # Enhanced search (all files)
│   ├── handlers/                 # MCP handlers
│   └── utils/
│       └── workingDirectoryFix.js  # Auto directory detection
├── dist/                         # Compiled output
├── CLAUDE.md                     # Project memory
└── README.md
```

## 🔐 Security & Privacy

- All data stored locally (no cloud sync)
- Sensitive file filtering
- Binary file exclusion
- Gitignore respect
- Safe file operations

## 🐛 Troubleshooting

### Working Directory Issues
If the tool starts in wrong directory:
1. Set `PROJECT_ROOT` environment variable in config
2. Tool auto-detects git repositories
3. Check logs for directory detection

### Memory Not Loading
1. Ensure CLAUDE.md exists in project root
2. Check file permissions
3. Use `reload_memories` tool

### Search Not Finding Files
1. Check if file type is in binary exclusion list
2. Verify file is not gitignored
3. Use specific file patterns

## 📈 Recent Improvements

### Version 2.1.0 (January 2025)
- ✅ **Smart Edit System**: 5 powerful editing strategies
  - Fuzzy matching for whitespace tolerance
  - Section-based editing for documentation
  - Line range editing for precise changes
  - Pattern/regex support for bulk replacements
  - Between markers for template editing
- ✅ Enhanced error messages with similarity detection
- ✅ Backup support for safe editing
- ✅ Diff statistics for change tracking

### Version 2.0.0 (January 2025)
- ✅ File-based memory system (replaced database)
- ✅ Enhanced search for ALL text files
- ✅ Working directory auto-detection
- ✅ Multi-file read operations
- ✅ Surgical file editing

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT

## 🆘 Support

For issues and questions, please open an issue on GitHub.