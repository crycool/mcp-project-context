import * as fs from 'fs/promises';
import * as path from 'path';

export interface ProjectDocument {
  file: string;
  path: string;
  content: string;
  size: number;
  priority: number;
  tokenCount: number;
  lastModified: Date;
}

export interface DocumentationLoadResult {
  documents: ProjectDocument[];
  totalTokens: number;
  loadedDocs: string[];
  skippedDocs: string[];
}

/**
 * Professional Documentation Loader for MCP Project Context Manager
 * Automatically discovers and loads project documentation files with intelligent prioritization
 */
export class DocumentationLoader {
  private static readonly PROJECT_DOC_FILES = [
    // Primary documentation files (highest priority)
    { pattern: 'CLAUDE.md', priority: 10 },
    { pattern: 'CLAUDE_IMPLEMENTATION_PLAN.md', priority: 9 },
    { pattern: 'INSTRUCTIONS.md', priority: 8 },
    
    // Secondary documentation files
    { pattern: 'README.md', priority: 7 },
    { pattern: 'DOCS.md', priority: 6 },
    { pattern: 'PROJECT.md', priority: 6 },
    
    // Directory-based documentation
    { pattern: '.claude/instructions.md', priority: 8 },
    { pattern: 'docs/README.md', priority: 5 },
    { pattern: 'docs/CLAUDE.md', priority: 7 },
    { pattern: 'docs/PROJECT.md', priority: 5 },
    
    // Configuration and setup documentation
    { pattern: 'SETUP.md', priority: 4 },
    { pattern: 'INSTALL.md', priority: 4 },
    { pattern: 'CONTRIBUTING.md', priority: 3 },
    { pattern: 'CHANGELOG.md', priority: 2 },
    { pattern: 'TROUBLESHOOTING.md', priority: 3 }
  ];

