import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { MemoryManager } from '../storage/memoryManager.js';
import { ProjectDiscovery, ProjectInfo } from '../discovery/projectDiscovery.js';

export interface ProjectContext {
  project: ProjectInfo;
  memories: any[];
  claudeInstructions: string[];
  recentFiles: FileContext[];
  importedFiles: Map<string, string>;
  sessionStart: Date;
  interactions: number;
}

export interface FileContext {
  path: string;
  content: string;
  language: string;
  lastAccessed: Date;
  importance: number;
}

export class ContextManager {
  private memoryManager: MemoryManager;
  private projectDiscovery: ProjectDiscovery;
  private context: ProjectContext;
  private fileCache: Map<string, FileContext> = new Map();
  private importCache: Map<string, string> = new Map();
  private maxContextSize: number = 100000; // ~25k tokens
  constructor(memoryManager: MemoryManager, projectDiscovery: ProjectDiscovery) {
    this.memoryManager = memoryManager;
    this.projectDiscovery = projectDiscovery;
    
    const projectInfo = projectDiscovery.getProjectInfo();
    if (!projectInfo) {
      throw new Error('Project info not available');
    }
    
    this.context = {
      project: projectInfo,
      memories: [],
      claudeInstructions: [],
      recentFiles: [],
      importedFiles: new Map(),
      sessionStart: new Date(),
      interactions: 0
    };
  }

