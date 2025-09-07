#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ProjectDiscovery } from './discovery/projectDiscovery.js';
import { FileBasedMemoryManager } from './storage/fileBasedMemoryManager.js';
import { EnhancedContextManager } from './context/enhancedContextManager.js';
import { FileHandler } from './handlers/fileHandler.js';
import { GitHandler } from './handlers/gitHandler.js';
import { EnhancedToolHandler } from './handlers/enhancedToolHandler.js';
import { ResourceHandler } from './handlers/resourceHandler.js';
import { PromptHandler } from './handlers/promptHandler.js';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Enhanced MCP Project Context Server with File-Based Memory
 * 
 * 🚀 CORE FEATURES:
 * - File-based memory system (Claude Code-like)
 * - Automatic documentation discovery and loading (CLAUDE.md, README.md, etc.)
 * - All memories always available in context (no search required)
 * - Hierarchical memory files (Enterprise > Project > User > Local)
 * - @import system for file references
 * - Smart token budget management with priority-based content loading
 * - Performance monitoring and caching
 */
class EnhancedMCPProjectContextServer {
  private server: Server;
  private projectDiscovery: ProjectDiscovery;
  private fileBasedMemoryManager: FileBasedMemoryManager;
  private enhancedContextManager!: EnhancedContextManager;
  private fileHandler!: FileHandler;
  private gitHandler!: GitHandler;
  private enhancedToolHandler!: EnhancedToolHandler;
  private resourceHandler!: ResourceHandler;
  private promptHandler!: PromptHandler;
  private currentWorkingDirectory: string;
  
  constructor() {
    this.currentWorkingDirectory = this.determineWorkingDirectory();
    console.error('🚀 Enhanced MCP Server starting with working directory:', this.currentWorkingDirectory);
    
    this.projectDiscovery = new ProjectDiscovery(this.currentWorkingDirectory);
    this.fileBasedMemoryManager = new FileBasedMemoryManager(this.currentWorkingDirectory);
    
    this.server = new Server(
      { 
        name: 'enhanced-mcp-project-context', 
        version: '2.0.0-file-based' 
      },
      { 
        capabilities: { 
          tools: {}, 
          resources: {}, 
          prompts: {} 
        } 
      }
    );
    
    // Enhanced error handling
    this.setupErrorHandling();
    
    console.error('✨ Enhanced MCP Project Context Server with File-Based Memory System');
  }
  
  private determineWorkingDirectory(): string {
    // 1. Environment variable'dan al (config'den gelir)
    if (process.env.PROJECT_ROOT && fs.existsSync(process.env.PROJECT_ROOT)) {
      console.error('📁 Using PROJECT_ROOT environment variable:', process.env.PROJECT_ROOT);
      return path.resolve(process.env.PROJECT_ROOT);
    }
    
    // 2. process.cwd() kontrol et, eğer root ise script'in bulunduğu yeri kullan
    const cwd = process.cwd();
    if (cwd === '/' || cwd === 'C:\\') {
      // Script'in bulunduğu dizinin üst klasörü (src/index.ts -> proje root)
      const scriptDir = path.dirname(new URL(import.meta.url).pathname);
      const resolvedPath = path.resolve(scriptDir, '..');
      console.error('📁 Using script directory parent:', resolvedPath);
      return resolvedPath;
    }
    
    // 3. Normal durumda process.cwd() kullan
    console.error('📁 Using current working directory:', cwd);
    return cwd;
  }
  
