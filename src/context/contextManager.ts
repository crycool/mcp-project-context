import * as fs from 'fs/promises';
import * as path from 'path';
import { FileBasedMemoryManager } from '../storage/fileBasedMemoryManager.js';
import { ProjectDiscovery, ProjectInfo } from '../discovery/projectDiscovery.js';

export interface ProjectContext {
  project: ProjectInfo;
  memoryContent: string;
  recentFiles: FileInfo[];
  sessionStart: Date;
  interactions: number;
}

export interface FileInfo {
  path: string;
  relativePath: string;
  content: string;
  language: string;
  importance: number;
}

export class ContextManager {
  private fileBasedMemory: FileBasedMemoryManager;
  private projectDiscovery: ProjectDiscovery;
  private context: ProjectContext;
  private fileCache: Map<string, FileInfo> = new Map();

  constructor(fileBasedMemory: FileBasedMemoryManager, projectDiscovery: ProjectDiscovery) {
    this.fileBasedMemory = fileBasedMemory;
    this.projectDiscovery = projectDiscovery;
    
    const projectInfo = projectDiscovery.getProjectInfo();
    if (!projectInfo) {
      throw new Error('Project info not available for Context Manager');
    }
    
    this.context = {
      project: projectInfo,
      memoryContent: '',
      recentFiles: [],
      sessionStart: new Date(),
      interactions: 0
    };
  }

  async initialize(): Promise<void> {
    console.error('🚀 Initializing Context Manager...');
    
    // Initialize file-based memory system
    await this.fileBasedMemory.initialize();
    
    // Load memory content into context
    this.context.memoryContent = this.fileBasedMemory.getMemoryContent();
    
    // Load important files
    await this.loadImportantFiles();
    
    console.error('✅ Context Manager initialized');
  }

  /**
   * Generate full project context
   */
  generateContext(tokenBudget: number = 25000): string {
    const sections: string[] = [];
    let usedTokens = 0;

    // 1. Project Overview (always included)
    const projectSection = this.generateProjectSection();
    sections.push(projectSection);
    usedTokens += this.estimateTokens(projectSection);

    // 2. Memory Content (always included - this is the key difference from old system)
    if (this.context.memoryContent) {
      const memoryTokens = this.estimateTokens(this.context.memoryContent);
      if (usedTokens + memoryTokens <= tokenBudget * 0.6) { // Reserve 40% for other content
        sections.push(this.context.memoryContent);
        usedTokens += memoryTokens;
      } else {
        sections.push('\n## 🧠 Project Memory\n*Memory content available but excluded due to token budget. All memories are file-based and persistent.*\n');
      }
    }

    // 3. Recent Files (if space permits)
    if (this.context.recentFiles.length > 0) {
      const fileSection = this.generateFileSection(tokenBudget - usedTokens);
      sections.push(fileSection);
      usedTokens += this.estimateTokens(fileSection);
    }

    // 4. Project Structure
    const structureSection = this.generateStructureSection();
    sections.push(structureSection);
    usedTokens += this.estimateTokens(structureSection);

    this.context.interactions++;
    
    console.error(`📄 Context generated: ${usedTokens.toLocaleString()} tokens`);
    return sections.join('\n');
  }

  /**
   * Add memory using file-based system
   */
  async addMemory(content: string, tags: string[] = []): Promise<string> {
    const result = await this.fileBasedMemory.addMemory(content, tags);
    
    // Update context with new memory content
    this.context.memoryContent = this.fileBasedMemory.getMemoryContent();
    
    console.error('✅ Memory added to file and context updated');
    return result;
  }

  /**
   * Add quick memory (Claude Code # syntax equivalent)
   */
  async addQuickMemory(content: string): Promise<string> {
    const result = await this.fileBasedMemory.addQuickMemory(content);
    this.context.memoryContent = this.fileBasedMemory.getMemoryContent();
    return result;
  }

  /**
   * Get recent memories from files
   */
  getRecentMemories(limit: number = 10): string {
    return this.fileBasedMemory.getRecentMemories(limit);
  }

  /**
   * Get memory files status
   */
  getMemoryStatus(): string {
    return this.fileBasedMemory.getMemoryStatus();
  }

  /**
   * Reload memories from files (for file watching)
   */
  async reloadMemories(): Promise<void> {
    await this.fileBasedMemory.reloadMemories();
    this.context.memoryContent = this.fileBasedMemory.getMemoryContent();
    console.error('🔄 Memories reloaded from files');
  }

  // =================== PRIVATE HELPER METHODS ===================

