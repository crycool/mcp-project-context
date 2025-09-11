import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { mcpConfig, MCPConfig, ValidationReport } from '../../config/mcpConfig.js';

export interface PathResolutionResult {
  originalPath: string;
  resolvedPath: string;
  isValid: boolean;
  isWithinProject: boolean;
  wasAutoCorrect: boolean;
  error?: string;
  suggestion?: string;
}

export interface DebugInfo {
  currentWorkingDirectory: string;
  projectRoot: string;
  inputPath: string;
  resolvedPath: string;
  pathExists: boolean;
  isAbsolute: boolean;
  isWithinAllowedDirs: boolean;
  resolutionSteps: string[];
  warnings: string[];
  suggestions: string[];
}

export class PathManager {
  private static instance: PathManager;
  private config: MCPConfig;
  private resolvedPathCache: Map<string, PathResolutionResult> = new Map();
  private debugMode: boolean = false;

  private constructor() {
    this.config = mcpConfig.getConfig();
    this.debugMode = this.config.debugMode;
    
    // Listen to config changes
    mcpConfig.onConfigChange((newConfig) => {
      this.config = newConfig;
      this.debugMode = newConfig.debugMode;
      this.clearCache();
    });
  }

  static getInstance(): PathManager {
    if (!PathManager.instance) {
      PathManager.instance = new PathManager();
    }
    return PathManager.instance;
  }

  /**
   * Main path resolution method - all path operations go through here
   */
  resolvePath(inputPath: string): PathResolutionResult {
    mcpConfig.incrementStat('totalPathOperations');
    
    const cacheKey = `${inputPath}|${process.cwd()}`;
    if (this.resolvedPathCache.has(cacheKey)) {
      return this.resolvedPathCache.get(cacheKey)!;
    }

    const result = this.performPathResolution(inputPath);
    
    // Cache successful results
    if (result.isValid) {
      this.resolvedPathCache.set(cacheKey, result);
      mcpConfig.incrementStat('successfulOperations');
    } else {
      mcpConfig.recordError(`Path resolution failed for: ${inputPath} - ${result.error}`);
    }

    if (this.debugMode) {
      this.logPathOperation(result);
    }

    return result;
  }

  private performPathResolution(inputPath: string): PathResolutionResult {
    const result: PathResolutionResult = {
      originalPath: inputPath,
      resolvedPath: '',
      isValid: false,
      isWithinProject: false,
      wasAutoCorrect: false
    };

    try {
      // Handle empty or null paths
      if (!inputPath || inputPath.trim() === '') {
        result.resolvedPath = this.config.workingDirectory;
        result.isValid = true;
        result.isWithinProject = true;
        return result;
      }

      let resolvedPath: string;

      // Handle absolute paths
      if (path.isAbsolute(inputPath)) {
        resolvedPath = path.normalize(inputPath);
      } else {
        // Handle relative paths - resolve against project root or working directory
        const basePath = this.config.projectRoot || this.config.workingDirectory;
        resolvedPath = path.resolve(basePath, inputPath);
      }

      result.resolvedPath = resolvedPath;

      // Validate the resolved path
      const validation = this.validatePath(resolvedPath);
      result.isValid = validation.isValid;
      result.isWithinProject = this.isWithinProjectRoot(resolvedPath);

      if (!validation.isValid && this.config.autoCorrection) {
        const correctedPath = this.attemptAutoCorrection(inputPath, resolvedPath);
        if (correctedPath && correctedPath !== resolvedPath) {
          result.resolvedPath = correctedPath;
          result.wasAutoCorrect = true;
          result.isValid = this.validatePath(correctedPath).isValid;
          result.isWithinProject = this.isWithinProjectRoot(correctedPath);
          mcpConfig.incrementStat('autoCorrections');
        }
      }

      if (!result.isValid) {
        result.error = validation.error;
        result.suggestion = this.generatePathSuggestion(inputPath);
      }

    } catch (error) {
      result.error = `Path resolution error: ${error instanceof Error ? error.message : String(error)}`;
    }

    return result;
  }

