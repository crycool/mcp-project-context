import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { EnhancedContextManager } from '../context/enhancedContextManager.js';
import { FileHandler } from './fileHandler.js';
import { GitHandler } from './gitHandler.js';
import { FileBasedMemoryManager } from '../storage/fileBasedMemoryManager.js';
import { ConfigToolHandler } from './config/configToolHandler.js';

/**
 * Enhanced Tool Handler with File-Based Memory System
 * 
 * Features:
 * - File-based memory system (CLAUDE.md hierarchy)
 * - Auto-loading documentation in get_context
 * - All memories always available in context (no search needed)
 * - Performance monitoring and statistics
 * - Smart context generation with token budget management
 */
export class EnhancedToolHandler {
  private server: Server;
  private contextManager: EnhancedContextManager;
  private fileHandler: FileHandler;
  private gitHandler: GitHandler;
  private fileBasedMemoryManager: FileBasedMemoryManager;
  private configToolHandler: ConfigToolHandler;

  constructor(
    server: Server,
    contextManager: EnhancedContextManager,
    fileHandler: FileHandler,
    gitHandler: GitHandler,
    fileBasedMemoryManager: FileBasedMemoryManager
  ) {
    this.server = server;
    this.contextManager = contextManager;
    this.fileHandler = fileHandler;
    this.gitHandler = gitHandler;
    this.fileBasedMemoryManager = fileBasedMemoryManager;
    this.configToolHandler = new ConfigToolHandler(server);
  }

