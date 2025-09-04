#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('');
console.log('========================================');
console.log('MCP Project Context Manager - Quick Start');
console.log('========================================');
console.log('');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 18) {
  console.error(`❌ Node.js ${nodeVersion} detected. Version 18.0.0 or higher is required.`);
  process.exit(1);
} else {
  console.log(`✅ Node.js ${nodeVersion} detected`);
}

// Check if npm is installed
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ npm ${npmVersion} detected`);
} catch {
  console.error('❌ npm is not installed or not in PATH');
  process.exit(1);
}

// Check if TypeScript is installed globally (optional)
try {
  const tscVersion = execSync('tsc --version', { encoding: 'utf8' }).trim();
  console.log(`✅ ${tscVersion} detected (global)`);
} catch {
  console.log('ℹ️  TypeScript not installed globally (will use local version)');
}

// Detect Claude Desktop config location
const platform = os.platform();
let configPath;

if (platform === 'win32') {
  configPath = path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
} else if (platform === 'darwin') {
  configPath = path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
} else {
  configPath = path.join(os.homedir(), '.config', 'claude', 'claude_desktop_config.json');
}

console.log('');
console.log('Claude Desktop Configuration:');
console.log(`Platform: ${platform}`);
console.log(`Config location: ${configPath}`);

// Check if config file exists
if (fs.existsSync(configPath)) {
  console.log('✅ Claude Desktop config file found');
  
  // Check if already configured
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (config.mcpServers && config.mcpServers['project-context']) {
    console.log('✅ MCP Project Context already configured');
  } else {
    console.log('ℹ️  MCP Project Context not yet configured');
  }
} else {
  console.log('⚠️  Claude Desktop config file not found');
  console.log('   Make sure Claude Desktop is installed and has been run at least once');
}

console.log('');
console.log('Next Steps:');
console.log('1. Install dependencies: npm install');
console.log('2. Build the project: npm run build');
console.log('3. Configure Claude Desktop:');
console.log('   - Copy claude_desktop_config.example.json');
console.log('   - Update paths to match your system');
console.log('   - Add to your Claude Desktop config at:');
console.log(`     ${configPath}`);
console.log('4. Restart Claude Desktop');
console.log('');
console.log('For more information, see README.md');
console.log('');
