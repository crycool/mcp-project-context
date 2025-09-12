import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';
import { ContextManager } from '../context/contextManager.js';
import { FileHandler } from './fileHandler.js';
import { GitHandler } from './gitHandler.js';

export class ToolHandler {
  private server: Server;
  private contextManager: ContextManager;
  private fileHandler: FileHandler;
  private gitHandler: GitHandler;

  constructor(
    server: Server,
    contextManager: ContextManager,
    fileHandler: FileHandler,
    gitHandler: GitHandler
  ) {
    this.server = server;
    this.contextManager = contextManager;
    this.fileHandler = fileHandler;
    this.gitHandler = gitHandler;
  }

  async initialize() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getToolDefinitions()
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await this.handleToolCall(request.params.name, request.params.arguments || {});
    });
  }

  private getToolDefinitions(): Tool[] {
    return [
      // =============== CORE CONTEXT AND MEMORY ===============
      {
        name: 'get_context',
        description: 'Get current project context with file-based memory (always available, no search needed)',
        inputSchema: {
          type: 'object',
          properties: {
            tokenBudget: { 
              type: 'number', 
              description: 'Maximum tokens for context',
              default: 25000
            }
          }
        }
      },
      {
        name: 'add_memory',
        description: 'Add memory to project CLAUDE.md file (immediately available in context)',
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
        description: 'Add quick memory note (like Claude Code # syntax)',
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
        description: 'List recent memory entries from CLAUDE.md files',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of recent entries', default: 10 }
          }
        }
      },
      {
        name: 'get_memory_status',
        description: 'Get status of memory files (CLAUDE.md hierarchy)',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },

      // =============== FILE OPERATIONS ===============
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

      // =============== CODE SEARCH ===============
      {
        name: 'search_code',
        description: '🔍 Search for code patterns in project files (FIXED: Now handles relative paths and nested directories properly)',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Search pattern (text or regex)' },
            directory: { 
              type: 'string', 
              description: 'Directory to search in. Relative paths (e.g. "Assets/Scripts") resolve to project root, not MCP server root'
            },
            filePattern: { 
              type: 'string', 
              description: 'File glob pattern. Use "**/*.cs" for recursive search, "*.cs" for direct files only. Auto-detects for script directories.'
            },
            excludePatterns: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Patterns to exclude from search'
            },
            caseSensitive: { type: 'boolean', description: 'Case sensitive search', default: false },
            regex: { type: 'boolean', description: 'Treat pattern as regex', default: false },
            contextLines: { type: 'number', description: 'Number of context lines around matches', default: 2 },
            maxResults: { type: 'number', description: 'Maximum results to return', default: 100 }
          },
          required: ['pattern']
        }
      },
      {
        name: 'search_symbols',
        description: 'Search for symbol definitions (functions, classes, variables)',
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
        description: 'Search for TODO/FIXME/NOTE comments in code',
        inputSchema: {
          type: 'object',
          properties: {
            includeNotes: { type: 'boolean', description: 'Include NOTE/INFO/WARNING comments', default: false }
          }
        }
      },

      // =============== GIT OPERATIONS ===============
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
            staged: { type: 'boolean', description: 'Show staged changes', default: false }
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
  }

  private async handleToolCall(name: string, args: any): Promise<any> {
    try {
      console.error(`🔧 Tool call: ${name}`);
      
      switch (name) {
        // =============== CORE CONTEXT AND MEMORY ===============
        case 'get_context':
          return {
            content: [
              {
                type: 'text',
                text: this.contextManager.generateContext(args.tokenBudget || 25000)
              }
            ]
          };
        
        case 'add_memory':
          const result = await this.contextManager.addMemory(args.content, args.tags || []);
          return {
            content: [
              {
                type: 'text',
                text: `✅ ${result}\n\n💡 Memory is immediately available in context. Use get_context to see it.`
              }
            ]
          };
        
        case 'add_quick_memory':
          const quickResult = await this.contextManager.addQuickMemory(args.content);
          return {
            content: [
              {
                type: 'text',
                text: `✅ ${quickResult}\n\n💡 Quick memory added and immediately available in context.`
              }
            ]
          };
        
        case 'list_recent_memories':
          const recentMemories = this.contextManager.getRecentMemories(args.limit || 10);
          return {
            content: [
              {
                type: 'text',
                text: `📋 **Recent Memory Entries:**\n\n${recentMemories}`
              }
            ]
          };
        
        case 'get_memory_status':
          const memoryStatus = this.contextManager.getMemoryStatus();
          return {
            content: [
              {
                type: 'text',
                text: memoryStatus
              }
            ]
          };

        // =============== FILE OPERATIONS ===============
        case 'read_file':
          return {
            content: [
              {
                type: 'text',
                text: await this.fileHandler.readFile(args.path)
              }
            ]
          };
        
        case 'write_file':
          await this.fileHandler.writeFile(args.path, args.content);
          return {
            content: [
              {
                type: 'text',
                text: `✅ File written successfully: ${args.path}`
              }
            ]
          };
        
        case 'list_directory':
          const entries = await this.fileHandler.listDirectory(args.path);
          return {
            content: [
              {
                type: 'text',
                text: entries.join('\n')
              }
            ]
          };
        
        case 'create_directory':
          await this.fileHandler.createDirectory(args.path);
          return {
            content: [
              {
                type: 'text',
                text: `✅ Directory created: ${args.path}`
              }
            ]
          };
        
        case 'delete_file':
          await this.fileHandler.deleteFile(args.path);
          return {
            content: [
              {
                type: 'text',
                text: `✅ File deleted: ${args.path}`
              }
            ]
          };
        
        case 'move_file':
          await this.fileHandler.moveFile(args.source, args.destination);
          return {
            content: [
              {
                type: 'text',
                text: `✅ File moved from ${args.source} to ${args.destination}`
              }
            ]
          };
        
        case 'read_multiple_files':
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
        
        case 'edit_file':
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
                text: editResult.success 
                  ? `✅ ${editResult.message}` 
                  : `❌ ${editResult.message}`
              }
            ],
            isError: !editResult.success
          };

        // =============== CODE SEARCH ===============
        case 'search_code':
          const projectInfo = this.contextManager.getProjectInfo();
          const projectRoot = projectInfo?.root || process.cwd();
          
          // FIX #1: Proper directory resolution
          // If directory is relative, resolve it relative to PROJECT ROOT, not MCP server root
          let searchDirectory = args.directory || projectRoot;
          if (!path.isAbsolute(searchDirectory)) {
            searchDirectory = path.resolve(projectRoot, searchDirectory);
            console.error(`🔧 Resolved relative directory: ${args.directory} → ${searchDirectory}`);
          }
          
          // FIX #2: Smart file pattern defaulting
          // If user specifies a directory like "Assets/Scripts", make file pattern recursive by default
          let filePattern = args.filePattern;
          if (!filePattern && searchDirectory.includes('Scripts')) {
            filePattern = '**/*.cs'; // Default to recursive CS search for script directories
            console.error(`🔧 Auto-detected script directory, using recursive pattern: ${filePattern}`);
          }
          
          const searchOptions = {
            pattern: args.pattern,
            directory: searchDirectory,
            filePattern: filePattern,
            excludePatterns: args.excludePatterns,
            caseSensitive: args.caseSensitive || false,
            regex: args.regex || false,
            contextLines: args.contextLines ?? 2,
            maxResults: args.maxResults || 100,
            includeHidden: args.includeHidden || false,
            followSymlinks: args.followSymlinks || false
          };
          
          console.error(`🔍 Search executing with options:`, {
            pattern: searchOptions.pattern,
            directory: searchOptions.directory,
            filePattern: searchOptions.filePattern
          });
          
          const searchResults = await this.fileHandler.searchCode(searchOptions);
          
          let searchResultText = `🔍 Search Results\n`;
          searchResultText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
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
        
        case 'search_symbols':
          const symbolResults = await this.fileHandler.searchSymbols(
            args.symbolName,
            args.filePattern
          );
          
          let symbolText = `🔎 Symbol Search: "${args.symbolName}"\n`;
          symbolText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
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
        
        case 'search_todos':
          const todoResults = await this.fileHandler.searchTodos(args.includeNotes);
          
          let todoText = `📝 TODO/FIXME Search\n`;
          todoText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
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

        // =============== GIT OPERATIONS ===============
        case 'git_status':
          const status = await this.gitHandler.getStatus();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(status, null, 2)
              }
            ]
          };
        
        case 'git_diff':
          const diff = await this.gitHandler.getDiff(args.staged);
          return {
            content: [
              {
                type: 'text',
                text: diff || 'No changes'
              }
            ]
          };
        
        case 'git_add':
          await this.gitHandler.addFiles(args.files);
          return {
            content: [
              {
                type: 'text',
                text: `✅ Files staged: ${Array.isArray(args.files) ? args.files.join(', ') : args.files}`
              }
            ]
          };
        
        case 'git_commit':
          const commitResult = await this.gitHandler.commit(args.message);
          return {
            content: [
              {
                type: 'text',
                text: `✅ Commit created: ${commitResult.commit}`
              }
            ]
          };
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`❌ Tool ${name} failed:`, error);
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
}
