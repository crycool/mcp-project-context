import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface MemoryFile {
  path: string;
  content: string;
  type: 'project' | 'user' | 'local' | 'enterprise';
  lastModified: Date;
  priority: number;
}

export class FileBasedMemoryManager {
  private projectRoot: string;
  private memoryFiles: Map<string, MemoryFile> = new Map();
  private consolidatedMemory: string = '';

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async initialize(): Promise<void> {
    await this.loadAllMemoryFiles();
    await this.consolidateMemories();
  }

  /**
   * Load all memory files in hierarchical order
   */
  private async loadAllMemoryFiles(): Promise<void> {
    const memoryPaths = [
      // Enterprise (highest priority)
      { path: this.getEnterprisePath(), type: 'enterprise' as const, priority: 100 },
      
      // Project memory (team-shared)
      { path: path.join(this.projectRoot, 'CLAUDE.md'), type: 'project' as const, priority: 90 },
      
      // User memory (all projects)
      { path: path.join(os.homedir(), '.claude', 'CLAUDE.md'), type: 'user' as const, priority: 80 },
      
      // Local project memory (personal)
      { path: path.join(this.projectRoot, 'CLAUDE.local.md'), type: 'local' as const, priority: 70 }
    ];

    for (const memoryPath of memoryPaths) {
      await this.loadMemoryFile(memoryPath.path, memoryPath.type, memoryPath.priority);
    }
  }

  /**
   * Load a single memory file with import processing
   */
  private async loadMemoryFile(filePath: string, type: MemoryFile['type'], priority: number): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const processedContent = await this.processImports(content, path.dirname(filePath));
      
      const stats = await fs.stat(filePath);
      
      this.memoryFiles.set(filePath, {
        path: filePath,
        content: processedContent,
        type,
        lastModified: stats.mtime,
        priority
      });
      
