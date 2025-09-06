import * as fs from 'fs/promises';
import * as path from 'path';
import { MemoryManager, Memory } from '../storage/memoryManager.js';
import { ProjectDiscovery, ProjectInfo } from '../discovery/projectDiscovery.js';
import { DocumentationLoader, DocumentationLoadResult } from './enhanced/documentationLoader.js';
import { EnhancedMemorySearch, CombinedSearchResult, SearchOptions } from './enhanced/enhancedMemorySearch.js';

export interface EnhancedProjectContext {
  project: ProjectInfo;
  documentation: DocumentationLoadResult;
  memories: Memory[];
  recentFiles: FileContext[];
  importedFiles: Map<string, string>;
  sessionStart: Date;
  interactions: number;
  lastContextGeneration: Date;
  contextStats: ContextGenerationStats;
}

export interface FileContext {
  path: string;
  content: string;
  language: string;
  lastAccessed: Date;
  importance: number;
  tokenCount: number;
}

export interface ContextGenerationStats {
  totalTokensUsed: number;
  tokenBudget: number;
  documentationTokens: number;
  memoryTokens: number;
  fileTokens: number;
  generationTime: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface EnhancedContextOptions {
  tokenBudget?: number;
  includeDocumentation?: boolean;
  includeRecentMemories?: boolean;
  includeFileContent?: boolean;
  maxRecentFiles?: number;
  maxRecentMemories?: number;
  enableCaching?: boolean;
}

/**
 * Enhanced Context Manager with Advanced Features
 * 
 * Features:
 * - Automatic documentation discovery and loading
 * - Enhanced memory search with fuzzy matching
 * - Real-time memory indexing
 * - Intelligent token budget management
 * - Caching and performance optimization
 */
export class EnhancedContextManager {
  private memoryManager: MemoryManager;
  private projectDiscovery: ProjectDiscovery;
  private documentationLoader: DocumentationLoader;
  public memorySearchEngine: EnhancedMemorySearch; // Made public for EnhancedToolHandler access
  
  private context: EnhancedProjectContext;
  private fileCache: Map<string, FileContext> = new Map();
  private importCache: Map<string, string> = new Map();
  private contextCache: Map<string, string> = new Map();
  
  // Performance tracking
  private performanceMetrics = {
    totalContextGenerations: 0,
    totalSearchQueries: 0,
    averageGenerationTime: 0,
    cacheHitRate: 0
  };

  constructor(memoryManager: MemoryManager, projectDiscovery: ProjectDiscovery) {
    this.memoryManager = memoryManager;
    this.projectDiscovery = projectDiscovery;
    
    const projectInfo = projectDiscovery.getProjectInfo();
    if (!projectInfo) {
      throw new Error('Project info not available for Enhanced Context Manager');
    }
    
    this.documentationLoader = new DocumentationLoader(projectInfo.root);
    this.memorySearchEngine = new EnhancedMemorySearch();
    
    this.context = {
      project: projectInfo,
      documentation: { documents: [], totalTokens: 0, loadedDocs: [], skippedDocs: [] },
      memories: [],
      recentFiles: [],
      importedFiles: new Map(),
      sessionStart: new Date(),
      interactions: 0,
      lastContextGeneration: new Date(),
      contextStats: {
        totalTokensUsed: 0,
        tokenBudget: 25000,
        documentationTokens: 0,
        memoryTokens: 0,
        fileTokens: 0,
        generationTime: 0,
        cacheHits: 0,
        cacheMisses: 0
      }
    };
    
    console.error('✅ Enhanced Context Manager initialized');
  }

  /**
   * Initialize the enhanced context manager
   */
  async initialize(): Promise<void> {
    const startTime = Date.now();
    console.error('🚀 Initializing Enhanced Context Manager...');
    
    try {
      // Load project documentation automatically
      await this.loadDocumentation();
      
      // Load recent memories with enhanced indexing
      await this.loadEnhancedMemories();
      
      // Load important project files
      await this.loadImportantFiles();
      
      // Process imports with enhanced handling
      await this.processImports();
      
      // Optimize initial context
      await this.optimizeContext();
      
      const initTime = Date.now() - startTime;
      console.error(`✅ Enhanced Context Manager initialized successfully (${initTime}ms)`);
      
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Context Manager:', error);
      throw error;
    }
  }

