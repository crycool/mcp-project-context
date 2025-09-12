#!/usr/bin/env node

// DETAILED CODESEARCHER BUG DEBUG

import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

console.log('🔬 CODESEARCHER DETAILED DEBUG');
console.log('=====================================');

const targetDir = '/Users/yusufkamil/Desktop/SurpriseBox';
console.log(`Target: ${targetDir}`);

// SIMULATE EXACT CODESEARCHER LOGIC
async function simulateCodeSearcher(searchOptions) {
  console.log('\n🔍 Simulating CodeSearcher.getFilesToSearch()...');
  console.log('Search options:', JSON.stringify(searchOptions, null, 2));
  
  const searchDir = path.resolve(searchOptions.directory);
  console.log(`Resolved search dir: ${searchDir}`);
  
  // Default file pattern if not specified
  const filePattern = searchOptions.filePattern || '**/*';
  console.log(`File pattern: ${filePattern}`);
  
  // Build glob options (EXACT same as CodeSearcher)
  const globOptions = {
    cwd: searchDir,
    absolute: true,
    nodir: true,
    dot: searchOptions.includeHidden || false,
    follow: searchOptions.followSymlinks || false,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.map',
      ...(searchOptions.excludePatterns || [])
    ]
  };
  
  console.log('Glob options:', JSON.stringify(globOptions, null, 2));
  
  try {
    // Get files using glob (EXACT same logic)
    let files = await glob(filePattern, globOptions);
    console.log(`✅ Glob found ${files.length} files`);
    
    if (files.length > 0) {
      console.log('First 5 files:', files.slice(0, 5).map(f => path.basename(f)));
    }
    
    // Filter with binary extensions (EXACT same logic)
    const originalCount = files.length;
    files = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      
      const binaryExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.webp', '.tiff', '.tif',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
        '.zip', '.rar', '.tar', '.gz', '.7z', '.bz2', '.xz', '.z',
        '.exe', '.dll', '.so', '.dylib', '.jar', '.class', '.pyc', '.pyo', '.o', '.obj',
        '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm', '.m4a', '.ogg',
        '.ttf', '.otf', '.woff', '.woff2', '.eot',
        '.db', '.sqlite', '.sqlite3', '.mdb', '.accdb',
        '.bin', '.dat', '.iso', '.dmg', '.img', '.deb', '.rpm'
      ];
      
      return !binaryExtensions.includes(ext);
    });
    
    console.log(`✅ After binary filter: ${files.length} files (filtered out ${originalCount - files.length})`);
    
    return files;
    
  } catch (error) {
    console.log(`❌ Glob error: ${error.message}`);
    return [];
  }
}

// TEST CASES MATCHING USER BUG REPORTS
const testCases = [
  {
    name: 'Default search in SurpriseBox',
    options: {
      pattern: 'using',
      directory: targetDir
    }
  },
  {
    name: 'Search with Assets/Scripts directory (relative)', 
    options: {
      pattern: 'SaveGift',
      directory: 'Assets/Scripts',
      filePattern: '*.cs'
    }
  },
  {
    name: 'Search with absolute Assets/Scripts directory',
    options: {
      pattern: 'SaveGift',
      directory: path.join(targetDir, 'Assets/Scripts'),
      filePattern: '*.cs'  
    }
  },
  {
    name: 'Search all CS files',
    options: {
      pattern: 'class',
      directory: targetDir,
      filePattern: '**/*.cs'
    }
  }
];

// Run all test cases
for (const testCase of testCases) {
  console.log(`\n📋 TEST: ${testCase.name}`);
  console.log('=' .repeat(50));
  
  const files = await simulateCodeSearcher(testCase.options);
  
  if (files.length > 0) {
    console.log(`✅ SUCCESS: Found ${files.length} files to search`);
    
    // Test pattern matching in first few files
    const pattern = testCase.options.pattern;
    console.log(`\n🔍 Testing pattern "${pattern}" in first 3 files:`);
    
    for (let i = 0; i < Math.min(3, files.length); i++) {
      const file = files[i];
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const hasPattern = content.toLowerCase().includes(pattern.toLowerCase());
        console.log(`  ${path.basename(file)}: ${hasPattern ? '✅ MATCH' : '❌ NO MATCH'}`);
        
        if (hasPattern) {
          const lines = content.split('\n');
          const matchingLines = lines.filter(line => 
            line.toLowerCase().includes(pattern.toLowerCase())).slice(0, 2);
          console.log(`    Sample matches: ${matchingLines.length}`);
          matchingLines.forEach(line => {
            console.log(`      "${line.trim()}"`);
          });
        }
      } catch (error) {
        console.log(`  ${path.basename(file)}: ❌ READ ERROR`);
      }
    }
  } else {
    console.log(`❌ FAILURE: Found 0 files to search`);
  }
}

console.log('\n🔧 DIAGNOSIS COMPLETE');
