import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface MCPConfig {
  // Working Directory Management
  workingDirectory: string;
  projectRoot: string;
  backupDirectories: string[];
  
  // Path Resolution
  pathResolution: 'strict' | 'flexible' | 'auto-correct';
  useRelativePaths: boolean;
  
  // Safety & Validation
  allowedDirectories: string[];
  forbiddenPaths: string[];
  
  // Recovery Options
  autoCorrection: boolean;
  emergencyFallback: string;
  
  // Debug & Monitoring
  debugMode: boolean;
  logPathOperations: boolean;
  trackWorkingDirChanges: boolean;
  
  // Metadata
  version: string;
  lastUpdated: string;
  createdBy: string;
}

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  validatedPaths: { [key: string]: boolean };
}

export interface PathStats {
  totalPathOperations: number;
  successfulOperations: number;
  failedOperations: number;
  autoCorrections: number;
  workingDirChanges: number;
  lastError?: string;
  lastErrorTime?: string;
}

export const DEFAULT_MCP_CONFIG: MCPConfig = {
  workingDirectory: process.cwd(),
  projectRoot: '',
  backupDirectories: [],
  pathResolution: 'auto-correct',
  useRelativePaths: false,
  allowedDirectories: [],
  forbiddenPaths: [
    // Only block exact dangerous paths, not paths that contain them
    '/System',
    '/Windows',
    '/Users/Shared',
    '/tmp',
    '/var/tmp',
    process.env.APPDATA || '',
    path.join(os.homedir(), 'AppData'),
    'C:\\Windows',
    'C:\\System32',
    'C:\\Program Files'
  ].filter(Boolean),
  autoCorrection: true,
  emergencyFallback: os.homedir(),
  debugMode: false,
  logPathOperations: false, // Disable to prevent JSON interference
  trackWorkingDirChanges: true,
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  createdBy: 'mcp-project-context'
};

export class MCPConfigManager {
  private static instance: MCPConfigManager;
  private config: MCPConfig;
  private configPath: string;
  private stats: PathStats;
  private watchers: Set<(config: MCPConfig) => void> = new Set();

  private constructor() {
    this.configPath = this.determineConfigPath();
    this.stats = {
      totalPathOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      autoCorrections: 0,
      workingDirChanges: 0
    };
    this.config = this.loadConfig();
  }

  static getInstance(): MCPConfigManager {
    if (!MCPConfigManager.instance) {
      MCPConfigManager.instance = new MCPConfigManager();
    }
    return MCPConfigManager.instance;
  }

  private determineConfigPath(): string {
    // 1. Project-specific config (highest priority)
    const projectConfig = path.join(process.cwd(), '.mcp-config.json');
    if (fs.existsSync(projectConfig)) {
      return projectConfig;
    }

    // 2. User-specific config directory
    const userConfigDir = path.join(os.homedir(), '.mcp');
    if (!fs.existsSync(userConfigDir)) {
      try {
        fs.mkdirSync(userConfigDir, { recursive: true });
      } catch (err) {
        console.warn('Could not create user config directory:', err);
      }
    }

    return path.join(userConfigDir, 'project-context-config.json');
  }

  private loadConfig(): MCPConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        const mergedConfig = { ...DEFAULT_MCP_CONFIG, ...configData };
        