  /**
   * Load project documentation automatically
   */
  private async loadDocumentation(): Promise<void> {
    try {
      console.error('📄 Loading project documentation...');
      
      // Load with smart token budget allocation (60% of total budget)
      const documentationBudget = Math.floor(25000 * 0.6);
      this.context.documentation = await this.documentationLoader.loadProjectDocumentation(documentationBudget);
      
      console.error(`📊 Documentation loaded: ${this.context.documentation.loadedDocs.length} files, ${this.context.documentation.totalTokens} tokens`);
      
      // Record documentation loading in memory
      this.addMemoryWithRealTimeIndexing('observation', {
        type: 'documentation_loaded',
        files: this.context.documentation.loadedDocs,
        totalTokens: this.context.documentation.totalTokens,
        skippedFiles: this.context.documentation.skippedDocs
      }, ['documentation', 'initialization', 'context']);
      
    } catch (error) {
      console.error('⚠️  Failed to load documentation:', error);
      // Continue initialization even if documentation loading fails
    }
  }

  /**
   * Load memories with enhanced indexing
   */
  private async loadEnhancedMemories(): Promise<void> {
    console.error('🧠 Loading enhanced memories...');
    
    // Load all memories for the project
    this.context.memories = this.memoryManager.getAllMemories();
    
    console.error(`📊 Memories loaded: ${this.context.memories.length} memories`);
    
    // Trigger memory index optimization
    await this.optimizeMemoryIndex();
  }

  /**
   * Generate enhanced context with automatic documentation
   */
  async generateEnhancedContext(options: EnhancedContextOptions = {}): Promise<string> {
    const startTime = Date.now();
    this.performanceMetrics.totalContextGenerations++;
    
    const contextOptions: Required<EnhancedContextOptions> = {
      tokenBudget: 25000,
      includeDocumentation: true,
      includeRecentMemories: true,
      includeFileContent: true,
      maxRecentFiles: 5,
      maxRecentMemories: 10,
      enableCaching: true,
      ...options
    };
    
    // Check cache first
    const cacheKey = this.generateCacheKey(contextOptions);
    if (contextOptions.enableCaching && this.contextCache.has(cacheKey)) {
      this.context.contextStats.cacheHits++;
      console.error('💾 Context served from cache');
      return this.contextCache.get(cacheKey)!;
    }
    
    this.context.contextStats.cacheMisses++;
    const sections: string[] = [];
    let usedTokens = 0;
    
    // 1. Project Overview (always included)
    const projectSection = this.generateProjectSection();
    sections.push(projectSection);
    usedTokens += this.estimateTokens(projectSection);
    
    // 2. Auto-loaded Documentation (high priority)
    if (contextOptions.includeDocumentation && this.context.documentation.documents.length > 0) {
      const docSection = this.documentationLoader.formatDocumentationForContext(
        this.context.documentation.documents
      );
      
      const docTokens = this.context.documentation.totalTokens;
      if (usedTokens + docTokens <= contextOptions.tokenBudget * 0.7) { // Reserve 30% for other content
        sections.push(`\n## 📚 Auto-Loaded Project Documentation\n${docSection}`);
        usedTokens += docTokens;
        this.context.contextStats.documentationTokens = docTokens;
      } else {
        sections.push(`\n## 📚 Project Documentation\n*Available but excluded due to token budget. Use read_file to access specific documents.*\n`);
      }
    }
    
    // 3. Recent Memories (enhanced)
    if (contextOptions.includeRecentMemories) {
      const memorySection = await this.generateEnhancedMemorySection(
        contextOptions.maxRecentMemories,
        contextOptions.tokenBudget - usedTokens
      );
      sections.push(memorySection);
      usedTokens += this.estimateTokens(memorySection);
    }
    
    // 4. Important Files (smart selection)
    if (contextOptions.includeFileContent) {
      const fileSection = await this.generateSmartFileSection(
        contextOptions.maxRecentFiles,
        contextOptions.tokenBudget - usedTokens
      );
      sections.push(fileSection);
      usedTokens += this.estimateTokens(fileSection);
    }
    
    // 5. Project Structure (compact)
    const structureSection = this.generateCompactStructureSection();
    sections.push(structureSection);
    usedTokens += this.estimateTokens(structureSection);
    
    // Generate final context
    const finalContext = sections.join('\n');
    
    // Update context statistics
    const generationTime = Date.now() - startTime;
    this.context.contextStats = {
      totalTokensUsed: usedTokens,
      tokenBudget: contextOptions.tokenBudget,
      documentationTokens: this.context.documentation.totalTokens,
      memoryTokens: 0, // Will be calculated in memory section
      fileTokens: 0,   // Will be calculated in file section
      generationTime,
      cacheHits: this.context.contextStats.cacheHits,
      cacheMisses: this.context.contextStats.cacheMisses
    };
    
    this.context.lastContextGeneration = new Date();
    this.updatePerformanceMetrics(generationTime);
    
    // Cache the result
    if (contextOptions.enableCaching) {
      this.contextCache.set(cacheKey, finalContext);
      
      // Clean old cache entries
      if (this.contextCache.size > 10) {
        const firstKey = this.contextCache.keys().next().value;
        if (firstKey !== undefined) {
          this.contextCache.delete(firstKey);
        }
      }
    }
    
    console.error(`🎯 Enhanced context generated: ${usedTokens.toLocaleString()} tokens in ${generationTime}ms`);
    
    return finalContext;
  }

