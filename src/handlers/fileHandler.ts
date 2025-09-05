import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import chokidar, { FSWatcher } from 'chokidar';
import { ContextManager } from '../context/contextManager.js';
import { CodeSearcher, SearchOptions, SearchSummary } from '../search/codeSearcher.js';

export class FileHandler {
  private contextManager: ContextManager;
  private watcher: FSWatcher | null = null;
  private watchedPaths: Set<string> = new Set();
  private codeSearcher: CodeSearcher;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
    const projectInfo = contextManager.getProjectInfo();
    this.codeSearcher = new CodeSearcher(projectInfo?.root || process.cwd());
  }

  startWatching() {
    try {
      const projectInfo = this.contextManager.getProjectInfo();
      const projectRoot = projectInfo?.root;
      
      // Safety check: Don't watch root directory or invalid paths
      if (!projectRoot || projectRoot === '/' || projectRoot === 'C:\\' || projectRoot.length < 5) {
        console.error('File watching disabled - unsafe or invalid project root:', projectRoot);
        return;
      }
      
      // Additional safety: Check if path exists and is a directory
      if (!fsSync.existsSync(projectRoot) || !fsSync.statSync(projectRoot).isDirectory()) {
        console.error('File watching disabled - invalid project directory:', projectRoot);
        return;
      }
      
      console.error('Starting file watching for project root:', projectRoot);
      
      this.watcher = chokidar.watch(projectRoot, {
        ignored: [
          /(^|[\/\\])\../,           // Ignore dotfiles
          '**/node_modules/**',      // Node modules
          '**/dist/**',              // Build outputs
          '**/build/**',             // Build outputs
          '**/target/**',            // Java/Rust builds
          '**/vendor/**',            // Vendor dependencies
          '**/*.log',                // Log files
          '**/tmp/**',               // Temp files
          '**/.git/**',              // Git files
          '**/coverage/**',          // Test coverage
          '**/__pycache__/**',       // Python cache
          '**/venv/**',              // Python virtual env
          '**/.venv/**',             // Python virtual env
          '**/env/**',               // Environment
          '**/.env/**',              // Environment
          '**/*.pyc',                // Python compiled
          '**/*.pyo',                // Python optimized
          '**/*.class',              // Java compiled
          '**/*.o',                  // Object files
          '**/*.so',                 // Shared libraries
          '**/*.dylib',              // MacOS dynamic libraries
          '**/*.dll'                 // Windows dynamic libraries
        ],
        persistent: true,
        ignoreInitial: true,
        depth: 10,                   // Limit depth
        ignorePermissionErrors: true, // Ignore permission errors
        followSymlinks: false,        // Don't follow symlinks for security
        usePolling: false,           // Use native events
        interval: 1000,              // Polling interval if needed
        binaryInterval: 2000,        // Binary file polling
        awaitWriteFinish: {          // Wait for writes to complete
          stabilityThreshold: 100,
          pollInterval: 100
        }
      });
      
      this.watcher
        .on('add', (filePath) => this.handleFileAdd(filePath))
        .on('change', (filePath) => this.handleFileChange(filePath))
        .on('unlink', (filePath) => this.handleFileRemove(filePath))
        .on('error', (error) => {
          console.error('File watcher error:', error);
          // Don't crash the server on watcher errors
        });
      
      console.error('File watching started successfully for:', projectRoot);
      
    } catch (error) {
      console.error('Failed to start file watching:', error);
      // Don't crash the server if file watching fails
    }
  }
  stopWatching() {
    if (this.watcher) {
      try {
        this.watcher.close();
        this.watcher = null;
        console.error('File watching stopped successfully');
      } catch (error) {
        console.error('Error stopping file watcher:', error);
      }
    }
  }

  private async handleFileAdd(filePath: string) {
    console.error('File added:', filePath);
    
    this.contextManager.updateContext('file_added', {
      path: filePath,
      timestamp: new Date()
    });
    
    // If it's an important file, load it into context
    if (this.isImportantFile(filePath)) {
      await this.contextManager.loadFileContext(filePath);
    }
  }

  private async handleFileChange(filePath: string) {
    console.error('File changed:', filePath);
    
    this.contextManager.updateContext('file_changed', {
      path: filePath,
      timestamp: new Date()
    });
    
    // Reload the file in context if it's cached
    await this.contextManager.loadFileContext(filePath);
  }

  private handleFileRemove(filePath: string) {
    console.error('File removed:', filePath);
    
    this.contextManager.updateContext('file_removed', {
      path: filePath,
      timestamp: new Date()
    });
  }
  async readFile(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Update context
    this.contextManager.updateContext('file_read', {
      path: filePath,
      size: content.length,
      timestamp: new Date()
    });
    
    // Cache the file
    await this.contextManager.loadFileContext(filePath);
    
    return content;
  }

  async writeFile(filePath: string, content: string) {
    await fs.writeFile(filePath, content, 'utf-8');
    
    // Update context
    this.contextManager.updateContext('file_written', {
      path: filePath,
      size: content.length,
      timestamp: new Date()
    });
    
    // Reload the file in context
    await this.contextManager.loadFileContext(filePath);
  }

  async listDirectory(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    const result = entries.map(entry => {
      if (entry.isDirectory()) {
        return `[DIR] ${entry.name}`;
      } else {
        return `[FILE] ${entry.name}`;
      }
    });
    
    this.contextManager.updateContext('directory_listed', {
      path: dirPath,
      entryCount: entries.length,
      timestamp: new Date()
    });
    
    return result;
  }
  async createDirectory(dirPath: string) {
    await fs.mkdir(dirPath, { recursive: true });
    
    this.contextManager.updateContext('directory_created', {
      path: dirPath,
      timestamp: new Date()
    });
  }

  async deleteFile(filePath: string) {
    await fs.unlink(filePath);
    
    this.contextManager.updateContext('file_deleted', {
      path: filePath,
      timestamp: new Date()
    });
  }

  async moveFile(sourcePath: string, destPath: string) {
    await fs.rename(sourcePath, destPath);
    
    this.contextManager.updateContext('file_moved', {
      source: sourcePath,
      destination: destPath,
      timestamp: new Date()
    });
  }

  async getFileStats(filePath: string) {
    const stats = await fs.stat(filePath);
    
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
  }

  private isImportantFile(filePath: string): boolean {
    const importantPatterns = [
      /src\//,
      /index\./,
      /main\./,
      /app\./,
      /README\.md$/,
      /package\.json$/,
      /\.config\./,
      /CLAUDE\.md$/
    ];
    
    return importantPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Read multiple files at once
   * @param filePaths Array of file paths to read
   * @returns Array of file contents with metadata
   */
  async readMultipleFiles(filePaths: string[]): Promise<Array<{
    path: string;
    content: string | null;
    error?: string;
  }>> {
    const results = await Promise.allSettled(
      filePaths.map(async (filePath) => {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          
          // Update context for each file read
          this.contextManager.updateContext('file_read', {
            path: filePath,
            size: content.length,
            timestamp: new Date()
          });
          
          // Cache the file
          await this.contextManager.loadFileContext(filePath);
          
          return {
            path: filePath,
            content: content
          };
        } catch (error) {
          return {
            path: filePath,
            content: null,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          path: '',
          content: null,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason)
        };
      }
    });
  }

  /**
   * Edit a file by replacing old content with new content
   * Supports surgical text replacements with validation
   * @param filePath Path to the file to edit
   * @param oldContent Text to replace
   * @param newContent Replacement text
   * @param expectedReplacements Number of expected replacements (default: 1)
   * @returns Result of the edit operation
   */
  async editFile(
    filePath: string,
    oldContent: string,
    newContent: string,
    expectedReplacements: number = 1
  ): Promise<{
    success: boolean;
    message: string;
    replacements?: number;
  }> {
    try {
      // Read the current file content
      const currentContent = await fs.readFile(filePath, 'utf-8');
      
      // Count occurrences
      const occurrences = (currentContent.match(new RegExp(
        oldContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 
        'g'
      )) || []).length;
      
      // Validate expected replacements
      if (occurrences === 0) {
        // Try to find similar content for helpful error message
        const lines = currentContent.split('\n');
        const oldLines = oldContent.split('\n');
        const firstOldLine = oldLines[0];
        
        let similarLine = '';
        for (const line of lines) {
          if (line.includes(firstOldLine.trim()) || 
              this.calculateSimilarity(line, firstOldLine) > 0.7) {
            similarLine = line;
            break;
          }
        }
        
        return {
          success: false,
          message: `Content not found. ${similarLine ? 
            `Did you mean: "${similarLine.substring(0, 50)}..."?` : 
            'Please check the exact text to replace.'}`
        };
      }
      
      if (expectedReplacements !== -1 && occurrences !== expectedReplacements) {
        return {
          success: false,
          message: `Expected ${expectedReplacements} replacement(s) but found ${occurrences} occurrence(s)`,
          replacements: occurrences
        };
      }
      
      // Perform the replacement
      let updatedContent = currentContent;
      if (expectedReplacements === -1) {
        // Replace all occurrences
        updatedContent = currentContent.split(oldContent).join(newContent);
      } else {
        // Replace specific number of occurrences
        let count = 0;
        updatedContent = currentContent.replace(
          new RegExp(oldContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          (match) => {
            count++;
            return count <= expectedReplacements ? newContent : match;
          }
        );
      }
      
      // Write the updated content
      await fs.writeFile(filePath, updatedContent, 'utf-8');
      
      // Update context
      this.contextManager.updateContext('file_edited', {
        path: filePath,
        size: updatedContent.length,
        timestamp: new Date(),
        replacements: occurrences
      });
      
      // Reload the file in context
      await this.contextManager.loadFileContext(filePath);
      
      return {
        success: true,
        message: `Successfully replaced ${occurrences} occurrence(s)`,
        replacements: occurrences
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Error editing file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,  // substitution
            matrix[i][j - 1] + 1,       // insertion
            matrix[i - 1][j] + 1        // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Search for code patterns in the project
   * @param options Search options
   * @returns Search summary with results
   */
  async searchCode(options: SearchOptions): Promise<SearchSummary> {
    try {
      // Update context
      this.contextManager.updateContext('code_search', {
        pattern: options.pattern,
        directory: options.directory,
        timestamp: new Date()
      });

      // Perform search
      const results = await this.codeSearcher.searchCode(options);

      // Log search metrics
      console.error(`Code search completed: ${results.totalMatches} matches in ${results.matchedFiles} files (${results.searchTime}ms)`);

      return results;
    } catch (error) {
      console.error('Code search error:', error);
      throw error;
    }
  }

  /**
   * Search for symbol definitions (functions, classes, etc)
   * @param symbolName Symbol name to search for
   * @param filePattern Optional file pattern filter
   * @returns Search results
   */
  async searchSymbols(symbolName: string, filePattern?: string) {
    try {
      this.contextManager.updateContext('symbol_search', {
        symbol: symbolName,
        timestamp: new Date()
      });

      return await this.codeSearcher.searchSymbols(symbolName, filePattern);
    } catch (error) {
      console.error('Symbol search error:', error);
      throw error;
    }
  }

  /**
   * Search for TODO/FIXME comments in code
   * @param includeNotes Include NOTE/INFO/WARNING comments
   * @returns Search results
   */
  async searchTodos(includeNotes: boolean = false) {
    try {
      this.contextManager.updateContext('todo_search', {
        includeNotes,
        timestamp: new Date()
      });

      return await this.codeSearcher.searchTodos(includeNotes);
    } catch (error) {
      console.error('TODO search error:', error);
      throw error;
    }
  }
}
