import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { mcpConfig, MCPConfig } from '../../config/mcpConfig.js';
import { pathManager } from '../../utils/paths/pathManager.js';
import { pathRecovery } from '../../utils/paths/pathRecoveryManager.js';

export class ConfigToolHandler {
  private server: Server;

  constructor(server: Server) {
    this.server = server;
  }

  /**
   * Get configuration management tool definitions
   */
  getConfigToolDefinitions(): Tool[] {
    return [
      // ================== MCP CONFIGURATION TOOLS ==================
      {
        name: 'get_mcp_config',
        description: '🔧 Get current MCP configuration (similar to Desktop Commander)',
        inputSchema: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              description: 'Specific config section to get (optional)',
              enum: ['all', 'paths', 'safety', 'debug', 'stats']
            }
          }
        }
      },
      {
        name: 'set_mcp_config',
        description: '⚙️ Set MCP configuration value (runtime config changes)',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Configuration key to set',
              enum: [
                'workingDirectory', 'projectRoot', 'pathResolution',
                'useRelativePaths', 'autoCorrection', 'debugMode',
                'logPathOperations', 'emergencyFallback'
              ]
            },
            value: {
              description: 'New value for the configuration key'
            }
          },
          required: ['key', 'value']
        }
      },
      {
        name: 'reset_mcp_config',
        description: '🔄 Reset MCP configuration to defaults',
        inputSchema: {
          type: 'object',
          properties: {
            confirm: {
              type: 'boolean',
              description: 'Confirm reset (safety measure)',
              default: false
            }
          }
        }
      },

      // ================== PATH MANAGEMENT TOOLS ==================
      {
        name: 'get_working_directory',
        description: '📁 Get current working directory with detailed info',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'set_working_directory',
        description: '📂 Set working directory (with safety validation)',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'New working directory path'
            },
            updateConfig: {
              type: 'boolean',
              description: 'Update config permanently',
              default: true
            }
          },
          required: ['path']
        }
      },
      {
        name: 'validate_paths',
        description: '✅ Validate all paths in configuration',
        inputSchema: {
          type: 'object',
          properties: {
            fix: {
              type: 'boolean',
              description: 'Attempt to fix issues automatically',
              default: false
            }
          }
        }
      },
      {
        name: 'fix_path_issues',
        description: '🛠 Auto-fix path and working directory issues',
        inputSchema: {
          type: 'object',
          properties: {
            emergency: {
              type: 'boolean',
              description: 'Use emergency reset if needed',
              default: false
            }
          }
        }
      },

      // ================== DEBUG TOOLS ==================
      {
        name: 'debug_path_resolution',
        description: '🔍 Debug path resolution for specific path',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to debug'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'trace_working_directory',
        description: '🔎 Trace working directory detection process',
        inputSchema: {
          type: 'object',
          properties: {
            includeSystemInfo: {
              type: 'boolean',
              description: 'Include system information',
              default: true
            }
          }
        }
      },
      {
        name: 'get_path_stats',
        description: '📊 Get path operation statistics and performance data',
        inputSchema: {
          type: 'object',
          properties: {
            reset: {
              type: 'boolean',
              description: 'Reset statistics after retrieval',
              default: false
            }
          }
        }
      },
      {
        name: 'emergency_reset',
        description: '🚨 Emergency reset - restore to safe working state',
        inputSchema: {
          type: 'object',
          properties: {
            confirm: {
              type: 'boolean',
              description: 'Confirm emergency reset (DANGER: resets all config)',
              default: false
            }
          }
        }
      }
    ];
  }

  /**
   * Handle configuration tool calls
   */
  async handleConfigToolCall(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        case 'get_mcp_config':
          return await this.getMCPConfig(args);
        
        case 'set_mcp_config':
          return await this.setMCPConfig(args);
        
        case 'reset_mcp_config':
          return await this.resetMCPConfig(args);
        
        case 'get_working_directory':
          return await this.getWorkingDirectory();
        
        case 'set_working_directory':
          return await this.setWorkingDirectory(args);
        
        case 'validate_paths':
          return await this.validatePaths(args);
        
        case 'fix_path_issues':
          return await this.fixPathIssues(args);
        
        case 'debug_path_resolution':
          return await this.debugPathResolution(args);
        
        case 'trace_working_directory':
          return await this.traceWorkingDirectory(args);
        
        case 'get_path_stats':
          return await this.getPathStats(args);
        
        case 'emergency_reset':
          return await this.emergencyReset(args);
        
        default:
          throw new Error(`Unknown config tool: ${name}`);
      }
    } catch (error) {
      return {
        error: `Config tool error: ${error instanceof Error ? error.message : String(error)}`,
        tool: name,
        args
      };
    }
  }

  // ================== IMPLEMENTATION METHODS ==================

  private async getMCPConfig(args: { section?: string }) {
    const config = mcpConfig.getConfig();
    const stats = mcpConfig.getStats();
    
    if (args.section) {
      switch (args.section) {
        case 'paths':
          return {
            workingDirectory: config.workingDirectory,
            projectRoot: config.projectRoot,
            backupDirectories: config.backupDirectories,
            allowedDirectories: config.allowedDirectories,
            forbiddenPaths: config.forbiddenPaths,
            pathResolution: config.pathResolution,
            useRelativePaths: config.useRelativePaths
          };
        
        case 'safety':
          return {
            allowedDirectories: config.allowedDirectories,
            forbiddenPaths: config.forbiddenPaths,
            autoCorrection: config.autoCorrection,
            emergencyFallback: config.emergencyFallback
          };
        
        case 'debug':
          return {
            debugMode: config.debugMode,
            logPathOperations: config.logPathOperations,
            trackWorkingDirChanges: config.trackWorkingDirChanges
          };
        
        case 'stats':
          return stats;
        
        default:
          return config;
      }
    }

    return {
      config,
      stats,
      configPath: mcpConfig.getConfigPath(),
      cacheStats: pathManager.getCacheStats()
    };
  }

  private async setMCPConfig(args: { key: string; value: any }) {
    const success = mcpConfig.updateConfig(args.key as keyof MCPConfig, args.value);
    
    return {
      success,
      message: success ? `Updated ${args.key} to ${JSON.stringify(args.value)}` : `Failed to update ${args.key}`,
      newValue: mcpConfig.getConfig()[args.key as keyof MCPConfig]
    };
  }

  private async resetMCPConfig(args: { confirm?: boolean }) {
    if (!args.confirm) {
      return {
        success: false,
        message: 'Reset requires confirmation (set confirm: true)',
        warning: 'This will reset ALL configuration to defaults'
      };
    }

    const success = mcpConfig.resetConfig();
    pathManager.clearCache();

    return {
      success,
      message: success ? 'Configuration reset to defaults' : 'Failed to reset configuration',
      newConfig: mcpConfig.getConfig()
    };
  }

  private async getWorkingDirectory() {
    const systemState = pathRecovery.getSystemState();
    
    return {
      currentWorkingDirectory: process.cwd(),
      configWorkingDirectory: systemState.config.workingDirectory,
      projectRoot: systemState.config.projectRoot,
      directoryState: systemState.currentState,
      emergencyState: systemState.emergencyState,
      isValid: systemState.currentState.exists && !systemState.emergencyState.isInDangerousDirectory
    };
  }

  private async setWorkingDirectory(args: { path: string; updateConfig?: boolean }) {
    try {
      const resolvedPath = pathManager.getValidPath(args.path);
      const oldDir = process.cwd();
      
      // Change working directory
      process.chdir(resolvedPath);
      
      // Update config if requested
      if (args.updateConfig !== false) {
        mcpConfig.updateConfig('workingDirectory', resolvedPath);
        mcpConfig.incrementStat('workingDirChanges');
      }

      // AUTO-FIX: Ensure new working directory is in allowed directories
      const config = mcpConfig.getConfig();
      if (!config.allowedDirectories.includes(resolvedPath)) {
        const updatedAllowedDirs = [...config.allowedDirectories, resolvedPath];
        mcpConfig.updateConfig('allowedDirectories', updatedAllowedDirs);
        console.error(`✅ Auto-added new working directory to allowed directories: ${resolvedPath}`);
      }

      return {
        success: true,
        message: `Changed working directory from ${oldDir} to ${resolvedPath}`,
        oldDirectory: oldDir,
        newDirectory: resolvedPath,
        configUpdated: args.updateConfig !== false,
        allowedDirectoriesUpdated: !config.allowedDirectories.includes(resolvedPath)
      };

    } catch (error) {
      // Try recovery
      const recovery = await pathRecovery.recoverFromPathError(
        error instanceof Error ? error : new Error(String(error)), 
        args.path
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        recoveryAttempted: true,
        recoveryResult: recovery
      };
    }
  }

  private async validatePaths(args: { fix?: boolean }) {
    const validation = await pathRecovery.validateAllPaths();
    
    if (args.fix && !validation.isValid) {
      const recovery = await pathRecovery.autoFix();
      return {
        validation,
        fixAttempted: true,
        fixResult: recovery,
        finalValidation: await pathRecovery.validateAllPaths()
      };
    }

    return {
      validation,
      fixAttempted: false
    };
  }

  private async fixPathIssues(args: { emergency?: boolean }) {
    if (args.emergency) {
      const emergencySuccess = await pathRecovery.emergencyReset();
      return {
        emergency: true,
        success: emergencySuccess,
        message: emergencySuccess ? 'Emergency reset completed' : 'Emergency reset failed',
        currentState: pathRecovery.getSystemState()
      };
    }

    const recovery = await pathRecovery.autoFix();
    return {
      emergency: false,
      recovery,
      currentState: pathRecovery.getSystemState()
    };
  }

  private async debugPathResolution(args: { path: string }) {
    const debugInfo = pathManager.debugPath(args.path);
    const resolutionResult = pathManager.safeResolvePath(args.path);

    return {
      inputPath: args.path,
      debugInfo,
      resolutionResult,
      safeResolvedPath: resolutionResult,
      recommendations: debugInfo.suggestions
    };
  }

  private async traceWorkingDirectory(args: { includeSystemInfo?: boolean }) {
    const systemState = pathRecovery.getSystemState();
    
    const result: any = {
      processWorkingDirectory: process.cwd(),
      configWorkingDirectory: systemState.config.workingDirectory,
      projectRoot: systemState.config.projectRoot,
      directoryState: systemState.currentState,
      emergencyState: systemState.emergencyState,
      pathValidation: systemState.pathValidation
    };

    if (args.includeSystemInfo) {
      result.systemInfo = {
        platform: process.platform,
        nodeVersion: process.version,
        environment: {
          PROJECT_ROOT: process.env.PROJECT_ROOT,
          MCP_PROJECT_ROOT: process.env.MCP_PROJECT_ROOT,
          HOME: process.env.HOME || process.env.USERPROFILE
        },
        argv: process.argv,
        execPath: process.execPath,
        pid: process.pid
      };
    }

    return result;
  }

  private async getPathStats(args: { reset?: boolean }) {
    const stats = mcpConfig.getStats();
    const cacheStats = pathManager.getCacheStats();
    
    const result = {
      pathStats: stats,
      cacheStats,
      timestamp: new Date().toISOString()
    };

    if (args.reset) {
      // Reset would need implementation in mcpConfig
      pathManager.clearCache();
    }

    return result;
  }

  private async emergencyReset(args: { confirm?: boolean }) {
    if (!args.confirm) {
      return {
        success: false,
        message: 'Emergency reset requires confirmation (set confirm: true)',
        warning: 'This will reset ALL configuration and change working directory to a safe location',
        currentDangerLevel: pathRecovery.getSystemState().emergencyState
      };
    }

    const success = await pathRecovery.emergencyReset();
    
    if (success) {
      // AUTO-FIX: Ensure new working directory after emergency reset is in allowed directories
      const newWorkingDir = process.cwd();
      const config = mcpConfig.getConfig();
      if (!config.allowedDirectories.includes(newWorkingDir)) {
        const updatedAllowedDirs = [...config.allowedDirectories, newWorkingDir];
        mcpConfig.updateConfig('allowedDirectories', updatedAllowedDirs);
        console.error(`✅ Emergency: Auto-added new working directory to allowed directories: ${newWorkingDir}`);
      }
    }
    
    return {
      success,
      message: success ? '🚨 Emergency reset completed - system restored to safe state' : 'Emergency reset failed',
      newState: pathRecovery.getSystemState(),
      newWorkingDirectory: process.cwd()
    };
  }
}
