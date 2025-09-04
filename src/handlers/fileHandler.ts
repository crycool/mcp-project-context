import * as fs from 'fs/promises';
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
    const projectRoot = this.contextManager.getProjectInfo().root;
    
    this.watcher = chokidar.watch(projectRoot, {
      ignored: [
        /(^|[\/\\])\../, // Ignore dotfiles
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.log'
      ],
      persistent: true,
      ignoreInitial: true,
      depth: 5
    });
    
    this.watcher
      .on('add', (filePath) => this.handleFileAdd(filePath))
      .on('change', (filePath) => this.handleFileChange(filePath))
      .on('unlink', (filePath) => this.handleFileRemove(filePath));
    
    console.error('File watching started for:', projectRoot);
  }
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.error('File watching stopped');
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