      console.error(`✅ Loaded ${type} memory: ${path.relative(this.projectRoot, filePath)}`);
    } catch (error) {
      // Memory file doesn't exist - that's OK
    }
  }

  /**
   * Process @import directives recursively
   */
  private async processImports(content: string, baseDir: string, depth: number = 0): Promise<string> {
    if (depth > 5) return content; // Prevent infinite recursion
    
    const importPattern = /@import\s+(.+)/g;
    let processedContent = content;
    
    for (const match of content.matchAll(importPattern)) {
      const importPath = match[1].trim();
      const resolvedPath = await this.resolveImportPath(importPath, baseDir);
      
      if (resolvedPath) {
        try {
          const importedContent = await fs.readFile(resolvedPath, 'utf-8');
          const processedImport = await this.processImports(importedContent, path.dirname(resolvedPath), depth + 1);
          processedContent = processedContent.replace(match[0], `\n<!-- Imported from ${importPath} -->\n${processedImport}\n`);
        } catch (error) {
          processedContent = processedContent.replace(match[0], `\n<!-- Import failed: ${importPath} -->\n`);
        }
      }
    }
    
    return processedContent;
  }

  /**
   * Resolve import path (relative, absolute, home directory)
   */
  private async resolveImportPath(importPath: string, baseDir: string): Promise<string | null> {
    if (importPath.startsWith('~/')) {
      return path.join(os.homedir(), importPath.slice(2));
    }
    
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return path.resolve(baseDir, importPath);
    }
    
    if (importPath.startsWith('/')) {
      return importPath;
    }
    
    // Try relative to base directory
    const relativePath = path.resolve(baseDir, importPath);
    try {
      await fs.access(relativePath);
      return relativePath;
    } catch {
      // Try with common extensions
      const extensions = ['.md', '.txt', '.markdown'];
      for (const ext of extensions) {
        const withExt = relativePath + ext;
        try {
          await fs.access(withExt);
          return withExt;
        } catch {}
      }
    }
    
    return null;
  }

  /**
   * Consolidate all memory files into single context string
   */
  private async consolidateMemories(): Promise<void> {
    const sections: string[] = [];
    
    // Sort by priority (highest first)
    const sortedMemories = Array.from(this.memoryFiles.values())
      .sort((a, b) => b.priority - a.priority);
    
    if (sortedMemories.length === 0) {
      this.consolidatedMemory = '## 🧠 Project Memory\n\n*No memory files found. Create CLAUDE.md in your project root to get started.*\n';
      return;
    }
    
    sections.push('## 🧠 Project Memory\n');
    
    for (const memory of sortedMemories) {
      const relPath = path.relative(this.projectRoot, memory.path);
      sections.push(`### Memory from ${memory.type}: ${relPath}\n`);
      sections.push(memory.content);
      sections.push('\n---\n');
    }
    
    this.consolidatedMemory = sections.join('\n');
  }

  /**
   * Get consolidated memory content for context
   */
  getMemoryContent(): string {
    return this.consolidatedMemory;
  }

  /**
   * Add new memory entry to project memory file
   */
  async addMemory(content: string, tags: string[] = []): Promise<string> {
    const projectMemoryPath = path.join(this.projectRoot, 'CLAUDE.md');
    
    const timestamp = new Date().toISOString();
    const memoryEntry = `\n## ${timestamp}\n${content}\n${tags.length > 0 ? `**Tags:** ${tags.join(', ')}\n` : ''}\n`;
    
    try {
      // Append to existing file or create new one
      await fs.appendFile(projectMemoryPath, memoryEntry, 'utf-8');
    } catch (error) {
      // Create directory if needed and write file
      await fs.mkdir(path.dirname(projectMemoryPath), { recursive: true });
      const header = '# Project Memory\n\nThis file contains project-specific memories and context.\n\n';
      await fs.writeFile(projectMemoryPath, header + memoryEntry, 'utf-8');
    }
    
    // Reload memory files to update context
    await this.loadMemoryFile(projectMemoryPath, 'project', 90);
    await this.consolidateMemories();
    
    return `Memory added to ${path.relative(this.projectRoot, projectMemoryPath)}`;
  }

  /**
   * Add quick memory (like Claude Code's # syntax)
   */
  async addQuickMemory(content: string): Promise<string> {
    return await this.addMemory(`💡 **Quick Note:** ${content}`);
  }

  /**
   * Get recent memory entries
   */
  getRecentMemories(limit: number = 10): string {
    const projectMemoryFile = this.memoryFiles.get(path.join(this.projectRoot, 'CLAUDE.md'));
    
    if (!projectMemoryFile) {
      return 'No project memories found. Use add_memory to create the first entry.';
    }
    
    // Extract recent entries by finding ## timestamps
    const entries = projectMemoryFile.content.split(/^## \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/m);
    const recentEntries = entries.slice(-limit).filter(entry => entry.trim());
    
    return recentEntries.join('\n---\n');
  }

  /**
   * Get memory files status
   */
  getMemoryStatus(): string {
    const status: string[] = [];
    status.push('📁 **Memory Files Status:**\n');
    
    if (this.memoryFiles.size === 0) {
      status.push('❌ No memory files found\n');
      status.push('💡 Create CLAUDE.md in your project root to get started');
      return status.join('');
    }
    
    const sortedMemories = Array.from(this.memoryFiles.values())
      .sort((a, b) => b.priority - a.priority);
    
    for (const memory of sortedMemories) {
      const relPath = path.relative(this.projectRoot, memory.path);
      const size = Math.ceil(memory.content.length / 4); // Rough token estimate
      status.push(`✅ **${memory.type}**: ${relPath} (${size} tokens)`);
    }
    
    return status.join('\n');
  }

  /**
   * Reload all memory files (for file watching)
   */
  async reloadMemories(): Promise<void> {
    this.memoryFiles.clear();
    await this.loadAllMemoryFiles();
    await this.consolidateMemories();
  }

  /**
   * Get enterprise policy path based on OS
   */
  private getEnterprisePath(): string {
    switch (process.platform) {
      case 'darwin':
        return '/Library/Application Support/ClaudeCode/CLAUDE.md';
      case 'win32':
        return 'C:\\ProgramData\\ClaudeCode\\CLAUDE.md';
      default:
        return '/etc/claude-code/CLAUDE.md';
    }
  }

  /**
   * Ensure user claude directory exists
   */
  async ensureUserClaudeDirectory(): Promise<void> {
    const claudeDir = path.join(os.homedir(), '.claude');
    try {
      await fs.mkdir(claudeDir, { recursive: true });
    } catch {
      // Directory already exists
    }
  }
}
