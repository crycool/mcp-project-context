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
import { ConfigToolHandler } from './handlers/config/configToolHandler.js';
import { mcpConfig } from './config/mcpConfig.js';
import { pathManager } from './utils/paths/pathManager.js';
import { pathRecovery } from './utils/paths/pathRecoveryManager.js';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Enhanced MCP Project Context Server v3.0
 * 
 * 🚀 NEW FEATURES v3.0:
 * - Advanced configuration management system (Desktop Commander-like)
 * - Centralized path management with auto-correction
 * - Path recovery and emergency reset capabilities
 * - Runtime configuration changes
 * - Comprehensive debugging tools
 * 
 * 🧠 EXISTING FEATURES:
 * - File-based memory system (Claude Code-like)
 * - Automatic documentation discovery and loading
 * - Hierarchical memory files (Enterprise > Project > User > Local)
 * - @import system for file references
 * - Smart token budget management
 * - Performance monitoring and caching
 */
class EnhancedMCPProjectContextServer {
  private server: Server;
  private projectDiscovery!: ProjectDiscovery;
  private fileBasedMemoryManager!: FileBasedMemoryManager;
  private enhancedContextManager!: EnhancedContextManager;
  private fileHandler!: FileHandler;
  private gitHandler!: GitHandler;
  private enhancedToolHandler!: EnhancedToolHandler;
  private resourceHandler!: ResourceHandler;
  private promptHandler!: PromptHandler;
  private configToolHandler!: ConfigToolHandler;
  private currentWorkingDirectory: string;
  private initializationComplete: boolean = false;
  
  constructor() {
    console.error('🚀 Enhanced MCP Server v3.0 initializing...');
    
    // Initialize server first
    this.server = new Server(
      { 
        name: 'enhanced-mcp-project-context', 
        version: '3.0.0-path-management' 
      },
      { 
        capabilities: { 
          tools: {}, 
          resources: {}, 
          prompts: {} 
        } 
      }
    );

    // Enhanced startup sequence with path management
    this.currentWorkingDirectory = '';
    this.initializeWithPathManagement();
  }

  /**
   * Enhanced initialization with comprehensive path management
   */
  private async initializeWithPathManagement() {
    try {
      console.error('🔧 Starting enhanced initialization sequence...');

      // Step 1: Load configuration system
      console.error('📁 Loading configuration system...');
      const config = mcpConfig.getConfig();
      console.error(`✅ Configuration loaded from: ${mcpConfig.getConfigPath()}`);

      // Step 1.5: AUTO-FIX: Ensure current working directory is in allowed directories
      console.error('🔧 Ensuring working directory access...');
      const currentWD = process.cwd();
      
      if (!config.allowedDirectories.includes(currentWD)) {
        console.error(`➕ Adding current working directory to allowed directories: ${currentWD}`);
        const updatedAllowedDirs = [...config.allowedDirectories, currentWD];
        mcpConfig.updateConfig('allowedDirectories', updatedAllowedDirs);
        console.error('✅ Working directory added to allowed directories');
      } else {
        console.error('✅ Working directory already in allowed directories');
      }

      // Step 2: Detect and fix working directory
      console.error('🔍 Detecting and validating working directory...');
      const recovery = await pathRecovery.detectAndFixWorkingDirectory();
      
      if (!recovery.success && recovery.errors.length > 0) {
        console.error('⚠️ Working directory issues detected:', recovery.errors);
        console.error('🛠 Attempting emergency recovery...');
        
        const emergencySuccess = await pathRecovery.emergencyReset();
        if (!emergencySuccess) {
          throw new Error('Failed to establish safe working directory');
        }
      }

      this.currentWorkingDirectory = process.cwd();
      console.error('✅ Working directory confirmed:', this.currentWorkingDirectory);

      // Step 3: Validate all paths
      console.error('🔎 Validating path configuration...');
      const validation = await pathRecovery.validateAllPaths();
      
      if (!validation.isValid) {
        console.error('⚠️ Path validation warnings:', validation.warnings);
        if (validation.errors.length > 0) {
          console.error('❌ Path validation errors:', validation.errors);
        }
      } else {
        console.error('✅ All paths validated successfully');
      }

      // Step 4: Initialize core components with validated paths
      console.error('⚙️ Initializing core components...');
      this.projectDiscovery = new ProjectDiscovery(this.currentWorkingDirectory);
      
      // Discover project information
      try {
        console.error('🔍 Discovering project information...');
        await this.projectDiscovery.discover();
        console.error('✅ Project discovery completed');
      } catch (error) {
        console.error('⚠️ Project discovery failed, using fallback:', error);
        // Continue with basic project info
      }
      
      this.fileBasedMemoryManager = new FileBasedMemoryManager(this.currentWorkingDirectory);

      // Step 5: Initialize enhanced components
      await this.initializeComponents();

      // Step 6: Setup error handling
      this.setupErrorHandling();

      // Step 7: Log successful initialization
      this.initializationComplete = true;
      console.error('🎉 Enhanced MCP Server v3.0 initialized successfully');
      console.error('📊 Configuration status:', {
        workingDirectory: this.currentWorkingDirectory,
        projectRoot: config.projectRoot,
        pathResolution: config.pathResolution,
        autoCorrection: config.autoCorrection,
        debugMode: config.debugMode
      });

    } catch (error) {
      console.error('💥 Initialization failed:', error);
      console.error('🚨 Attempting emergency initialization...');
      await this.emergencyInitialization();
    }
  }

