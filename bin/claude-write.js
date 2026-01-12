#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceDir = path.resolve(__dirname, '..');
const targetArg = process.argv[2];

if (!targetArg) {
  console.error('❌ Please specify the target directory.');
  console.error('Usage: claude-write <directory>');
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), targetArg);

console.log(`🚀 Initializing Claude Write workspace in: ${targetDir}`);

// 1. Create target directory
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
} else {
  if (fs.readdirSync(targetDir).length > 0) {
    console.error(`❌ Target directory "${targetArg}" is not empty.`);
    process.exit(1);
  }
}

// 2. Copy files
const ignoreList = [
  '.git',
  'node_modules',
  'bin', // Don't copy the installer itself
  'package-lock.json',
  '.DS_Store',
  'dist',
  'coverage'
];

function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoreList.includes(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  console.log('📦 Copying template files...');
  copyDir(sourceDir, targetDir);

  // 3. Initialize Git
  console.log('Git Initializing git repository...');
  execSync('git init', { cwd: targetDir, stdio: 'ignore' });

  // Create an initial commit
  execSync('git add .', { cwd: targetDir, stdio: 'ignore' });
  execSync('git commit -m "Initial commit: Scaffolding Claude Write workspace"', { cwd: targetDir, stdio: 'ignore' });

  // 4. Install dependencies
  console.log('npm Installing dependencies (this may take a moment)...');
  execSync('npm install', { cwd: targetDir, stdio: 'inherit' });

  console.log('\n✅ Claude Write workspace created successfully!');
  console.log('\nNext steps:');
  console.log(`  cd ${targetArg}`);
  console.log('  npm run init    # Configure your workspace');
  console.log('  code .          # Open in VSCode');

} catch (error) {
  console.error('\n❌ An error occurred during initialization:', error.message);
  process.exit(1);
}
