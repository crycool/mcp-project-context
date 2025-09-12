#!/usr/bin/env node

// DEBUG SCRIPT FOR SEARCH_CODE BUG

import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

console.log('🐛 SEARCH_CODE DEBUG ANALYSIS');
console.log('================================');

// Test environment
console.log('📍 Environment Check:');
console.log('  process.cwd():', process.cwd());
console.log('  __dirname available:', typeof __dirname !== 'undefined');

// Check target directory
const targetDir = '/Users/yusufkamil/Desktop/SurpriseBox';
console.log(`\n📁 Target Directory Check: ${targetDir}`);
console.log('  exists:', fs.existsSync(targetDir));

if (fs.existsSync(targetDir)) {
  console.log('  is directory:', fs.statSync(targetDir).isDirectory());
  
  // List some files manually
  const entries = fs.readdirSync(targetDir);
  console.log(`  entries count: ${entries.length}`);
  console.log('  first 10 entries:', entries.slice(0, 10));
  
  // Look for Assets/Scripts specifically
  const assetsPath = path.join(targetDir, 'Assets');
  if (fs.existsSync(assetsPath)) {
    console.log('  Assets/ exists: ✅');
    const scriptsPath = path.join(assetsPath, 'Scripts');
    if (fs.existsSync(scriptsPath)) {
      console.log('  Assets/Scripts/ exists: ✅');
      const scriptFiles = fs.readdirSync(scriptsPath);
      console.log(`  .cs files in Scripts: ${scriptFiles.filter(f => f.endsWith('.cs')).length}`);
      console.log('  first 5 .cs files:', scriptFiles.filter(f => f.endsWith('.cs')).slice(0, 5));
    }
  }
}

// Test glob patterns
console.log('\n🔍 Glob Pattern Tests:');

const testPatterns = [
  '**/*',
  '**/*.cs', 
  'Assets/**/*.cs',
  '*.cs',
  'Assets/Scripts/*.cs'
];

for (const pattern of testPatterns) {
  console.log(`\nPattern: "${pattern}"`);
  try {
    const globOptions = {
      cwd: targetDir,
      absolute: true,
      nodir: true,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**'
      ]
    };
    
    console.log('  glob options:', JSON.stringify(globOptions, null, 2));
    
    const files = await glob(pattern, globOptions);
    console.log(`  ✅ Found ${files.length} files`);
    
    if (files.length > 0) {
      console.log('  First 3 files:', files.slice(0, 3).map(f => path.basename(f)));
    }
  } catch (error) {
    console.log(`  ❌ Error:`, error.message);
  }
}

// Test simple patterns
console.log('\n🧪 Simple Pattern Tests:');
try {
  // Simple test - all files
  const allFiles = await glob('**/*', { cwd: targetDir, nodir: true });
  console.log(`All files: ${allFiles.length}`);
  
  // CS files specifically  
  const csFiles = await glob('**/*.cs', { cwd: targetDir });
  console.log(`CS files: ${csFiles.length}`);
  
  if (csFiles.length > 0) {
    console.log('First CS files:', csFiles.slice(0, 3));
    
    // Test file content search
    const firstCsFile = csFiles[0];
    if (fs.existsSync(firstCsFile)) {
      const content = fs.readFileSync(firstCsFile, 'utf-8');
      const hasUsing = content.includes('using');
      const hasClass = content.includes('class');
      console.log(`\n📄 Content test of ${path.basename(firstCsFile)}:`);
      console.log(`  Contains 'using': ${hasUsing}`);
      console.log(`  Contains 'class': ${hasClass}`);
      console.log(`  File size: ${content.length} chars`);
    }
  }
  
} catch (error) {
  console.log('❌ Simple pattern error:', error.message);
}

console.log('\n🔧 DIAGNOSIS COMPLETE');
