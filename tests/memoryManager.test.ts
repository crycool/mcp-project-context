import { MemoryManager } from '../src/storage/memoryManager';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;
  const testProjectId = 'test-project-123';
  
  beforeEach(() => {
    memoryManager = new MemoryManager();
  });
  
  afterEach(async () => {
    // Clean up test data
    const storageDir = path.join(os.homedir(), '.mcp-project-context', 'projects');
    const testFile = path.join(storageDir, `${testProjectId}.json`);
    try {
      await fs.unlink(testFile);
    } catch {}
  });
  
  describe('initialize', () => {
    it('should initialize with project ID', async () => {
      await memoryManager.initialize(testProjectId);
      expect(memoryManager['projectId']).toBe(testProjectId);
    });
    
    it('should create storage directories', async () => {
      await memoryManager.initialize(testProjectId);
      const storageDir = path.join(os.homedir(), '.mcp-project-context');
      const stats = await fs.stat(storageDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });
  
  describe('addMemory', () => {
    beforeEach(async () => {
      await memoryManager.initialize(testProjectId);
    });
    
    it('should add a memory and return ID', () => {
      const id = memoryManager.addMemory('observation', { test: 'data' }, ['test']);
      expect(id).toBeDefined();
      expect(id.length).toBe(12);
    });
    
    it('should retrieve added memory', () => {
      const id = memoryManager.addMemory('observation', { test: 'data' }, ['test']);
      const memory = memoryManager.getMemory(id);
      expect(memory).toBeDefined();
      expect(memory?.content).toEqual({ test: 'data' });
      expect(memory?.tags).toContain('test');
    });
  });
}); 
