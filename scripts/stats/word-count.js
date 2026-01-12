#!/usr/bin/env node

const path = require('path');
const { getAllMarkdownFiles, readFile, getRelativePath, getMainFolder } = require('../utils/file-helpers');
const { parseFrontMatter, countWords, extractTags, getTitle } = require('../utils/markdown-parser');

const ROOT_DIR = process.cwd();

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function c(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * 生成进度条
 */
function progressBar(current, max, width = 20) {
  const ratio = max > 0 ? current / max : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * 按项目统计字数
 */
function countByProject(files) {
  const projects = {};

  files.forEach(file => {
    const relativePath = getRelativePath(file.path, ROOT_DIR);
    const parts = relativePath.split(path.sep);

    // 获取项目名 (01_Projects/ProjectName/...)
    if (parts[0] === '01_Projects' && parts.length >= 2) {
      const projectName = parts[1];
      if (!projects[projectName]) {
        projects[projectName] = { words: 0, files: 0 };
      }
      projects[projectName].words += file.words;
      projects[projectName].files++;
    }
  });

  return projects;
}

/**
 * 按标签统计字数
 */
function countByTag(files) {
  const tags = {};

  files.forEach(file => {
    file.tags.forEach(tag => {
      if (!tags[tag]) {
        tags[tag] = { words: 0, files: 0 };
      }
      tags[tag].words += file.words;
      tags[tag].files++;
    });
  });

  return tags;
}

/**
 * 按文件夹统计字数
 */
function countByFolder(files) {
  const folders = {};

  const folderNames = {
    '00_Inbox': '收件箱',
    '01_Projects': '项目',
    '02_Areas': '领域',
    '03_Resources': '资源',
    '04_Archive': '归档',
    '06_Meta': '元数据'
  };

  files.forEach(file => {
    const folder = getMainFolder(file.path);
    if (folder) {
      if (!folders[folder]) {
        folders[folder] = { words: 0, files: 0, name: folderNames[folder] || folder };
      }
      folders[folder].words += file.words;
      folders[folder].files++;
    }
  });

  return folders;
}

/**
 * 主函数
 */
function main() {
  console.log(c('bright', '\n📝 字数统计报告\n'));
  console.log(`生成时间: ${new Date().toLocaleString('zh-CN')}\n`);

  // 获取所有 Markdown 文件
  const mdPaths = getAllMarkdownFiles(ROOT_DIR);
  const contentFiles = mdPaths.filter(f => !f.endsWith('README.md'));

  if (contentFiles.length === 0) {
    console.log('工作区暂无内容文件。\n');
    return;
  }

  // 分析每个文件
  const files = contentFiles.map(filePath => {
    const content = readFile(filePath);
    return {
      path: filePath,
      title: getTitle(content) || path.basename(filePath, '.md'),
      words: countWords(content),
      tags: extractTags(content)
    };
  });

  // 总计
  const totalWords = files.reduce((sum, f) => sum + f.words, 0);
  const totalFiles = files.length;

  console.log(c('bright', '=== 总体统计 ===\n'));
  console.log(`文件总数: ${c('cyan', totalFiles)}`);
  console.log(`总字数: ${c('cyan', totalWords.toLocaleString())} 字`);
  console.log(`平均字数: ${c('cyan', Math.round(totalWords / totalFiles))} 字/篇\n`);

  // 按文件夹统计
  console.log(c('bright', '=== 按文件夹统计 ===\n'));
  const byFolder = countByFolder(files);
  const maxFolderWords = Math.max(...Object.values(byFolder).map(f => f.words));

  Object.keys(byFolder).sort().forEach(folder => {
    const data = byFolder[folder];
    const bar = progressBar(data.words, maxFolderWords);
    console.log(`${c('blue', folder)} (${data.name})`);
    console.log(`  ${bar} ${data.words.toLocaleString()} 字 (${data.files} 篇)`);
  });
  console.log('');

  // 按项目统计
  const byProject = countByProject(files);
  if (Object.keys(byProject).length > 0) {
    console.log(c('bright', '=== 按项目统计 ===\n'));
    const maxProjectWords = Math.max(...Object.values(byProject).map(p => p.words));

    const sortedProjects = Object.entries(byProject)
      .sort((a, b) => b[1].words - a[1].words);

    sortedProjects.forEach(([name, data]) => {
      const bar = progressBar(data.words, maxProjectWords);
      console.log(`${c('green', name)}`);
      console.log(`  ${bar} ${data.words.toLocaleString()} 字 (${data.files} 篇)`);
    });
    console.log('');
  }

  // 按标签统计
  const byTag = countByTag(files);
  if (Object.keys(byTag).length > 0) {
    console.log(c('bright', '=== Top 10 标签字数 ===\n'));
    const sortedTags = Object.entries(byTag)
      .sort((a, b) => b[1].words - a[1].words)
      .slice(0, 10);

    const maxTagWords = sortedTags.length > 0 ? sortedTags[0][1].words : 0;

    sortedTags.forEach(([tag, data]) => {
      const bar = progressBar(data.words, maxTagWords);
      console.log(`${c('magenta', '#' + tag)}`);
      console.log(`  ${bar} ${data.words.toLocaleString()} 字 (${data.files} 篇)`);
    });
    console.log('');
  }

  // Top 10 最长文章
  console.log(c('bright', '=== Top 10 最长文章 ===\n'));
  const topFiles = [...files].sort((a, b) => b.words - a.words).slice(0, 10);

  topFiles.forEach((file, index) => {
    const relativePath = getRelativePath(file.path, ROOT_DIR);
    console.log(`${c('cyan', (index + 1).toString().padStart(2))}. ${file.title}`);
    console.log(`    ${file.words.toLocaleString()} 字 | ${relativePath}`);
  });
  console.log('');

  // 写作目标追踪
  console.log(c('bright', '=== 写作目标 ===\n'));
  const goals = [
    { name: '短文 (500字)', threshold: 500 },
    { name: '文章 (1000字)', threshold: 1000 },
    { name: '长文 (2000字)', threshold: 2000 },
    { name: '深度文章 (5000字)', threshold: 5000 }
  ];

  goals.forEach(goal => {
    const count = files.filter(f => f.words >= goal.threshold).length;
    console.log(`${goal.name}: ${c('cyan', count)} 篇`);
  });
  console.log('');

  // JSON 输出
  if (process.argv.includes('--json')) {
    console.log(c('bright', '=== JSON 输出 ===\n'));
    console.log(JSON.stringify({
      total: { files: totalFiles, words: totalWords },
      byFolder,
      byProject,
      byTag,
      files: files.map(f => ({
        path: getRelativePath(f.path, ROOT_DIR),
        title: f.title,
        words: f.words,
        tags: f.tags
      }))
    }, null, 2));
  }
}

// 运行
main();
