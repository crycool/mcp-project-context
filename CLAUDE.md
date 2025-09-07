# Project Memory

This file contains project-specific memories and context for the MCP Project Context Manager.

## 2025-09-07T05:30:00Z
🚀 **Major Implementation Completed:** Transitioned from complex database-based memory system to Claude Code-like file-based memory system.
**Tags:** architecture, file-based, claude-code, implementation

## Key Architecture Changes
💡 **Quick Note:** The memory system now works exactly like Claude Code:
- All memories stored in CLAUDE.md files
- Hierarchical loading: Enterprise > Project > User > Local
- No search required - memories always in context
- @import system for file references
- Immediate availability after adding

## Implementation Details
- FileBasedMemoryManager replaces MemoryManager
- Direct file operations instead of complex database
- Markdown-based storage for human readability
- Token-efficient context generation

## Performance Improvements
✅ Eliminated search dependencies
✅ Reduced complexity from 500+ lines to simple file operations
✅ Guaranteed memory access (no search failures)
✅ Better Claude Code compatibility

## Next Steps
- [ ] Test the new file-based system
- [ ] Update documentation
- [ ] Create example CLAUDE.md templates
- [ ] Add file watching for external edits

## 2025-09-07T10:04:08.913Z
## Working Directory Fix Applied

**Problem:** MCP tool was starting in Claude's exe directory instead of actual project directory
**Solution:** Enhanced working directory detection with environment variables and auto-correction

### Configuration:
- Claude Desktop config now includes PROJECT_ROOT environment variable
- Tool automatically detects and switches to C:\teamvoicechat
- Falls back to git repository detection if env var not set

### Files Modified:
- `src/enhancedIndex.ts` - Enhanced determineWorkingDirectory() method
- `src/utils/workingDirectoryFix.js` - New utility for directory management
- `claude_desktop_config.json` - Added PROJECT_ROOT env variable

**Status:** ✅ Fixed and ready for testing
**Tags:** working-directory, mcp-fix, configuration


## 2025-09-07T10:14:40.169Z
## Search Enhancement Completed

**Improvement:** search_code now searches ALL text-based files, not just code files

### Changes Made:
- Removed `.svg` from binary exclusions (it's text-based XML)
- Added more binary formats to exclusion list
- Now searches in: code, configs, markdown, json, yaml, xml, env, scripts, logs, etc.
- Enhanced symbol search to include more programming languages
- Added more TODO patterns (IMPORTANT, TIP, HINT)

### Files Modified:
- `src/search/codeSearcher.ts` - Enhanced filtering logic

**Status:** ✅ Ready for compilation and testing
**Tags:** search-enhancement, all-files, mcp-improvement

