import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  PromptMessage
} from '@modelcontextprotocol/sdk/types.js';
import type { Prompt } from '@modelcontextprotocol/sdk/types.js';
import { ContextManager } from '../context/contextManager.js';

export class PromptHandler {
  private server: Server;
  private contextManager: ContextManager;

  constructor(server: Server, contextManager: ContextManager) {
    this.server = server;
    this.contextManager = contextManager;
  }

  async initialize() {
    // Register list prompts handler
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: this.getPromptDefinitions()
    }));

    // Register get prompt handler
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      return await this.handleGetPrompt(request.params.name, request.params.arguments);
    });
  }

  private getPromptDefinitions(): Prompt[] {
    return [
      {
        name: 'project_context',
        description: 'Get comprehensive project context for development',
        arguments: [
          {
            name: 'focus',
            description: 'Specific area to focus on (optional)',
            required: false
          }
        ]
      },      {
        name: 'code_review',
        description: 'Context for code review with project standards',
        arguments: [
          {
            name: 'file',
            description: 'File to review',
            required: true
          }
        ]
      },
      {
        name: 'debug_context',
        description: 'Context for debugging with recent changes and errors',
        arguments: [
          {
            name: 'error',
            description: 'Error message or issue description',
            required: false
          }
        ]
      },
      {
        name: 'feature_development',
        description: 'Context for developing a new feature',
        arguments: [
          {
            name: 'feature',
            description: 'Feature description',
            required: true
          }
        ]
      },
      {
        name: 'refactoring',
        description: 'Context for refactoring with project patterns',
        arguments: [
          {
            name: 'target',
            description: 'Target area for refactoring',
            required: true
          }
        ]
      }
    ];
  }
  private async handleGetPrompt(name: string, args?: Record<string, string>): Promise<any> {
    const messages: PromptMessage[] = [];
    
    switch (name) {
      case 'project_context':
        messages.push({
          role: 'user',
          content: {
            type: 'text',
            text: this.generateProjectContextPrompt(args?.focus)
          }
        });
        break;
      
      case 'code_review':
        if (!args?.file) {
          throw new Error('File parameter is required for code_review prompt');
        }
        messages.push({
          role: 'user',
          content: {
            type: 'text',
            text: await this.generateCodeReviewPrompt(args.file)
          }
        });
        break;
      
      case 'debug_context':
        messages.push({
          role: 'user',
          content: {
            type: 'text',
            text: this.generateDebugPrompt(args?.error)
          }
        });
        break;
      
      case 'feature_development':
        if (!args?.feature) {
          throw new Error('Feature parameter is required for feature_development prompt');
        }
        messages.push({
          role: 'user',
          content: {
            type: 'text',
            text: this.generateFeaturePrompt(args.feature)
          }
        });
        break;
      
      case 'refactoring':
        if (!args?.target) {
          throw new Error('Target parameter is required for refactoring prompt');
        }
        messages.push({
          role: 'user',
          content: {
            type: 'text',
            text: this.generateRefactoringPrompt(args.target)
          }
        });
        break;
      
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
    
    return { messages };
  }
  private generateProjectContextPrompt(focus?: string): string {
    const context = this.contextManager.generateContext();
    const projectInfo = this.contextManager.getProjectInfo();
    
    let prompt = `I'm working on the ${projectInfo.name} project. Here's the current context:\n\n`;
    prompt += context;
    
    if (focus) {
      prompt += `\n\nPlease focus particularly on: ${focus}`;
    }
    
    prompt += '\n\nI need your help with development. Please consider the project structure, ';
    prompt += 'technologies used, and any CLAUDE.md instructions when providing assistance.';
    
    return prompt;
  }

  private async generateCodeReviewPrompt(file: string): Promise<string> {
    const projectInfo = this.contextManager.getProjectInfo();
    const fullPath = file.startsWith('/') ? file : `${projectInfo.root}/${file}`;
    
    // Load the file
    const fileContext = await this.contextManager.loadFileContext(fullPath);
    if (!fileContext) {
      throw new Error(`Could not load file: ${file}`);
    }
    
    let prompt = `Please review the following code from the ${projectInfo.name} project:\n\n`;
    prompt += `File: ${file}\n`;
    prompt += `Language: ${fileContext.language}\n\n`;
    prompt += '```' + fileContext.language + '\n';
    prompt += fileContext.content;
    prompt += '\n```\n\n';
    prompt += 'Please check for:\n';
    prompt += '1. Code quality and best practices\n';
    prompt += '2. Potential bugs or issues\n';
    prompt += '3. Performance considerations\n';
    prompt += '4. Security vulnerabilities\n';
    prompt += '5. Adherence to project patterns\n';
    
    return prompt;
  }
  private generateDebugPrompt(error?: string): string {
    const context = this.contextManager.generateContext(10000); // Smaller context for debugging
    const projectInfo = this.contextManager.getProjectInfo();
    
    let prompt = `I'm debugging an issue in the ${projectInfo.name} project.\n\n`;
    
    if (error) {
      prompt += `Error/Issue:\n${error}\n\n`;
    }
    
    prompt += 'Recent Project Context:\n';
    prompt += context;
    prompt += '\n\nPlease help me:\n';
    prompt += '1. Identify the root cause\n';
    prompt += '2. Suggest debugging steps\n';
    prompt += '3. Provide potential solutions\n';
    prompt += '4. Recommend preventive measures\n';
    
    return prompt;
  }

  private generateFeaturePrompt(feature: string): string {
    const context = this.contextManager.generateContext(15000);
    const projectInfo = this.contextManager.getProjectInfo();
    
    let prompt = `I want to develop a new feature for the ${projectInfo.name} project.\n\n`;
    prompt += `Feature Description: ${feature}\n\n`;
    prompt += 'Project Context:\n';
    prompt += context;
    prompt += '\n\nPlease help me:\n';
    prompt += '1. Design the feature architecture\n';
    prompt += '2. Identify required components\n';
    prompt += '3. Suggest implementation approach\n';
    prompt += '4. Consider integration with existing code\n';
    prompt += '5. Highlight potential challenges\n';
    
    return prompt;
  }
  private generateRefactoringPrompt(target: string): string {
    const context = this.contextManager.generateContext(15000);
    const projectInfo = this.contextManager.getProjectInfo();
    
    let prompt = `I want to refactor part of the ${projectInfo.name} project.\n\n`;
    prompt += `Refactoring Target: ${target}\n\n`;
    prompt += 'Project Context:\n';
    prompt += context;
    prompt += '\n\nPlease help me:\n';
    prompt += '1. Analyze current implementation\n';
    prompt += '2. Identify code smells and issues\n';
    prompt += '3. Suggest refactoring patterns\n';
    prompt += '4. Provide step-by-step refactoring plan\n';
    prompt += '5. Ensure backward compatibility\n';
    prompt += '6. Recommend testing strategies\n';
    
    return prompt;
  }
}
