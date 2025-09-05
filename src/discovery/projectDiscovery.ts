import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import ignore from 'ignore';
import { simpleGit, SimpleGit } from 'simple-git';
import { createHash } from 'crypto';

export interface ProjectInfo {
  id: string;
  name: string;
  type: string;
  root: string;
  language?: string;
  framework?: string;
  buildTool?: string;
  packageManager?: string;
  gitInfo?: GitInfo;
  structure: ProjectStructure;
  files: ProjectFile[];
  claudeFiles: string[];
}

export interface GitInfo {
  branch: string;
  remote?: string;
  lastCommit?: string;
  isDirty: boolean;
}

export interface ProjectStructure {
  directories: string[];
  importantDirs: string[];
  configFiles: string[];
}
export interface ProjectFile {
  path: string;
  relativePath: string;
  type: string;
  size: number;
  lastModified: Date;
}

export class ProjectDiscovery {
  private workingDir: string;
  private projectInfo: ProjectInfo | null = null;
  private git: SimpleGit;
  private ignorer: any;

  constructor(workingDir: string) {
    this.workingDir = workingDir;
    this.git = simpleGit(workingDir);
  }

  async discover(): Promise<ProjectInfo> {
    try {
      await this.loadGitignore();
      
      const projectRoot = await this.findProjectRoot();
      console.error('Project root found:', projectRoot);
      
      // Safety check for project root
      if (projectRoot === '/' || projectRoot === 'C:\\' || projectRoot.length < 3) {
        throw new Error(`Unsafe project root detected: ${projectRoot}`);
      }
      
      const projectType = await this.detectProjectType(projectRoot);
      const gitInfo = await this.getGitInfo();
      const structure = await this.analyzeStructure(projectRoot);
      const files = await this.discoverFiles(projectRoot);
      const claudeFiles = await this.findClaudeFiles(projectRoot);
      
      this.projectInfo = {
        id: this.generateProjectId(projectRoot),
        name: path.basename(projectRoot),
        type: projectType.type,
        root: projectRoot,
        language: projectType.language,
        framework: projectType.framework,
        buildTool: projectType.buildTool,
        packageManager: projectType.packageManager,
        gitInfo,
        structure,
        files,
        claudeFiles
      };
      
      console.error(`Project discovery completed: ${this.projectInfo.name} (${this.projectInfo.type})`);
      return this.projectInfo;
      
    } catch (error) {
      console.error('Project discovery failed:', error);
      // Create fallback project info
      const fallbackRoot = this.workingDir || '/tmp';
      this.projectInfo = {
        id: this.generateProjectId(fallbackRoot),
        name: 'fallback-project',
        type: 'unknown',
        root: fallbackRoot,
        structure: { directories: [], importantDirs: [], configFiles: [] },
        files: [],
        claudeFiles: []
      };
      return this.projectInfo;
    }
  }
  private async loadGitignore() {
    // Handle ES module default export
    const ignoreFactory = (ignore as any).default || ignore;
    this.ignorer = ignoreFactory();
    this.ignorer.add([
      'node_modules/',
      '.git/',
      'dist/',
      'build/',
      'target/',
      '.env',
      '.env.local',
      '*.log',
      '.DS_Store',
      'Thumbs.db'
    ]);
    
    try {
      const gitignorePath = path.join(this.workingDir, '.gitignore');
      const content = await fs.readFile(gitignorePath, 'utf-8');
      this.ignorer.add(content);
    } catch {
      // .gitignore not found, use defaults
    }
  }

  private async findProjectRoot(): Promise<string> {
    let currentDir = this.workingDir;
    
    while (currentDir !== path.parse(currentDir).root) {
      const markers = [
        '.git',
        'package.json',
        'pom.xml',
        'build.gradle',
        'requirements.txt',
        'go.mod',
        'Cargo.toml'
      ];
      
      for (const marker of markers) {
        try {
          await fs.access(path.join(currentDir, marker));
          return currentDir;
        } catch {
          // Continue searching
        }
      }
      
      currentDir = path.dirname(currentDir);
    }
    
    return this.workingDir;
  }
  private async detectProjectType(projectRoot: string) {
    const result = {
      type: 'unknown',
      language: undefined as string | undefined,
      framework: undefined as string | undefined,
      buildTool: undefined as string | undefined,
      packageManager: undefined as string | undefined
    };
    
    // Check for package.json (Node.js/JavaScript/TypeScript)
    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);
      
      result.type = 'javascript';
      result.language = 'JavaScript/TypeScript';
      
      // Detect framework
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (deps['react']) result.framework = 'React';
      else if (deps['vue']) result.framework = 'Vue';
      else if (deps['@angular/core']) result.framework = 'Angular';
      else if (deps['next']) result.framework = 'Next.js';
      else if (deps['express']) result.framework = 'Express';
      
