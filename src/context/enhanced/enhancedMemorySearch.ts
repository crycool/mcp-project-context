import { Memory } from '../../storage/memoryManager.js';

export interface SearchStrategy {
  name: string;
  weight: number;
  execute: (query: string, memories: Memory[]) => SearchResult[];
}

export interface SearchResult {
  memory: Memory;
  score: number;
  strategy: string;
  matchDetails?: string[];
}

export interface SearchOptions {
  limit?: number;
  fuzzy?: boolean;
  tagSearch?: boolean;
  semanticSearch?: boolean;
  minScore?: number;
  includeContent?: boolean;
  timeWeight?: boolean;
}

export interface CombinedSearchResult {
  results: SearchResult[];
  totalMatches: number;
  searchTime: number;
  strategiesUsed: string[];
  queryAnalysis: QueryAnalysis;
}

export interface QueryAnalysis {
  originalQuery: string;
  normalizedQuery: string;
  extractedTags: string[];
  queryType: 'exact' | 'fuzzy' | 'semantic' | 'tag-based';
  confidence: number;
}

/**
 * Professional Enhanced Memory Search System
 * Implements multiple search strategies with intelligent ranking and fuzzy matching
 */
export class EnhancedMemorySearch {
  private static readonly TAG_MAPPINGS: Record<string, string[]> = {
    // Critical issues and problems
    'critical': ['critical-issues', 'high-priority', 'urgent', 'blocking'],
    'issues': ['critical-issues', 'problems', 'bugs', 'errors', 'failures'],
    'problems': ['critical-issues', 'issues', 'bugs', 'errors', 'failures'],
    'bugs': ['critical-issues', 'problems', 'errors', 'failures', 'debugging'],
    'errors': ['critical-issues', 'problems', 'bugs', 'failures', 'exceptions'],
    
    // Project and development
    'refactoring': ['refactoring', 'architecture', 'implementation', 'restructuring'],
    'architecture': ['refactoring', 'design', 'structure', 'implementation'],
    'implementation': ['refactoring', 'architecture', 'development', 'coding'],
    'plan': ['implementation-plan', 'phases', 'roadmap', 'strategy'],
    'planning': ['implementation-plan', 'phases', 'roadmap', 'strategy'],
    
    // Technologies and features
    'screen sharing': ['screen-sharing', 'webrtc', 'media', 'streaming'],
    'remote control': ['remote-control', 'permissions', 'events', 'interaction'],
    'webrtc': ['screen-sharing', 'media', 'streaming', 'communication'],
    'socket': ['websocket', 'communication', 'real-time', 'networking'],
    
    // Project names and identifiers
    'teamvoicechat': ['project-status', 'teamvoicechat', 'team-voice-chat'],
    'team voice chat': ['project-status', 'teamvoicechat', 'team-voice-chat'],
    
    // User and session
    'yusuf': ['user-yusuf', 'session', 'conversation'],
    'claude': ['assistant', 'ai', 'conversation'],
    'session': ['user-session', 'conversation', 'interaction'],
    
    // Priority and status
    'high priority': ['high-priority', 'urgent', 'critical-issues'],
    'urgent': ['high-priority', 'critical-issues', 'immediate'],
    'immediate': ['urgent', 'high-priority', 'blocking'],
    'blocking': ['urgent', 'high-priority', 'critical-issues']
  };

  private searchStrategies: SearchStrategy[] = [];

  constructor() {
    this.initializeSearchStrategies();
  }