  async initialize() {
    console.error('🔧 Initializing Enhanced Tool Handler with file-based memory...');
    
    // Register list tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getEnhancedToolDefinitions()
    }));

    // Register call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await this.handleEnhancedToolCall(request.params.name, request.params.arguments || {});
    });
    
    console.error('✅ Enhanced Tool Handler initialized with file-based memory');
  }

  /**
   * Get enhanced tool definitions with file-based memory features and path management
   */
  private getEnhancedToolDefinitions(): Tool[] {
    // Get config tools from config handler
    const configTools = this.configToolHandler.getConfigToolDefinitions();
    
    // Combine with existing tools
    const coreTools: Tool[] = [
      // ================== FILE-BASED MEMORY TOOLS ==================
      {
        name: 'get_context',
        description: '🚀 Get current project context with file-based memory (all memories always available)',
        inputSchema: {
          type: 'object',
          properties: {
            tokenBudget: { 
              type: 'number', 
              description: 'Maximum tokens for context (default: 25000)',
              default: 25000
            },
            includeDocumentation: {
              type: 'boolean',
              description: 'Auto-load project documentation (CLAUDE.md, README.md, etc.)',
              default: true
            },
            includeFileContent: {
              type: 'boolean',
              description: 'Include key project files content',
              default: true
            }
          }
        }
      },
      {
        name: 'add_memory',
        description: '🧠 Add memory to project CLAUDE.md file (immediately available in context)',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Memory content' },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional tags for organization'
            }
          },
          required: ['content']
        }
      },
      {
        name: 'add_quick_memory',
        description: '💡 Add quick memory note (like Claude Code # syntax)',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Quick memory content' }
          },
          required: ['content']
        }
      },
      {
        name: 'list_recent_memories',
        description: '📋 List recent memory entries from CLAUDE.md files',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of recent entries', default: 10 }
          }
        }
      },
      {
        name: 'get_memory_status',
        description: '📁 Get status of memory files (CLAUDE.md hierarchy)',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'reload_memories',
        description: '🔄 Reload memory files (useful if edited externally)',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      
      // ================== CONTEXT MANAGEMENT ==================
      {
        name: 'get_context_stats',
        description: '📊 Get detailed context generation and performance statistics',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_documentation_status',
        description: '📄 Get status of auto-loaded project documentation',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'clear_context_cache',
        description: '🗑️  Clear context cache to force fresh context generation',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      
      // ================== FILE OPERATIONS ==================
      {
        name: 'read_file',
        description: 'Read the contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file' }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file' },
            content: { type: 'string', description: 'Content to write' }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'list_directory',
        description: 'List contents of a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the directory' }
          },
          required: ['path']
        }
      },
      {
        name: 'create_directory',
        description: 'Create a new directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path for the new directory' }
          },
          required: ['path']
        }
      },
      {
        name: 'delete_file',
        description: 'Delete a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file to delete' }
          },
          required: ['path']
        }
      },
      {
        name: 'move_file',
        description: 'Move or rename a file',
        inputSchema: {
          type: 'object',
          properties: {
            source: { type: 'string', description: 'Source path' },
            destination: { type: 'string', description: 'Destination path' }
          },
          required: ['source', 'destination']
        }
      },
      {
        name: 'read_multiple_files',
        description: 'Read contents of multiple files at once',
        inputSchema: {
          type: 'object',
          properties: {
            paths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of file paths to read'
            }
          },
          required: ['paths']
        }
      },
      {
        name: 'edit_file',
        description: 'Edit a file by replacing specific content with new content',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file to edit' },
            old_content: { type: 'string', description: 'Exact content to replace' },
            new_content: { type: 'string', description: 'New content to insert' },
            expected_replacements: { 
              type: 'number', 
              description: 'Number of expected replacements (default: 1, use -1 for all)',
              default: 1
            }
          },
          required: ['path', 'old_content', 'new_content']
        }
      },
      
      // ================== CODE SEARCH ==================
      {
        name: 'search_code',
        description: 'Search for code patterns in project files',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Search pattern (text or regex)' },
            directory: { type: 'string', description: 'Directory to search in' },
            filePattern: { type: 'string', description: 'File glob pattern' },
            excludePatterns: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Patterns to exclude'
            },
            caseSensitive: { type: 'boolean', default: false },
            regex: { type: 'boolean', default: false },
            contextLines: { type: 'number', default: 2 },
            maxResults: { type: 'number', default: 100 }
          },
          required: ['pattern']
        }
      },
      {
        name: 'search_symbols',
        description: 'Search for symbol definitions',
        inputSchema: {
          type: 'object',
          properties: {
            symbolName: { type: 'string', description: 'Symbol name to search for' },
            filePattern: { type: 'string', description: 'File pattern to search in' }
          },
          required: ['symbolName']
        }
      },
      {
        name: 'search_todos',
        description: 'Search for TODO/FIXME/NOTE comments',
        inputSchema: {
          type: 'object',
          properties: {
            includeNotes: { type: 'boolean', default: false }
          }
        }
      },
      
      // ================== GIT OPERATIONS ==================
      {
        name: 'git_status',
        description: 'Get git repository status',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'git_diff',
        description: 'Get git diff of changes',
        inputSchema: {
          type: 'object',
          properties: {
            staged: { type: 'boolean', default: false }
          }
        }
      },
      {
        name: 'git_add',
        description: 'Stage files for commit',
        inputSchema: {
          type: 'object',
          properties: {
            files: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'File(s) to stage'
            }
          },
          required: ['files']
        }
      },
      {
        name: 'git_commit',
        description: 'Create a git commit',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Commit message' }
          },
          required: ['message']
        }
      }
    ];
    
    // Combine config tools with core tools
    return [...configTools, ...coreTools];
  }

  /**
   * Handle enhanced tool calls with file-based memory
   */
  private async handleEnhancedToolCall(name: string, args: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      console.error(`🔧 Tool call: ${name}`);
      
      // Check if it's a config tool first
      const configToolNames = [
        'get_mcp_config', 'set_mcp_config', 'reset_mcp_config',
        'get_working_directory', 'set_working_directory', 'validate_paths',
        'fix_path_issues', 'debug_path_resolution', 'trace_working_directory',
        'get_path_stats', 'emergency_reset'
      ];
      
      if (configToolNames.includes(name)) {
        const configResult = await this.configToolHandler.handleConfigToolCall(name, args);
        
        // Wrap config tool result in MCP response format
        return {
          content: [
            {
              type: 'text',
              text: typeof configResult === 'object' ? 
                    JSON.stringify(configResult, null, 2) : 
                    String(configResult)
            }
          ],
          isError: configResult?.error ? true : false
        };
      }
      
      switch (name) {
        // ================== FILE-BASED MEMORY TOOLS ==================
        case 'get_context':
          return await this.handleGetContext(args);
        
        case 'add_memory':
          return await this.handleAddMemory(args);
        
        case 'add_quick_memory':
          return await this.handleAddQuickMemory(args);
        
        case 'list_recent_memories':
          return await this.handleListRecentMemories(args);
        
        case 'get_memory_status':
          return await this.handleGetMemoryStatus();
        
        case 'reload_memories':
          return await this.handleReloadMemories();
        
        // ================== CONTEXT MANAGEMENT ==================
        case 'get_context_stats':
          return await this.handleGetContextStats();
        
        case 'get_documentation_status':
          return await this.handleGetDocumentationStatus();
        
        case 'clear_context_cache':
          return await this.handleClearContextCache();
        
        // ================== FILE OPERATIONS ==================
        case 'read_file':
          return await this.handleReadFile(args);
        
        case 'write_file':
          return await this.handleWriteFile(args);
        
        case 'list_directory':
          return await this.handleListDirectory(args);
        
        case 'create_directory':
          return await this.handleCreateDirectory(args);
        
        case 'delete_file':
          return await this.handleDeleteFile(args);
        
        case 'move_file':
          return await this.handleMoveFile(args);
        
        case 'read_multiple_files':
          return await this.handleReadMultipleFiles(args);
        
        case 'edit_file':
          return await this.handleEditFile(args);
        
        case 'search_code':
          return await this.handleSearchCode(args);
        
        case 'search_symbols':
          return await this.handleSearchSymbols(args);
        
        case 'search_todos':
          return await this.handleSearchTodos(args);
        
        // ================== GIT OPERATIONS ==================
        case 'git_status':
          return await this.handleGitStatus();
        
        case 'git_diff':
          return await this.handleGitDiff(args);
        
        case 'git_add':
          return await this.handleGitAdd(args);
        
        case 'git_commit':
          return await this.handleGitCommit(args);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Tool ${name} failed in ${duration}ms:`, error);
      
      return {
        content: [
          {
            type: 'text',
            text: `❌ Error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }

  // ================== FILE-BASED MEMORY IMPLEMENTATIONS ==================

  private async handleGetContext(args: any): Promise<any> {
    const context = await this.contextManager.generateEnhancedContext({
      tokenBudget: args.tokenBudget || 25000,
      includeDocumentation: args.includeDocumentation !== false,
      includeFileContent: args.includeFileContent !== false
    });
    
    this.contextManager.updateContext('context_generated', {
      tokenBudget: args.tokenBudget
    });
    
    return {
      content: [
        {
          type: 'text',
          text: context
        }
      ]
    };
  }

  private async handleAddMemory(args: any): Promise<any> {
    const result = await this.contextManager.addMemory(
      args.content,
      args.tags || []
    );
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ ${result}\n\n💡 Memory is immediately available in context. Use get_context to see it.`
        }
      ]
    };
  }

  private async handleAddQuickMemory(args: any): Promise<any> {
    const result = await this.contextManager.addQuickMemory(args.content);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ ${result}\n\n💡 Quick memory added and immediately available in context.`
        }
      ]
    };
  }

  private async handleListRecentMemories(args: any): Promise<any> {
    const recentMemories = this.contextManager.getRecentMemories(args.limit || 10);
    
    return {
      content: [
        {
          type: 'text',
          text: `📋 **Recent Memory Entries:**\n\n${recentMemories}`
        }
      ]
    };
  }

  private async handleGetMemoryStatus(): Promise<any> {
    const status = this.contextManager.getMemoryStatus();
    
    return {
      content: [
        {
          type: 'text',
          text: status
        }
      ]
    };
  }

  private async handleReloadMemories(): Promise<any> {
    await this.contextManager.reloadMemories();
    
    return {
      content: [
        {
          type: 'text',
          text: `🔄 Memory files reloaded successfully!\n\nAll CLAUDE.md files have been refreshed and are available in context.`
        }
      ]
    };
  }

  private async handleGetContextStats(): Promise<any> {
    const performanceReport = this.contextManager.getPerformanceReport();
    
    return {
      content: [
        {
          type: 'text',
          text: performanceReport
        }
      ]
    };
  }

  private async handleGetDocumentationStatus(): Promise<any> {
    const context = this.contextManager.getContext();
    const docResult = context.documentation;
    
    let statusText = `📄 **Project Documentation Status**\n`;
    statusText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    if (docResult.loadedDocs.length > 0) {
      statusText += `✅ **Auto-loaded Documents (${docResult.loadedDocs.length}):**\n`;
      for (const doc of docResult.loadedDocs) {
        statusText += `   • ${doc}\n`;
      }
      statusText += `\n`;
    }
    
    if (docResult.skippedDocs.length > 0) {
      statusText += `⏭️ **Skipped Documents (${docResult.skippedDocs.length}):**\n`;
      for (const doc of docResult.skippedDocs) {
        statusText += `   • ${doc} (exceeded token budget)\n`;
      }
      statusText += `\n`;
    }
    
    statusText += `🧮 **Token Usage:**\n`;
    statusText += `   • Documentation Tokens: ${docResult.totalTokens.toLocaleString()}\n`;
    statusText += `   • Available in Context: ${docResult.documents.length > 0 ? '✅ Yes' : '❌ No'}\n`;
    
    statusText += `\n💡 **Tips:**\n`;
    statusText += `• Documentation is automatically loaded with get_context\n`;
    statusText += `• Higher priority files (CLAUDE.md) are loaded first\n`;
    statusText += `• Token budget can be adjusted in get_context options`;
    
    return {
      content: [
        {
          type: 'text',
          text: statusText
        }
      ]
    };
  }

  private async handleClearContextCache(): Promise<any> {
    this.contextManager.clearCache();
    
    return {
      content: [
        {
          type: 'text',
          text: `🗑️  **Context Cache Cleared Successfully**\n\n` +
              `The following caches have been cleared:\n` +
              `• Context generation cache\n` +
              `• File content cache\n` +
              `• Recent files list\n\n` +
              `Next get_context call will be freshly generated.`
        }
      ]
    };
  }

  // ================== FILE OPERATIONS (keep existing) ==================

  private async handleReadFile(args: any): Promise<any> {
    const content = await this.fileHandler.readFile(args.path);
    this.contextManager.updateContext('file_read', { path: args.path });
    
    return {
      content: [
        {
          type: 'text',
          text: content
        }
      ]
    };
  }

  private async handleWriteFile(args: any): Promise<any> {
    await this.fileHandler.writeFile(args.path, args.content);
    this.contextManager.updateContext('file_written', { path: args.path });
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ File written successfully: ${args.path}`
        }
      ]
    };
  }

  private async handleListDirectory(args: any): Promise<any> {
    const entries = await this.fileHandler.listDirectory(args.path);
    
    return {
      content: [
        {
          type: 'text',
          text: entries.join('\n')
        }
      ]
    };
  }

  private async handleCreateDirectory(args: any): Promise<any> {
    await this.fileHandler.createDirectory(args.path);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Directory created: ${args.path}`
        }
      ]
    };
  }

  private async handleDeleteFile(args: any): Promise<any> {
    await this.fileHandler.deleteFile(args.path);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ File deleted: ${args.path}`
        }
      ]
    };
  }

  private async handleMoveFile(args: any): Promise<any> {
    await this.fileHandler.moveFile(args.source, args.destination);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ File moved from ${args.source} to ${args.destination}`
        }
      ]
    };
  }

  private async handleReadMultipleFiles(args: any): Promise<any> {
    const filesContent = await this.fileHandler.readMultipleFiles(args.paths);
    
    const successfulReads = filesContent.filter(f => f.content !== null);
    const failedReads = filesContent.filter(f => f.content === null);
    
    let readResultText = '';
    
    if (successfulReads.length > 0) {
      readResultText += '=== Successfully read files ===\n\n';
      for (const file of successfulReads) {
        readResultText += `File: ${file.path}\n---\n${file.content}\n\n`;
      }
    }
    
    if (failedReads.length > 0) {
      readResultText += '=== Failed to read files ===\n\n';
      for (const file of failedReads) {
        readResultText += `File: ${file.path}\nError: ${file.error}\n\n`;
      }
    }
    
    return {
      content: [
        {
          type: 'text',
          text: readResultText || 'No files to read'
        }
      ]
    };
  }

  private async handleEditFile(args: any): Promise<any> {
    const editResult = await this.fileHandler.editFile(
      args.path,
      args.old_content,
      args.new_content,
      args.expected_replacements || 1
    );
    
    return {
      content: [
        {
          type: 'text',
          text: editResult.success ? `✅ ${editResult.message}` : `❌ ${editResult.message}`
        }
      ],
      isError: !editResult.success
    };
  }

  private async handleSearchCode(args: any): Promise<any> {
    const projectInfo = this.contextManager.getProjectInfo();
    const path = await import('path');
    
    const searchOptions = {
      pattern: args.pattern,
      directory: args.directory || projectInfo?.root || process.cwd(),
      filePattern: args.filePattern,
      excludePatterns: args.excludePatterns,
      caseSensitive: args.caseSensitive || false,
      regex: args.regex || false,
      contextLines: args.contextLines ?? 2,
      maxResults: args.maxResults || 100,
      includeHidden: false,
      followSymlinks: false
    };
    
    const searchResults = await this.fileHandler.searchCode(searchOptions);
    
    let searchResultText = `🔍 Search Results\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    searchResultText += `Pattern: "${args.pattern}"${args.regex ? ' (regex)' : ''}\n`;
    searchResultText += `Files searched: ${searchResults.totalFiles}\n`;
    searchResultText += `Files with matches: ${searchResults.matchedFiles}\n`;
    searchResultText += `Total matches: ${searchResults.totalMatches}\n`;
    searchResultText += `Search time: ${searchResults.searchTime}ms\n`;
    searchResultText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (searchResults.results.length > 0) {
      for (const result of searchResults.results) {
        const relativePath = path.relative(searchOptions.directory, result.file);
        searchResultText += `📄 ${relativePath}:${result.line}:${result.column}\n`;
        
        if (result.context?.before?.length) {
          result.context.before.forEach(line => {
            searchResultText += `   │ ${line}\n`;
          });
        }
        
        searchResultText += ` ► │ ${result.match}\n`;
        
        if (result.context?.after?.length) {
          result.context.after.forEach(line => {
            searchResultText += `   │ ${line}\n`;
          });
        }
        
        searchResultText += '\n';
      }
    } else {
      searchResultText += 'No matches found.\n';
    }
    
    return {
      content: [
        {
          type: 'text',
          text: searchResultText
        }
      ]
    };
  }

  private async handleSearchSymbols(args: any): Promise<any> {
    const path = await import('path');
    const symbolResults = await this.fileHandler.searchSymbols(
      args.symbolName,
      args.filePattern
    );
    
    let symbolText = `🔎 Symbol Search: "${args.symbolName}"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    symbolText += `Found ${symbolResults.length} definition(s)\n\n`;
    
    for (const result of symbolResults) {
      const relativePath = path.relative(process.cwd(), result.file);
      symbolText += `📍 ${relativePath}:${result.line}\n   ${result.match}\n\n`;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: symbolText || 'No symbols found.'
        }
      ]
    };
  }

  private async handleSearchTodos(args: any): Promise<any> {
    const todoResults = await this.fileHandler.searchTodos(args.includeNotes);
    
    let todoText = `📝 TODO/FIXME Search\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    todoText += `Found ${todoResults.length} item(s)\n\n`;
    
    const todosByType: Record<string, typeof todoResults> = {};
    
    for (const result of todoResults) {
      const match = result.match.match(/\b(TODO|FIXME|XXX|HACK|BUG|NOTE|INFO|WARNING)\b/i);
      if (match) {
        const type = match[1].toUpperCase();
        if (!todosByType[type]) {
          todosByType[type] = [];
        }
        todosByType[type].push(result);
      }
    }
    
    for (const [type, items] of Object.entries(todosByType)) {
      const emoji = {
        TODO: '📌', FIXME: '🔧', BUG: '🐛', HACK: '⚡',
        XXX: '⚠️', NOTE: '📝', INFO: 'ℹ️', WARNING: '⚠️'
      }[type] || '•';
      
      todoText += `\n${emoji} ${type} (${items.length})\n${'─'.repeat(30)}\n`;
      
      for (const item of items) {
        const path = await import('path');
        const relativePath = path.relative(process.cwd(), item.file);
        todoText += `  ${relativePath}:${item.line}\n    ${item.match}\n`;
      }
    }
    
    return {
      content: [
        {
          type: 'text',
          text: todoText
        }
      ]
    };
  }

  private async handleGitStatus(): Promise<any> {
    const status = await this.gitHandler.getStatus();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(status, null, 2)
        }
      ]
    };
  }

  private async handleGitDiff(args: any): Promise<any> {
    const diff = await this.gitHandler.getDiff(args.staged);
    
    return {
      content: [
        {
          type: 'text',
          text: diff || 'No changes'
        }
      ]
    };
  }

  private async handleGitAdd(args: any): Promise<any> {
    await this.gitHandler.addFiles(args.files);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Files staged: ${Array.isArray(args.files) ? args.files.join(', ') : args.files}`
        }
      ]
    };
  }

  private async handleGitCommit(args: any): Promise<any> {
    const commitResult = await this.gitHandler.commit(args.message);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Commit created: ${commitResult.commit}`
        }
      ]
    };
  }
}
