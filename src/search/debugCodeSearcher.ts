import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import * as ignore from 'ignore';
import type { Ignore } from 'ignore';

/**
 * 🐛 DEBUG VERSION OF CODE SEARCHER FOR BUG HUNTING
 * Added extensive debug logging to identify search issues
 */

export interface SearchOptions {
  pattern: string;              
  directory: string;            
  filePattern?: string;         
  excludePatterns?: string[];   
  caseSensitive?: boolean;      
  regex?: boolean;              
  contextLines?: number;        
  maxResults?: number;          
  includeHidden?: boolean;      
  followSymlinks?: boolean;     
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
  debug?: {
    searchDirectory: string;
    resolvedDirectory: string;
    filePattern: string;
    globPattern: string;
    globResults: string[];
    filteredFiles: string[];
    skippedFiles: string[];
    errorFiles: string[];
    searchPatternInfo: any;
  };
}

export class DebugCodeSearcher {
  private gitignore: Ignore | null = null;
  private searchCache: Map<string, SearchSummary> = new Map();
  
  constructor(private projectRoot: string) {
    console.error(`🔍 [DEBUG] DebugCodeSearcher initialized with projectRoot: ${projectRoot}`);
    this.loadGitignore();
  }

  private async loadGitignore(): Promise<void> {
    try {
      const gitignorePath = path.join(this.projectRoot, '.gitignore');
      if (fsSync.existsSync(gitignorePath)) {
        const content = await fs.readFile(gitignorePath, 'utf-8');
        this.gitignore = (ignore as any).default().add(content);
        console.error(`🔍 [DEBUG] .gitignore loaded with ${content.split('\n').length} rules`);
      } else {
        console.error(`🔍 [DEBUG] No .gitignore found at ${gitignorePath}`);
      }
    } catch (error) {
      console.error('🔍 [DEBUG] Failed to load .gitignore:', error);
    }
  }

  async searchCode(options: SearchOptions): Promise<SearchSummary> {
    const startTime = Date.now();
    
    console.error(`🔍 [DEBUG] ============= SEARCH DEBUG START =============`);
    console.error(`🔍 [DEBUG] Search Options:`, JSON.stringify(options, null, 2));
    
    const results: SearchResult[] = [];
    let totalFiles = 0;
    let matchedFiles = 0;
    
    // Debug info collection
    const debugInfo: any = {
      searchDirectory: options.directory,
      resolvedDirectory: '',
      filePattern: options.filePattern || '**/*',
      globPattern: '',
      globResults: [],
      filteredFiles: [],
      skippedFiles: [],
      errorFiles: [],
      searchPatternInfo: {}
    };

    try {
      // Get list of files to search
      console.error(`🔍 [DEBUG] Step 1: Getting files to search...`);
      const fileSearchResult = await this.getFilesToSearchWithDebug(options);
      const files = fileSearchResult.files;
      totalFiles = files.length;
      
      // Copy debug info
      Object.assign(debugInfo, fileSearchResult.debugInfo);
      
      console.error(`🔍 [DEBUG] Step 1 COMPLETE: Found ${totalFiles} files`);
      
      if (totalFiles === 0) {
        console.error(`🚨 [DEBUG] CRITICAL: No files found to search!`);
        console.error(`🔍 [DEBUG] Debug info:`, JSON.stringify(debugInfo, null, 2));
      }

      // Create search pattern
      console.error(`🔍 [DEBUG] Step 2: Creating search pattern...`);
      const searchPattern = this.createSearchPattern(options);
      debugInfo.searchPatternInfo = {
        originalPattern: options.pattern,
        isRegex: options.regex,
        caseSensitive: options.caseSensitive,
        compiledPattern: searchPattern instanceof RegExp ? searchPattern.source : searchPattern
      };
      console.error(`🔍 [DEBUG] Step 2 COMPLETE: Search pattern created`);

      // Search through files
      console.error(`🔍 [DEBUG] Step 3: Searching through ${totalFiles} files...`);
      for (const file of files) {
        if (options.maxResults && results.length >= options.maxResults) {
          break;
        }

        console.error(`🔍 [DEBUG] Searching file: ${path.basename(file)}`);
        const fileResults = await this.searchInFileWithDebug(file, searchPattern, options);
        if (fileResults.length > 0) {
          matchedFiles++;
          results.push(...fileResults);
          console.error(`🔍 [DEBUG] ✅ Found ${fileResults.length} matches in ${path.basename(file)}`);
        }
      }
      console.error(`🔍 [DEBUG] Step 3 COMPLETE: Found ${results.length} total matches`);

      const summary: SearchSummary = {
        totalFiles,
        matchedFiles,
        totalMatches: results.length,
        searchTime: Date.now() - startTime,
        results: results.slice(0, options.maxResults || Infinity),
        debug: debugInfo
      };

      console.error(`🔍 [DEBUG] ============= SEARCH DEBUG END =============`);
      console.error(`🔍 [DEBUG] FINAL RESULT: ${matchedFiles} files matched, ${results.length} total matches in ${summary.searchTime}ms`);
      
      if (results.length === 0) {
        console.error(`🚨 [DEBUG] NO MATCHES FOUND! Possible issues:`);
        console.error(`🚨 [DEBUG] 1. Pattern: "${options.pattern}" might not exist in files`);
        console.error(`🚨 [DEBUG] 2. Directory: "${options.directory}" might not contain target files`);
        console.error(`🚨 [DEBUG] 3. File filtering might be too aggressive`);
        console.error(`🚨 [DEBUG] 4. Case sensitivity: ${options.caseSensitive}`);
      }

      return summary;

    } catch (error) {
      console.error('🚨 [DEBUG] Search error:', error);
      throw error;
    }
  }

