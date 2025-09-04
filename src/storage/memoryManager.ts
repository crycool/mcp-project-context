import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';

export interface Memory {
  id: string;
  projectId: string;
  type: 'observation' | 'entity' | 'relation' | 'preference';
  content: any;
  importance: number;
  timestamp: Date;
  accessCount: number;
  lastAccessed: Date;
  tags: string[];
}

export interface KnowledgeGraph {
  entities: Map<string, Entity>;
  relations: Map<string, Relation>;
  observations: Map<string, Observation>;
}

export interface Entity {
  id: string;
  name: string;
  type: string;
  attributes: Record<string, any>;
  relatedTo: string[];
}

export interface Relation {
  id: string;
  source: string;
  target: string;
  type: string;
  attributes: Record<string, any>;
}
export interface Observation {
  id: string;
  content: string;
  context: string;
  timestamp: Date;
  importance: number;
}

export class MemoryManager {
  private storageDir: string;
  private projectId: string = '';
  private memories: Map<string, Memory> = new Map();
  private knowledgeGraph: KnowledgeGraph = {
    entities: new Map(),
    relations: new Map(),
    observations: new Map()
  };
  private userPreferences: Map<string, any> = new Map();

  constructor() {
    this.storageDir = path.join(os.homedir(), '.mcp-project-context');
  }

  async initialize(projectId: string) {
    this.projectId = projectId;
    
    // Create storage directory if it doesn't exist
    await fs.mkdir(this.storageDir, { recursive: true });
    await fs.mkdir(path.join(this.storageDir, 'projects'), { recursive: true });
    
    // Load existing memories
    await this.loadMemories();
    await this.loadUserPreferences();
  }
  private async loadMemories() {
    const projectMemoryPath = this.getProjectMemoryPath();
    
    try {
      const data = await fs.readFile(projectMemoryPath, 'utf-8');
      const stored = JSON.parse(data);
      
      // Restore memories
      for (const memory of stored.memories) {
        this.memories.set(memory.id, {
          ...memory,
          timestamp: new Date(memory.timestamp),
          lastAccessed: new Date(memory.lastAccessed)
        });
      }
      
      // Restore knowledge graph
      for (const entity of stored.entities || []) {
        this.knowledgeGraph.entities.set(entity.id, entity);
      }
      
      for (const relation of stored.relations || []) {
        this.knowledgeGraph.relations.set(relation.id, relation);
      }
      
      for (const observation of stored.observations || []) {
        this.knowledgeGraph.observations.set(observation.id, {
          ...observation,
          timestamp: new Date(observation.timestamp)
        });
      }
    } catch (error) {
      // No existing memories, start fresh
      console.error('No existing memories found, starting fresh');
    }
  }
  private async loadUserPreferences() {
    const preferencesPath = path.join(this.storageDir, 'preferences.json');
    
    try {
      const data = await fs.readFile(preferencesPath, 'utf-8');
      const preferences = JSON.parse(data);
      
      for (const [key, value] of Object.entries(preferences)) {
        this.userPreferences.set(key, value);
      }
    } catch {
      // No preferences yet
    }
  }

  async saveMemories() {
    const projectMemoryPath = this.getProjectMemoryPath();
    
    const data = {
      projectId: this.projectId,
      lastSaved: new Date().toISOString(),
      memories: Array.from(this.memories.values()),
      entities: Array.from(this.knowledgeGraph.entities.values()),
      relations: Array.from(this.knowledgeGraph.relations.values()),
      observations: Array.from(this.knowledgeGraph.observations.values())
    };
    
    await fs.writeFile(projectMemoryPath, JSON.stringify(data, null, 2));
  }

  async saveUserPreferences() {
    const preferencesPath = path.join(this.storageDir, 'preferences.json');
    const preferences = Object.fromEntries(this.userPreferences);
    await fs.writeFile(preferencesPath, JSON.stringify(preferences, null, 2));
  }
  addMemory(type: Memory['type'], content: any, tags: string[] = []): string {
    const id = this.generateId(content);
    
    const memory: Memory = {
      id,
      projectId: this.projectId,
      type,
      content,
      importance: this.calculateImportance(content),
      timestamp: new Date(),
      accessCount: 0,
      lastAccessed: new Date(),
      tags
    };
    
    this.memories.set(id, memory);
    this.saveMemories().catch(console.error);
    
    return id;
  }

  getMemory(id: string): Memory | undefined {
    const memory = this.memories.get(id);
    
    if (memory) {
      memory.accessCount++;
      memory.lastAccessed = new Date();
      this.saveMemories().catch(console.error);
    }
    
    return memory;
  }

