import * as fs from 'fs/promises';
import * as path from 'path';

export interface DocumentationLoadResult {
  documents: DocumentationFile[];
  totalTokens: number;
  loadedDocs: string[];
  skippedDocs: string[];
}

export interface DocumentationFile {
  file: string;
  content: string;
  priority: number;
  tokenCount: number;
}

/**
 * Handles automatic documentation discovery and loading
 */
export class DocumentationLoader {
  private projectRoot: string;
  
  // Documentation file priorities (higher = more important)
  private readonly DOCUMENTATION_PRIORITIES: Record<string, number> = {
    'CLAUDE.md': 100,
    'CLAUDE_IMPLEMENTATION_PLAN.md': 95,
    'README.md': 90,
    'DOCS.md': 85,
    'PROJECT.md': 80,
    '.claude/instructions.md': 75,
    'docs/CLAUDE.md': 70,
    'docs/README.md': 65,
    'DOCUMENTATION.md': 60,
    'GUIDE.md': 55
  };
  
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }
  
  /**
   * Load project documentation with smart token budget management
   */
  async loadProjectDocumentation(tokenBudget: number): Promise<DocumentationLoadResult> {
    const result: DocumentationLoadResult = {
      documents: [],
      totalTokens: 0,
      loadedDocs: [],
      skippedDocs: []
    };
    
    // Find all documentation files
    const docFiles = await this.findDocumentationFiles();
    
    // Sort by priority
    docFiles.sort((a, b) => b.priority - a.priority);
    
    // Load files within token budget
    for (const docFile of docFiles) {
      try {
        const content = await fs.readFile(docFile.path, 'utf-8');
        const tokenCount = this.estimateTokens(content);
        
        if (result.totalTokens + tokenCount <= tokenBudget) {
          result.documents.push({
            file: docFile.relativePath,
            content,
            priority: docFile.priority,
            tokenCount
          });
          result.totalTokens += tokenCount;
          result.loadedDocs.push(docFile.relativePath);
        } else {
          result.skippedDocs.push(docFile.relativePath);
        }
      } catch (error) {
        // File doesn't exist or can't be read
        continue;
      }
    }
    
    return result;
  }
  
  /**
   * Find all documentation files in the project
   */
  private async findDocumentationFiles(): Promise<Array<{
    path: string;
    relativePath: string;
    priority: number;
  }>> {
    const docFiles: Array<{
      path: string;
      relativePath: string;
      priority: number;
    }> = [];
    
    // Check for documentation files
    for (const [fileName, priority] of Object.entries(this.DOCUMENTATION_PRIORITIES)) {
      const filePath = path.join(this.projectRoot, fileName);
      try {
        await fs.access(filePath);
        docFiles.push({
          path: filePath,
          relativePath: fileName,
          priority
        });
      } catch {
        // File doesn't exist
      }
    }
    
    // Also check for .md files in root (lower priority)
    try {
      const rootFiles = await fs.readdir(this.projectRoot);
      for (const file of rootFiles) {
        if (file.endsWith('.md') && !this.DOCUMENTATION_PRIORITIES[file]) {
          const filePath = path.join(this.projectRoot, file);
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            docFiles.push({
              path: filePath,
              relativePath: file,
              priority: 50 // Default priority for other .md files
            });
          }
        }
      }
    } catch {
      // Error reading directory
    }
    
    return docFiles;
  }
  
  /**
   * Format documentation for context inclusion
   */
  formatDocumentationForContext(documents: DocumentationFile[]): string {
    if (documents.length === 0) {
      return '*No documentation files found.*';
    }
    
    const sections: string[] = [];
    
    for (const doc of documents) {
      sections.push(`### 📄 ${doc.file}`);
      sections.push(doc.content);
      sections.push('');
    }
    
    return sections.join('\n');
  }
  
  /**
   * Estimate token count for text
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~1 token per 4 characters
    return Math.ceil(text.length / 4);
  }
}
