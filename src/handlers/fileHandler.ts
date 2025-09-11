import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import chokidar, { FSWatcher } from 'chokidar';
import { ContextManager } from '../context/contextManager.js';
import { CodeSearcher, SearchOptions, SearchSummary } from '../search/codeSearcher.js';
import { 
  SmartEditor, 
  EditStrategy, 
  SmartEditOptions, 
  EditResult,
  SectionEditParams,
  LineEditParams,
  PatternEditParams,
  BetweenEditParams 
} from '../utils/smartEditor.js';
import { pathManager } from '../utils/paths/pathManager.js';
import { pathRecovery } from '../utils/paths/pathRecoveryManager.js';

export class FileHandler {
  private contextManager: ContextManager;
  private watcher: FSWatcher | null = null;
  private watchedPaths: Set<string> = new Set();
  private codeSearcher: CodeSearcher;
  private smartEditor: SmartEditor;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
    const projectInfo = contextManager.getProjectInfo();
    this.codeSearcher = new CodeSearcher(projectInfo?.root || process.cwd());
    this.smartEditor = new SmartEditor();
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
    try {
      // Use path manager to resolve and validate path
      const resolvedPath = pathManager.getValidPath(filePath);
      const content = await fs.readFile(resolvedPath, 'utf-8');
      
      // Update context
      this.contextManager.updateContext('file_read', {
        path: resolvedPath,
        originalPath: filePath,
        size: content.length,
        timestamp: new Date()
      });
      
      // Cache the file
      await this.contextManager.loadFileContext(resolvedPath);
      
      return content;
    } catch (error) {
      // Try path recovery
      const recovery = await pathRecovery.recoverFromPathError(
        error instanceof Error ? error : new Error(String(error)),
        filePath
      );
      
      if (recovery.success) {
        // Retry with recovered path
        const resolvedPath = pathManager.getValidPath(filePath);
        const content = await fs.readFile(resolvedPath, 'utf-8');
        
        this.contextManager.updateContext('file_read', {
          path: resolvedPath,
          originalPath: filePath,
          size: content.length,
          timestamp: new Date(),
          recoveryApplied: true
        });
        
        await this.contextManager.loadFileContext(resolvedPath);
        return content;
      }
      
      throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async writeFile(filePath: string, content: string) {
    try {
      // Use path manager to resolve and validate path
      const resolvedPath = pathManager.getValidPath(filePath);
      await fs.writeFile(resolvedPath, content, 'utf-8');
      
      // Update context
      this.contextManager.updateContext('file_written', {
        path: resolvedPath,
        originalPath: filePath,
        size: content.length,
        timestamp: new Date()
      });
      
      // Reload the file in context
      await this.contextManager.loadFileContext(resolvedPath);
    } catch (error) {
      // Try path recovery
      const recovery = await pathRecovery.recoverFromPathError(
        error instanceof Error ? error : new Error(String(error)),
        filePath
      );
      
      if (recovery.success) {
        // Retry with recovered path
        const resolvedPath = pathManager.getValidPath(filePath);
        await fs.writeFile(resolvedPath, content, 'utf-8');
        
        this.contextManager.updateContext('file_written', {
          path: resolvedPath,
          originalPath: filePath,
          size: content.length,
          timestamp: new Date(),
          recoveryApplied: true
        });
        
        await this.contextManager.loadFileContext(resolvedPath);
        return;
      }
      
      throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
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
   * ENHANCED: Smart edit file with multiple strategies
   * @param filePath Path to the file to edit
   * @param oldContent Text to replace (or parameters object for advanced strategies)
   * @param newContent Replacement text
   * @param options Edit options including strategy selection
   * @returns Result of the edit operation
   */
  async editFile(
    filePath: string,
    oldContent: string | any,
    newContent?: string,
    options?: SmartEditOptions | number
  ): Promise<EditResult> {
    try {
      // Handle backward compatibility with old signature
      if (typeof options === 'number') {
        // Legacy mode: expectedReplacements as number
        const expectedReplacements = options;
        const result = await this.smartEditor.smartEdit(
          filePath,
          oldContent as string,
          newContent || '',
          { strategy: EditStrategy.EXACT }
        );
        
        // Convert to legacy format if needed
        if (expectedReplacements !== -1 && result.replacements !== expectedReplacements) {
          return {
            success: false,
            message: `Expected ${expectedReplacements} replacement(s) but found ${result.replacements} occurrence(s)`,
            replacements: result.replacements
          };
        }
        
        return result;
      }
      
      // New smart edit mode with options
      const editOptions = options || {};
      
      // Determine strategy from options or use default
      const strategy = editOptions.strategy || EditStrategy.EXACT;
      
      switch (strategy) {
        case EditStrategy.FUZZY:
          return await this.smartEditor.smartEdit(
            filePath,
            oldContent as string,
            newContent || '',
            { ...editOptions, fuzzy: true }
          );
          
        case EditStrategy.SECTION:
          const sectionParams = oldContent as SectionEditParams;
          return await this.smartEditor.editSection({
            path: filePath,
            sectionStart: sectionParams.sectionStart,
            sectionEnd: sectionParams.sectionEnd,
            newContent: newContent || sectionParams.newContent,
            options: editOptions
          });
          
        case EditStrategy.LINES:
          const lineParams = oldContent as LineEditParams;
          return await this.smartEditor.editLines({
            path: filePath,
            startLine: lineParams.startLine,
            endLine: lineParams.endLine,
            newContent: newContent || lineParams.newContent,
            options: editOptions
          });
          
        case EditStrategy.PATTERN:
          const patternParams = oldContent as PatternEditParams;
          return await this.smartEditor.editPattern({
            path: filePath,
            pattern: patternParams.pattern,
            newContent: newContent || patternParams.newContent,
            options: editOptions
          });
          
        case EditStrategy.BETWEEN:
          const betweenParams = oldContent as BetweenEditParams;
          return await this.smartEditor.editBetween({
            path: filePath,
            startMarker: betweenParams.startMarker,
            endMarker: betweenParams.endMarker,
            newContent: newContent || betweenParams.newContent,
            includeMarkers: betweenParams.includeMarkers,
            options: editOptions
          });
          
        default:
          // Default to exact matching
          return await this.smartEditor.smartEdit(
            filePath,
            oldContent as string,
            newContent || '',
            editOptions
          );
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Error editing file: ${error instanceof Error ? error.message : String(error)}`
      };
    } finally {
      // Always reload the file in context after edit attempt
      await this.contextManager.loadFileContext(filePath);
    }
  }

  /**
   * Edit a section in a file (e.g., between markdown headers)
   */
  async editSection(
    filePath: string,
    sectionStart: string,
    newContent: string,
    sectionEnd?: string,
    options?: SmartEditOptions
  ): Promise<EditResult> {
    return await this.smartEditor.editSection({
      path: filePath,
      sectionStart,
      sectionEnd,
      newContent,
      options
    });
  }

  /**
   * Edit specific lines in a file
   */
  async editLines(
    filePath: string,
    startLine: number,
    endLine: number,
    newContent: string,
    options?: SmartEditOptions
  ): Promise<EditResult> {
    return await this.smartEditor.editLines({
      path: filePath,
      startLine,
      endLine,
      newContent,
      options
    });
  }

  /**
   * Edit using a pattern (regex or string)
   */
  async editPattern(
    filePath: string,
    pattern: string | RegExp,
    newContent: string,
    options?: SmartEditOptions
  ): Promise<EditResult> {
    return await this.smartEditor.editPattern({
      path: filePath,
      pattern,
      newContent,
      options
    });
  }

  /**
   * Edit content between two markers
   */
  async editBetween(
    filePath: string,
    startMarker: string,
    endMarker: string,
    newContent: string,
    includeMarkers: boolean = false,
    options?: SmartEditOptions
  ): Promise<EditResult> {
    return await this.smartEditor.editBetween({
      path: filePath,
      startMarker,
      endMarker,
      newContent,
      includeMarkers,
      options
    });
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