  private async getFilesToSearchWithDebug(options: SearchOptions): Promise<{
    files: string[], 
    debugInfo: any
  }> {
    const searchDir = path.resolve(options.directory);
    
    console.error(`🔍 [DEBUG] getFilesToSearch - searchDir resolved to: ${searchDir}`);
    console.error(`🔍 [DEBUG] getFilesToSearch - directory exists: ${fsSync.existsSync(searchDir)}`);
    
    const debugInfo: any = {
      searchDirectory: options.directory,
      resolvedDirectory: searchDir,
      filePattern: options.filePattern || '**/*',
      globPattern: '',
      globResults: [],
      filteredFiles: [],
      skippedFiles: [],
      errorFiles: []
    };
    
    // Default file pattern if not specified - search ALL files
    const filePattern = options.filePattern || '**/*';
    debugInfo.filePattern = filePattern;
    debugInfo.globPattern = filePattern;
    
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

    console.error(`🔍 [DEBUG] Glob options:`, JSON.stringify(globOptions, null, 2));

    // Get files using glob
    console.error(`🔍 [DEBUG] Running glob with pattern: ${filePattern}`);
    let files: string[] = [];
    
    try {
      files = await glob(filePattern, globOptions);
      debugInfo.globResults = files.map(f => path.relative(searchDir, f));
      console.error(`🔍 [DEBUG] Glob returned ${files.length} files`);
      
      if (files.length === 0) {
        console.error(`🚨 [DEBUG] GLOB RETURNED NO FILES!`);
        console.error(`🚨 [DEBUG] Checking if directory is accessible...`);
        
        try {
          const dirContents = await fs.readdir(searchDir);
          console.error(`🔍 [DEBUG] Directory contents (${dirContents.length} items):`, dirContents.slice(0, 10));
        } catch (dirError) {
          console.error(`🚨 [DEBUG] Cannot read directory:`, dirError);
        }
        
        // Try simple glob patterns
        console.error(`🔍 [DEBUG] Trying simpler glob patterns...`);
        const simplePatterns = ['*', '*.cs', '**/*.cs'];
        for (const pattern of simplePatterns) {
          try {
            const simpleFiles = await glob(pattern, globOptions);
            console.error(`🔍 [DEBUG] Pattern "${pattern}" found ${simpleFiles.length} files`);
          } catch (globError) {
            console.error(`🚨 [DEBUG] Pattern "${pattern}" failed:`, globError);
          }
        }
      }
      
    } catch (globError) {
      console.error(`🚨 [DEBUG] Glob failed:`, globError);
      debugInfo.errorFiles.push(`Glob error: ${globError}`);
      return { files: [], debugInfo };
    }

    console.error(`🔍 [DEBUG] Files before gitignore filter: ${files.length}`);

    // Filter with gitignore if available
    if (this.gitignore) {
      const originalCount = files.length;
      files = files.filter(file => {
        const relativePath = path.relative(this.projectRoot, file);
        const ignored = this.gitignore!.ignores(relativePath);
        if (ignored) {
          debugInfo.skippedFiles.push(`${relativePath} (gitignore)`);
        }
        return !ignored;
      });
      console.error(`🔍 [DEBUG] After gitignore filter: ${files.length} (removed ${originalCount - files.length})`);
    }

    console.error(`🔍 [DEBUG] Files before binary filter: ${files.length}`);

    // Filter out binary files
    const originalCount = files.length;
    files = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      
      const binaryExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.webp', '.tiff', '.tif',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
        '.zip', '.rar', '.tar', '.gz', '.7z', '.bz2', '.xz', '.z',
        '.exe', '.dll', '.so', '.dylib', '.jar', '.class', '.pyc', '.pyo', '.o', '.obj',
        '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm', '.m4a', '.ogg',
        '.ttf', '.otf', '.woff', '.woff2', '.eot',
        '.db', '.sqlite', '.sqlite3', '.mdb', '.accdb',
        '.bin', '.dat', '.iso', '.dmg', '.img', '.deb', '.rpm'
      ];
      