  async initialize() {
    // Load CLAUDE.md files
    await this.loadClaudeInstructions();
    
    // Load recent memories
    this.context.memories = this.memoryManager.getAllMemories();
    
    // Load important project files
    await this.loadImportantFiles();
    
    // Process imports
    await this.processImports();
  }
  private async loadClaudeInstructions() {
    for (const claudeFile of this.context.project.claudeFiles) {
      try {
        const content = await fs.readFile(claudeFile, 'utf-8');
        
        // Parse CLAUDE.md for instructions and imports
        const lines = content.split('\n');
        const instructions: string[] = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Check for imports
          const importMatch = line.match(/@import\s+(.+)/);
          if (importMatch) {
            const importPath = this.resolveImportPath(importMatch[1].trim(), claudeFile);
            if (importPath) {
              this.importCache.set(importPath, '');
            }
            continue;
          }
          
          // Collect non-import content as instructions
          instructions.push(line);
        }
        
        this.context.claudeInstructions.push(instructions.join('\n'));
        
        // Record this in memory
        this.memoryManager.addMemory('observation', {
          type: 'claude_instructions_loaded',
          file: claudeFile,
          instructionCount: instructions.length
        }, ['claude', 'instructions']);
        
      } catch (error) {
        console.error(`Failed to load CLAUDE.md from ${claudeFile}:`, error);
      }
    }
  }
  private async loadImportantFiles() {
    const importantPatterns = [
      'README.md',
      'package.json',
      'tsconfig.json',
      '.env.example',
      'docker-compose.yml'
    ];
    
    for (const pattern of importantPatterns) {
      const filePath = path.join(this.context.project.root, pattern);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const fileContext: FileContext = {
          path: filePath,
          content: content.slice(0, 5000), // Limit content size
          language: this.detectLanguage(filePath),
          lastAccessed: new Date(),
          importance: 8
        };
        
        this.fileCache.set(filePath, fileContext);
        this.context.recentFiles.push(fileContext);
      } catch {
        // File doesn't exist, skip
      }
    }
    
    // Also load recently modified source files
    const recentSourceFiles = this.context.project.files
      .filter(f => f.relativePath.includes('src/'))
      .slice(0, 10);
    
    for (const file of recentSourceFiles) {
      await this.loadFileContext(file.path);
    }
  }
  private async processImports(depth: number = 0) {
    if (depth > 5) return; // Max import depth like Claude Code
    
    const toProcess = Array.from(this.importCache.keys())
      .filter(path => this.importCache.get(path) === '');
    
    for (const importPath of toProcess) {
      try {
        const content = await fs.readFile(importPath, 'utf-8');
        this.importCache.set(importPath, content);
        this.context.importedFiles.set(importPath, content);
        
        // Check for nested imports
        const nestedImports = content.matchAll(/@import\s+(.+)/g);
        for (const match of nestedImports) {
          const nestedPath = this.resolveImportPath(match[1].trim(), importPath);
          if (nestedPath && !this.importCache.has(nestedPath)) {
            this.importCache.set(nestedPath, '');
          }
        }
      } catch (error) {
        console.error(`Failed to import ${importPath}:`, error);
        this.importCache.delete(importPath);
      }
    }
    
    // Process any new imports recursively
    const hasNewImports = Array.from(this.importCache.values()).some(v => v === '');
    if (hasNewImports) {
      await this.processImports(depth + 1);
    }
  }
  async loadFileContext(filePath: string): Promise<FileContext | null> {
    // Check cache first
    if (this.fileCache.has(filePath)) {
      const cached = this.fileCache.get(filePath)!;
      cached.lastAccessed = new Date();
      return cached;
    }
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileContext: FileContext = {
        path: filePath,
        content: content.slice(0, 10000), // Limit to first 10k chars
        language: this.detectLanguage(filePath),
        lastAccessed: new Date(),
        importance: this.calculateFileImportance(filePath)
      };
      
      this.fileCache.set(filePath, fileContext);
      this.context.recentFiles.push(fileContext);
      
      // Keep recent files list manageable
      if (this.context.recentFiles.length > 20) {
        this.context.recentFiles = this.context.recentFiles
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 20);
      }
      
      // Record file access
      this.memoryManager.addMemory('observation', {
        type: 'file_accessed',
        path: filePath,
        timestamp: new Date()
      }, ['file', 'access']);
      
      return fileContext;
    } catch (error) {
      console.error(`Failed to load file ${filePath}:`, error);
      return null;
    }
  }
  generateContext(tokenBudget: number = 25000): string {
    const sections: string[] = [];
    
    // Project overview
    sections.push(`# Project: ${this.context.project.name}`);
    sections.push(`Type: ${this.context.project.type}`);
    if (this.context.project.framework) {
      sections.push(`Framework: ${this.context.project.framework}`);
    }
    sections.push(`Root: ${this.context.project.root}\n`);
    
    // Git information
    if (this.context.project.gitInfo) {
      sections.push(`## Git Status`);
      sections.push(`Branch: ${this.context.project.gitInfo.branch}`);
      sections.push(`Dirty: ${this.context.project.gitInfo.isDirty ? 'Yes' : 'No'}\n`);
    }
    
    // CLAUDE.md instructions
    if (this.context.claudeInstructions.length > 0) {
      sections.push(`## Project Instructions`);
      sections.push(this.context.claudeInstructions.join('\n---\n'));
      sections.push('');
    }
    
    // Important files
    if (this.context.recentFiles.length > 0) {
      sections.push(`## Key Files`);
      for (const file of this.context.recentFiles.slice(0, 5)) {
        const relativePath = path.relative(this.context.project.root, file.path);
        sections.push(`### ${relativePath}`);
        sections.push('```' + file.language);
        sections.push(file.content.slice(0, 1000));
        sections.push('```\n');
      }
    }
    // Project structure
    sections.push(`## Project Structure`);
    sections.push('```');
    for (const dir of this.context.project.structure.importantDirs.slice(0, 10)) {
      sections.push(`📁 ${dir}`);
    }
    sections.push('```\n');
    
    // Recent memories
    const recentMemories = this.context.memories
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
    
    if (recentMemories.length > 0) {
      sections.push(`## Recent Context`);
      for (const memory of recentMemories) {
        if (memory.type === 'observation') {
          sections.push(`- ${JSON.stringify(memory.content)}`);
        }
      }
      sections.push('');
    }
    
    // Combine and trim to token budget
    let context = sections.join('\n');
    
    // Rough token estimation (4 chars per token)
    const estimatedTokens = context.length / 4;
    if (estimatedTokens > tokenBudget) {
      // Trim from the middle sections, keep project info and recent context
      const maxChars = tokenBudget * 4;
      context = context.slice(0, maxChars);
    }
    
    return context;
  }
  updateContext(type: string, data: any) {
    this.context.interactions++;
    
    // Add to memory
    this.memoryManager.addMemory('observation', {
      type,
      data,
      interaction: this.context.interactions
    }, [type]);
    
    // Update recent memories in context
    this.context.memories = this.memoryManager.getAllMemories();
  }

  private resolveImportPath(importPath: string, fromFile: string): string | null {
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return path.resolve(path.dirname(fromFile), importPath);
    }
    
    // Handle absolute imports from project root
    if (importPath.startsWith('/')) {
      return path.join(this.context.project.root, importPath.slice(1));
    }
    
    // Handle imports without extension
    const possibleExtensions = ['.md', '.txt', '.json', '.yaml', '.yml'];
    for (const ext of possibleExtensions) {
      const fullPath = path.resolve(path.dirname(fromFile), importPath + ext);
      try {
        if (require('fs').existsSync(fullPath)) {
          return fullPath;
        }
      } catch {}
    }
    
    return null;
  }
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'jsx',
      '.ts': 'typescript',
      '.tsx': 'tsx',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.md': 'markdown',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sql': 'sql',
      '.sh': 'bash',
      '.bash': 'bash',
      '.zsh': 'zsh',
      '.fish': 'fish',
      '.ps1': 'powershell'
    };
    
    return languageMap[ext] || 'text';
  }

  private calculateFileImportance(filePath: string): number {
    const relativePath = path.relative(this.context.project.root, filePath);
    let importance = 5;
    
    // Increase importance for certain patterns
    if (relativePath.includes('src/')) importance += 2;
    if (relativePath.includes('index.')) importance += 2;
    if (relativePath.includes('main.')) importance += 2;
    if (relativePath.includes('app.')) importance += 1;
    if (relativePath.includes('config')) importance += 1;
    if (relativePath.endsWith('README.md')) importance += 3;
    if (relativePath.endsWith('package.json')) importance += 3;
    
    return Math.min(importance, 10);
  }

  getContext(): ProjectContext {
    return this.context;
  }

  getProjectInfo(): ProjectInfo {
    return this.context.project;
  }

  clearCache() {
    this.fileCache.clear();
    this.context.recentFiles = [];
  }
}
