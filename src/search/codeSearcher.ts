import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import * as ignore from 'ignore';
import type { Ignore } from 'ignore';

/**
 * Advanced code search interface
 */
export interface SearchOptions {
  pattern: string;              // Search pattern (text or regex)
  directory: string;            // Directory to search in
  filePattern?: string;         // File glob pattern (e.g., "*.ts", "**/*.js")
  excludePatterns?: string[];   // Patterns to exclude
  caseSensitive?: boolean;      // Case sensitive search
  regex?: boolean;              // Treat pattern as regex
  contextLines?: number;        // Number of context lines before/after match
  maxResults?: number;          // Maximum results to return
  includeHidden?: boolean;      // Include hidden files
  followSymlinks?: boolean;     // Follow symbolic links
}

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  context?: {
    before: string[];
    after: string[];
  };
}

export interface SearchSummary {
  totalFiles: number;
  matchedFiles: number;
  totalMatches: number;
  searchTime: number;
  results: SearchResult[];
}

/**
 * Advanced code search functionality for MCP
 * Implements professional-grade search with glob, regex, and context support
 * ENHANCED: Now searches ALL text-based files, not just code files
 */
export class CodeSearcher {
  private gitignore: Ignore | null = null;
  private searchCache: Map<string, SearchSummary> = new Map();
  
  constructor(private projectRoot: string) {
    this.loadGitignore();
  }

  /**
   * Load .gitignore patterns for filtering
   */
  private async loadGitignore(): Promise<void> {
    try {
      const gitignorePath = path.join(this.projectRoot, '.gitignore');
      if (fsSync.existsSync(gitignorePath)) {
        const content = await fs.readFile(gitignorePath, 'utf-8');
        this.gitignore = (ignore as any).default().add(content);
      }
    } catch (error) {
      console.error('Failed to load .gitignore:', error);
    }
  }

  /**
   * Search for code patterns in files
   */
  async searchCode(options: SearchOptions): Promise<SearchSummary> {
    const startTime = Date.now();
    
    // Generate cache key
    const cacheKey = JSON.stringify(options);
    if (this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey)!;
      if (Date.now() - cached.searchTime < 5000) { // 5 second cache
        return cached;
      }
    }

    const results: SearchResult[] = [];
    let totalFiles = 0;
    let matchedFiles = 0;

