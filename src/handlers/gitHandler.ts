import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import { ContextManager } from '../context/contextManager.js';

export class GitHandler {
  private git: SimpleGit;
  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
    const projectRoot = contextManager.getProjectInfo().root;
    this.git = simpleGit(projectRoot);
  }

  async getStatus(): Promise<StatusResult> {
    const status = await this.git.status();
    
    this.contextManager.updateContext('git_status_checked', {
      branch: status.current,
      ahead: status.ahead,
      behind: status.behind,
      modified: status.modified.length,
      staged: status.staged.length,
      timestamp: new Date()
    });
    
    return status;
  }

  async getCurrentBranch(): Promise<string> {
    const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim();
  }
  async getCommitHistory(limit: number = 10) {
    const log = await this.git.log({ maxCount: limit });
    
    this.contextManager.updateContext('git_log_retrieved', {
      commitCount: log.all.length,
      latestCommit: log.latest?.hash,
      timestamp: new Date()
    });
    
    return log.all;
  }

  async getDiff(staged: boolean = false) {
    const diff = staged 
      ? await this.git.diff(['--staged'])
      : await this.git.diff();
    
    this.contextManager.updateContext('git_diff_retrieved', {
      staged,
      diffLength: diff.length,
      timestamp: new Date()
    });
    
    return diff;
  }

  async addFiles(files: string | string[]) {
    await this.git.add(files);
    
    this.contextManager.updateContext('git_files_added', {
      files: Array.isArray(files) ? files : [files],
      timestamp: new Date()
    });
  }

  async commit(message: string) {
    const result = await this.git.commit(message);
    
    this.contextManager.updateContext('git_commit_made', {
      message,
      hash: result.commit,
      timestamp: new Date()
    });
    
    return result;
  }
  async push(remote: string = 'origin', branch?: string) {
    const currentBranch = branch || await this.getCurrentBranch();
    const result = await this.git.push(remote, currentBranch);
    
    this.contextManager.updateContext('git_push', {
      remote,
      branch: currentBranch,
      timestamp: new Date()
    });
    
    return result;
  }

  async pull(remote: string = 'origin', branch?: string) {
    const currentBranch = branch || await this.getCurrentBranch();
    const result = await this.git.pull(remote, currentBranch);
    
    this.contextManager.updateContext('git_pull', {
      remote,
      branch: currentBranch,
      summary: result.summary,
      timestamp: new Date()
    });
    
    return result;
  }

  async checkout(branch: string) {
    await this.git.checkout(branch);
    
    this.contextManager.updateContext('git_checkout', {
      branch,
      timestamp: new Date()
    });
  }

  async createBranch(branchName: string) {
    await this.git.checkoutLocalBranch(branchName);
    
    this.contextManager.updateContext('git_branch_created', {
      branch: branchName,
      timestamp: new Date()
    });
  }

  async getRemotes() {
    const remotes = await this.git.getRemotes(true);
    
    this.contextManager.updateContext('git_remotes_retrieved', {
      remoteCount: remotes.length,
      remotes: remotes.map(r => ({ name: r.name, url: r.refs.fetch })),
      timestamp: new Date()
    });
    
    return remotes;
  }

  async stash(message?: string) {
    const result = message 
      ? await this.git.stash(['save', message])
      : await this.git.stash();
    
    this.contextManager.updateContext('git_stash', {
      message,
      timestamp: new Date()
    });
    
    return result;
  }

  async stashPop() {
    const result = await this.git.stash(['pop']);
    
    this.contextManager.updateContext('git_stash_pop', {
      timestamp: new Date()
    });
    
    return result;
  }
}