  /**
   * Emergency initialization when normal startup fails
   */
  private async emergencyInitialization() {
    try {
      console.error('🚨 Emergency initialization starting...');
      
      // Reset to safe defaults
      await pathRecovery.emergencyReset();
      this.currentWorkingDirectory = process.cwd();
      
      // EMERGENCY AUTO-FIX: Ensure current working directory is in allowed directories
      console.error('🔧 Emergency: Ensuring working directory access...');
      const config = mcpConfig.getConfig();
      
      if (!config.allowedDirectories.includes(this.currentWorkingDirectory)) {
        console.error(`➕ Emergency: Adding working directory to allowed directories: ${this.currentWorkingDirectory}`);
        const updatedAllowedDirs = [...config.allowedDirectories, this.currentWorkingDirectory];
        mcpConfig.updateConfig('allowedDirectories', updatedAllowedDirs);
        console.error('✅ Emergency: Working directory added to allowed directories');
      }
      
      // Initialize with minimal components
      this.projectDiscovery = new ProjectDiscovery(this.currentWorkingDirectory);
      
      // Try to discover project info
      try {
        await this.projectDiscovery.discover();
      } catch (error) {
        console.error('⚠️ Emergency project discovery failed:', error);
      }
      
      this.fileBasedMemoryManager = new FileBasedMemoryManager(this.currentWorkingDirectory);
      
      // Basic component initialization
      await this.initializeComponents();
      
      this.initializationComplete = true;
      console.error('✅ Emergency initialization completed');
      
    } catch (error) {
      console.error('💥 Emergency initialization failed:', error);
      // At this point, we have a serious problem, but don't crash
      this.initializationComplete = false;
    }
  }

  /**
   * Initialize all components
   */
  private async initializeComponents() {
    // Initialize context manager
    this.enhancedContextManager = new EnhancedContextManager(
      this.fileBasedMemoryManager,
      this.projectDiscovery
    );

    // Create a ContextManager wrapper for compatibility
    const contextManagerWrapper = {
      getProjectInfo: () => {
        try {
          const projectInfo = this.projectDiscovery.getProjectInfo();
          // Ensure we have basic project info
          if (!projectInfo) {
            return {
              id: 'unknown',
              name: 'Project',
              type: 'unknown',
              root: this.currentWorkingDirectory,
              structure: { directories: [], importantDirs: [], configFiles: [] },
              files: [],
              claudeFiles: []
            };
          }
          return projectInfo;
        } catch (error) {
          console.error('Error getting project info:', error);
          return {
            id: 'unknown',
            name: 'Project',
            type: 'unknown', 
            root: this.currentWorkingDirectory,
            structure: { directories: [], importantDirs: [], configFiles: [] },
            files: [],
            claudeFiles: []
          };
        }
      },
      updateContext: (type: string, data: any) => {
        // Enhanced context manager handles this differently
        // Silent - don't interfere with JSON-RPC protocol
      },
      loadFileContext: async (filePath: string) => {
        // Enhanced context manager handles file loading
        return;
      },
      generateContext: (tokenLimit?: number) => {
        // For PromptHandler compatibility
        return 'Enhanced context loading...';
      }
    } as any;

    // Initialize handlers with wrapper
    this.fileHandler = new FileHandler(contextManagerWrapper);
    this.gitHandler = new GitHandler(contextManagerWrapper);
    
    // Initialize config tool handler
    this.configToolHandler = new ConfigToolHandler(this.server);

    // Initialize enhanced tool handler
    this.enhancedToolHandler = new EnhancedToolHandler(
      this.server,
      this.enhancedContextManager,
      this.fileHandler,
      this.gitHandler,
      this.fileBasedMemoryManager
    );

    // Initialize other handlers
    this.resourceHandler = new ResourceHandler(this.server, contextManagerWrapper as any, this.fileHandler);
    this.promptHandler = new PromptHandler(this.server, contextManagerWrapper as any);

    // Initialize all handlers
    try {
      console.error('🔧 Initializing handlers...');
      await Promise.all([
        this.enhancedToolHandler.initialize().catch(err => {
          console.error('❌ Enhanced tool handler initialization failed:', err);
          throw err;
        }),
        this.resourceHandler.initialize().catch(err => {
          console.error('❌ Resource handler initialization failed:', err);
          throw err;
        }),
        this.promptHandler.initialize().catch(err => {
          console.error('❌ Prompt handler initialization failed:', err);
          throw err;
        })
      ]);
      console.error('✅ All handlers initialized successfully');
    } catch (error) {
      console.error('💥 Handler initialization failed:', error);
      throw error;
    }

    console.error('✅ All components initialized');
  }

