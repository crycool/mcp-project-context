// Working Directory Auto-Detection for MCP
import { existsSync } from 'fs';
import { join, resolve } from 'path';

export class WorkingDirectoryManager {
  constructor() {
    this.actualProjectRoot = null;
    this.mcpRoot = process.cwd();
  }

  /**
   * Context'ten veya environment'tan doğru working directory'yi bul
   */
  async detectProjectRoot() {
    // 1. Environment variable'dan kontrol et
    if (process.env.MCP_PROJECT_ROOT) {
      const envPath = resolve(process.env.MCP_PROJECT_ROOT);
      if (existsSync(envPath)) {
        console.log(`✅ Project root from ENV: ${envPath}`);
        return envPath;
      }
    }

    // 2. Claude context'inden gelen path'i kontrol et
    const contextPaths = [
      'C:\\teamvoicechat',
      'C:\\mcp-project-context',
      process.cwd()
    ];

    for (const path of contextPaths) {
      if (existsSync(path)) {
        // Git repo mu kontrol et
        const gitPath = join(path, '.git');
        if (existsSync(gitPath)) {
          console.log(`✅ Found git project at: ${path}`);
          return path;
        }
      }
    }

    // 3. Parent directory'lerde git repo ara
    let currentPath = process.cwd();
    while (currentPath !== resolve(currentPath, '..')) {
      const gitPath = join(currentPath, '.git');
      if (existsSync(gitPath)) {
        console.log(`✅ Found parent git project at: ${currentPath}`);
        return currentPath;
      }
      currentPath = resolve(currentPath, '..');
    }

    // 4. Default olarak mevcut directory'yi kullan
    console.warn(`⚠️ Using current directory as project root: ${process.cwd()}`);
    return process.cwd();
  }

  /**
   * Tüm path'leri doğru working directory'ye göre resolve et
   */
  resolvePath(relativePath) {
    if (!this.actualProjectRoot) {
      throw new Error('Project root not detected. Call detectProjectRoot() first.');
    }

    // Absolute path ise direkt kullan
    if (relativePath && relativePath.match(/^[A-Z]:\\/i)) {
      return relativePath;
    }

    // Relative path'i project root'a göre resolve et
    return resolve(this.actualProjectRoot, relativePath || '.');
  }

  /**
   * Process'in working directory'sini değiştir
   */
  changeToProjectRoot() {
    if (this.actualProjectRoot && this.actualProjectRoot !== process.cwd()) {
      process.chdir(this.actualProjectRoot);
      console.log(`📁 Changed working directory to: ${this.actualProjectRoot}`);
    }
  }
}

// Auto-fix on import
export async function autoFixWorkingDirectory() {
  const manager = new WorkingDirectoryManager();
  const projectRoot = await manager.detectProjectRoot();
  manager.actualProjectRoot = projectRoot;
  manager.changeToProjectRoot();
  return manager;
}