      // Detect package manager
      try {
        await fs.access(path.join(projectRoot, 'yarn.lock'));
        result.packageManager = 'yarn';
      } catch {
        try {
          await fs.access(path.join(projectRoot, 'pnpm-lock.yaml'));
          result.packageManager = 'pnpm';
        } catch {
          result.packageManager = 'npm';
        }
      }
    } catch {
      // Not a Node.js project
    }
    // Check for Python
    try {
      await fs.access(path.join(projectRoot, 'requirements.txt'));
      result.type = 'python';
      result.language = 'Python';
      result.packageManager = 'pip';
      
      try {
        await fs.access(path.join(projectRoot, 'poetry.lock'));
        result.packageManager = 'poetry';
      } catch {
        try {
          await fs.access(path.join(projectRoot, 'Pipfile.lock'));
          result.packageManager = 'pipenv';
        } catch {}
      }
      
      // Detect Python framework
      try {
        const requirements = await fs.readFile(path.join(projectRoot, 'requirements.txt'), 'utf-8');
        if (requirements.includes('django')) result.framework = 'Django';
        else if (requirements.includes('flask')) result.framework = 'Flask';
        else if (requirements.includes('fastapi')) result.framework = 'FastAPI';
      } catch {}
    } catch {}
    
    // Check for Java
    try {
      await fs.access(path.join(projectRoot, 'pom.xml'));
      result.type = 'java';
      result.language = 'Java';
      result.buildTool = 'Maven';
    } catch {
      try {
        await fs.access(path.join(projectRoot, 'build.gradle'));
        result.type = 'java';
        result.language = 'Java';
        result.buildTool = 'Gradle';
      } catch {}
    }
    
    // Check for Go
    try {
      await fs.access(path.join(projectRoot, 'go.mod'));
      result.type = 'go';
      result.language = 'Go';
      result.packageManager = 'go modules';
    } catch {}
    
    // Check for Rust
    try {
      await fs.access(path.join(projectRoot, 'Cargo.toml'));
      result.type = 'rust';
      result.language = 'Rust';
      result.packageManager = 'cargo';
    } catch {}
    
    return result;
  }
  private async getGitInfo(): Promise<GitInfo | undefined> {
    try {
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) return undefined;
      
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      const status = await this.git.status();
      const log = await this.git.log({ maxCount: 1 });
      const remotes = await this.git.getRemotes(true);
      
      return {
        branch,
        remote: remotes[0]?.refs?.fetch,
        lastCommit: log.latest?.hash,
        isDirty: status.files.length > 0
      };
    } catch {
      return undefined;
    }
  }

  private async analyzeStructure(projectRoot: string): Promise<ProjectStructure> {
    const allDirs = await glob('**/', {
      cwd: projectRoot,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
      absolute: false
    });
    
    const importantDirs = allDirs.filter(dir => 
      dir.includes('src') ||
      dir.includes('lib') ||
      dir.includes('test') ||
      dir.includes('docs') ||
      dir.includes('components') ||
      dir.includes('pages') ||
      dir.includes('api') ||
      dir.includes('services') ||
      dir.includes('utils')
    );
    
    const configFiles = await glob('*{config,rc}*.{js,json,yaml,yml,toml}', {
      cwd: projectRoot,
      absolute: false
    });
    
    return {
      directories: allDirs.slice(0, 50), // Limit to top 50 directories
      importantDirs,
      configFiles
    };
  }
  private async discoverFiles(projectRoot: string): Promise<ProjectFile[]> {
    const files: ProjectFile[] = [];
    
    const patterns = [
      '**/*.{js,jsx,ts,tsx}',
      '**/*.{py,java,go,rs,cpp,c,h}',
      '**/*.{html,css,scss,sass,less}',
      '**/*.{json,yaml,yml,toml,xml}',
      '**/*.{md,txt,rst}',
      '**/Dockerfile*',
      '**/.env.example'
    ];
    
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: projectRoot,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.min.*'],
        absolute: false
      });
      
      for (const match of matches) {
        if (this.ignorer.ignores(match)) continue;
        
        const fullPath = path.join(projectRoot, match);
        try {
          const stats = await fs.stat(fullPath);
          if (stats.size > 1024 * 1024) continue; // Skip files > 1MB
          
          files.push({
            path: fullPath,
            relativePath: match,
            type: path.extname(match).slice(1) || 'unknown',
            size: stats.size,
            lastModified: stats.mtime
          });
        } catch {}
      }
    }
    
    // Sort by importance (src files first, then by modification time)
    files.sort((a, b) => {
      const aImportant = a.relativePath.includes('src/') ? 1 : 0;
      const bImportant = b.relativePath.includes('src/') ? 1 : 0;
      if (aImportant !== bImportant) return bImportant - aImportant;
      return b.lastModified.getTime() - a.lastModified.getTime();
    });
    
    return files.slice(0, 500); // Limit to 500 most relevant files
  }
  private async findClaudeFiles(projectRoot: string): Promise<string[]> {
    const claudeFiles: string[] = [];
    let currentDir = projectRoot;
    
    // Search up the directory tree
    while (currentDir !== path.parse(currentDir).root) {
      try {
        const claudePath = path.join(currentDir, 'CLAUDE.md');
        await fs.access(claudePath);
        claudeFiles.push(claudePath);
      } catch {}
      
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }
    
    // Search in subdirectories
    const subClaudeFiles = await glob('**/CLAUDE.md', {
      cwd: projectRoot,
      ignore: ['node_modules/**', '.git/**'],
      absolute: true
    });
    
    claudeFiles.push(...subClaudeFiles);
    
    // Remove duplicates
    return [...new Set(claudeFiles)];
  }

  private generateProjectId(projectRoot: string): string {
    return createHash('sha256')
      .update(projectRoot)
      .digest('hex')
      .slice(0, 16);
  }

  getProjectInfo(): ProjectInfo | null {
    return this.projectInfo;
  }

  getProjectId(): string {
    return this.projectInfo?.id || 'unknown';
  }

  getProjectRoot(): string {
    return this.projectInfo?.root || this.workingDir;
  }
}