  /**
   * Enhanced memory search with multiple strategies
   */
  async searchMemoriesEnhanced(
    query: string, 
    options: SearchOptions = {}
  ): Promise<CombinedSearchResult> {
    this.performanceMetrics.totalSearchQueries++;
    
    console.error(`🔍 Enhanced memory search: "${query}"`);
    const startTime = Date.now();
    
    // Use enhanced memory search engine
    const searchResult = await this.memorySearchEngine.searchMemories(
      query,
      this.context.memories,
      {
        limit: 10,
        fuzzy: true,
        tagSearch: true,
        semanticSearch: true,
        minScore: 0.3,
        ...options
      }
    );
    
    console.error(`🔍 Search completed: ${searchResult.results.length} results in ${searchResult.searchTime}ms`);
    
    // Update access counts for found memories
    for (const result of searchResult.results) {
      result.memory.accessCount++;
      result.memory.lastAccessed = new Date();
    }
    
    // Save updated memory access counts
    await this.memoryManager.saveMemories();
    
    return searchResult;
  }

  /**
   * Add memory with real-time indexing
   */
  addMemoryWithRealTimeIndexing(
    type: Memory['type'], 
    content: any, 
    tags: string[] = []
  ): string {
    console.error(`🧠 Adding memory with real-time indexing: ${type}`);
    
    // Add to memory manager
    const memoryId = this.memoryManager.addMemory(type, content, tags);
    
    // Update local context immediately
    const memory = this.memoryManager.getMemory(memoryId);
    if (memory) {
      this.context.memories.push(memory);
      
      // Sort memories by timestamp (most recent first)
      this.context.memories.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      // Keep only the most recent 100 memories in context for performance
      if (this.context.memories.length > 100) {
        this.context.memories = this.context.memories.slice(0, 100);
      }
      
      console.error(`✅ Memory indexed immediately: ${memoryId}`);
    }
    
    // Clear context cache to force regeneration
    this.contextCache.clear();
    
    return memoryId;
  }

  /**
   * Get context generation statistics
   */
  getContextStats(): ContextGenerationStats & { performance: any } {
    return {
      ...this.context.contextStats,
      performance: { ...this.performanceMetrics }
    };
  }