  private setupErrorHandling() {
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception in Enhanced MCP Server:', error);
      
      // Try path recovery if it's a path-related error
      if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
        console.error('🛠 Attempting path recovery...');
        const recovery = await pathRecovery.recoverFromPathError(error, '');
        if (recovery.success) {
          console.error('✅ Path recovery successful, continuing...');
          return;
        }
      }
      
      this.gracefulShutdown();
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection in Enhanced MCP Server at:', promise, 'reason:', reason);
      
      // Try path recovery for path-related rejections
      if (reason instanceof Error && 
          (reason.message.includes('ENOENT') || reason.message.includes('path'))) {
        console.error('🛠 Attempting path recovery...');
        const recovery = await pathRecovery.recoverFromPathError(reason, '');
        if (recovery.success) {
          console.error('✅ Path recovery successful, continuing...');
          return;
        }
      }
      
      this.gracefulShutdown();
    });

    // Path manager error handling
    mcpConfig.onConfigChange((newConfig) => {
      console.error('📝 Configuration updated:', {
        workingDirectory: newConfig.workingDirectory,
        projectRoot: newConfig.projectRoot,
        pathResolution: newConfig.pathResolution
      });
    });
  }

  private gracefulShutdown() {
    console.error('🔄 Graceful shutdown initiated...');
    
    try {
      // Save current state
      const config = mcpConfig.getConfig();
      config.workingDirectory = process.cwd();
      mcpConfig.updateConfig('workingDirectory', config.workingDirectory);
      
      // Clean up
      if (this.fileHandler) {
        this.fileHandler.stopWatching();
      }
      
      console.error('✅ Graceful shutdown completed');
    } catch (error) {
      console.error('⚠️ Error during graceful shutdown:', error);
    }
    
    process.exit(1);
  }

  /**
   * Enhanced run method with initialization check
   */
  async run() {
    try {
      // Wait for initialization if not complete
      if (!this.initializationComplete) {
        console.error('⏳ Waiting for initialization to complete...');
        
        let attempts = 0;
        while (!this.initializationComplete && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
        
        if (!this.initializationComplete) {
          throw new Error('Initialization timeout - server may not be fully functional');
        }
      }

      console.error('🚀 Enhanced MCP Server v3.0 starting transport...');
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      // Log success with system state
      const systemState = pathRecovery.getSystemState();
      console.error('🎉 Enhanced MCP Server v3.0 started successfully!');
      console.error('📊 System Status:', {
        workingDirectory: systemState.currentState.workingDirectory,
        projectRoot: systemState.currentState.projectRoot,
        isValid: systemState.pathValidation.isValid,
        pathResolution: systemState.config.pathResolution,
        autoCorrection: systemState.config.autoCorrection,
        emergencyState: systemState.emergencyState.isInDangerousDirectory || 
                       systemState.emergencyState.isInClaudeExeDirectory ? 'DANGER' : 'OK'
      });
      
      // Add memory to log server start
      try {
        await this.fileBasedMemoryManager.addMemory(
          '🚀 Enhanced server started with advanced path management system',
          ['server', 'startup', 'path-management', 'v3.0.0']
        );
      } catch (error) {
        console.error('⚠️ Could not add startup memory:', error);
      }
      
    } catch (error) {
      console.error('💥 Failed to start Enhanced MCP Server:', error);
      
      // Final attempt at recovery
      console.error('🚨 Attempting final recovery...');
      await pathRecovery.emergencyReset();
      
      // Try to start with emergency state
      try {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('🆘 Server started in emergency mode');
      } catch (finalError) {
        console.error('💥 Final recovery failed:', finalError);
        process.exit(1);
      }
    }
  }

  /**
   * Get server status for debugging
   */
  getStatus() {
    return {
      initializationComplete: this.initializationComplete,
      workingDirectory: this.currentWorkingDirectory,
      systemState: pathRecovery.getSystemState(),
      pathStats: mcpConfig.getStats(),
      timestamp: new Date().toISOString()
    };
  }
}

// Main execution
async function main() {
  console.error('🌟 Starting Enhanced MCP Project Context Server v3.0...');
  
  const server = new EnhancedMCPProjectContextServer();
  await server.run();
}

// Handle process termination
process.on('SIGINT', () => {
  console.error('🛑 Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('🛑 Received SIGTERM, shutting down...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('💥 Main execution failed:', error);
  process.exit(1);
});
