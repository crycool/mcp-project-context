import { Memory } from '../../storage/memoryManager.js';

export interface SearchOptions {
  limit?: number;
  fuzzy?: boolean;
  tagSearch?: boolean;
  semanticSearch?: boolean;
  minScore?: number;
}

export interface SearchResult {
  memory: Memory;
  score: number;
  strategy: string;
  matchDetails?: string[];
}

export interface CombinedSearchResult {
  results: SearchResult[];
  searchTime: number;
  strategiesUsed: string[];
  queryAnalysis: QueryAnalysis;
}

export interface QueryAnalysis {
  queryType: string;
  extractedTags: string[];
  confidence: number;
}

/**
 * Enhanced memory search engine with multiple strategies
 */
export class EnhancedMemorySearch {
  
  /**
   * Search memories using multiple strategies
   */
  async searchMemories(
    query: string, 
    memories: Memory[], 
    options: SearchOptions = {}
  ): Promise<CombinedSearchResult> {
    const startTime = Date.now();
    const strategiesUsed: string[] = [];
    const allResults: SearchResult[] = [];
    
    const queryAnalysis = this.analyzeQuery(query);
    
    // Basic string matching (always enabled)
    const basicResults = this.basicSearch(query, memories);
    if (basicResults.length > 0) {
      strategiesUsed.push('basic');
      allResults.push(...basicResults);
    }
    
    // Fuzzy matching
    if (options.fuzzy !== false) {
      const fuzzyResults = this.fuzzySearch(query, memories);
      if (fuzzyResults.length > 0) {
        strategiesUsed.push('fuzzy');
        allResults.push(...fuzzyResults);
      }
    }
    
    // Tag-based search
    if (options.tagSearch !== false) {
      const tagResults = this.tagSearch(query, memories, queryAnalysis.extractedTags);
      if (tagResults.length > 0) {
        strategiesUsed.push('tag-based');
        allResults.push(...tagResults);
      }
    }
    
    // Semantic similarity (simplified)
    if (options.semanticSearch !== false) {
      const semanticResults = this.semanticSearch(query, memories);
      if (semanticResults.length > 0) {
        strategiesUsed.push('semantic');
        allResults.push(...semanticResults);
      }
    }
    
    // Combine and deduplicate results
    const combinedResults = this.combineResults(allResults, options.minScore || 0.3);
    
    // Sort by score and limit
    combinedResults.sort((a, b) => b.score - a.score);
    const limitedResults = combinedResults.slice(0, options.limit || 10);
    
    return {
      results: limitedResults,
      searchTime: Date.now() - startTime,
      strategiesUsed,
      queryAnalysis
    };
  }
  
  /**
   * Basic string matching search
   */
  private basicSearch(query: string, memories: Memory[]): SearchResult[] {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    
    for (const memory of memories) {
      const contentStr = JSON.stringify(memory.content).toLowerCase();
      const tagsStr = memory.tags.join(' ').toLowerCase();
      
      if (contentStr.includes(queryLower) || tagsStr.includes(queryLower)) {
        results.push({
          memory,
          score: 1.0,
          strategy: 'basic',
          matchDetails: ['Exact match in content or tags']
        });
      }
    }
    
    return results;
  }
  
  /**
   * Fuzzy matching search
   */
  private fuzzySearch(query: string, memories: Memory[]): SearchResult[] {
    const results: SearchResult[] = [];
    const queryWords = query.toLowerCase().split(/\s+/);
    
    for (const memory of memories) {
      const contentStr = JSON.stringify(memory.content).toLowerCase();
      const tagsStr = memory.tags.join(' ').toLowerCase();
      const combined = contentStr + ' ' + tagsStr;
      
      let matchCount = 0;
      const matchDetails: string[] = [];
      
      for (const word of queryWords) {
        if (combined.includes(word)) {
          matchCount++;
          matchDetails.push(`Word match: "${word}"`);
        } else {
          // Check for partial matches
          const partialMatches = combined.split(/\s+/).filter(w => 
            w.includes(word) || word.includes(w)
          );
          if (partialMatches.length > 0) {
            matchCount += 0.5;
            matchDetails.push(`Partial match: "${word}" ~ "${partialMatches[0]}"`);
          }
        }
      }
      
      if (matchCount > 0) {
        const score = matchCount / queryWords.length;
        results.push({
          memory,
          score: score * 0.8, // Slightly lower weight for fuzzy matches
          strategy: 'fuzzy',
          matchDetails
        });
      }
    }
    
    return results;
  }
  
