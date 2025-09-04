#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ProjectDiscovery } from './discovery/projectDiscovery.js';
import { MemoryManager } from './storage/memoryManager.js';
import { ContextManager } from './context/contextManager.js';
import { FileHandler } from './handlers/fileHandler.js';
import { GitHandler } from './handlers/gitHandler.js';
import { ToolHandler } from './handlers/toolHandler.js';
import { ResourceHandler } from './handlers/resourceHandler.js';
import { PromptHandler } from './handlers/promptHandler.js';

class MCPProjectContextServer {
  private server: Server;
  private projectDiscovery: ProjectDiscovery;
  private memoryManager: MemoryManager;
  private contextManager: ContextManager;
  private fileHandler: FileHandler;
  private gitHandler: GitHandler;
  private toolHandler: ToolHandler;
  private resourceHandler: ResourceHandler;
  private promptHandler: PromptHandler;
  private currentWorkingDirectory: string;
  constructor() {
    this.currentWorkingDirectory = process.cwd();
    this.projectDiscovery = new ProjectDiscovery(this.currentWorkingDirectory);
    this.memoryManager = new MemoryManager();
    this.contextManager = new ContextManager(this.memoryManager, this.projectDiscovery);
    this.fileHandler = new FileHandler(this.contextManager);
    this.gitHandler = new GitHandler(this.contextManager);
    
    this.server = new Server(
      { name: 'mcp-project-context', version: '1.0.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );
    
    this.toolHandler = new ToolHandler(
      this.server,
      this.contextManager,
      this.fileHandler,
      this.gitHandler,
      this.memoryManager
    );
    
    this.resourceHandler = new ResourceHandler(
      this.server,
      this.contextManager,
      this.fileHandler
    );
    
    this.promptHandler = new PromptHandler(
      this.server,
      this.contextManager
    );
  }
  async initialize() {
    console.error('MCP Project Context Server initializing...');
    
    // Discover project structure
    await this.projectDiscovery.discover();
    
    // Load project memory
    await this.memoryManager.initialize(this.projectDiscovery.getProjectId());
    
    // Initialize context
    await this.contextManager.initialize();
    
    // Setup handlers
    await this.toolHandler.initialize();
    await this.resourceHandler.initialize();
    await this.promptHandler.initialize();
    
    // Watch for file changes
    this.fileHandler.startWatching();
    
    console.error('MCP Project Context Server initialized successfully');
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.initialize();
    await this.server.connect(transport);
    
    console.error('MCP Project Context Server is running');
  }
}

// Main execution
const server = new MCPProjectContextServer();
server.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
