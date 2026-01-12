#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { getAllMarkdownFiles, readFile, getRelativePath, formatFileSize, getFileSize } = require('../utils/file-helpers');

const ROOT_DIR = process.cwd();
const ATTACHMENTS_DIR = path.join(ROOT_DIR, '05_Attachments');

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function c(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * 获取附件目录中的所有文件
 * @returns {string[]} - 文件路径数组
 */
function getAllAttachments() {
  const attachments = [];

  if (!fs.existsSync(ATTACHMENTS_DIR)) {
    return attachments;
  }

  function walk(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      if (item.startsWith('.')) continue;

      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile()) {
        attachments.push(fullPath);
      }
    }
  }

  walk(ATTACHMENTS_DIR);
  return attachments;
}

/**
 * 从 Markdown 内容中提取所有引用的文件
 * @param {string} content - Markdown 内容
 * @returns {string[]} - 引用的文件名数组
 */
function extractReferencedFiles(content) {
  const references = new Set();

  // 匹配 Markdown 图片语法: ![alt](path)
  const imageRegex = /!\[.*?\]\(([^)]+)\)/g;
  let match;
  while ((match = imageRegex.exec(content)) !== null) {
    references.add(path.basename(match[1]));
  }

  // 匹配 Markdown 链接语法: [text](path)
  const linkRegex = /(?<!!)\[.*?\]\(([^)]+)\)/g;
  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[1];
    // 只处理本地文件引用
    if (!href.startsWith('http') && !href.startsWith('#')) {
      references.add(path.basename(href));
    }
  }

  // 匹配 HTML img 标签
  const htmlImgRegex = /<img[^>]+src=["']([^"']+)["']/g;
  while ((match = htmlImgRegex.exec(content)) !== null) {
    references.add(path.basename(match[1]));
  }

  // 匹配 Obsidian 风格的嵌入: ![[filename]]
  const obsidianEmbed = /!\[\[([^\]]+)\]\]/g;
  while ((match = obsidianEmbed.exec(content)) !== null) {
    references.add(match[1].split('|')[0]); // 处理别名 ![[file|alias]]
  }

  return Array.from(references);
}

/**
 * 查找孤儿附件
 */
function findOrphans() {
  console.log(c('bright', '\n🔍 查找孤儿附件\n'));

  // 获取所有附件
  const attachments = getAllAttachments();

  if (attachments.length === 0) {
    console.log('附件目录为空或不存在。\n');
    return;
  }

  console.log(`扫描附件目录: ${attachments.length} 个文件\n`);

  // 获取所有 Markdown 文件中引用的文件
  const mdFiles = getAllMarkdownFiles(ROOT_DIR);
  const allReferences = new Set();

  mdFiles.forEach(mdFile => {
    const content = readFile(mdFile);
    const refs = extractReferencedFiles(content);
    refs.forEach(ref => allReferences.add(ref));
  });

  console.log(`Markdown 文件: ${mdFiles.length} 个`);
  console.log(`引用的附件: ${allReferences.size} 个\n`);

  // 找出未被引用的附件
  const orphans = [];
  let orphanSize = 0;

  attachments.forEach(attachment => {
    const fileName = path.basename(attachment);
    if (!allReferences.has(fileName)) {
      const size = getFileSize(attachment);
      orphans.push({ path: attachment, name: fileName, size });
      orphanSize += size;
    }
  });

  // 输出结果
  if (orphans.length === 0) {
    console.log(c('green', '✓ 没有发现孤儿附件，所有文件都被正确引用！\n'));
    return;
  }

  console.log(c('yellow', `⚠ 发现 ${orphans.length} 个孤儿附件 (${formatFileSize(orphanSize)}):\n`));

  // 按类型分组
  const byType = {};
  orphans.forEach(orphan => {
    const ext = path.extname(orphan.name).toLowerCase() || '(无扩展名)';
    if (!byType[ext]) {
      byType[ext] = [];
    }
    byType[ext].push(orphan);
  });

  Object.keys(byType).sort().forEach(ext => {
    console.log(c('cyan', `${ext} (${byType[ext].length} 个):`));
    byType[ext].forEach(orphan => {
      const relativePath = getRelativePath(orphan.path, ROOT_DIR);
      console.log(`  - ${relativePath} (${formatFileSize(orphan.size)})`);
    });
    console.log('');
  });

  // 建议
  console.log(c('bright', '=== 建议操作 ===\n'));
  console.log('1. 确认这些文件确实不再需要');
  console.log('2. 使用以下命令移动到备份目录:');
  console.log(c('yellow', `   mkdir -p .backup/orphans-$(date +%Y%m%d)`));
  console.log(c('yellow', `   # 然后手动移动确认不需要的文件\n`));

  // 检查参数
  if (process.argv.includes('--json')) {
    console.log(c('bright', '=== JSON 输出 ===\n'));
    console.log(JSON.stringify(orphans.map(o => ({
      path: getRelativePath(o.path, ROOT_DIR),
      name: o.name,
      size: o.size,
      sizeFormatted: formatFileSize(o.size)
    })), null, 2));
  }
}

// 运行
findOrphans();