  /**
   * Execute enhanced multi-strategy search
   */
  async searchMemories(
    query: string, 
    memories: Memory[], 
    options: SearchOptions = {}
  ): Promise<CombinedSearchResult> {
    const startTime = Date.now();
    
    const searchOptions = {
      limit: 10,
      fuzzy: true,
      tagSearch: true,
      semanticSearch: true,
      minScore: 0.3,
      includeContent: true,
      timeWeight: true,
      ...options
    };

    // Analyze the query
    const queryAnalysis = this.analyzeQuery(query);
    
    // Execute search strategies
    const strategiesUsed: string[] = [];
    const allResults: SearchResult[] = [];

    for (const strategy of this.searchStrategies) {
      if (this.shouldUseStrategy(strategy, searchOptions, queryAnalysis)) {
        try {
          const strategyResults = strategy.execute(query, memories);
          allResults.push(...strategyResults);
          strategiesUsed.push(strategy.name);
        } catch (error) {
          console.error(`Error in search strategy ${strategy.name}:`, error);
        }
      }
    }

    // Combine and rank results
    const combinedResults = this.combineAndRankResults(
      allResults, 
      searchOptions,
      queryAnalysis
    );

    const searchTime = Date.now() - startTime;

    return {
      results: combinedResults.slice(0, searchOptions.limit),
      totalMatches: combinedResults.length,
      searchTime,
      strategiesUsed,
      queryAnalysis
    };
  }

  /**
   * Initialize all search strategies
   */
  private initializeSearchStrategies(): void {
    this.searchStrategies = [
      {
        name: 'exact-match',
        weight: 1.0,
        execute: (query: string, memories: Memory[]) => this.exactMatchSearch(query, memories)
      },
      {
        name: 'tag-based',
        weight: 0.9,
        execute: (query: string, memories: Memory[]) => this.tagBasedSearch(query, memories)
      },
      {
        name: 'fuzzy-content',
        weight: 0.8,
        execute: (query: string, memories: Memory[]) => this.fuzzyContentSearch(query, memories)
      },
      {
        name: 'semantic-similarity',
        weight: 0.7,
        execute: (query: string, memories: Memory[]) => this.semanticSimilaritySearch(query, memories)
      },
      {
        name: 'partial-match',
        weight: 0.6,
        execute: (query: string, memories: Memory[]) => this.partialMatchSearch(query, memories)
      }
    ];
  }

  /**
   * Analyze query to determine best search approach
   */
  private analyzeQuery(query: string): QueryAnalysis {
    const normalizedQuery = query.toLowerCase().trim();
    const extractedTags = this.extractTagsFromQuery(normalizedQuery);
    
    let queryType: QueryAnalysis['queryType'] = 'fuzzy';
    let confidence = 0.5;

    // Determine query type based on characteristics
    if (normalizedQuery.length > 20 && extractedTags.length === 0) {
      queryType = 'semantic';
      confidence = 0.7;
    } else if (extractedTags.length > 0) {
      queryType = 'tag-based';
      confidence = 0.8;
    } else if (normalizedQuery.includes('"') || normalizedQuery.length < 10) {
      queryType = 'exact';
      confidence = 0.9;
    }

    return {
      originalQuery: query,
      normalizedQuery,
      extractedTags,
      queryType,
      confidence
    };
  }