  private generateProjectSection(): string {
    const git = this.context.project.gitInfo;
    
    return [
      `# 📁 Project: ${this.context.project.name}`,
      `**Type:** ${this.context.project.type}${this.context.project.framework ? ` (${this.context.project.framework})` : ''}`,
      `**Language:** ${this.context.project.language || 'Unknown'}`,
      `**Root:** ${this.context.project.root}`,
      git ? `**Git:** ${git.branch}${git.isDirty ? ' (modified)' : ' (clean)'}` : '',
      `**Session:** ${this.context.interactions} interactions since ${this.context.sessionStart.toLocaleString()}`,
      ``
    ].filter(line => line !== '').join('\n');
  }

  private generateFileSection(availableTokens: number): string {
    if (this.context.recentFiles.length === 0) {
      return '\n## 📄 Key Files\n*No key files loaded.*\n';
    }

    let section = '\n## 📄 Key Files\n';
    let usedTokens = 0;
    let includedFiles = 0;

    const sortedFiles = this.context.recentFiles
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);

    for (const file of sortedFiles) {
      const fileContent = this.formatFileForContext(file);
      const tokenCount = this.estimateTokens(fileContent);
      
      if (usedTokens + tokenCount <= availableTokens * 0.3 && includedFiles < 3) {
        section += fileContent;
        usedTokens += tokenCount;
        includedFiles++;
      }
    }

    if (includedFiles === 0) {
      section += '*Key files available but excluded due to token budget.*\n';
    }

    return section;
  }

  private generateStructureSection(): string {
    const structure = this.context.project.structure;
    
    return [
      '\n## 📂 Project Structure',
      `**Directories:** ${structure.importantDirs.slice(0, 8).join(', ')}`,
      `**Config Files:** ${structure.configFiles.slice(0, 5).join(', ')}`,
      `**Total Files:** ${this.context.project.files.length} files`,
      ''
    ].join('\n');
  }

  private formatFileForContext(file: FileInfo): string {
    const contentPreview = file.content.substring(0, 300);
    
    return [
      `### 📄 ${file.relativePath}`,
      `**Language:** ${file.language} | **Importance:** ${file.importance}/10`,
      '```' + file.language,
      contentPreview + (file.content.length > 300 ? '\n// ... (truncated)' : ''),
      '```',
      ''
    ].join('\n');
  }

  private async loadImportantFiles(): Promise<void> {
    const importantPatterns = [
      'package.json', 'tsconfig.json', 'README.md',
      '.env.example', 'docker-compose.yml'
    ];
    
    for (const pattern of importantPatterns) {
      const filePath = path.join(this.context.project.root, pattern);
      await this.loadFileInfo(filePath);
    }

    // Load recent source files
    const recentSourceFiles = this.context.project.files
      .filter(f => f.relativePath.includes('src/') || f.relativePath.includes('lib/'))
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(0, 5);
    
    for (const file of recentSourceFiles) {
      await this.loadFileInfo(file.path);
    }
  }

  private async loadFileInfo(filePath: string): Promise<void> {
    if (this.fileCache.has(filePath)) {
      return;
    }
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const truncatedContent = content.slice(0, 2000);
      
      const fileInfo: FileInfo = {
        path: filePath,
        relativePath: path.relative(this.context.project.root, filePath),
        content: truncatedContent,
        language: this.detectLanguage(filePath),
        importance: this.calculateFileImportance(filePath)
      };
      
      this.fileCache.set(filePath, fileInfo);
      this.context.recentFiles.push(fileInfo);
      
      // Keep list manageable
      if (this.context.recentFiles.length > 15) {
        this.context.recentFiles = this.context.recentFiles
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 15);
      }
    } catch {
      // File doesn't exist or can't be read
    }
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript', '.jsx': 'jsx', '.ts': 'typescript', '.tsx': 'tsx',
      '.py': 'python', '.java': 'java', '.cpp': 'cpp', '.c': 'c',
      '.go': 'go', '.rs': 'rust', '.rb': 'ruby', '.php': 'php',
      '.md': 'markdown', '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
      '.html': 'html', '.css': 'css', '.scss': 'scss', '.sql': 'sql'
    };
    return languageMap[ext] || 'text';
  }

  private calculateFileImportance(filePath: string): number {
    const relativePath = path.relative(this.context.project.root, filePath);
    let importance = 5;
    
    if (relativePath.includes('src/')) importance += 2;
    if (relativePath.includes('index.')) importance += 2;
    if (relativePath.includes('main.')) importance += 2;
    if (relativePath.endsWith('README.md')) importance += 3;
    if (relativePath.endsWith('package.json')) importance += 3;
    if (relativePath.endsWith('CLAUDE.md')) importance += 4;
    
    return Math.min(importance, 10);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // =================== PUBLIC INTERFACE ===================

  getProjectInfo(): ProjectInfo {
    return this.context.project;
  }

  getContext(): ProjectContext {
    return this.context;
  }

  updateContext(type: string, data: any): void {
    this.context.interactions++;
    // File-based system doesn't need complex tracking
  }
}