        // Validate and clean config
        this.validateConfigData(mergedConfig);
        return mergedConfig;
      }
    } catch (error) {
      console.warn('Error loading MCP config, using defaults:', error);
    }

    // Return default config and save it
    this.saveConfig(DEFAULT_MCP_CONFIG);
    return { ...DEFAULT_MCP_CONFIG };
  }

  private validateConfigData(config: MCPConfig): void {
    // Validate working directory exists
    if (!fs.existsSync(config.workingDirectory)) {
      config.workingDirectory = process.cwd();
    }

    // Validate project root
    if (!config.projectRoot || !fs.existsSync(config.projectRoot)) {
      config.projectRoot = config.workingDirectory;
    }

    // Clean up non-existent directories
    config.allowedDirectories = config.allowedDirectories.filter(dir => 
      fs.existsSync(dir));
      
    config.backupDirectories = config.backupDirectories.filter(dir => 
      fs.existsSync(dir));

    // Update timestamp
    config.lastUpdated = new Date().toISOString();
  }

  saveConfig(config?: MCPConfig): boolean {
    try {
      const configToSave = config || this.config;
      configToSave.lastUpdated = new Date().toISOString();
      
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(configToSave, null, 2));
      
      if (config) {
        this.config = { ...configToSave };
        this.notifyWatchers();
      }
      
      return true;
    } catch (error) {
      console.error('Error saving MCP config:', error);
      return false;
    }
  }

  getConfig(): MCPConfig {
    return { ...this.config };
  }

  updateConfig(key: keyof MCPConfig, value: any): boolean {
    try {
      (this.config as any)[key] = value;
      this.config.lastUpdated = new Date().toISOString();
      this.saveConfig();
      this.notifyWatchers();
      return true;
    } catch (error) {
      console.error('Error updating config:', error);
      return false;
    }
  }

  resetConfig(): boolean {
    try {
      this.config = { ...DEFAULT_MCP_CONFIG };
      this.config.workingDirectory = process.cwd();
      this.saveConfig();
      this.notifyWatchers();
      return true;
    } catch (error) {
      console.error('Error resetting config:', error);
      return false;
    }
  }

  validateConfig(): ValidationReport {
    const report: ValidationReport = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      validatedPaths: {}
    };

    // Validate working directory
    if (!fs.existsSync(this.config.workingDirectory)) {
      report.errors.push(`Working directory does not exist: ${this.config.workingDirectory}`);
      report.isValid = false;
      report.suggestions.push(`Update working directory to: ${process.cwd()}`);
    }
    report.validatedPaths.workingDirectory = fs.existsSync(this.config.workingDirectory);

    // Validate project root
    if (!fs.existsSync(this.config.projectRoot)) {
      report.errors.push(`Project root does not exist: ${this.config.projectRoot}`);
      report.isValid = false;
    }
    report.validatedPaths.projectRoot = fs.existsSync(this.config.projectRoot);

    // Check allowed directories
    for (const dir of this.config.allowedDirectories) {
      const exists = fs.existsSync(dir);
      report.validatedPaths[`allowed:${dir}`] = exists;
      if (!exists) {
        report.warnings.push(`Allowed directory does not exist: ${dir}`);
      }
    }

    // Check for dangerous paths in working directory
    const dangerousPaths = ['/', 'C:\\', '/System', '/Windows'];
    if (dangerousPaths.includes(this.config.workingDirectory)) {
      report.errors.push(`Working directory is dangerous: ${this.config.workingDirectory}`);
      report.isValid = false;
      report.suggestions.push('Use a safe project directory');
    }

    return report;
  }

  getStats(): PathStats {
    return { ...this.stats };
  }

  incrementStat(stat: keyof PathStats): void {
    if (typeof this.stats[stat] === 'number') {
      (this.stats[stat] as number)++;
    }
  }

  recordError(error: string): void {
    this.stats.lastError = error;
    this.stats.lastErrorTime = new Date().toISOString();
    this.incrementStat('failedOperations');
  }

  onConfigChange(callback: (config: MCPConfig) => void): void {
    this.watchers.add(callback);
  }

  removeConfigWatcher(callback: (config: MCPConfig) => void): void {
    this.watchers.delete(callback);
  }

  private notifyWatchers(): void {
    this.watchers.forEach(callback => {
      try {
        callback(this.config);
      } catch (error) {
        console.error('Error in config watcher:', error);
      }
    });
  }

  getConfigPath(): string {
    return this.configPath;
  }

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  importConfig(configJson: string): boolean {
    try {
      const importedConfig = JSON.parse(configJson);
      this.validateConfigData(importedConfig);
      this.config = { ...DEFAULT_MCP_CONFIG, ...importedConfig };
      this.saveConfig();
      this.notifyWatchers();
      return true;
    } catch (error) {
      console.error('Error importing config:', error);
      return false;
    }
  }
}

// Singleton instance
export const mcpConfig = MCPConfigManager.getInstance();