  private setupErrorHandling() {
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception in Enhanced MCP Server:', error);
      this.gracefulShutdown();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection in Enhanced MCP Server at:', promise, 'reason:', reason);
      this.gracefulShutdown();
    });
    
    process.on('SIGINT', () => {
      console.error('🛑 Received SIGINT, shutting down Enhanced MCP Server gracefully...');
      this.gracefulShutdown();
    });
    
    process.on('SIGTERM', () => {
      console.error('🛑 Received SIGTERM, shutting down Enhanced MCP Server gracefully...');
      this.gracefulShutdown();
    });
  }
  
  private gracefulShutdown() {
    console.error('🔄 Starting graceful shutdown...');
    
    if (this.fileHandler) {
      console.error('🛑 Stopping file watching...');
      this.fileHandler.stopWatching();
    }
    
    if (this.enhancedContextManager) {
      console.error('📊 Saving performance metrics...');
      const stats = this.enhancedContextManager.getPerformanceReport();
      console.error('📈 Final Performance Report:\n', stats);
    }
    
    console.error('✅ Enhanced MCP Server shutdown complete');
    process.exit(0);
  }

  async initialize() {
    const initStartTime = Date.now();
    
    try {
      console.error('🔧 Enhanced MCP Project Context Server initializing...');
      
      // Phase 1: Project Discovery with timeout
      console.error('🔍 Phase 1: Project Discovery...');
      const discoveryPromise = this.projectDiscovery.discover();
      const discovery = await Promise.race([
        discoveryPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Discovery timeout after 30 seconds')), 30000)
        )
      ]) as any;
      
      console.error(`✅ Project discovered: ${discovery.name} (${discovery.type})`);
      
      // Phase 2: File-Based Memory System Initialization
      console.error('🧠 Phase 2: File-Based Memory System Initialization...');
      await this.fileBasedMemoryManager.initialize();
      const memoryStatus = this.fileBasedMemoryManager.getMemoryStatus();
      console.error(memoryStatus);
      console.error('✅ File-based memory system initialized');
      
      // Phase 3: Enhanced Context Manager with File-Based Memory
      console.error('⚡ Phase 3: Enhanced Context Manager...');
      this.enhancedContextManager = new EnhancedContextManager(
        this.fileBasedMemoryManager as any, // Type compatibility - we'll fix this properly later
        this.projectDiscovery
      );
      await this.enhancedContextManager.initialize();
      console.error('✅ Enhanced context manager initialized with file-based memory');
      
      // Phase 4: Handler Initialization
      console.error('🔨 Phase 4: Handler Initialization...');
      this.fileHandler = new FileHandler(this.enhancedContextManager as any); // Type compatibility
      this.gitHandler = new GitHandler(this.enhancedContextManager as any);
      
      // Enhanced Tool Handler
      this.enhancedToolHandler = new EnhancedToolHandler(
        this.server,
        this.enhancedContextManager,
        this.fileHandler,
        this.gitHandler,
        this.fileBasedMemoryManager as any // Type compatibility
      );
      
      // Keep existing resource and prompt handlers
      this.resourceHandler = new ResourceHandler(
        this.server,
        this.enhancedContextManager as any,
        this.fileHandler
      );
      
      this.promptHandler = new PromptHandler(
        this.server,
        this.enhancedContextManager as any
      );
      
      console.error('✅ All handlers initialized');
      
      // Phase 5: MCP Protocol Setup
      console.error('🔗 Phase 5: MCP Protocol Setup...');
      await this.enhancedToolHandler.initialize();
      await this.resourceHandler.initialize();
      await this.promptHandler.initialize();
      console.error('✅ MCP protocol handlers registered');
      
      // Phase 6: Initial Context Generation
      console.error('📄 Phase 6: Initial Context Generation...');
      const initialContext = await this.enhancedContextManager.generateEnhancedContext({
        tokenBudget: 25000,
        includeDocumentation: true,
        includeRecentMemories: true,
        includeFileContent: true
      });
      
      const contextTokens = Math.ceil(initialContext.length / 4);
      console.error(`✅ Initial enhanced context generated (${contextTokens.toLocaleString()} tokens)`);
      
      // Phase 7: Performance Baseline
      console.error('📊 Phase 7: Performance Baseline...');
      const stats = this.enhancedContextManager.getContextStats();
      console.error(`📈 Baseline Performance:`);
      console.error(`   • Documentation: ${stats.performance.totalContextGenerations} contexts generated`);
      console.error(`   • Memory Files: Always available in context`);
      console.error(`   • Cache: ${(stats.performance.cacheHitRate * 100).toFixed(1)}% hit rate`);
      
      const initTime = Date.now() - initStartTime;
      console.error(`🎉 Enhanced MCP Project Context Server initialized successfully in ${initTime}ms`);
      
      // Log major enhancements
      console.error('✨ FILE-BASED MEMORY FEATURES ACTIVE:');
      console.error('   📁 File-based memory system (CLAUDE.md hierarchy)');
      console.error('   🔄 Auto-loading documentation (CLAUDE.md, README.md, etc.)');
      console.error('   ✅ All memories always available in context');
      console.error('   📥 @import system for file references');
      console.error('   🎯 Hierarchical memory files (Enterprise > Project > User > Local)');
      console.error('   ⚡ No search required - memories are in context');
      console.error('   🧮 Smart token budget management');
      console.error('   📊 Performance monitoring and caching');
      
    } catch (error) {
      const initTime = Date.now() - initStartTime;
      console.error(`❌ Enhanced MCP server initialization failed after ${initTime}ms:`, error);
      throw error;
    }
  }

  async run() {
    try {
      const transport = new StdioServerTransport();
      await this.initialize();
      
      // Start file watching AFTER successful initialization
      if (this.fileHandler) {
        console.error('👁️  Starting enhanced file watching...');
        this.fileHandler.startWatching();
      }
      
      // Add initial memory entry using file-based system
      await this.fileBasedMemoryManager.addMemory(
        `🚀 Enhanced server started with file-based memory system`,
        ['server', 'startup', 'file-based', 'v2.0.0']
      );
      
      await this.server.connect(transport);
      console.error('🚀 Enhanced MCP Project Context Server is running and ready!');
      console.error('💡 Memory files (CLAUDE.md) are always available in context');
      console.error('📁 Create CLAUDE.md in your project root to add persistent memories');
      console.error('✨ Use add_memory to append new memories to CLAUDE.md');
      
    } catch (error) {
      console.error('💥 Failed to start Enhanced MCP server:', error);
      process.exit(1);
    }
  }

  /**
   * Get enhanced server status for debugging
   */
  getEnhancedStatus() {
    return {
      version: '2.0.0-file-based',
      features: {
        fileBasedMemory: true,
        autoDocumentationLoading: true,
        hierarchicalMemoryFiles: true,
        importSystem: true,
        alwaysInContext: true,
        smartTokenManagement: true,
        performanceMonitoring: true
      },
      memoryStatus: this.fileBasedMemoryManager ? 
        this.fileBasedMemoryManager.getMemoryStatus() : null,
      performance: this.enhancedContextManager ? 
        this.enhancedContextManager.getContextStats() : null,
      projectInfo: this.projectDiscovery ? 
        this.projectDiscovery.getProjectInfo() : null
    };
  }
}

// Main execution with enhanced error handling
console.error('🌟 Starting Enhanced MCP Project Context Server v2.0.0 (File-Based)...');

const enhancedServer = new EnhancedMCPProjectContextServer();

enhancedServer.run().catch((error) => {
  console.error('💥 Fatal error in Enhanced MCP server:', error);
  console.error('');
  console.error('🔧 Troubleshooting Tips:');
  console.error('   • Check if the project directory is accessible');
  console.error('   • Verify Node.js version (18+ required)');
  console.error('   • Ensure proper permissions for file operations');
  console.error('   • Create CLAUDE.md in project root for memories');
  console.error('');
  process.exit(1);
});

// Graceful error recovery
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled promise rejection, attempting recovery:', reason);
  // Don't exit immediately, allow for graceful recovery
});

export { EnhancedMCPProjectContextServer };