  private validatePath(pathToValidate: string): { isValid: boolean; error?: string } {
    const normalizedPath = path.normalize(pathToValidate);
    
    // Check for exact dangerous paths
    const exactDangerousPaths = ['/', 'C:\\', '/System', '/Windows', '/usr', '/bin', '/sbin'];
    if (exactDangerousPaths.includes(normalizedPath)) {
      return {
        isValid: false,
        error: `Cannot operate on system directory: ${normalizedPath}`
      };
    }
    
    // Check forbidden paths with more precise logic
    for (const forbidden of this.config.forbiddenPaths) {
      // For system directories, ensure we're not in the immediate directory
      if (forbidden.startsWith('/System') || forbidden.startsWith('/Windows') || forbidden.startsWith('C:\\Windows')) {
        if (normalizedPath.startsWith(forbidden)) {
          return {
            isValid: false,
            error: `Path is in forbidden system directory: ${forbidden}`
          };
        }
      }
      // For other forbidden paths, check if they are exact matches or direct children
      else if (normalizedPath === forbidden || normalizedPath.startsWith(forbidden + path.sep)) {
        return {
          isValid: false,
          error: `Path is in forbidden directory: ${forbidden}`
        };
      }
    }

    // Check allowed directories if specified
    if (this.config.allowedDirectories.length > 0) {
      const isInAllowed = this.config.allowedDirectories.some(allowedDir =>
        normalizedPath.startsWith(path.resolve(allowedDir))
      );
      
      if (!isInAllowed) {
        return {
          isValid: false,
          error: `Path is not in allowed directories`
        };
      }
    }
    
    // Check for dangerous patterns
    if (normalizedPath.includes('..\\..\\') || normalizedPath.includes('../../')) {
      return {
        isValid: false,
        error: `Potentially dangerous path detected`
      };
    }

    return { isValid: true };
  }

  private isWithinProjectRoot(pathToCheck: string): boolean {
    if (!this.config.projectRoot) return true;
    
    const normalizedProject = path.resolve(this.config.projectRoot);
    const normalizedCheck = path.resolve(pathToCheck);
    
    return normalizedCheck.startsWith(normalizedProject);
  }

  private attemptAutoCorrection(originalPath: string, resolvedPath: string): string | null {
    const attempts = [
      // Try relative to project root
      () => {
        if (this.config.projectRoot && !path.isAbsolute(originalPath)) {
          return path.resolve(this.config.projectRoot, originalPath);
        }
        return null;
      },
      
      // Try relative to working directory
      () => {
        if (!path.isAbsolute(originalPath)) {
          return path.resolve(this.config.workingDirectory, originalPath);
        }
        return null;
      },
      
      // Try with backup directories
      () => {
        for (const backupDir of this.config.backupDirectories) {
          const attemptPath = path.resolve(backupDir, path.basename(originalPath));
          if (fs.existsSync(attemptPath)) {
            return attemptPath;
          }
        }
        return null;
      },
      
      // Try to find similar file names
      () => {
        const dir = path.dirname(resolvedPath);
        const filename = path.basename(originalPath);
        
        if (fs.existsSync(dir)) {
          try {
            const files = fs.readdirSync(dir);
            const similar = files.find(file => 
              file.toLowerCase() === filename.toLowerCase() ||
              file.includes(filename) ||
              filename.includes(file)
            );
            
            if (similar) {
              return path.join(dir, similar);
            }
          } catch (error) {
            // Ignore read errors
          }
        }
        return null;
      }
    ];

    for (const attempt of attempts) {
      try {
        const correctedPath = attempt();
        if (correctedPath && fs.existsSync(correctedPath) && 
            this.validatePath(correctedPath).isValid) {
          return correctedPath;
        }
      } catch (error) {
        // Continue to next attempt
      }
    }

    return null;
  }

