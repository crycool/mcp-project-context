import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ResourceSchema
} from '@modelcontextprotocol/sdk/types.js';
import { ContextManager } from '../context/contextManager.js';
import { FileHandler } from './fileHandler.js';
import * as path from 'path';

export class ResourceHandler {
  private server: Server;
  private contextManager: ContextManager;
  private fileHandler: FileHandler;

  constructor(
    server: Server,
    contextManager: ContextManager,
    fileHandler: FileHandler
  ) {
    this.server = server;
    this.contextManager = contextManager;
    this.fileHandler = fileHandler;
  }

  async initialize() {
    // Register list resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: this.getResourceList()
    }));

    // Register read resource handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return await this.handleResourceRead(request.params.uri);
    });
  }
  private getResourceList(): ResourceSchema[] {
    const projectInfo = this.contextManager.getProjectInfo();
    const resources: ResourceSchema[] = [];
    
    // Add project overview resource
    resources.push({
      uri: `project://${projectInfo.id}/overview`,
      name: 'Project Overview',
      description: `Overview of ${projectInfo.name} project`,
      mimeType: 'text/markdown'
    });
    
    // Add project structure resource
    resources.push({
      uri: `project://${projectInfo.id}/structure`,
      name: 'Project Structure',
      description: 'Directory structure and important files',
      mimeType: 'text/plain'
    });
    
    // Add CLAUDE.md files as resources
    for (const claudeFile of projectInfo.claudeFiles) {
      const relativePath = path.relative(projectInfo.root, claudeFile);
      resources.push({
        uri: `project://${projectInfo.id}/claude/${relativePath}`,
        name: `CLAUDE.md: ${relativePath}`,
        description: 'Project-specific Claude instructions',
        mimeType: 'text/markdown'
      });
    }
    
    // Add important files as resources
    const importantFiles = projectInfo.files
      .filter(f => 
        f.relativePath === 'README.md' ||
        f.relativePath === 'package.json' ||
        f.relativePath.includes('config')
      )
      .slice(0, 10);
    
    for (const file of importantFiles) {
      resources.push({
        uri: `project://${projectInfo.id}/file/${file.relativePath}`,
        name: file.relativePath,
        description: `Project file: ${file.type}`,
        mimeType: this.getMimeType(file.type)
      });
    }
    
    return resources;
  }
  private async handleResourceRead(uri: string): Promise<any> {
    const projectInfo = this.contextManager.getProjectInfo();
    
    if (uri === `project://${projectInfo.id}/overview`) {
      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: this.generateProjectOverview()
          }
        ]
      };
    }
    
    if (uri === `project://${projectInfo.id}/structure`) {
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: this.generateProjectStructure()
          }
        ]
      };
    }
    
    // Handle CLAUDE.md files
    if (uri.includes('/claude/')) {
      const relativePath = uri.split('/claude/')[1];
      const fullPath = path.join(projectInfo.root, relativePath);
      const content = await this.fileHandler.readFile(fullPath);
      
      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: content
          }
        ]
      };
    }
    
    // Handle regular project files
    if (uri.includes('/file/')) {
      const relativePath = uri.split('/file/')[1];
      const fullPath = path.join(projectInfo.root, relativePath);
      const content = await this.fileHandler.readFile(fullPath);
      
      return {
        contents: [
          {
            uri,
            mimeType: this.getMimeType(path.extname(fullPath)),
            text: content
          }
        ]
      };
    }
    
    throw new Error(`Unknown resource: ${uri}`);
  }
  private generateProjectOverview(): string {
    const projectInfo = this.contextManager.getProjectInfo();
    const lines: string[] = [];
    
    lines.push(`# ${projectInfo.name}`);
    lines.push('');
    lines.push(`**Type:** ${projectInfo.type}`);
    if (projectInfo.language) lines.push(`**Language:** ${projectInfo.language}`);
    if (projectInfo.framework) lines.push(`**Framework:** ${projectInfo.framework}`);
    if (projectInfo.packageManager) lines.push(`**Package Manager:** ${projectInfo.packageManager}`);
    if (projectInfo.buildTool) lines.push(`**Build Tool:** ${projectInfo.buildTool}`);
    lines.push('');
    
    if (projectInfo.gitInfo) {
      lines.push('## Git Information');
      lines.push(`- Branch: ${projectInfo.gitInfo.branch}`);
      lines.push(`- Status: ${projectInfo.gitInfo.isDirty ? 'Modified' : 'Clean'}`);
      if (projectInfo.gitInfo.remote) {
        lines.push(`- Remote: ${projectInfo.gitInfo.remote}`);
      }
      lines.push('');
    }
    
    lines.push('## Project Statistics');
    lines.push(`- Total Files: ${projectInfo.files.length}`);
    lines.push(`- Directories: ${projectInfo.structure.directories.length}`);
    lines.push(`- Config Files: ${projectInfo.structure.configFiles.length}`);
    lines.push(`- CLAUDE.md Files: ${projectInfo.claudeFiles.length}`);
    
    return lines.join('\n');
  }

  private generateProjectStructure(): string {
    const projectInfo = this.contextManager.getProjectInfo();
    const lines: string[] = [];
    
    lines.push('Project Structure');
    lines.push('================');
    lines.push('');
    
    lines.push('Important Directories:');
    for (const dir of projectInfo.structure.importantDirs.slice(0, 20)) {
      lines.push(`  📁 ${dir}`);
    }
    lines.push('');
    
    lines.push('Configuration Files:');
    for (const config of projectInfo.structure.configFiles) {
      lines.push(`  ⚙️ ${config}`);
    }
    lines.push('');
    
    lines.push('Recent Files:');
    for (const file of projectInfo.files.slice(0, 20)) {
      lines.push(`  📄 ${file.relativePath} (${file.type})`);
    }
    
    return lines.join('\n');
  }
  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.js': 'text/javascript',
      '.jsx': 'text/javascript',
      '.ts': 'text/typescript',
      '.tsx': 'text/typescript',
      '.json': 'application/json',
      '.md': 'text/markdown',
      '.html': 'text/html',
      '.css': 'text/css',
      '.xml': 'application/xml',
      '.yaml': 'text/yaml',
      '.yml': 'text/yaml',
      '.txt': 'text/plain',
      '.py': 'text/x-python',
      '.java': 'text/x-java',
      '.c': 'text/x-c',
      '.cpp': 'text/x-c++',
      '.h': 'text/x-c',
      '.cs': 'text/x-csharp',
      '.go': 'text/x-go',
      '.rs': 'text/x-rust',
      '.rb': 'text/x-ruby',
      '.php': 'text/x-php',
      '.sql': 'text/x-sql',
      '.sh': 'text/x-shellscript',
      '.dockerfile': 'text/x-dockerfile',
      '.toml': 'text/x-toml'
    };
    
    return mimeTypes[extension.toLowerCase()] || 'text/plain';
  }
}
