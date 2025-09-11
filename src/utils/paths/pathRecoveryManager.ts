import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { mcpConfig, MCPConfig, ValidationReport } from '../../config/mcpConfig.js';
import { pathManager, DebugInfo } from './pathManager.js';

export interface RecoveryReport {
  success: boolean;
  actions: string[];
  errors: string[];
  warnings: string[];
  beforeState: DirectoryState;
  afterState: DirectoryState;
  recoveryTime: number;
}

export interface DirectoryState {
  workingDirectory: string;
  projectRoot: string;
  exists: boolean;
  isGitRepo: boolean;
  hasWriteAccess: boolean;
  pathValidation: ValidationReport;
}

export interface EmergencyState {
  isInDangerousDirectory: boolean;
  isInClaudeExeDirectory: boolean;
  canAccessProjectFiles: boolean;
  recommendedActions: string[];
}

export class PathRecoveryManager {
  private static instance: PathRecoveryManager;
  private config: MCPConfig;

  private constructor() {
    this.config = mcpConfig.getConfig();
    mcpConfig.onConfigChange((newConfig) => {
      this.config = newConfig;
    });
  }

  static getInstance(): PathRecoveryManager {
    if (!PathRecoveryManager.instance) {
      PathRecoveryManager.instance = new PathRecoveryManager();
    }
    return PathRecoveryManager.instance;
  }