  /**
   * Get formatted performance report
   */
  getPerformanceReport(): string {
    const stats = this.getContextStats();
    
    return [
      `📊 Enhanced Context Manager Performance Report`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🎯 Context Generations: ${stats.performance.totalContextGenerations}`,
      `🔍 Search Queries: ${stats.performance.totalSearchQueries}`,
      `⚡ Average Generation Time: ${stats.performance.averageGenerationTime.toFixed(0)}ms`,
      `💾 Cache Hit Rate: ${(stats.performance.cacheHitRate * 100).toFixed(1)}%`,
      ``,
      `📄 Current Session:`,
      `   • Documentation Files: ${this.context.documentation.loadedDocs.length}`,
      `   • Memory Count: ${this.context.memories.length}`,
      `   • File Cache Size: ${this.fileCache.size}`,
      `   • Last Context: ${this.context.lastContextGeneration.toLocaleString()}`,
      ``,
      `🧮 Token Usage:`,
      `   • Total Budget: ${stats.tokenBudget.toLocaleString()}`,
      `   • Used Tokens: ${stats.totalTokensUsed.toLocaleString()}`,
      `   • Documentation: ${stats.documentationTokens.toLocaleString()}`,
      `   • Memory: ${stats.memoryTokens.toLocaleString()}`,
      `   • Files: ${stats.fileTokens.toLocaleString()}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    ].join('\n');
  }
  // ================== PRIVATE HELPER METHODS ==================

  /**
   * Generate project section
   */
  private generateProjectSection(): string {
    const git = this.context.project.gitInfo;
    
    return [
      `# 🚀 Project: ${this.context.project.name}`,
      `**Type:** ${this.context.project.type}${this.context.project.framework ? ` (${this.context.project.framework})` : ''}`,
      `**Language:** ${this.context.project.language || 'Unknown'}`,
      `**Root:** ${this.context.project.root}`,
      git ? `**Git:** ${git.branch}${git.isDirty ? ' (modified)' : ' (clean)'}` : '',
      `**Session:** ${this.context.interactions} interactions since ${this.context.sessionStart.toLocaleString()}`,
      ``
    ].filter(line => line !== '').join('\n');
  }

  /**
   * Generate enhanced memory section
   */
  private async generateEnhancedMemorySection(maxMemories: number, availableTokens: number): Promise<string> {
    if (this.context.memories.length === 0) {
      return `\n## 🧠 Recent Context\n*No memories available for this project.*\n`;
    }

    let section = `\n## 🧠 Enhanced Recent Context\n`;
    let memoryTokens = 0;
    let includedMemories = 0;

    // Sort by relevance (recent + high importance)
    const sortedMemories = this.context.memories
      .sort((a, b) => {
        const aScore = (a.importance * 0.4) + (this.calculateRecencyScore(a) * 0.6);
        const bScore = (b.importance * 0.4) + (this.calculateRecencyScore(b) * 0.6);
        return bScore - aScore;
      })
      .slice(0, maxMemories);

    for (const memory of sortedMemories) {
      if (includedMemories >= maxMemories) break;

      const memoryContent = this.formatMemoryForContext(memory);
      const tokenCount = this.estimateTokens(memoryContent);
      
      if (memoryTokens + tokenCount <= availableTokens * 0.3) { // Max 30% of available tokens for memories
        section += memoryContent;
        memoryTokens += tokenCount;
        includedMemories++;
      }
    }

    this.context.contextStats.memoryTokens = memoryTokens;
    
    if (includedMemories === 0) {
      section += `*Recent memories available but excluded due to token budget constraints.*\n`;
    } else {
      section += `\n*Showing ${includedMemories} of ${this.context.memories.length} memories*\n`;
    }

    return section;
  }

