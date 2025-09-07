import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Smart editing strategies for enhanced file editing
 */
export enum EditStrategy {
  EXACT = 'exact',        // Exact string match (current behavior)
  FUZZY = 'fuzzy',        // Fuzzy matching with whitespace normalization
  SECTION = 'section',    // Section-based editing (between headers)
  LINES = 'lines',        // Line range editing
  PATTERN = 'pattern',    // Regex pattern based
  BETWEEN = 'between'     // Between two markers
}

export interface SmartEditOptions {
  strategy?: EditStrategy;
  fuzzy?: boolean;                  // Enable fuzzy matching
  tolerance?: number;                // Similarity threshold (0-1)
  preserveIndentation?: boolean;    // Preserve original indentation
  createIfMissing?: boolean;        // Create section if not found
  caseSensitive?: boolean;           // Case sensitive matching
  multiline?: boolean;               // Enable multiline regex
  backup?: boolean;                  // Create backup before editing
}

export interface SectionEditParams {
  path: string;
  sectionStart: string;              // Section header or marker
  sectionEnd?: string;               // Optional end marker
  newContent: string;
  options?: SmartEditOptions;
}

export interface LineEditParams {
  path: string;
  startLine: number;
  endLine: number;
  newContent: string;
  options?: SmartEditOptions;
}

export interface PatternEditParams {
  path: string;
  pattern: string | RegExp;
  newContent: string;
  options?: SmartEditOptions;
}

export interface BetweenEditParams {
  path: string;
  startMarker: string;
  endMarker: string;
  newContent: string;
  includeMarkers?: boolean;
  options?: SmartEditOptions;
}

export interface EditResult {
  success: boolean;
  message: string;
  replacements?: number;
  backup?: string;
  lineNumbers?: number[];
  diff?: {
    added: number;
    removed: number;
    modified: number;
  };
}

/**
 * Smart file editor with multiple editing strategies
 */
export class SmartEditor {
  