  private generatePathSuggestion(originalPath: string): string {
    const suggestions = [];

    // Suggest project root relative path
    if (this.config.projectRoot) {
      suggestions.push(`Try relative to project root: ${this.config.projectRoot}`);
    }

    // Suggest working directory relative path
    suggestions.push(`Try relative to working directory: ${this.config.workingDirectory}`);

    // Suggest allowed directories
    if (this.config.allowedDirectories.length > 0) {
      suggestions.push(`Use paths within allowed directories: ${this.config.allowedDirectories.join(', ')}`);
    }

    return suggestions[0] || 'Check path spelling and existence';
  }

  /**
   * Public methods for external use
   */
  getValidPath(inputPath: string): string {
    const result = this.resolvePath(inputPath);
    if (!result.isValid) {
      throw new Error(`Invalid path: ${inputPath} - ${result.error}`);
    }
    return result.resolvedPath;
  }

  safeResolvePath(inputPath: string): string | null {
    try {
      const result = this.resolvePath(inputPath);
      return result.isValid ? result.resolvedPath : null;
    } catch (error) {
      return null;
    }
  }

  debugPath(inputPath: string): DebugInfo {
    const result = this.resolvePath(inputPath);
    const resolvedPath = result.resolvedPath || path.resolve(this.config.workingDirectory, inputPath);
    
    return {
      currentWorkingDirectory: process.cwd(),
      projectRoot: this.config.projectRoot,
      inputPath,
      resolvedPath,
      pathExists: fs.existsSync(resolvedPath),
      isAbsolute: path.isAbsolute(inputPath),
      isWithinAllowedDirs: this.config.allowedDirectories.length === 0 || 
                           this.config.allowedDirectories.some(dir => 
                             resolvedPath.startsWith(path.resolve(dir))),
      resolutionSteps: this.generateResolutionSteps(inputPath),
      warnings: this.generateWarnings(inputPath, resolvedPath),
      suggestions: [result.suggestion].filter((s): s is string => Boolean(s))
    };
  }

  private generateResolutionSteps(inputPath: string): string[] {
    const steps = [];
    steps.push(`Input: ${inputPath}`);
    steps.push(`Is absolute: ${path.isAbsolute(inputPath)}`);
    steps.push(`Current working directory: ${process.cwd()}`);
    steps.push(`Project root: ${this.config.projectRoot}`);
    steps.push(`Working directory: ${this.config.workingDirectory}`);
    
    if (path.isAbsolute(inputPath)) {
      steps.push(`Using absolute path as-is`);
    } else {
      const basePath = this.config.projectRoot || this.config.workingDirectory;
      steps.push(`Resolving relative to: ${basePath}`);
    }
    
    return steps;
  }

  private generateWarnings(inputPath: string, resolvedPath: string): string[] {
    const warnings = [];
    
    if (!fs.existsSync(resolvedPath)) {
      warnings.push(`Resolved path does not exist: ${resolvedPath}`);
    }
    
    if (!this.isWithinProjectRoot(resolvedPath)) {
      warnings.push(`Path is outside project root: ${this.config.projectRoot}`);
    }
    
    if (this.config.forbiddenPaths.some(forbidden => resolvedPath.startsWith(forbidden))) {
      warnings.push(`Path is in forbidden directory`);
    }
    
    return warnings;
  }

  private logPathOperation(result: PathResolutionResult): void {
    const logLevel = result.isValid ? 'log' : 'warn';
    console[logLevel](`[PathManager] ${result.originalPath} -> ${result.resolvedPath} (valid: ${result.isValid}${result.wasAutoCorrect ? ', auto-corrected' : ''})`);
    
    if (result.error) {
      console.warn(`[PathManager] Error: ${result.error}`);
    }
  }

  clearCache(): void {
    this.resolvedPathCache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.resolvedPathCache.size,
      keys: Array.from(this.resolvedPathCache.keys())
    };
  }
}

// Singleton instance
export const pathManager = PathManager.getInstance();