  /**
   * Generate smart file section
   */
  private async generateSmartFileSection(maxFiles: number, availableTokens: number): Promise<string> {
    if (this.context.recentFiles.length === 0) {
      return `\n## 📁 Key Files\n*No key files loaded.*\n`;
    }

    let section = `\n## 📁 Key Files\n`;
    let fileTokens = 0;
    let includedFiles = 0;

    // Sort files by importance
    const sortedFiles = this.context.recentFiles
      .sort((a, b) => b.importance - a.importance)
      .slice(0, maxFiles);

    for (const file of sortedFiles) {
      if (includedFiles >= maxFiles) break;

      const fileContent = this.formatFileForContext(file);
      const tokenCount = file.tokenCount || this.estimateTokens(fileContent);
      
      if (fileTokens + tokenCount <= availableTokens * 0.2) { // Max 20% for files
        section += fileContent;
        fileTokens += tokenCount;
        includedFiles++;
      }
    }

    this.context.contextStats.fileTokens = fileTokens;
    
    if (includedFiles === 0) {
      section += `*Key files available but excluded due to token budget constraints.*\n`;
    } else {
      section += `\n*Showing ${includedFiles} of ${this.context.recentFiles.length} files*\n`;
    }

    return section;
  }

  /**
   * Generate compact structure section
   */
  private generateCompactStructureSection(): string {
    const structure = this.context.project.structure;
    
    return [
      `\n## 📂 Project Structure`,
      `**Key Directories:** ${structure.importantDirs.slice(0, 8).join(', ')}`,
      `**Config Files:** ${structure.configFiles.slice(0, 5).join(', ')}`,
      `**Total Files:** ${this.context.project.files.length} tracked files`,
      ``
    ].join('\n');
  }

  /**
   * Format memory for context inclusion
   */
  private formatMemoryForContext(memory: Memory): string {
    const age = this.formatAge(memory.timestamp);
    const contentPreview = JSON.stringify(memory.content).substring(0, 150);
    
    return [
      `### 🧠 ${memory.type} (${age})`,
      `**Tags:** ${memory.tags.join(', ') || 'none'} | **Importance:** ${memory.importance}/10`,
      `${contentPreview}${JSON.stringify(memory.content).length > 150 ? '...' : ''}`,
      ``
    ].join('\n');
  }

  /**
   * Format file for context inclusion
   */
  private formatFileForContext(file: FileContext): string {
    const relativePath = path.relative(this.context.project.root, file.path);
    const contentPreview = file.content.substring(0, 300);
    
    return [
      `### 📄 ${relativePath}`,
      `**Language:** ${file.language} | **Importance:** ${file.importance}/10`,
      '```' + file.language,
      contentPreview + (file.content.length > 300 ? '\n// ... (truncated)' : ''),
      '```',
      ``
    ].join('\n');
  }

  /**
   * Calculate recency score for memory sorting
   */
  private calculateRecencyScore(memory: Memory): number {
    const now = Date.now();
    const age = now - memory.timestamp.getTime();
    const lastAccess = now - memory.lastAccessed.getTime();
    
    // Exponential decay: recent memories get higher scores
    const ageScore = Math.exp(-age / (7 * 24 * 60 * 60 * 1000)); // 7 days half-life
    const accessScore = Math.exp(-lastAccess / (3 * 24 * 60 * 60 * 1000)); // 3 days half-life
    
    return (ageScore * 0.6) + (accessScore * 0.4);
  }