      const isBinary = binaryExtensions.includes(ext);
      if (isBinary) {
        debugInfo.skippedFiles.push(`${path.basename(file)} (binary: ${ext})`);
      }
      return !isBinary;
    });

    debugInfo.filteredFiles = files.map(f => path.relative(searchDir, f));
    console.error(`🔍 [DEBUG] After binary filter: ${files.length} (removed ${originalCount - files.length} binary files)`);
    
    if (files.length === 0 && debugInfo.globResults.length > 0) {
      console.error(`🚨 [DEBUG] ALL FILES WERE FILTERED OUT!`);
      console.error(`🚨 [DEBUG] Originally found: ${debugInfo.globResults.length}`);
      console.error(`🚨 [DEBUG] Skipped files:`, debugInfo.skippedFiles);
    }

    return { files, debugInfo };
  }

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

  private async searchInFileWithDebug(
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

          if (options.maxResults && results.length >= options.maxResults) {
            return results;
          }
        }
      }

    } catch (error) {
      console.error(`🚨 [DEBUG] Error searching file ${filePath}:`, error);
      if ((error as NodeJS.ErrnoException).code !== 'EACCES') {
        console.error(`🚨 [DEBUG] Unexpected file error for ${filePath}:`, error);
      }
    }

    return results;
  }

  // Other methods remain the same for now
  async searchSymbols(symbolName: string, filePattern: string = '**/*.{js,ts,jsx,tsx,py,java,go,rs,cpp,c,h,php,rb,swift,kt,cs,vb,scala,dart,lua,r,m,mm}'): Promise<SearchResult[]> {
    // Use debug version
    const symbolPatterns = [
      `(function|const|let|var|class)\\s+${symbolName}\\b`,
      `${symbolName}\\s*[:=]\\s*(function|\\([^)]*\\)\\s*=>)`,
      `(def|class)\\s+${symbolName}\\b`,
      `(public|private|protected)?\\s*(static)?\\s*\\w+\\s+${symbolName}\\s*\\(`,
      `func\\s+(\\(\\w+\\s+\\w+\\)\\s+)?${symbolName}\\b`,
      `(fn|struct|enum|trait|impl)\\s+${symbolName}\\b`,
      `(void|int|char|float|double|bool|auto)\\s+${symbolName}\\s*\\(`,
      `(function|class)\\s+${symbolName}\\b`,
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

  async searchTodos(includeNotes: boolean = false): Promise<SearchResult[]> {
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

  clearCache(): void {
    this.searchCache.clear();
  }
}
