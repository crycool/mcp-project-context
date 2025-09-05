import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ContextManager } from '../context/contextManager.js';
import { FileHandler } from './fileHandler.js';
import { GitHandler } from './gitHandler.js';
import { MemoryManager } from '../storage/memoryManager.js';

export class ToolHandler {
  private server: Server;
  private contextManager: ContextManager;
  private fileHandler: FileHandler;
  private gitHandler: GitHandler;
  private memoryManager: MemoryManager;

  constructor(
    server: Server,
    contextManager: ContextManager,
    fileHandler: FileHandler,
    gitHandler: GitHandler,
    memoryManager: MemoryManager
  ) {
    this.server = server;
    this.contextManager = contextManager;
    this.fileHandler = fileHandler;
    this.gitHandler = gitHandler;
    this.memoryManager = memoryManager;
  }
  async initialize() {
    // Register list tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getToolDefinitions()
    }));

    // Register call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await this.handleToolCall(request.params.name, request.params.arguments || {});
    });
  }

  private getToolDefinitions(): Tool[] {
    return [
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
      },      {
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
        description: 'Edit a file by replacing specific content with new content. Supports surgical text replacements.',
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
      },      {
        name: 'git_status',
        description: 'Get git repository status',
        inputSchema: {
          type: 'object',
          properties: {}
        }
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
      },      {
        name: 'get_context',
        description: 'Get current project context',
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
        name: 'search_memories',
        description: 'Search project memories',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum results', default: 10 }
          },
          required: ['query']
        }
      },
      {
        name: 'add_memory',
        description: 'Add a memory to the project',
        inputSchema: {
          type: 'object',
          properties: {
            type: { 
              type: 'string', 
              enum: ['observation', 'entity', 'relation', 'preference'],
              description: 'Type of memory'
            },
            content: { type: 'object', description: 'Memory content' },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for the memory'
            }
          },
          required: ['type', 'content']
        }
      }
    ];
  }
  private async handleToolCall(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        // File operations
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
                text: `File written successfully: ${args.path}`
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
                text: `Directory created: ${args.path}`
              }
            ]
          };
        
        case 'delete_file':
          await this.fileHandler.deleteFile(args.path);
          return {
            content: [
              {
                type: 'text',
                text: `File deleted: ${args.path}`
              }
            ]
          };
        
        case 'move_file':
          await this.fileHandler.moveFile(args.source, args.destination);
          return {
            content: [
              {
                type: 'text',
                text: `File moved from ${args.source} to ${args.destination}`
              }
            ]
          };
        
        case 'read_multiple_files':
          const filesContent = await this.fileHandler.readMultipleFiles(args.paths);
          const successfulReads = filesContent.filter(f => f.content !== null);
          const failedReads = filesContent.filter(f => f.content === null);
          
          let resultText = '';
          
          // Add successful reads
          if (successfulReads.length > 0) {
            resultText += '=== Successfully read files ===\n\n';
            for (const file of successfulReads) {
              resultText += `File: ${file.path}\n`;
              resultText += '---\n';
              resultText += file.content;
              resultText += '\n\n';
            }
          }
          
          // Add failed reads
          if (failedReads.length > 0) {
            resultText += '=== Failed to read files ===\n\n';
            for (const file of failedReads) {
              resultText += `File: ${file.path}\n`;
              resultText += `Error: ${file.error}\n\n`;
            }
          }
          
          return {
            content: [
              {
                type: 'text',
                text: resultText || 'No files to read'
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
                  ? `✓ ${editResult.message}` 
                  : `✗ ${editResult.message}`
              }
            ],
            isError: !editResult.success
          };
        // Git operations
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
                text: `Files staged: ${Array.isArray(args.files) ? args.files.join(', ') : args.files}`
              }
            ]
          };
        
        case 'git_commit':
          const commitResult = await this.gitHandler.commit(args.message);
          return {
            content: [
              {
                type: 'text',
                text: `Commit created: ${commitResult.commit}`
              }
            ]
          };
        // Context and memory operations
        case 'get_context':
          const context = this.contextManager.generateContext(args.tokenBudget);
          return {
            content: [
              {
                type: 'text',
                text: context
              }
            ]
          };
        
        case 'search_memories':
          const memories = this.memoryManager.searchMemories(args.query, args.limit);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(memories, null, 2)
              }
            ]
          };
        
        case 'add_memory':
          const memoryId = this.memoryManager.addMemory(
            args.type,
            args.content,
            args.tags
          );
          return {
            content: [
              {
                type: 'text',
                text: `Memory added with ID: ${memoryId}`
              }
            ]
          };
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`Error in tool ${name}:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
}