  /**
   * Tag-based search with smart tag mapping
   */
  private tagSearch(query: string, memories: Memory[], extractedTags: string[]): SearchResult[] {
    const results: SearchResult[] = [];
    
    // Combine extracted tags with query words
    const searchTags = [...extractedTags, ...query.toLowerCase().split(/\s+/)];
    
    for (const memory of memories) {
      const memoryTags = memory.tags.map(t => t.toLowerCase());
      const matchDetails: string[] = [];
      let matchScore = 0;
      
      for (const searchTag of searchTags) {
        for (const memoryTag of memoryTags) {
          if (memoryTag === searchTag) {
            matchScore += 1.0;
            matchDetails.push(`Tag match: "${searchTag}"`);
          } else if (memoryTag.includes(searchTag) || searchTag.includes(memoryTag)) {
            matchScore += 0.5;
            matchDetails.push(`Partial tag: "${searchTag}" ~ "${memoryTag}"`);
          }
        }
      }
      
      if (matchScore > 0) {
        results.push({
          memory,
          score: Math.min(matchScore / searchTags.length, 1.0) * 0.9,
          strategy: 'tag-based',
          matchDetails
        });
      }
    }
    
    return results;
  }
  
  /**
   * Simplified semantic search
   */
  private semanticSearch(query: string, memories: Memory[]): SearchResult[] {
    const results: SearchResult[] = [];
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    
    for (const memory of memories) {
      const contentWords = new Set(
        JSON.stringify(memory.content)
          .toLowerCase()
          .split(/\s+/)
          .filter(w => w.length > 3)
      );
      
      // Calculate Jaccard similarity
      const intersection = new Set([...queryWords].filter(w => contentWords.has(w)));
      const union = new Set([...queryWords, ...contentWords]);
      
      if (intersection.size > 0) {
        const similarity = intersection.size / union.size;
        results.push({
          memory,
          score: similarity * 0.7, // Lower weight for semantic matches
          strategy: 'semantic',
          matchDetails: [`Semantic similarity: ${(similarity * 100).toFixed(1)}%`]
        });
      }
    }
    
    return results;
  }
  
  /**
   * Analyze query to extract insights
   */
  private analyzeQuery(query: string): QueryAnalysis {
    const extractedTags: string[] = [];
    let queryType = 'general';
    let confidence = 0.5;
    
    // Extract potential tags
    const tagKeywords = ['critical', 'bug', 'feature', 'todo', 'important', 'error', 'fix'];
    for (const keyword of tagKeywords) {
      if (query.toLowerCase().includes(keyword)) {
        extractedTags.push(keyword);
        confidence += 0.1;
      }
    }
    
    // Determine query type
    if (query.includes('?')) {
      queryType = 'question';
    } else if (query.match(/^(find|search|get|show|list)/i)) {
      queryType = 'search';
      confidence += 0.2;
    } else if (query.match(/^(what|where|when|who|how|why)/i)) {
      queryType = 'interrogative';
      confidence += 0.1;
    }
    
    return {
      queryType,
      extractedTags,
      confidence: Math.min(confidence, 1.0)
    };
  }
  
  /**
   * Combine and deduplicate results
   */
  private combineResults(results: SearchResult[], minScore: number): SearchResult[] {
    const combined = new Map<string, SearchResult>();
    
    for (const result of results) {
      const memoryId = result.memory.id;
      
      if (combined.has(memoryId)) {
        const existing = combined.get(memoryId)!;
        // Keep the highest scoring result
        if (result.score > existing.score) {
          combined.set(memoryId, result);
        } else if (result.score === existing.score) {
          // Combine match details
          existing.matchDetails = [
            ...(existing.matchDetails || []),
            ...(result.matchDetails || [])
          ];
        }
      } else if (result.score >= minScore) {
        combined.set(memoryId, result);
      }
    }
    
    return Array.from(combined.values());
  }
  
  /**
   * Format search results for display
   */
  formatSearchResults(searchResult: CombinedSearchResult): string {
    let text = `🔍 **Enhanced Memory Search Results**\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `**Query Analysis:**\n`;
    text += `• Type: ${searchResult.queryAnalysis.queryType}\n`;
    text += `• Confidence: ${(searchResult.queryAnalysis.confidence * 100).toFixed(0)}%\n`;
    text += `• Strategies: ${searchResult.strategiesUsed.join(', ')}\n`;
    text += `• Search Time: ${searchResult.searchTime}ms\n\n`;
    
    if (searchResult.results.length === 0) {
      text += `❌ **No memories found**\n\n`;
      text += `💡 **Search Tips:**\n`;
      text += `• Try using more specific terms\n`;
      text += `• Use tags like: critical, bug, feature, todo\n`;
      text += `• Break complex queries into simpler terms\n`;
    } else {
      text += `✅ **Found ${searchResult.results.length} memories:**\n\n`;
      
      for (let i = 0; i < searchResult.results.length; i++) {
        const result = searchResult.results[i];
        const memory = result.memory;
        
        text += `**${i + 1}. ${memory.type}** (Score: ${(result.score * 100).toFixed(0)}%)\n`;
        text += `   📅 ${new Date(memory.timestamp).toLocaleString()}\n`;
        text += `   🏷️ Tags: ${memory.tags.join(', ') || 'none'}\n`;
        text += `   🎯 Match: ${result.strategy}\n`;
        
        const contentPreview = JSON.stringify(memory.content).substring(0, 200);
        text += `   📝 ${contentPreview}${JSON.stringify(memory.content).length > 200 ? '...' : ''}\n\n`;
      }
    }
    
    return text;
  }
}
