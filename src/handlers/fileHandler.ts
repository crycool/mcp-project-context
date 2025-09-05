import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import chokidar, { FSWatcher } from 'chokidar';
import { ContextManager } from '../context/contextManager.js';

export class FileHandler {
  private contextManager: ContextManager;
  private watcher: FSWatcher | null = null;
  private watchedPaths: Set<string> = new Set();

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
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
}