  /**
   * Extract relevant tags from query using mapping dictionary
   */
  private extractTagsFromQuery(query: string): string[] {
    const extractedTags: Set<string> = new Set();
    
    for (const [keyword, mappedTags] of Object.entries(EnhancedMemorySearch.TAG_MAPPINGS)) {
      if (query.includes(keyword)) {
        mappedTags.forEach(tag => extractedTags.add(tag));
      }
    }
    
    // Also look for direct tag mentions
    const words = query.split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && !this.isCommonWord(word)) {
        extractedTags.add(word);
      }
    }
    
    return Array.from(extractedTags);
  }

  /**
   * Check if a word is too common to be useful as a tag
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'within', 'without',
      'this', 'that', 'these', 'those', 'what', 'which', 'who', 'when',
      'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
      'most', 'other', 'some', 'such', 'only', 'own', 'same', 'so', 'than',
      'too', 'very', 'can', 'will', 'just', 'should', 'now', 'project',
      'system', 'development', 'code', 'file', 'function', 'method'
    ]);
    
    return commonWords.has(word.toLowerCase());
  }

  /**
   * Determine if a strategy should be used based on options and query analysis
   */
  private shouldUseStrategy(
    strategy: SearchStrategy, 
    options: SearchOptions, 
    queryAnalysis: QueryAnalysis
  ): boolean {
    switch (strategy.name) {
      case 'exact-match':
        return true; // Always try exact match first
      case 'tag-based':
        return options.tagSearch !== false && queryAnalysis.extractedTags.length > 0;
      case 'fuzzy-content':
        return options.fuzzy !== false;
      case 'semantic-similarity':
        return options.semanticSearch !== false && queryAnalysis.originalQuery.length > 10;
      case 'partial-match':
        return queryAnalysis.originalQuery.length > 5;
      default:
        return true;
    }
  }

  /**
   * Exact match search strategy
   */
  private exactMatchSearch(query: string, memories: Memory[]): SearchResult[] {
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const memory of memories) {
      const contentStr = JSON.stringify(memory.content).toLowerCase();
      const tagsStr = memory.tags.join(' ').toLowerCase();
      
      if (contentStr.includes(queryLower) || tagsStr.includes(queryLower)) {
        const score = this.calculateExactMatchScore(queryLower, contentStr, tagsStr);
        results.push({
          memory,
          score,
          strategy: 'exact-match',
          matchDetails: this.findMatchDetails(queryLower, contentStr, tagsStr)
        });
      }
    }

    return results;
  }

  /**
   * Tag-based search strategy
   */
  private tagBasedSearch(query: string, memories: Memory[]): SearchResult[] {
    const extractedTags = this.extractTagsFromQuery(query.toLowerCase());
    if (extractedTags.length === 0) return [];

    const results: SearchResult[] = [];

    for (const memory of memories) {
      const memoryTags = memory.tags.map((tag: string) => tag.toLowerCase());
      let matchCount = 0;
      const matchedTags: string[] = [];

      for (const tag of extractedTags) {
        if (memoryTags.some((memTag: string) => memTag.includes(tag) || tag.includes(memTag))) {
          matchCount++;
          matchedTags.push(tag);
        }
      }

      if (matchCount > 0) {
        const score = matchCount / extractedTags.length;
        results.push({
          memory,
          score,
          strategy: 'tag-based',
          matchDetails: [`Matched tags: ${matchedTags.join(', ')}`]
        });
      }
    }

    return results;
  }
  /**
   * Fuzzy content search strategy using string similarity
   */
  private fuzzyContentSearch(query: string, memories: Memory[]): SearchResult[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    const results: SearchResult[] = [];

    for (const memory of memories) {
      const contentStr = JSON.stringify(memory.content).toLowerCase();
      const tagsStr = memory.tags.join(' ').toLowerCase();
      const combinedText = `${contentStr} ${tagsStr}`;
      
      let totalScore = 0;
      const matchedWords: string[] = [];

      for (const word of queryWords) {
        const wordScore = this.calculateFuzzyWordScore(word, combinedText);
        if (wordScore > 0.3) { // Minimum similarity threshold
          totalScore += wordScore;
          matchedWords.push(word);
        }
      }

      if (matchedWords.length > 0) {
        const averageScore = totalScore / queryWords.length;
        results.push({
          memory,
          score: averageScore,
          strategy: 'fuzzy-content',
          matchDetails: [`Fuzzy matched words: ${matchedWords.join(', ')}`]
        });
      }
    }

    return results;
  }

  /**
   * Semantic similarity search (simplified implementation)
   */
  private semanticSimilaritySearch(query: string, memories: Memory[]): SearchResult[] {
    const results: SearchResult[] = [];
    const queryWords = query.toLowerCase().split(/\s+/);
    
    for (const memory of memories) {
      const contentStr = JSON.stringify(memory.content).toLowerCase();
      const similarityScore = this.calculateSemanticSimilarity(queryWords, contentStr);
      
      if (similarityScore > 0.2) {
        results.push({
          memory,
          score: similarityScore,
          strategy: 'semantic-similarity',
          matchDetails: [`Semantic similarity: ${(similarityScore * 100).toFixed(1)}%`]
        });
      }
    }

    return results;
  }

  /**
   * Partial match search strategy
   */
  private partialMatchSearch(query: string, memories: Memory[]): SearchResult[] {
    const queryLower = query.toLowerCase();
    const queryParts = queryLower.split(/\s+/);
    const results: SearchResult[] = [];

    for (const memory of memories) {
      const contentStr = JSON.stringify(memory.content).toLowerCase();
      const tagsStr = memory.tags.join(' ').toLowerCase();
      
      let matchCount = 0;
      const matchedParts: string[] = [];

      for (const part of queryParts) {
        if (part.length > 2) {
          if (contentStr.includes(part) || tagsStr.includes(part)) {
            matchCount++;
            matchedParts.push(part);
          }
        }
      }

      if (matchCount > 0) {
        const score = matchCount / queryParts.length;
        results.push({
          memory,
          score,
          strategy: 'partial-match',
          matchDetails: [`Partial matches: ${matchedParts.join(', ')}`]
        });
      }
    }

    return results;
  }

  /**
   * Calculate exact match score
   */
  private calculateExactMatchScore(query: string, contentStr: string, tagsStr: string): number {
    let score = 0;
    
    // Direct content match gets higher score
    if (contentStr.includes(query)) {
      score += 0.8;
      
      // Bonus for exact phrase match
      const contentWords = contentStr.split(/\s+/);
      const queryWords = query.split(/\s+/);
      if (queryWords.length > 1) {
        const phraseMatch = contentStr.includes(query);
        if (phraseMatch) score += 0.2;
      }
    }
    
    // Tag match gets medium score
    if (tagsStr.includes(query)) {
      score += 0.6;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate fuzzy word similarity score
   */
  private calculateFuzzyWordScore(word: string, text: string): number {
    if (text.includes(word)) return 1.0;
    
    // Use Levenshtein distance for fuzzy matching
    const words = text.split(/\s+/);
    let bestScore = 0;
    
    for (const textWord of words) {
      if (Math.abs(textWord.length - word.length) > 3) continue;
      
      const distance = this.levenshteinDistance(word, textWord);
      const maxLength = Math.max(word.length, textWord.length);
      const similarity = 1 - (distance / maxLength);
      
      if (similarity > bestScore) {
        bestScore = similarity;
      }
    }
    
    return bestScore;
  }

  /**
   * Calculate semantic similarity (simplified)
   */
  private calculateSemanticSimilarity(queryWords: string[], contentStr: string): number {
    const contentWords = contentStr.split(/\s+/);
    let commonWords = 0;
    let conceptualMatches = 0;
    
    // Direct word matches
    for (const queryWord of queryWords) {
      if (contentWords.includes(queryWord)) {
        commonWords++;
      }
    }
    
    // Conceptual matches using synonym/related term detection
    const conceptMap: Record<string, string[]> = {
      'error': ['bug', 'issue', 'problem', 'exception', 'failure'],
      'fix': ['solve', 'repair', 'correct', 'resolve'],
      'screen': ['display', 'monitor', 'view', 'visual'],
      'share': ['sharing', 'broadcast', 'stream', 'transmit'],
      'control': ['manage', 'handle', 'command', 'direct']
    };
    
    for (const queryWord of queryWords) {
      const relatedTerms = conceptMap[queryWord] || [];
      for (const term of relatedTerms) {
        if (contentWords.some(word => word.includes(term))) {
          conceptualMatches++;
          break;
        }
      }
    }
    
    const totalMatches = commonWords + (conceptualMatches * 0.5);
    return totalMatches / queryWords.length;
  }

  /**
   * Levenshtein distance calculation for fuzzy matching
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator  // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Find specific match details for debugging
   */
  private findMatchDetails(query: string, contentStr: string, tagsStr: string): string[] {
    const details: string[] = [];
    
    if (contentStr.includes(query)) {
      details.push(`Content match: "${query}"`);
    }
    
    if (tagsStr.includes(query)) {
      details.push(`Tag match: "${query}"`);
    }
    
    return details;
  }

  /**
   * Combine and rank results from multiple strategies
   */
  private combineAndRankResults(
    allResults: SearchResult[], 
    options: SearchOptions,
    queryAnalysis: QueryAnalysis
  ): SearchResult[] {
    // Group results by memory ID to avoid duplicates
    const resultMap = new Map<string, SearchResult>();
    
    for (const result of allResults) {
      const memoryId = result.memory.id;
      const existing = resultMap.get(memoryId);
      
      if (!existing || result.score > existing.score) {
        // Apply strategy weight
        const strategy = this.searchStrategies.find(s => s.name === result.strategy);
        const weightedScore = result.score * (strategy?.weight || 1.0);
        
        // Apply time weight if enabled
        const timeWeight = options.timeWeight ? this.calculateTimeWeight(result.memory) : 1.0;
        const finalScore = weightedScore * timeWeight;
        
        if (finalScore >= (options.minScore || 0.3)) {
          resultMap.set(memoryId, {
            ...result,
            score: finalScore
          });
        }
      }
    }
    
    // Sort by score (descending)
    return Array.from(resultMap.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate time-based weight for recency
   */
  private calculateTimeWeight(memory: Memory): number {
    const now = Date.now();
    const age = now - memory.timestamp.getTime();
    const recency = now - memory.lastAccessed.getTime();
    
    // Exponential decay for age (30 days half-life)
    const ageWeight = Math.exp(-age / (30 * 24 * 60 * 60 * 1000));
    
    // Exponential decay for last access (7 days half-life)  
    const recencyWeight = Math.exp(-recency / (7 * 24 * 60 * 60 * 1000));
    
    // Combine age and recency with access count
    const accessWeight = Math.log10(memory.accessCount + 1) / 3;
    
    return (ageWeight * 0.4) + (recencyWeight * 0.4) + (accessWeight * 0.2);
  }

  /**
   * Format search results for display
   */
  formatSearchResults(searchResult: CombinedSearchResult): string {
    let output = `🔍 Enhanced Memory Search Results\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `Query: "${searchResult.queryAnalysis.originalQuery}"\n`;
    output += `Search Type: ${searchResult.queryAnalysis.queryType}\n`;
    output += `Confidence: ${(searchResult.queryAnalysis.confidence * 100).toFixed(1)}%\n`;
    output += `Strategies Used: ${searchResult.strategiesUsed.join(', ')}\n`;
    output += `Total Matches: ${searchResult.totalMatches}\n`;
    output += `Search Time: ${searchResult.searchTime}ms\n`;
    
    if (searchResult.queryAnalysis.extractedTags.length > 0) {
      output += `Extracted Tags: ${searchResult.queryAnalysis.extractedTags.join(', ')}\n`;
    }
    
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (searchResult.results.length === 0) {
      output += `❌ No memories found matching your query.\n\n`;
      output += `💡 Search Tips:\n`;
      output += `• Try broader terms (e.g., "screen" instead of "screen sharing bug")\n`;
      output += `• Use specific identifiers (e.g., "TeamVoiceChat", "CLAUDE_IMPLEMENTATION_PLAN")\n`;
      output += `• Search by tags (e.g., "critical", "webrtc", "yusuf")\n`;
      return output;
    }
    
    for (let i = 0; i < searchResult.results.length; i++) {
      const result = searchResult.results[i];
      const memory = result.memory;
      
      output += `${i + 1}. 🧠 Memory ID: ${memory.id}\n`;
      output += `   📊 Score: ${(result.score * 100).toFixed(1)}% | Strategy: ${result.strategy}\n`;
      output += `   🏷️  Tags: ${memory.tags.join(', ') || '(none)'}\n`;
      output += `   📅 Created: ${memory.timestamp.toLocaleDateString()}\n`;
      output += `   👁️  Accessed: ${memory.accessCount} times\n`;
      
      if (result.matchDetails && result.matchDetails.length > 0) {
        output += `   🔍 Match Details: ${result.matchDetails.join('; ')}\n`;
      }
      
      output += `   📝 Content: ${JSON.stringify(memory.content).substring(0, 200)}${JSON.stringify(memory.content).length > 200 ? '...' : ''}\n`;
      output += `\n`;
    }
    
    return output;
  }
}
