#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ProjectDiscovery } from './discovery/projectDiscovery.js';
import { FileBasedMemoryManager } from './storage/fileBasedMemoryManager.js';
import { ContextManager } from './context/contextManager.js';
import { FileHandler } from './handlers/fileHandler.js';
import { GitHandler } from './handlers/gitHandler.js';
import { ToolHandler } from './handlers/toolHandler.js';
import { ResourceHandler } from './handlers/resourceHandler.js';
import { PromptHandler } from './handlers/promptHandler.js';
import * as path from 'path';
import * as fs from 'fs';

class MCPProjectContextServer {
  private server: Server;
  private projectDiscovery: ProjectDiscovery;
  private fileBasedMemoryManager: FileBasedMemoryManager;
  private contextManager!: ContextManager;
  private fileHandler!: FileHandler;
  private gitHandler!: GitHandler;
  private toolHandler!: ToolHandler;
  private resourceHandler!: ResourceHandler;
  private promptHandler!: PromptHandler;
  private currentWorkingDirectory: string;
  
  constructor() {
    this.currentWorkingDirectory = this.determineWorkingDirectory();
    console.error('🚀 MCP Server starting with working directory:', this.currentWorkingDirectory);
    
    this.projectDiscovery = new ProjectDiscovery(this.currentWorkingDirectory);
    this.fileBasedMemoryManager = new FileBasedMemoryManager(this.currentWorkingDirectory);
    
    this.server = new Server(
      { name: 'mcp-project-context', version: '2.0.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );
    
    // Error handling for server
    this.setupErrorHandling();
    
    console.error('✨ File-based Memory System activated');
  }
  
  private determineWorkingDirectory(): string {
    // 1. Environment variable'dan al (config'den gelir)
    if (process.env.PROJECT_ROOT && fs.existsSync(process.env.PROJECT_ROOT)) {
      return path.resolve(process.env.PROJECT_ROOT);
    }
    
    // 2. process.cwd() kontrol et, eğer root ise script'in bulunduğu yeri kullan
    const cwd = process.cwd();
    if (cwd === '/' || cwd === 'C:\\') {
      // Script'in bulunduğu dizinin üst klasörü (src/index.ts -> proje root)
      const scriptDir = path.dirname(new URL(import.meta.url).pathname);
      return path.resolve(scriptDir, '..');
    }
    
    // 3. Normal durumda process.cwd() kullan
    return cwd;
  }
  
  private setupErrorHandling() {
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      this.gracefulShutdown();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown();
    });
    
    process.on('SIGINT', () => {
      console.error('🛑 Received SIGINT, shutting down gracefully...');
      this.gracefulShutdown();
    });
    
    process.on('SIGTERM', () => {
      console.error('🛑 Received SIGTERM, shutting down gracefully...');
      this.gracefulShutdown();
    });
  }
  
  private gracefulShutdown() {
    if (this.fileHandler) {
      this.fileHandler.stopWatching();
    }
    process.exit(0);
  }
  
  async initialize() {
    try {
      console.error('🔧 MCP Project Context Server initializing...');
      
      // Discover project structure with timeout
      const discoveryPromise = this.projectDiscovery.discover();
      const discovery = await Promise.race([
        discoveryPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Discovery timeout')), 30000)
        )
      ]) as any;
      
      console.error(`✅ Project discovered: ${discovery.name} (${discovery.type})`);
      
      // Initialize file-based memory system
      console.error('🧠 Initializing File-Based Memory System...');
      await this.fileBasedMemoryManager.initialize();
      console.error('✅ File-based memory system ready');
      
      // Initialize context manager with file-based memory
      this.contextManager = new ContextManager(this.fileBasedMemoryManager, this.projectDiscovery);
      this.fileHandler = new FileHandler(this.contextManager);
      this.gitHandler = new GitHandler(this.contextManager);
      
      this.toolHandler = new ToolHandler(
        this.server,
        this.contextManager,
        this.fileHandler,
        this.gitHandler
      );
      
      this.resourceHandler = new ResourceHandler(
        this.server,
        this.contextManager,
        this.fileHandler
      );
      
      this.promptHandler = new PromptHandler(
        this.server,
        this.contextManager
      );
      
      // Initialize context
      await this.contextManager.initialize();
      
      // Setup handlers
      await this.toolHandler.initialize();
      await this.resourceHandler.initialize();
      await this.promptHandler.initialize();
      
      console.error('✅ MCP Project Context Server initialized successfully');
      console.error('🎯 Memory System: File-based (Claude Code-like)');
      console.error('📁 Memory Files: CLAUDE.md hierarchy');
      
    } catch (error) {
      console.error('❌ Failed to initialize MCP server:', error);
      throw error;
    }
  }

  async run() {
    try {
      const transport = new StdioServerTransport();
      await this.initialize();
      
      // Start file watching AFTER successful initialization
      if (this.fileHandler) {
        this.fileHandler.startWatching();
      }
      
      await this.server.connect(transport);
      console.error('🚀 MCP Project Context Server is running');
      console.error('💡 Using file-based memory system (CLAUDE.md files)');
      console.error('✨ All memories are always available in context');
      
    } catch (error) {
      console.error('❌ Failed to start MCP server:', error);
      process.exit(1);
    }
  }
}

// Main execution with proper error handling
const server = new MCPProjectContextServer();
server.run().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