  /**
   * Detect and fix working directory issues
   */
  async detectAndFixWorkingDirectory(): Promise<RecoveryReport> {
    const startTime = Date.now();
    const beforeState = this.getCurrentDirectoryState();
    
    const report: RecoveryReport = {
      success: false,
      actions: [],
      errors: [],
      warnings: [],
      beforeState,
      afterState: beforeState,
      recoveryTime: 0
    };

    try {
      // Step 1: Check if current directory is problematic
      const emergency = this.checkEmergencyState();
      if (emergency.isInDangerousDirectory || emergency.isInClaudeExeDirectory) {
        report.actions.push('Detected dangerous or Claude exe directory');
        
        // Attempt to find and switch to project directory
        const projectPath = await this.findActualProjectDirectory();
        if (projectPath) {
          this.switchToDirectory(projectPath, report);
        } else {
          // Emergency fallback
          this.emergencyFallback(report);
        }
      }

      // Step 2: Validate current working directory
      const validation = mcpConfig.validateConfig();
      if (!validation.isValid) {
        report.warnings.push(...validation.warnings);
        report.errors.push(...validation.errors);
        
        // Try to fix validation issues
        await this.fixValidationIssues(validation, report);
      }

      // Step 3: Update config with confirmed working state
      if (report.actions.length > 0 && report.errors.length === 0) {
        mcpConfig.updateConfig('workingDirectory', process.cwd());
        mcpConfig.updateConfig('projectRoot', await this.findProjectRoot() || process.cwd());
        report.actions.push('Updated config with corrected paths');
        report.success = true;
      }

      report.afterState = this.getCurrentDirectoryState();
      report.recoveryTime = Date.now() - startTime;

    } catch (error) {
      report.errors.push(`Recovery failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return report;
  }

  private getCurrentDirectoryState(): DirectoryState {
    const cwd = process.cwd();
    const projectRoot = this.config.projectRoot || cwd;
    
    return {
      workingDirectory: cwd,
      projectRoot,
      exists: fs.existsSync(cwd),
      isGitRepo: fs.existsSync(path.join(cwd, '.git')),
      hasWriteAccess: this.checkWriteAccess(cwd),
      pathValidation: mcpConfig.validateConfig()
    };
  }

  private checkWriteAccess(dirPath: string): boolean {
    try {
      const testFile = path.join(dirPath, '.mcp-write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return true;
    } catch (error) {
      return false;
    }
  }

  private checkEmergencyState(): EmergencyState {
    const cwd = process.cwd();
    const isInDangerousDirectory = [
      '/', 'C:\\', '/System', '/Windows', 
      '/Users/Shared', '/tmp', 'C:\\Temp'
    ].includes(cwd) || cwd.includes('System32');
    
    const isInClaudeExeDirectory = cwd.includes('AnthropicClaude') || 
                                   cwd.includes('app-') || 
                                   cwd.includes('Resources');
    
    const canAccessProjectFiles = this.config.projectRoot ? 
      fs.existsSync(this.config.projectRoot) : false;

    const recommendedActions = [];
    if (isInDangerousDirectory) {
      recommendedActions.push('Move to safe project directory');
    }
    if (isInClaudeExeDirectory) {
      recommendedActions.push('Switch to actual project directory');
    }
    if (!canAccessProjectFiles) {
      recommendedActions.push('Configure valid project root');
    }

    return {
      isInDangerousDirectory,
      isInClaudeExeDirectory,
      canAccessProjectFiles,
      recommendedActions
    };
  }

  private async findActualProjectDirectory(): Promise<string | null> {
    // Strategy 1: Use environment variables
    const envPaths = [
      process.env.PROJECT_ROOT,
      process.env.MCP_PROJECT_ROOT,
      process.env.WORKSPACE_ROOT
    ].filter(Boolean);

    for (const envPath of envPaths) {
      if (envPath && fs.existsSync(envPath) && this.isValidProjectDirectory(envPath)) {
        return path.resolve(envPath);
      }
    }

    // Strategy 2: Search for git repositories in common locations
    const searchPaths = [
      path.join(os.homedir(), 'Documents'),
      path.join(os.homedir(), 'Projects'), 
      path.join(os.homedir(), 'Development'),
      path.join(os.homedir(), 'dev'),
      path.join(os.homedir(), 'workspace'),
      path.join(os.homedir(), 'Desktop'),
      '/Users/yusufkamil/Desktop', // User specific
      'C:\\Projects',
      'C:\\Dev',
      'C:\\Users\\' + os.userInfo().username + '\\Desktop'
    ];

    for (const searchPath of searchPaths) {
      if (!fs.existsSync(searchPath)) continue;
      
      try {
        const dirs = fs.readdirSync(searchPath);
        for (const dir of dirs) {
          const fullPath = path.join(searchPath, dir);
          if (this.isValidProjectDirectory(fullPath)) {
            return fullPath;
          }
        }
      } catch (error) {
        // Continue searching
      }
    }

    // Strategy 3: Look for known project patterns
    const knownProjects = [
      'mcp-project-context',
      'teamvoicechat',
      'project-context',
      'SurpriseBox'
    ];

    for (const searchPath of searchPaths) {
      if (!fs.existsSync(searchPath)) continue;
      
      for (const projectName of knownProjects) {
        const projectPath = path.join(searchPath, projectName);
        if (this.isValidProjectDirectory(projectPath)) {
          return projectPath;
        }
      }
    }

    return null;
  }

  private isValidProjectDirectory(dirPath: string): boolean {
    if (!fs.existsSync(dirPath)) return false;
    
    try {
      const stat = fs.statSync(dirPath);
      if (!stat.isDirectory()) return false;
      
      // Check for project indicators
      const indicators = [
        '.git',
        'package.json',
        'README.md',
        'CLAUDE.md',
        'src',
        'pyproject.toml',
        'Cargo.toml',
        'pom.xml',
        '.project'
      ];
      
      return indicators.some(indicator => 
        fs.existsSync(path.join(dirPath, indicator)));
        
    } catch (error) {
      return false;
    }
  }

  private switchToDirectory(targetDir: string, report: RecoveryReport): void {
    try {
      const oldDir = process.cwd();
      process.chdir(targetDir);
      report.actions.push(`Switched from ${oldDir} to ${targetDir}`);
      mcpConfig.incrementStat('workingDirChanges');
    } catch (error) {
      report.errors.push(`Failed to switch to ${targetDir}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private emergencyFallback(report: RecoveryReport): void {
    const fallbackPaths = [
      this.config.emergencyFallback,
      os.homedir(),
      path.join(os.homedir(), 'Desktop'),
      '/tmp'
    ].filter(p => p && fs.existsSync(p));

    for (const fallbackPath of fallbackPaths) {
      try {
        process.chdir(fallbackPath);
        report.actions.push(`Emergency fallback to ${fallbackPath}`);
        report.warnings.push('Using emergency fallback directory');
        return;
      } catch (error) {
        report.warnings.push(`Failed fallback to ${fallbackPath}`);
      }
    }

    report.errors.push('All fallback directories failed');
  }

  private async fixValidationIssues(validation: ValidationReport, report: RecoveryReport): Promise<void> {
    // Fix working directory if it doesn't exist
    if (!validation.validatedPaths.workingDirectory) {
      const newWorkingDir = await this.findActualProjectDirectory() || os.homedir();
      this.switchToDirectory(newWorkingDir, report);
    }

    // Fix project root if it doesn't exist
    if (!validation.validatedPaths.projectRoot) {
      const newProjectRoot = await this.findProjectRoot();
      if (newProjectRoot) {
        mcpConfig.updateConfig('projectRoot', newProjectRoot);
        report.actions.push(`Updated project root to ${newProjectRoot}`);
      }
    }

    // Clean up non-existent allowed directories
    const validAllowedDirs = this.config.allowedDirectories.filter(dir => 
      fs.existsSync(dir));
    if (validAllowedDirs.length !== this.config.allowedDirectories.length) {
      mcpConfig.updateConfig('allowedDirectories', validAllowedDirs);
      report.actions.push('Cleaned up non-existent allowed directories');
    }
  }

  private async findProjectRoot(): Promise<string | null> {
    let currentDir = process.cwd();
    
    // Search up the directory tree for project indicators
    while (currentDir !== path.resolve(currentDir, '..')) {
      if (this.isValidProjectDirectory(currentDir)) {
        return currentDir;
      }
      currentDir = path.resolve(currentDir, '..');
    }

    // If not found in current path, use the found project directory
    return await this.findActualProjectDirectory();
  }

  /**
   * Recover from a specific path error
   */
  async recoverFromPathError(error: Error, originalPath: string): Promise<RecoveryReport> {
    const startTime = Date.now();
    const beforeState = this.getCurrentDirectoryState();
    
    const report: RecoveryReport = {
      success: false,
      actions: [`Attempting recovery from path error: ${error.message}`],
      errors: [],
      warnings: [],
      beforeState,
      afterState: beforeState,
      recoveryTime: 0
    };

    try {
      // Try path manager's auto-correction first
      const correctedPath = pathManager.safeResolvePath(originalPath);
      if (correctedPath) {
        report.actions.push(`Auto-corrected path: ${originalPath} -> ${correctedPath}`);
        report.success = true;
        return report;
      }

      // If path correction failed, check if it's a working directory issue
      if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
        const recovery = await this.detectAndFixWorkingDirectory();
        report.actions.push(...recovery.actions);
        report.errors.push(...recovery.errors);
        report.warnings.push(...recovery.warnings);
        report.success = recovery.success;
      }

      report.afterState = this.getCurrentDirectoryState();
      report.recoveryTime = Date.now() - startTime;

    } catch (recoveryError) {
      report.errors.push(`Recovery failed: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`);
    }

    return report;
  }

  /**
   * Validate all paths in current configuration
   */
  async validateAllPaths(): Promise<ValidationReport> {
    const report: ValidationReport = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      validatedPaths: {}
    };

    // Validate config paths
    const configValidation = mcpConfig.validateConfig();
    report.errors.push(...configValidation.errors);
    report.warnings.push(...configValidation.warnings);
    report.suggestions.push(...configValidation.suggestions);
    Object.assign(report.validatedPaths, configValidation.validatedPaths);

    if (configValidation.errors.length > 0) {
      report.isValid = false;
    }

    // Validate current working state
    const currentState = this.getCurrentDirectoryState();
    if (!currentState.exists) {
      report.errors.push('Current working directory does not exist');
      report.isValid = false;
    }

    if (!currentState.hasWriteAccess) {
      report.warnings.push('No write access to current working directory');
    }

    // Check emergency state
    const emergency = this.checkEmergencyState();
    if (emergency.isInDangerousDirectory) {
      report.errors.push('Currently in dangerous directory');
      report.suggestions.push(...emergency.recommendedActions);
      report.isValid = false;
    }

    if (emergency.isInClaudeExeDirectory) {
      report.warnings.push('Currently in Claude executable directory');
      report.suggestions.push(...emergency.recommendedActions);
    }

    return report;
  }

  /**
   * Emergency reset - restore to a safe, working state
   */
  async emergencyReset(): Promise<boolean> {
    try {
      console.log('🚨 Emergency reset initiated...');
      
      // Reset config to defaults
      mcpConfig.resetConfig();
      
      // Find and switch to a safe directory
      const safeDir = await this.findActualProjectDirectory() || os.homedir();
      process.chdir(safeDir);
      
      // Update config with safe values
      mcpConfig.updateConfig('workingDirectory', safeDir);
      mcpConfig.updateConfig('projectRoot', safeDir);
      mcpConfig.updateConfig('allowedDirectories', [safeDir]);
      
      // Clear path manager cache
      pathManager.clearCache();
      
      console.log(`✅ Emergency reset complete. Now in: ${safeDir}`);
      return true;
      
    } catch (error) {
      console.error('💥 Emergency reset failed:', error);
      return false;
    }
  }

  /**
   * Get comprehensive system state for debugging
   */
  getSystemState(): {
    currentState: DirectoryState;
    emergencyState: EmergencyState;
    pathValidation: ValidationReport;
    config: MCPConfig;
    pathStats: any;
  } {
    return {
      currentState: this.getCurrentDirectoryState(),
      emergencyState: this.checkEmergencyState(),
      pathValidation: mcpConfig.validateConfig(),
      config: mcpConfig.getConfig(),
      pathStats: mcpConfig.getStats()
    };
  }

  /**
   * Auto-fix common path issues
   */
  async autoFix(): Promise<RecoveryReport> {
    console.log('🔧 Starting auto-fix process...');
    
    const recovery = await this.detectAndFixWorkingDirectory();
    
    if (recovery.success) {
      console.log('✅ Auto-fix completed successfully');
    } else {
      console.log('⚠️ Auto-fix completed with warnings/errors');
    }
    
    return recovery;
  }
}

// Singleton instance
export const pathRecovery = PathRecoveryManager.getInstance();
