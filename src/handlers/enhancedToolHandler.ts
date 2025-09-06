import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { EnhancedContextManager } from '../context/enhancedContextManager.js';
import { FileHandler } from './fileHandler.js';
import { GitHandler } from './gitHandler.js';
import { MemoryManager } from '../storage/memoryManager.js';

/**
 * Enhanced Tool Handler with Advanced Context Management
 * 
 * New Features:
 * - Auto-loading documentation in get_context
 * - Enhanced memory search with fuzzy matching
 * - Real-time memory indexing
 * - Performance monitoring and statistics
 * - Smart context generation with token budget management
 */
export class EnhancedToolHandler {
  private server: Server;
  private contextManager: EnhancedContextManager;
  private fileHandler: FileHandler;
  private gitHandler: GitHandler;
  private memoryManager: MemoryManager;

  constructor(
    server: Server,
    contextManager: EnhancedContextManager,
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
    console.error('🔧 Initializing Enhanced Tool Handler...');
    
    // Register list tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getEnhancedToolDefinitions()
    }));

    // Register call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await this.handleEnhancedToolCall(request.params.name, request.params.arguments || {});
    });
    
    console.error('✅ Enhanced Tool Handler initialized');
  }

  /**
   * Get enhanced tool definitions including new advanced features
   */
  private getEnhancedToolDefinitions(): Tool[] {
    return [
      // ================== ENHANCED CORE TOOLS ==================
      {
        name: 'get_context',
        description: '🚀 ENHANCED: Get current project context with automatic documentation loading and smart token management',
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
              description: 'Auto-load project documentation (CLAUDE.md, README.md, etc.) - NEW FEATURE',
              default: true
            },
            includeRecentMemories: {
              type: 'boolean',
              description: 'Include recent project memories',
              default: true
            },
            includeFileContent: {
              type: 'boolean',
              description: 'Include key project files content',
              default: true
            },
            maxRecentFiles: {
              type: 'number',
              description: 'Maximum number of recent files to include',
              default: 5
            },
            maxRecentMemories: {
              type: 'number',
              description: 'Maximum number of recent memories to include',
              default: 10
            },
            enableCaching: {
              type: 'boolean',
              description: 'Enable context caching for performance',
              default: true
            }
          }
        }
      },
      {
        name: 'search_memories',
        description: '🔍 ENHANCED: Search project memories with fuzzy matching, tag-based search, and semantic similarity',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (supports fuzzy matching)' },
            limit: { type: 'number', description: 'Maximum results', default: 10 },
            fuzzy: { 
              type: 'boolean', 
              description: 'Enable fuzzy matching for broader results - NEW FEATURE', 
              default: true 
            },
            tagSearch: { 
              type: 'boolean', 
              description: 'Enable tag-based search with smart mappings - NEW FEATURE', 
              default: true 
            },
            semanticSearch: { 
              type: 'boolean', 
              description: 'Enable semantic similarity search - NEW FEATURE', 
              default: true 
            },
            minScore: { 
              type: 'number', 
              description: 'Minimum relevance score (0.0-1.0)', 
              default: 0.3 
            }
          },
          required: ['query']
        }
      },
      {
        name: 'add_memory',
        description: '🧠 ENHANCED: Add memory with real-time indexing for immediate searchability',
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
              description: 'Tags for enhanced searchability (use specific terms for better results)'
            }
          },
          required: ['type', 'content']
        }
      },
      
      // ================== NEW ENHANCED TOOLS ==================
      {
        name: 'get_context_stats',
        description: '📊 NEW: Get detailed context generation and performance statistics',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_documentation_status',
        description: '📄 NEW: Get status of auto-loaded project documentation',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'search_memories_advanced',
        description: '🎯 NEW: Advanced memory search with detailed analysis and query optimization',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            analyzeQuery: { 
              type: 'boolean', 
              description: 'Provide detailed query analysis and suggestions', 
              default: true 
            },
            showMatchDetails: { 
              type: 'boolean', 
              description: 'Show detailed match information for debugging', 
              default: true 
            },
            limit: { type: 'number', description: 'Maximum results', default: 10 }
          },
          required: ['query']
        }
      },
      {
        name: 'clear_context_cache',
        description: '🗑️  NEW: Clear context cache to force fresh context generation',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      
      // ================== EXISTING TOOLS (Enhanced) ==================
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
      {
        name: 'search_code',
        description: 'Search for code patterns in project files with advanced filtering',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Search pattern (text or regex)' },
            directory: { type: 'string', description: 'Directory to search in (default: project root)' },
            filePattern: { type: 'string', description: 'File glob pattern (e.g., "*.ts", "**/*.js")' },
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
      // Git tools
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
  /**
   * Handle enhanced tool calls with advanced features
   */
  private async handleEnhancedToolCall(name: string, args: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Log tool usage for performance monitoring
      console.error(`🔧 Enhanced tool call: ${name}${args.query ? ` ("${args.query}")` : ''}`);
      
      switch (name) {
        // ================== ENHANCED CORE TOOLS ==================
        case 'get_context':
          return await this.handleGetContextEnhanced(args);
        
        case 'search_memories':
          return await this.handleSearchMemoriesEnhanced(args);
        
        case 'add_memory':
          return await this.handleAddMemoryEnhanced(args);
        
        // ================== NEW ENHANCED TOOLS ==================
        case 'get_context_stats':
          return await this.handleGetContextStats();
        
        case 'get_documentation_status':
          return await this.handleGetDocumentationStatus();
        
        case 'search_memories_advanced':
          return await this.handleSearchMemoriesAdvanced(args);
        
        case 'clear_context_cache':
          return await this.handleClearContextCache();
        
        // ================== EXISTING FILE TOOLS ==================
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
        
        // ================== GIT TOOLS ==================
        case 'git_status':
          return await this.handleGitStatus();
        
        case 'git_diff':
          return await this.handleGitDiff(args);
        
        case 'git_add':
          return await this.handleGitAdd(args);
        
        case 'git_commit':
          return await this.handleGitCommit(args);
        
        default:
          throw new Error(`Unknown enhanced tool: ${name}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Enhanced tool ${name} failed in ${duration}ms:`, error);
      
      return {
        content: [
          {
            type: 'text',
            text: `❌ Enhanced Tool Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
                  `If you're experiencing issues with memory search, try:\n` +
                  `• Use more specific terms (e.g., "TeamVoiceChat" instead of "project")\n` +
                  `• Try tag-based search (e.g., "critical", "webrtc", "yusuf")\n` +
                  `• Use the search_memories_advanced tool for detailed diagnostics`
          }
        ],
        isError: true
      };
    }
  }

  // ================== ENHANCED TOOL IMPLEMENTATIONS ==================

  /**
   * Enhanced get_context with automatic documentation loading
   */
  private async handleGetContextEnhanced(args: any): Promise<any> {
    console.error('🚀 Generating enhanced context with auto-documentation loading...');
    
    const context = await this.contextManager.generateEnhancedContext({
      tokenBudget: args.tokenBudget || 25000,
      includeDocumentation: args.includeDocumentation !== false,
      includeRecentMemories: args.includeRecentMemories !== false,
      includeFileContent: args.includeFileContent !== false,
      maxRecentFiles: args.maxRecentFiles || 5,
      maxRecentMemories: args.maxRecentMemories || 10,
      enableCaching: args.enableCaching !== false
    });
    
    // Update context with this interaction
    this.contextManager.updateContext('context_generated', {
      tokenBudget: args.tokenBudget,
      includeDocumentation: args.includeDocumentation !== false
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

  /**
   * Enhanced memory search with fuzzy matching and advanced features
   */
  private async handleSearchMemoriesEnhanced(args: any): Promise<any> {
    console.error(`🔍 Enhanced memory search: "${args.query}"`);
    
    const searchResult = await this.contextManager.searchMemoriesEnhanced(args.query, {
      limit: args.limit || 10,
      fuzzy: args.fuzzy !== false,
      tagSearch: args.tagSearch !== false,
      semanticSearch: args.semanticSearch !== false,
      minScore: args.minScore || 0.3
    });
    
    // Update context
    this.contextManager.updateContext('memory_search', {
      query: args.query,
      results: searchResult.results.length,
      strategies: searchResult.strategiesUsed
    });
    
    return {
      content: [
        {
          type: 'text',
          text: this.contextManager.memorySearchEngine.formatSearchResults(searchResult)
        }
      ]
    };
  }

  /**
   * Add memory with real-time indexing
   */
  private async handleAddMemoryEnhanced(args: any): Promise<any> {
    console.error(`🧠 Adding memory with real-time indexing: ${args.type}`);
    
    const memoryId = this.contextManager.addMemoryWithRealTimeIndexing(
      args.type,
      args.content,
      args.tags || []
    );
    
    // Test immediate searchability
    const testSearch = await this.contextManager.searchMemoriesEnhanced(
      args.tags?.[0] || Object.keys(args.content)[0] || 'test',
      { limit: 1 }
    );
    
    const isImmediatelySearchable = testSearch.results.some(r => r.memory.id === memoryId);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Memory added successfully!\n\n` +
                `📋 **Memory Details:**\n` +
                `• **ID:** ${memoryId}\n` +
                `• **Type:** ${args.type}\n` +
                `• **Tags:** ${args.tags?.join(', ') || 'none'}\n` +
                `• **Real-time Indexing:** ${isImmediatelySearchable ? '✅ Active' : '⚠️  Pending'}\n\n` +
                `🔍 **Search Tips:**\n` +
                `• Use specific tags for better findability\n` +
                `• Try searching with: "${args.tags?.[0] || Object.keys(args.content)[0]}"`
        }
      ]
    };
  }

  /**
   * Get context generation statistics
   */
  private async handleGetContextStats(): Promise<any> {
    const stats = this.contextManager.getContextStats();
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

  /**
   * Get documentation loading status
   */
  private async handleGetDocumentationStatus(): Promise<any> {
    const context = this.contextManager.getContext();
    const docResult = context.documentation;
    
    let statusText = `📄 **Project Documentation Status**\n`;
    statusText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    if (docResult.loadedDocs.length > 0) {
      statusText += `✅ **Auto-loaded Documents (${docResult.loadedDocs.length}):**\n`;
      for (const doc of docResult.loadedDocs) {
        const docObj = docResult.documents.find(d => d.file === doc);
        if (docObj) {
          statusText += `   • ${doc} (${docObj.tokenCount.toLocaleString()} tokens, priority: ${docObj.priority})\n`;
        } else {
          statusText += `   • ${doc}\n`;
        }
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
    
    if (docResult.loadedDocs.length === 0 && docResult.skippedDocs.length === 0) {
      statusText += `\n❌ **No Documentation Found**\n`;
      statusText += `The system looks for these files:\n`;
      statusText += `• CLAUDE.md, CLAUDE_IMPLEMENTATION_PLAN.md\n`;
      statusText += `• README.md, DOCS.md, PROJECT.md\n`;
      statusText += `• .claude/instructions.md\n`;
      statusText += `• docs/CLAUDE.md, docs/README.md\n`;
    }
    
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

  /**
   * Advanced memory search with detailed analysis
   */
  private async handleSearchMemoriesAdvanced(args: any): Promise<any> {
    console.error(`🎯 Advanced memory search: "${args.query}"`);
    
    const searchResult = await this.contextManager.searchMemoriesEnhanced(args.query, {
      limit: args.limit || 10,
      fuzzy: true,
      tagSearch: true,
      semanticSearch: true,
      minScore: 0.1 // Lower threshold for analysis
    });
    
    let advancedText = this.contextManager.memorySearchEngine.formatSearchResults(searchResult);
    
    if (args.analyzeQuery !== false) {
      advancedText += `\n\n🧠 **Query Analysis & Optimization Suggestions:**\n`;
      advancedText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      
      const analysis = searchResult.queryAnalysis;
      advancedText += `• **Query Type:** ${analysis.queryType}\n`;
      advancedText += `• **Confidence:** ${(analysis.confidence * 100).toFixed(1)}%\n`;
      
      if (analysis.extractedTags.length > 0) {
        advancedText += `• **Smart Tags:** ${analysis.extractedTags.join(', ')}\n`;
      }
      
      // Provide suggestions based on results
      if (searchResult.results.length === 0) {
        advancedText += `\n❌ **No Results - Try These Suggestions:**\n`;
        advancedText += `• Use broader terms: "${args.query.split(' ')[0]}" instead of "${args.query}"\n`;
        advancedText += `• Search by identifiers: "TeamVoiceChat", "CLAUDE_IMPLEMENTATION_PLAN"\n`;
        advancedText += `• Use tag keywords: "critical", "issues", "webrtc", "yusuf"\n`;
        advancedText += `• Try partial matches: individual words from your query\n`;
      } else if (searchResult.results.length < 3) {
        advancedText += `\n⚠️ **Few Results - Consider:**\n`;
        advancedText += `• Reducing minScore (currently using smart defaults)\n`;
        advancedText += `• Using wildcard terms or broader concepts\n`;
        advancedText += `• Checking for typos in your query\n`;
      } else {
        advancedText += `\n✅ **Good Results - Query is well-optimized**\n`;
      }
    }
    
    if (args.showMatchDetails !== false && searchResult.results.length > 0) {
      advancedText += `\n\n🔍 **Detailed Match Analysis:**\n`;
      advancedText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      
      for (let i = 0; i < Math.min(3, searchResult.results.length); i++) {
        const result = searchResult.results[i];
        advancedText += `**Result ${i + 1}:**\n`;
        advancedText += `• Score: ${(result.score * 100).toFixed(1)}% via ${result.strategy}\n`;
        if (result.matchDetails) {
          advancedText += `• Match: ${result.matchDetails.join('; ')}\n`;
        }
        advancedText += `• Tags: ${result.memory.tags.join(', ') || 'none'}\n\n`;
      }
    }
    
    return {
      content: [
        {
          type: 'text',
          text: advancedText
        }
      ]
    };
  }

  /**
   * Clear context cache
   */
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
              `Next get_context call will be freshly generated with:\n` +
              `• Latest project documentation\n` +
              `• Updated memory index\n` +
              `• Current file states\n\n` +
              `💡 This may slightly increase the next context generation time.`
        }
      ]
    };
  }

  // ================== EXISTING TOOL IMPLEMENTATIONS (Enhanced with logging) ==================

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
    this.contextManager.updateContext('file_written', { path: args.path, size: args.content.length });
    
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
    this.contextManager.updateContext('directory_listed', { path: args.path });
    
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
    this.contextManager.updateContext('directory_created', { path: args.path });
    
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
    this.contextManager.updateContext('file_deleted', { path: args.path });
    
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
    this.contextManager.updateContext('file_moved', { source: args.source, destination: args.destination });
    
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
    this.contextManager.updateContext('multiple_files_read', { count: args.paths.length });
    
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
    
    this.contextManager.updateContext('file_edited', { 
      path: args.path, 
      success: editResult.success,
      replacements: editResult.success ? args.expected_replacements : 0
    });
    
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
      includeHidden: args.includeHidden || false,
      followSymlinks: args.followSymlinks || false
    };
    
    const searchResults = await this.fileHandler.searchCode(searchOptions);
    this.contextManager.updateContext('code_searched', { 
      pattern: args.pattern, 
      matches: searchResults.totalMatches 
    });
    
    // Format results for display (keeping existing format)
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
    
    this.contextManager.updateContext('symbols_searched', { 
      symbol: args.symbolName, 
      matches: symbolResults.length 
    });
    
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
    this.contextManager.updateContext('todos_searched', { matches: todoResults.length });
    
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
    this.contextManager.updateContext('git_status_checked', { dirty: status.files?.length > 0 });
    
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
    this.contextManager.updateContext('git_diff_checked', { staged: args.staged });
    
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
    this.contextManager.updateContext('git_files_added', { files: args.files });
    
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
    this.contextManager.updateContext('git_commit_created', { message: args.message });
    
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