  /**
   * Normalize whitespace for fuzzy matching
   */
  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\t/g, '  ')             // Tabs to spaces
      .replace(/ +/g, ' ')              // Multiple spaces to single
      .replace(/\n\s*\n/g, '\n\n')      // Multiple empty lines to double
      .trim();                          // Remove leading/trailing whitespace
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,  // substitution
            matrix[i][j - 1] + 1,       // insertion
            matrix[i - 1][j] + 1        // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Find similar content in file for better error messages
   */
  private findSimilarContent(
    content: string, 
    searchText: string, 
    tolerance: number = 0.7
  ): { line: number; text: string; similarity: number } | null {
    const lines = content.split('\n');
    const searchNormalized = this.normalizeWhitespace(searchText);
    
    let bestMatch = { line: -1, text: '', similarity: 0 };
    
    // Check each line and multi-line segments
    for (let i = 0; i < lines.length; i++) {
      // Single line check
      const lineNormalized = this.normalizeWhitespace(lines[i]);
      const lineSimilarity = this.calculateSimilarity(lineNormalized, searchNormalized);
      
      if (lineSimilarity > bestMatch.similarity) {
        bestMatch = { line: i + 1, text: lines[i], similarity: lineSimilarity };
      }
      
      // Multi-line check (up to same number of lines as search text)
      const searchLineCount = searchText.split('\n').length;
      if (searchLineCount > 1 && i + searchLineCount <= lines.length) {
        const segment = lines.slice(i, i + searchLineCount).join('\n');
        const segmentNormalized = this.normalizeWhitespace(segment);
        const segmentSimilarity = this.calculateSimilarity(segmentNormalized, searchNormalized);
        
        if (segmentSimilarity > bestMatch.similarity) {
          bestMatch = { 
            line: i + 1, 
            text: segment.substring(0, 100) + (segment.length > 100 ? '...' : ''),
            similarity: segmentSimilarity 
          };
        }
      }
    }
    
    return bestMatch.similarity >= tolerance ? bestMatch : null;
  }

  /**
   * Smart edit with fuzzy matching and enhanced error reporting
   */
  async smartEdit(
    filePath: string,
    oldContent: string,
    newContent: string,
    options: SmartEditOptions = {}
  ): Promise<EditResult> {
    try {
      const currentContent = await fs.readFile(filePath, 'utf-8');
      
      // Backup if requested
      let backupPath: string | undefined;
      if (options.backup) {
        backupPath = `${filePath}.backup.${Date.now()}`;
        await fs.writeFile(backupPath, currentContent, 'utf-8');
      }
      
      let updatedContent = currentContent;
      let replacements = 0;
      const lineNumbers: number[] = [];
      
      if (options.fuzzy) {
        // Fuzzy matching with whitespace normalization
        const normalizedCurrent = this.normalizeWhitespace(currentContent);
        const normalizedOld = this.normalizeWhitespace(oldContent);
        
        if (normalizedCurrent.includes(normalizedOld)) {
          // Find the original text that matches the normalized version
          const lines = currentContent.split('\n');
          const searchLines = oldContent.split('\n').length;
          
          for (let i = 0; i <= lines.length - searchLines; i++) {
            const segment = lines.slice(i, i + searchLines).join('\n');
            const segmentNormalized = this.normalizeWhitespace(segment);
            
            if (segmentNormalized === normalizedOld) {
              // Found the match, replace it
              lines.splice(i, searchLines, ...newContent.split('\n'));
              updatedContent = lines.join('\n');
              replacements = 1;
              lineNumbers.push(i + 1);
              break;
            }
          }
        }
      } else {
        // Exact matching (current behavior)
        const occurrences = (currentContent.match(new RegExp(
          oldContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 
          'g'
        )) || []).length;
        
        if (occurrences > 0) {
          updatedContent = currentContent.replace(oldContent, newContent);
          replacements = occurrences;
          
          // Find line numbers
          const lines = currentContent.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(oldContent.split('\n')[0])) {
              lineNumbers.push(i + 1);
            }
          }
        }
      }
      
      if (replacements === 0) {
        // Find similar content for helpful error message
        const similar = this.findSimilarContent(
          currentContent, 
          oldContent, 
          options.tolerance || 0.7
        );
        
        if (similar) {
          return {
            success: false,
            message: `Content not found. Similar content found at line ${similar.line}:\n` +
                    `"${similar.text}"\n` +
                    `(${Math.round(similar.similarity * 100)}% similarity)\n` +
                    `Try using --fuzzy flag or adjust the search text.`
          };
        } else {
          return {
            success: false,
            message: 'Content not found. No similar content detected in file.'
          };
        }
      }
      
      // Write the updated content
      await fs.writeFile(filePath, updatedContent, 'utf-8');
      
      // Calculate diff statistics
      const oldLines = currentContent.split('\n').length;
      const newLines = updatedContent.split('\n').length;
      
      return {
        success: true,
        message: `Successfully replaced ${replacements} occurrence(s)`,
        replacements,
        backup: backupPath,
        lineNumbers,
        diff: {
          added: Math.max(0, newLines - oldLines),
          removed: Math.max(0, oldLines - newLines),
          modified: replacements
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Edit content between section markers (like markdown headers)
   */
  async editSection(params: SectionEditParams): Promise<EditResult> {
    try {
      const content = await fs.readFile(params.path, 'utf-8');
      const lines = content.split('\n');
      
      // Find section start
      let startIndex = -1;
      let endIndex = lines.length;
      
      for (let i = 0; i < lines.length; i++) {
        const line = params.options?.fuzzy 
          ? this.normalizeWhitespace(lines[i])
          : lines[i];
        const searchStart = params.options?.fuzzy
          ? this.normalizeWhitespace(params.sectionStart)
          : params.sectionStart;
          
        if (line.includes(searchStart) || 
            (params.options?.fuzzy && this.calculateSimilarity(line, searchStart) > 0.8)) {
          startIndex = i;
          break;
        }
      }
      
      if (startIndex === -1) {
        if (params.options?.createIfMissing) {
          // Append the new section at the end
          const newSection = `\n\n${params.sectionStart}\n${params.newContent}`;
          await fs.appendFile(params.path, newSection, 'utf-8');
          
          return {
            success: true,
            message: 'Section created and content added',
            replacements: 1
          };
        }
        
        return {
          success: false,
          message: `Section "${params.sectionStart}" not found`
        };
      }
      
      // Find section end
      if (params.sectionEnd) {
        for (let i = startIndex + 1; i < lines.length; i++) {
          const line = params.options?.fuzzy
            ? this.normalizeWhitespace(lines[i])
            : lines[i];
          const searchEnd = params.options?.fuzzy
            ? this.normalizeWhitespace(params.sectionEnd)
            : params.sectionEnd;
            
          if (line.includes(searchEnd)) {
            endIndex = i;
            break;
          }
        }
      } else {
        // Find next section at same or higher level (for markdown headers)
        const headerMatch = lines[startIndex].match(/^#+/);
        if (headerMatch) {
          const level = headerMatch[0].length;
          for (let i = startIndex + 1; i < lines.length; i++) {
            const nextHeader = lines[i].match(/^#+/);
            if (nextHeader && nextHeader[0].length <= level) {
              endIndex = i;
              break;
            }
          }
        }
      }
      
      // Replace section content
      const sectionHeader = lines[startIndex];
      const newLines = [
        ...lines.slice(0, startIndex),
        sectionHeader,
        ...params.newContent.split('\n'),
        ...lines.slice(endIndex)
      ];
      
      const updatedContent = newLines.join('\n');
      await fs.writeFile(params.path, updatedContent, 'utf-8');
      
      return {
        success: true,
        message: `Section updated successfully`,
        replacements: 1,
        lineNumbers: [startIndex + 1],
        diff: {
          added: params.newContent.split('\n').length,
          removed: endIndex - startIndex - 1,
          modified: 1
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Edit specific line range
   */
  async editLines(params: LineEditParams): Promise<EditResult> {
    try {
      const content = await fs.readFile(params.path, 'utf-8');
      const lines = content.split('\n');
      
      // Validate line numbers
      if (params.startLine < 1 || params.startLine > lines.length) {
        return {
          success: false,
          message: `Invalid start line ${params.startLine}. File has ${lines.length} lines.`
        };
      }
      
      if (params.endLine < params.startLine || params.endLine > lines.length) {
        return {
          success: false,
          message: `Invalid end line ${params.endLine}. Must be between ${params.startLine} and ${lines.length}.`
        };
      }
      
      // Replace lines
      const newLines = [
        ...lines.slice(0, params.startLine - 1),
        ...params.newContent.split('\n'),
        ...lines.slice(params.endLine)
      ];
      
      const updatedContent = newLines.join('\n');
      await fs.writeFile(params.path, updatedContent, 'utf-8');
      
      const replacedCount = params.endLine - params.startLine + 1;
      const addedCount = params.newContent.split('\n').length;
      
      return {
        success: true,
        message: `Replaced lines ${params.startLine}-${params.endLine}`,
        replacements: 1,
        lineNumbers: Array.from(
          { length: replacedCount }, 
          (_, i) => params.startLine + i
        ),
        diff: {
          added: addedCount,
          removed: replacedCount,
          modified: 0
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Edit using regex pattern
   */
  async editPattern(params: PatternEditParams): Promise<EditResult> {
    try {
      const content = await fs.readFile(params.path, 'utf-8');
      
      // Create regex from string or use provided regex
      const regex = params.pattern instanceof RegExp 
        ? params.pattern
        : new RegExp(
            params.pattern, 
            `g${params.options?.caseSensitive ? '' : 'i'}${params.options?.multiline ? 'm' : ''}`
          );
      
      // Count matches
      const matches = content.match(regex);
      if (!matches || matches.length === 0) {
        return {
          success: false,
          message: `Pattern not found: ${params.pattern}`
        };
      }
      
      // Replace all matches
      const updatedContent = content.replace(regex, params.newContent);
      await fs.writeFile(params.path, updatedContent, 'utf-8');
      
      // Find line numbers of replacements
      const lineNumbers: number[] = [];
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(regex)) {
          lineNumbers.push(i + 1);
        }
      }
      
      return {
        success: true,
        message: `Replaced ${matches.length} pattern match(es)`,
        replacements: matches.length,
        lineNumbers
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Edit content between two markers
   */
  async editBetween(params: BetweenEditParams): Promise<EditResult> {
    try {
      const content = await fs.readFile(params.path, 'utf-8');
      
      // Find start and end markers
      const startIndex = content.indexOf(params.startMarker);
      const endIndex = content.indexOf(params.endMarker, startIndex + params.startMarker.length);
      
      if (startIndex === -1) {
        return {
          success: false,
          message: `Start marker not found: "${params.startMarker.substring(0, 50)}..."`
        };
      }
      
      if (endIndex === -1) {
        return {
          success: false,
          message: `End marker not found: "${params.endMarker.substring(0, 50)}..."`
        };
      }
      
      // Calculate replacement boundaries
      const replaceStart = params.includeMarkers 
        ? startIndex 
        : startIndex + params.startMarker.length;
      const replaceEnd = params.includeMarkers 
        ? endIndex + params.endMarker.length
        : endIndex;
      
      // Build new content
      const before = content.substring(0, replaceStart);
      const after = content.substring(replaceEnd);
      const middle = params.includeMarkers 
        ? params.newContent
        : `${params.startMarker}${params.newContent}${params.endMarker}`;
      
      const updatedContent = before + middle + after;
      await fs.writeFile(params.path, updatedContent, 'utf-8');
      
      // Find line numbers
      const lineNumbers = [];
      const beforeLines = content.substring(0, startIndex).split('\n').length;
      lineNumbers.push(beforeLines);
      
      return {
        success: true,
        message: 'Content between markers replaced successfully',
        replacements: 1,
        lineNumbers
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

export default SmartEditor;