  private rootPath: string;
  private tokenEstimateCache: Map<string, number> = new Map();

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  /**
   * Automatically discover and load project documentation files
   */
  async loadProjectDocumentation(tokenBudget: number = 20000): Promise<DocumentationLoadResult> {
    const discoveredDocs = await this.discoverDocumentationFiles();
    const processedDocs = await this.processDocumentationFiles(discoveredDocs);
    
    // Sort by priority (descending) and size (ascending for same priority)
    processedDocs.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.tokenCount - b.tokenCount;
    });

    return this.selectDocumentsByTokenBudget(processedDocs, tokenBudget);
  }

  /**
   * Discover all available documentation files in the project
   */
  private async discoverDocumentationFiles(): Promise<Array<{path: string, priority: number}>> {
    const discoveredFiles: Array<{path: string, priority: number}> = [];

    for (const docSpec of DocumentationLoader.PROJECT_DOC_FILES) {
      const filePath = path.join(this.rootPath, docSpec.pattern);
      
      try {
        const stats = await fs.stat(filePath);
        if (stats.isFile() && stats.size > 0 && stats.size < 1024 * 1024) { // Max 1MB
          discoveredFiles.push({
            path: filePath,
            priority: docSpec.priority
          });
        }
      } catch (error) {
        // File doesn't exist, continue
      }
    }

    // Search for additional CLAUDE.md files in subdirectories
    await this.searchSubdirectoriesForClaudeFiles(discoveredFiles);

    return discoveredFiles;
  }

  /**
   * Search subdirectories for additional CLAUDE.md files
   */
  private async searchSubdirectoriesForClaudeFiles(
    discoveredFiles: Array<{path: string, priority: number}>
  ): Promise<void> {
    try {
      const subdirs = ['src', 'docs', 'documentation', '.github', 'config'];
      
      for (const subdir of subdirs) {
        const subdirPath = path.join(this.rootPath, subdir);
        
        try {
          const subdirStats = await fs.stat(subdirPath);
          if (!subdirStats.isDirectory()) continue;

          const claudeFile = path.join(subdirPath, 'CLAUDE.md');
          try {
            const stats = await fs.stat(claudeFile);
            if (stats.isFile() && stats.size > 0) {
              discoveredFiles.push({
                path: claudeFile,
                priority: 7 // High priority for subdirectory CLAUDE files
              });
            }
          } catch {
            // File doesn't exist in this subdirectory
          }
        } catch {
          // Subdirectory doesn't exist
        }
      }
    } catch (error) {
      console.error('Error searching subdirectories for CLAUDE files:', error);
    }
  }

  /**
   * Process discovered files to extract metadata and content
   */
  private async processDocumentationFiles(
    discoveredFiles: Array<{path: string, priority: number}>
  ): Promise<ProjectDocument[]> {
    const processedDocs: ProjectDocument[] = [];

    for (const fileSpec of discoveredFiles) {
      try {
        const content = await fs.readFile(fileSpec.path, 'utf-8');
        const stats = await fs.stat(fileSpec.path);
        const tokenCount = this.estimateTokenCount(content);

        const doc: ProjectDocument = {
          file: path.basename(fileSpec.path),
          path: fileSpec.path,
          content,
          size: stats.size,
          priority: fileSpec.priority,
          tokenCount,
          lastModified: stats.mtime
        };

        processedDocs.push(doc);
      } catch (error) {
        console.error(`Failed to process documentation file ${fileSpec.path}:`, error);
      }
    }

    return processedDocs;
  }

  /**
   * Select documents that fit within the token budget
   */
  private selectDocumentsByTokenBudget(
    processedDocs: ProjectDocument[], 
    tokenBudget: number
  ): DocumentationLoadResult {
    const result: DocumentationLoadResult = {
      documents: [],
      totalTokens: 0,
      loadedDocs: [],
      skippedDocs: []
    };

    // Reserve 20% of budget for other context elements
    const documentBudget = Math.floor(tokenBudget * 0.8);
    let usedTokens = 0;

    for (const doc of processedDocs) {
      if (usedTokens + doc.tokenCount <= documentBudget) {
        result.documents.push(doc);
        result.loadedDocs.push(doc.file);
        usedTokens += doc.tokenCount;
      } else {
        result.skippedDocs.push(doc.file);
      }
    }

    result.totalTokens = usedTokens;
    return result;
  }

  /**
   * Estimate token count for content (4 characters ≈ 1 token)
   */
  private estimateTokenCount(content: string): number {
    // Check cache first
    const contentHash = this.hashContent(content);
    const cached = this.tokenEstimateCache.get(contentHash);
    if (cached !== undefined) return cached;

    // Rough estimation: 1 token ≈ 4 characters for English text
    // More sophisticated estimation for code/markdown
    const lines = content.split('\n');
    let tokens = 0;

    for (const line of lines) {
      if (line.trim().length === 0) {
        tokens += 1; // Empty lines
      } else if (line.trim().startsWith('#')) {
        tokens += Math.ceil(line.length / 3); // Headers are more token-dense
      } else if (line.trim().startsWith('```')) {
        tokens += 3; // Code block markers
      } else if (line.includes('```')) {
        tokens += Math.ceil(line.length / 2.5); // Inline code
      } else {
        tokens += Math.ceil(line.length / 4); // Regular text
      }
    }

    // Cache the result
    this.tokenEstimateCache.set(contentHash, tokens);
    return tokens;
  }

  /**
   * Create a simple hash of content for caching
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Format documentation for context inclusion
   */
  formatDocumentationForContext(documents: ProjectDocument[]): string {
    let formattedContent = '';

    for (const doc of documents) {
      const relativePath = path.relative(this.rootPath, doc.path);
      formattedContent += `\n## 📄 ${doc.file}\n`;
      formattedContent += `*Path: ${relativePath} | Priority: ${doc.priority} | Tokens: ~${doc.tokenCount}*\n\n`;
      formattedContent += doc.content;
      formattedContent += '\n\n---\n';
    }

    return formattedContent;
  }

  /**
   * Get documentation loading statistics for debugging
   */
  getLoadingStats(result: DocumentationLoadResult): string {
    const stats = [
      `📊 Documentation Loading Statistics`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `✅ Loaded Documents: ${result.loadedDocs.length}`,
      `   ${result.loadedDocs.map(doc => `• ${doc}`).join('\n   ')}`,
      ``,
      `⏭️ Skipped Documents: ${result.skippedDocs.length}`,
      result.skippedDocs.length > 0 ? `   ${result.skippedDocs.map(doc => `• ${doc} (exceeded budget)`).join('\n   ')}` : `   (none)`,
      ``,
      `🧮 Token Usage: ${result.totalTokens.toLocaleString()} tokens`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    ].filter(line => line !== '').join('\n');

    return stats;
  }
}