  /**
   * Format age in human-readable form
   */
  private formatAge(date: Date): string {
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  /**
   * Estimate token count for text
   */
  private estimateTokens(text: string): number {
    // Improved token estimation
    const words = text.split(/\s+/).length;
    const chars = text.length;
    
    // Account for markdown, code, and structure
    let tokens = Math.ceil(chars / 4); // Base estimation
    
    // Adjustments
    if (text.includes('```')) tokens += Math.ceil(words * 0.2); // Code blocks
    if (text.includes('#')) tokens += Math.ceil(words * 0.1); // Headers
    if (text.includes('*') || text.includes('_')) tokens += Math.ceil(words * 0.05); // Formatting
    
    return tokens;
  }

  /**
   * Generate cache key for context options
   */
  private generateCacheKey(options: Required<EnhancedContextOptions>): string {
    return [
      options.tokenBudget,
      options.includeDocumentation,
      options.includeRecentMemories,
      options.includeFileContent,
      options.maxRecentFiles,
      options.maxRecentMemories,
      this.context.memories.length,
      this.context.documentation.totalTokens
    ].join('-');
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(generationTime: number): void {
    // Update running average
    const totalGenerations = this.performanceMetrics.totalContextGenerations;
    const currentAvg = this.performanceMetrics.averageGenerationTime;
    
    this.performanceMetrics.averageGenerationTime = 
      ((currentAvg * (totalGenerations - 1)) + generationTime) / totalGenerations;
    
    // Update cache hit rate
    const totalCacheRequests = this.context.contextStats.cacheHits + this.context.contextStats.cacheMisses;
    this.performanceMetrics.cacheHitRate = 
      totalCacheRequests > 0 ? this.context.contextStats.cacheHits / totalCacheRequests : 0;
  }

  /**
   * Load important files with enhanced processing
   */
  private async loadImportantFiles(): Promise<void> {
    console.error('📁 Loading important files...');
    
    const importantPatterns = [
      'README.md',
      'package.json',
      'tsconfig.json',
      '.env.example',
      'docker-compose.yml',
      'Dockerfile',
      'requirements.txt',
      'setup.py',
      'go.mod',
      'Cargo.toml'
    ];
    
    for (const pattern of importantPatterns) {
      const filePath = path.join(this.context.project.root, pattern);
      await this.loadFileContext(filePath);
    }
    
    // Also load recently modified source files
    const recentSourceFiles = this.context.project.files
      .filter(f => f.relativePath.includes('src/') || f.relativePath.includes('lib/'))
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(0, 10);
    
    for (const file of recentSourceFiles) {
      await this.loadFileContext(file.path);
    }
    
    console.error(`📊 Files loaded: ${this.fileCache.size} files cached`);
  }

  /**
   * Load file context with enhanced processing
   */
  private async loadFileContext(filePath: string): Promise<FileContext | null> {
    // Check cache first
    if (this.fileCache.has(filePath)) {
      const cached = this.fileCache.get(filePath)!;
      cached.lastAccessed = new Date();
      return cached;
    }
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const truncatedContent = content.slice(0, 5000); // Limit content
      
      const fileContext: FileContext = {
        path: filePath,
        content: truncatedContent,
        language: this.detectLanguage(filePath),
        lastAccessed: new Date(),
        importance: this.calculateFileImportance(filePath),
        tokenCount: this.estimateTokens(truncatedContent)
      };
      
      this.fileCache.set(filePath, fileContext);
      this.context.recentFiles.push(fileContext);
      
      // Keep recent files list manageable
      if (this.context.recentFiles.length > 25) {
        this.context.recentFiles = this.context.recentFiles
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 25);
      }
      
      return fileContext;
    } catch (error) {
      return null;
    }
  }

  /**
   * Process imports with enhanced handling
   */
  private async processImports(depth: number = 0): Promise<void> {
    if (depth > 5) return; // Max import depth
    
    const toProcess = Array.from(this.importCache.keys())
      .filter(path => this.importCache.get(path) === '');
    
    if (toProcess.length === 0) return;
    
    console.error(`📥 Processing ${toProcess.length} imports (depth: ${depth})`);
    
    for (const importPath of toProcess) {
      try {
        const content = await fs.readFile(importPath, 'utf-8');
        this.importCache.set(importPath, content);
        this.context.importedFiles.set(importPath, content);
        
        // Check for nested imports
        const nestedImports = content.matchAll(/@import\s+(.+)/g);
        for (const match of nestedImports) {
          const nestedPath = await this.resolveImportPath(match[1].trim(), importPath);
          if (nestedPath && !this.importCache.has(nestedPath)) {
            this.importCache.set(nestedPath, '');
          }
        }
      } catch (error) {
        console.error(`⚠️  Failed to import ${importPath}:`, error);
        this.importCache.delete(importPath);
      }
    }
    
    // Process any new imports recursively
    const hasNewImports = Array.from(this.importCache.values()).some(v => v === '');
    if (hasNewImports) {
      await this.processImports(depth + 1);
    }
  }