    try {
      // Get list of files to search
      const files = await this.getFilesToSearch(options);
      totalFiles = files.length;

      // Create search pattern
      const searchPattern = this.createSearchPattern(options);

      // Search through files
      for (const file of files) {
        if (options.maxResults && results.length >= options.maxResults) {
          break;
        }

        const fileResults = await this.searchInFile(file, searchPattern, options);
        if (fileResults.length > 0) {
          matchedFiles++;
          results.push(...fileResults);
        }
      }

      const summary: SearchSummary = {
        totalFiles,
        matchedFiles,
        totalMatches: results.length,
        searchTime: Date.now() - startTime,
        results: results.slice(0, options.maxResults || Infinity)
      };

      // Cache the result
      this.searchCache.set(cacheKey, summary);
      
      // Clean old cache entries
      if (this.searchCache.size > 100) {
        const firstKey = this.searchCache.keys().next().value;
        if (firstKey) {
          this.searchCache.delete(firstKey);
        }
      }

      return summary;

    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Get list of files to search based on options
   * ENHANCED: Now includes ALL text-based files, not just code files
   */
  private async getFilesToSearch(options: SearchOptions): Promise<string[]> {
    const searchDir = path.resolve(options.directory);
    
    // 🚨 BUG FIX: Default file pattern MUST be recursive for parent directory searches
    // OLD: '**/*' was correct but specific patterns like '*.cs' were not recursive
    // NEW: If filePattern is provided and doesn't have **, make it recursive automatically
    let filePattern = options.filePattern || '**/*';
    
    // Auto-fix non-recursive patterns to be recursive (*.cs -> **/*.cs)
    if (filePattern && !filePattern.includes('**/') && !filePattern.startsWith('./')) {
      // If pattern is like "*.cs", "*.js" etc, make it recursive
      if (filePattern.match(/^\*\.\w+$/)) {
        filePattern = `**/${filePattern}`;
    console.error(`🔧 [CodeSearcher] Auto-fixed pattern: ${options.filePattern} → ${filePattern}`);
      }
    }
    
    console.error(`🔍 [CodeSearcher] Search config: dir="${searchDir}", pattern="${filePattern}"`);
    
    // Build glob options
    const globOptions = {
      cwd: searchDir,
      absolute: true,
      nodir: true,
      dot: options.includeHidden || false,
      follow: options.followSymlinks || false,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/coverage/**',
        '**/*.min.js',
        '**/*.map',
        ...(options.excludePatterns || [])
      ]
    };

    // Get files using glob
    let files = await glob(filePattern, globOptions);
    
    console.error(`🔍 [CodeSearcher] Glob found ${files.length} files with pattern "${filePattern}"`);

    // Filter with gitignore if available
    if (this.gitignore) {
      files = files.filter(file => {
        const relativePath = path.relative(this.projectRoot, file);
        return !this.gitignore!.ignores(relativePath);
      });
    }

    // ENHANCED: Only filter out TRUE binary files
    // Now includes ALL text-based files: code, configs, docs, data, etc.
    files = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      
      // ONLY exclude true binary/media files
      const binaryExtensions = [
        // Images (NOTE: .svg removed as it's text-based XML)
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.webp', '.tiff', '.tif',
        // Binary documents
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
        // Archives
        '.zip', '.rar', '.tar', '.gz', '.7z', '.bz2', '.xz', '.z',
        // Executables and compiled files
        '.exe', '.dll', '.so', '.dylib', '.jar', '.class', '.pyc', '.pyo', '.o', '.obj',
        // Media files
        '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm', '.m4a', '.ogg',
        // Fonts
        '.ttf', '.otf', '.woff', '.woff2', '.eot',
        // Database files
        '.db', '.sqlite', '.sqlite3', '.mdb', '.accdb',
        // Other binary formats
        '.bin', '.dat', '.iso', '.dmg', '.img', '.deb', '.rpm'
      ];
      
      // Text-based files that ARE included:
      // - Code: .js, .ts, .py, .java, .go, .rs, .cpp, .c, .h, .php, .rb, .swift, .kt, etc.
      // - Markup: .html, .xml, .svg, .md, .rst, .tex, .adoc
      // - Data: .json, .yaml, .yml, .toml, .ini, .conf, .cfg, .properties
      // - Config: .env, .gitignore, .dockerignore, .editorconfig, .eslintrc, .prettierrc
      // - Scripts: .sh, .bat, .ps1, .cmd, .bash, .zsh, .fish
      // - Text: .txt, .log, .csv, .tsv, .sql
      // - Styles: .css, .scss, .sass, .less, .styl
      // - Templates: .ejs, .pug, .hbs, .mustache, .liquid, .njk
      // - Documentation: .md, .mdx, .rst, .adoc, .org, .textile
      // - And ANY other text-based format!
      
      return !binaryExtensions.includes(ext);
    });

    return files;
  }

  /**
   * Create search pattern (regex or string)
   */
  private createSearchPattern(options: SearchOptions): RegExp | string {
    if (options.regex) {
      const flags = options.caseSensitive ? 'gm' : 'gim';
      return new RegExp(options.pattern, flags);
    } else {
      // Escape special regex characters for literal search
      const escaped = options.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = options.caseSensitive ? 'gm' : 'gim';
      return new RegExp(escaped, flags);
    }
  }

  /**
   * Search within a single file
   */
  private async searchInFile(
    filePath: string,
    pattern: RegExp | string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const searchPattern = typeof pattern === 'string' 
          ? new RegExp(pattern, options.caseSensitive ? 'g' : 'gi')
          : pattern;

        let match;
        while ((match = searchPattern.exec(line)) !== null) {
          const result: SearchResult = {
            file: filePath,
            line: i + 1,
            column: match.index + 1,
            match: line.trim()
          };

          // Add context if requested
          if (options.contextLines && options.contextLines > 0) {
            result.context = {
              before: [],
              after: []
            };

            // Get context before
            for (let j = Math.max(0, i - options.contextLines); j < i; j++) {
              result.context.before.push(lines[j]);
            }

            // Get context after
            for (let j = i + 1; j < Math.min(lines.length, i + 1 + options.contextLines); j++) {
              result.context.after.push(lines[j]);
            }
          }

          results.push(result);

          // Check max results
          if (options.maxResults && results.length >= options.maxResults) {
            return results;
          }
        }
      }

    } catch (error) {
      // Skip files that can't be read (permissions, etc)
      if ((error as NodeJS.ErrnoException).code !== 'EACCES') {
        console.error(`Error searching file ${filePath}:`, error);
      }
    }

    return results;
  }

  /**
   * Search for symbols (functions, classes, variables) using simple heuristics
   * ENHANCED: Now also searches in more file types
   */
  async searchSymbols(
    symbolName: string,
    filePattern: string = '**/*.{js,ts,jsx,tsx,py,java,go,rs,cpp,c,h,php,rb,swift,kt,cs,vb,scala,dart,lua,r,m,mm}'
  ): Promise<SearchResult[]> {
    // Language-specific patterns for symbol detection
    const symbolPatterns = [
      // JavaScript/TypeScript
      `(function|const|let|var|class)\\s+${symbolName}\\b`,
      `${symbolName}\\s*[:=]\\s*(function|\\([^)]*\\)\\s*=>)`,
      
      // Python
      `(def|class)\\s+${symbolName}\\b`,
      
      // Java/C#
      `(public|private|protected)?\\s*(static)?\\s*\\w+\\s+${symbolName}\\s*\\(`,
      
      // Go
      `func\\s+(\\(\\w+\\s+\\w+\\)\\s+)?${symbolName}\\b`,
      
      // Rust
      `(fn|struct|enum|trait|impl)\\s+${symbolName}\\b`,
      
      // C/C++
      `(void|int|char|float|double|bool|auto)\\s+${symbolName}\\s*\\(`,
      
      // PHP
      `(function|class)\\s+${symbolName}\\b`,
      
      // Ruby
      `(def|class|module)\\s+${symbolName}\\b`
    ];

    const pattern = `(${symbolPatterns.join('|')})`;
    
    return (await this.searchCode({
      pattern,
      directory: this.projectRoot,
      filePattern,
      regex: true,
      contextLines: 2,
      caseSensitive: true
    })).results;
  }

  /**
   * Search for TODO/FIXME/NOTE comments
   * ENHANCED: Now searches in ALL text files, not just code
   */
  async searchTodos(
    includeNotes: boolean = false
  ): Promise<SearchResult[]> {
    const patterns = ['TODO', 'FIXME', 'XXX', 'HACK', 'BUG'];
    if (includeNotes) {
      patterns.push('NOTE', 'INFO', 'WARNING', 'IMPORTANT', 'TIP', 'HINT');
    }
    
    const pattern = `\\b(${patterns.join('|')})\\b:?\\s*(.*)`;
    
    return (await this.searchCode({
      pattern,
      directory: this.projectRoot,
      regex: true,
      caseSensitive: false,
      contextLines: 1
    })).results;
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
  }
}