  searchMemories(query: string, limit: number = 10): Memory[] {
    const results: Memory[] = [];
    const queryLower = query.toLowerCase();
    
    for (const memory of this.memories.values()) {
      if (memory.projectId !== this.projectId) continue;
      
      const contentStr = JSON.stringify(memory.content).toLowerCase();
      const tagsStr = memory.tags.join(' ').toLowerCase();
      
      if (contentStr.includes(queryLower) || tagsStr.includes(queryLower)) {
        results.push(memory);
      }
    }
    
    // Sort by relevance (importance * recency * access count)
    results.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a);
      const scoreB = this.calculateRelevanceScore(b);
      return scoreB - scoreA;
    });
    
    return results.slice(0, limit);
  }
  addEntity(name: string, type: string, attributes: Record<string, any> = {}): string {
    const id = this.generateId(name + type);
    
    const entity: Entity = {
      id,
      name,
      type,
      attributes,
      relatedTo: []
    };
    
    this.knowledgeGraph.entities.set(id, entity);
    this.saveMemories().catch(console.error);
    
    return id;
  }

  addRelation(sourceId: string, targetId: string, type: string, attributes: Record<string, any> = {}): string {
    const id = this.generateId(sourceId + targetId + type);
    
    const relation: Relation = {
      id,
      source: sourceId,
      target: targetId,
      type,
      attributes
    };
    
    this.knowledgeGraph.relations.set(id, relation);
    
    // Update entity relations
    const sourceEntity = this.knowledgeGraph.entities.get(sourceId);
    if (sourceEntity && !sourceEntity.relatedTo.includes(targetId)) {
      sourceEntity.relatedTo.push(targetId);
    }
    
    this.saveMemories().catch(console.error);
    
    return id;
  }
  addObservation(content: string, context: string, importance: number = 5): string {
    const id = this.generateId(content);
    
    const observation: Observation = {
      id,
      content,
      context,
      timestamp: new Date(),
      importance
    };
    
    this.knowledgeGraph.observations.set(id, observation);
    this.saveMemories().catch(console.error);
    
    return id;
  }

  getRelatedEntities(entityId: string): Entity[] {
    const entity = this.knowledgeGraph.entities.get(entityId);
    if (!entity) return [];
    
    return entity.relatedTo
      .map(id => this.knowledgeGraph.entities.get(id))
      .filter((e): e is Entity => e !== undefined);
  }

  setUserPreference(key: string, value: any) {
    this.userPreferences.set(key, value);
    this.saveUserPreferences().catch(console.error);
  }

  getUserPreference(key: string): any {
    return this.userPreferences.get(key);
  }

  async cleanupOldMemories(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    for (const [id, memory] of this.memories) {
      if (memory.lastAccessed < cutoffDate && memory.importance < 7) {
        this.memories.delete(id);
      }
    }
    
    await this.saveMemories();
  }
  private generateId(input: string): string {
    return createHash('sha256')
      .update(input + Date.now().toString())
      .digest('hex')
      .slice(0, 12);
  }

  private calculateImportance(content: any): number {
    // Basic importance calculation based on content characteristics
    const contentStr = JSON.stringify(content);
    let importance = 5; // Base importance
    
    // Increase importance for certain keywords
    const importantKeywords = ['error', 'bug', 'fix', 'important', 'critical', 'todo', 'fixme'];
    for (const keyword of importantKeywords) {
      if (contentStr.toLowerCase().includes(keyword)) {
        importance += 1;
      }
    }
    
    // Cap at 10
    return Math.min(importance, 10);
  }

  private calculateRelevanceScore(memory: Memory): number {
    const now = Date.now();
    const age = now - memory.timestamp.getTime();
    const recency = now - memory.lastAccessed.getTime();
    
    // Normalize to 0-1 scale
    const ageScore = Math.exp(-age / (30 * 24 * 60 * 60 * 1000)); // 30 days half-life
    const recencyScore = Math.exp(-recency / (7 * 24 * 60 * 60 * 1000)); // 7 days half-life
    const accessScore = Math.log10(memory.accessCount + 1) / 3; // Logarithmic access score
    const importanceScore = memory.importance / 10;
    
    return (importanceScore * 0.3) + (recencyScore * 0.3) + (ageScore * 0.2) + (accessScore * 0.2);
  }

  private getProjectMemoryPath(): string {
    return path.join(this.storageDir, 'projects', `${this.projectId}.json`);
  }

  getKnowledgeGraph(): KnowledgeGraph {
    return this.knowledgeGraph;
  }

  getAllMemories(): Memory[] {
    return Array.from(this.memories.values())
      .filter(m => m.projectId === this.projectId);
  }
}
