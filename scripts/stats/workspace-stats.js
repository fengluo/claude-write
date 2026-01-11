#!/usr/bin/env node

const path = require('path');
const { getAllMarkdownFiles, readFile, getMainFolder, formatFileSize, getFileSize, getRelativePath } = require('../utils/file-helpers');
const { parseFrontMatter, countWords, extractTags, extractLinks, getTitle } = require('../utils/markdown-parser');

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
 * 生成工作区统计
 */
function generateStats() {
  console.log(c('bright', '\n📊 工作区统计报告\n'));
  console.log(`生成时间: ${new Date().toLocaleString('zh-CN')}\n`);

  // 获取所有 Markdown 文件
  const files = getAllMarkdownFiles(ROOT_DIR);

  // 过滤掉 README 文件
  const contentFiles = files.filter(f => !f.endsWith('README.md'));

  if (contentFiles.length === 0) {
    console.log('工作区暂无内容文件。使用 /quick-capture 开始记录！\n');
    return;
  }

  // 基础统计
  const stats = {
    totalFiles: contentFiles.length,
    totalWords: 0,
    totalSize: 0,
    byFolder: {},
    allTags: {},
    allLinks: [],
    filesByDate: []
  };

  // 文件夹映射
  const folderNames = {
    '00_Inbox': '收件箱',
    '01_Projects': '项目',
    '02_Areas': '领域',
    '03_Resources': '资源',
    '04_Archive': '归档',
    '06_Meta': '元数据'
  };

  // 分析每个文件
  contentFiles.forEach(filePath => {
    const content = readFile(filePath);
    const words = countWords(content);
    const size = getFileSize(filePath);
    const tags = extractTags(content);
    const links = extractLinks(content);
    const folder = getMainFolder(filePath);
    const title = getTitle(content) || path.basename(filePath, '.md');

    stats.totalWords += words;
    stats.totalSize += size;

    // 按文件夹统计
    if (folder) {
      if (!stats.byFolder[folder]) {
        stats.byFolder[folder] = {
          count: 0,
          words: 0,
          size: 0
        };
      }
      stats.byFolder[folder].count++;
      stats.byFolder[folder].words += words;
      stats.byFolder[folder].size += size;
    }

    // 标签统计
    tags.forEach(tag => {
      stats.allTags[tag] = (stats.allTags[tag] || 0) + 1;
    });

    // 链接收集
    links.forEach(link => {
      if (!stats.allLinks.includes(link)) {
        stats.allLinks.push(link);
      }
    });

    // 文件信息
    stats.filesByDate.push({
      path: filePath,
      title,
      words,
      size,
      tags
    });
  });

  // 显示基础统计
  console.log(c('bright', '=== 基础统计 ===\n'));
  console.log(`总笔记数: ${c('cyan', stats.totalFiles)}`);
  console.log(`总字数: ${c('cyan', stats.totalWords.toLocaleString())}`);
  console.log(`平均字数: ${c('cyan', Math.round(stats.totalWords / stats.totalFiles))} 字/篇`);
  console.log(`存储空间: ${c('cyan', formatFileSize(stats.totalSize))}\n`);

  // 按文件夹分布
  console.log(c('bright', '=== 文件夹分布 ===\n'));
  const folders = Object.keys(stats.byFolder).sort();
  folders.forEach(folder => {
    const data = stats.byFolder[folder];
    const name = folderNames[folder] || folder;
    console.log(`${c('blue', folder)} (${name})`);
    console.log(`  笔记: ${data.count} 篇`);
    console.log(`  字数: ${data.words.toLocaleString()} 字`);
    console.log(`  大小: ${formatFileSize(data.size)}`);
    console.log('');
  });

  // 标签统计
  if (Object.keys(stats.allTags).length > 0) {
    console.log(c('bright', '=== Top 10 标签 ===\n'));
    const topTags = Object.entries(stats.allTags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    topTags.forEach(([tag, count], index) => {
      console.log(`${index + 1}. ${c('magenta', '#' + tag)} (${count})`);
    });
    console.log('');
  }

  // 字数排行
  console.log(c('bright', '=== Top 5 最长笔记 ===\n'));
  const longestFiles = stats.filesByDate
    .sort((a, b) => b.words - a.words)
    .slice(0, 5);

  longestFiles.forEach((file, index) => {
    const relativePath = getRelativePath(file.path, ROOT_DIR);
    console.log(`${index + 1}. ${c('green', file.title)}`);
    console.log(`   路径: ${relativePath}`);
    console.log(`   字数: ${file.words.toLocaleString()} 字`);
    console.log('');
  });

  // 双向链接统计
  if (stats.allLinks.length > 0) {
    console.log(c('bright', '=== 知识连接 ===\n'));
    console.log(`双向链接数: ${c('cyan', stats.allLinks.length)}`);
    console.log(`链接密度: ${c('cyan', (stats.allLinks.length / stats.totalFiles).toFixed(2))} 个/篇\n`);
  }

  // 建议
  console.log(c('bright', '=== 建议 ===\n'));

  if (stats.byFolder['00_Inbox'] && stats.byFolder['00_Inbox'].count > 5) {
    console.log(`⚠️  收件箱有 ${stats.byFolder['00_Inbox'].count} 个未处理项目，建议运行 ${c('yellow', '/inbox-processor')} 整理`);
  }

  if (Object.keys(stats.allTags).length < 10) {
    console.log(`💡 考虑为笔记添加更多标签，便于检索和组织`);
  }

  if (stats.allLinks.length < stats.totalFiles * 0.5) {
    console.log(`💡 增加双向链接 [[笔记名]] 可以建立更强的知识网络`);
  }

  console.log('');
}

// 运行统计
generateStats();