  /**
   * Optimize memory index for better search performance
   */
  private async optimizeMemoryIndex(): Promise<void> {
    // This is where we could add more sophisticated indexing
    // For now, we ensure memories are sorted by timestamp
    this.context.memories.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Optimize context for better performance
   */
  private async optimizeContext(): Promise<void> {
    // Clean up old cache entries
    if (this.fileCache.size > 50) {
      const entries = Array.from(this.fileCache.entries());
      const sortedEntries = entries.sort((a, b) => 
        b[1].lastAccessed.getTime() - a[1].lastAccessed.getTime()
      );
      
      // Keep only the 30 most recently accessed files
      this.fileCache.clear();
      for (const [path, context] of sortedEntries.slice(0, 30)) {
        this.fileCache.set(path, context);
      }
    }
  }

  /**
   * Detect file language from extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript', '.jsx': 'jsx', '.ts': 'typescript', '.tsx': 'tsx',
      '.py': 'python', '.java': 'java', '.cpp': 'cpp', '.c': 'c',
      '.cs': 'csharp', '.go': 'go', '.rs': 'rust', '.rb': 'ruby',
      '.php': 'php', '.swift': 'swift', '.kt': 'kotlin',
      '.md': 'markdown', '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
      '.xml': 'xml', '.html': 'html', '.css': 'css', '.scss': 'scss',
      '.sql': 'sql', '.sh': 'bash', '.bash': 'bash'
    };
    return languageMap[ext] || 'text';
  }

  /**
   * Calculate file importance based on patterns
   */
  private calculateFileImportance(filePath: string): number {
    const relativePath = path.relative(this.context.project.root, filePath);
    let importance = 5;
    
    // Boost importance for key files
    if (relativePath.includes('src/')) importance += 2;
    if (relativePath.includes('index.')) importance += 2;
    if (relativePath.includes('main.')) importance += 2;
    if (relativePath.includes('app.')) importance += 1;
    if (relativePath.includes('config')) importance += 1;
    if (relativePath.endsWith('README.md')) importance += 3;
    if (relativePath.endsWith('package.json')) importance += 3;
    if (relativePath.endsWith('CLAUDE.md')) importance += 4;
    
    return Math.min(importance, 10);
  }

  /**
   * Resolve import path
   */
  private async resolveImportPath(importPath: string, fromFile: string): Promise<string | null> {
    const path = await import('path');
    const fs = await import('fs');
    
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return path.resolve(path.dirname(fromFile), importPath);
    }
    
    if (importPath.startsWith('/')) {
      return path.join(this.context.project.root, importPath.slice(1));
    }
    
    const possibleExtensions = ['.md', '.txt', '.json', '.yaml', '.yml'];
    for (const ext of possibleExtensions) {
      const fullPath = path.resolve(path.dirname(fromFile), importPath + ext);
      try {
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      } catch {}
    }
    
    return null;
  }

  // ================== PUBLIC INTERFACE ==================

  /**
   * Get current context
   */
  getContext(): EnhancedProjectContext {
    return this.context;
  }

  /**
   * Get project info
   */
  getProjectInfo(): ProjectInfo {
    return this.context.project;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.fileCache.clear();
    this.contextCache.clear();
    this.context.recentFiles = [];
    console.error('🗑️  All caches cleared');
  }

  /**
   * Update context after interaction
   */
  updateContext(type: string, data: any): void {
    this.context.interactions++;
    
    // Add to memory with real-time indexing
    this.addMemoryWithRealTimeIndexing('observation', {
      type,
      data,
      interaction: this.context.interactions
    }, [type, 'interaction']);
  }
}
