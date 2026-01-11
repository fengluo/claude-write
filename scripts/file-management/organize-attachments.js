#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { getAllMarkdownFiles, readFile, getRelativePath, formatFileSize, getFileSize } = require('../utils/file-helpers');

const ROOT_DIR = process.cwd();
const ATTACHMENTS_DIR = path.join(ROOT_DIR, '05_Attachments');

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function c(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * 获取所有附件文件
 */
function getAllAttachments() {
  const attachments = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile() && item !== '.gitkeep') {
        attachments.push(fullPath);
      }
    }
  }

  walk(ATTACHMENTS_DIR);
  return attachments;
}

/**
 * 分类附件
 */
function categorizeAttachment(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  const categories = {
    images: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'],
    documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'],
    videos: ['.mp4', '.mov', '.avi', '.mkv', '.webm']
  };

  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(ext)) {
      return category;
    }
  }

  return 'other';
}

/**
 * 检查附件是否被引用
 */
function isAttachmentReferenced(attachmentPath, allMarkdownFiles) {
  const fileName = path.basename(attachmentPath);
  const relativePath = getRelativePath(attachmentPath, ROOT_DIR);

  for (const mdFile of allMarkdownFiles) {
    const content = readFile(mdFile);

    // 检查是否包含文件名或相对路径
    if (content.includes(fileName) || content.includes(relativePath)) {
      return true;
    }
  }

  return false;
}

/**
 * 整理附件
 */
function organizeAttachments() {
  console.log(c('bright', '\n📎 附件组织报告\n'));

  if (!fs.existsSync(ATTACHMENTS_DIR)) {
    console.log(c('yellow', '附件目录不存在。'));
    return;
  }

  // 获取所有附件
  const attachments = getAllAttachments();

  if (attachments.length === 0) {
    console.log('暂无附件文件。\n');
    return;
  }

  // 获取所有 Markdown 文件用于引用检查
  const markdownFiles = getAllMarkdownFiles(ROOT_DIR);

  // 统计信息
  const stats = {
    total: attachments.length,
    byCategory: {
      images: { count: 0, size: 0, files: [] },
      documents: { count: 0, size: 0, files: [] },
      videos: { count: 0, size: 0, files: [] },
      other: { count: 0, size: 0, files: [] }
    },
    totalSize: 0,
    orphaned: [],
    misplaced: []
  };

  // 分析每个附件
  attachments.forEach(filePath => {
    const size = getFileSize(filePath);
    const category = categorizeAttachment(filePath);
    const expectedDir = path.join(ATTACHMENTS_DIR, category);
    const actualDir = path.dirname(filePath);
    const isReferenced = isAttachmentReferenced(filePath, markdownFiles);

    stats.totalSize += size;

    // 按类别统计
    stats.byCategory[category].count++;
    stats.byCategory[category].size += size;
    stats.byCategory[category].files.push(filePath);

    // 检查是否放错位置
    if (actualDir !== expectedDir) {
      stats.misplaced.push({
        path: filePath,
        expected: expectedDir,
        actual: actualDir,
        category
      });
    }

    // 检查是否是孤儿文件
    if (!isReferenced) {
      stats.orphaned.push({
        path: filePath,
        size,
        category
      });
    }
  });

  // 显示统计
  console.log(c('bright', '=== 总体统计 ===\n'));
  console.log(`总文件数: ${c('cyan', stats.total)}`);
  console.log(`总大小: ${c('cyan', formatFileSize(stats.totalSize))}\n`);

  // 按类别显示
  console.log(c('bright', '=== 文件分类 ===\n'));
  Object.entries(stats.byCategory).forEach(([category, data]) => {
    if (data.count > 0) {
      const categoryNames = {
        images: '图片',
        documents: '文档',
        videos: '视频',
        other: '其他'
      };

      console.log(c('blue', `${categoryNames[category]}:`));
      console.log(`  数量: ${data.count}`);
      console.log(`  大小: ${formatFileSize(data.size)}`);
      console.log('');
    }
  });

  // 显示放错位置的文件
  if (stats.misplaced.length > 0) {
    console.log(c('bright', '=== 建议移动的文件 ===\n'));
    console.log(c('yellow', `发现 ${stats.misplaced.length} 个文件可能放错位置：\n`));

    stats.misplaced.slice(0, 10).forEach(file => {
      const fileName = path.basename(file.path);
      const relativePath = getRelativePath(file.path, ROOT_DIR);
      console.log(`📄 ${c('green', fileName)}`);
      console.log(`   当前: ${relativePath}`);
      console.log(`   建议: ${getRelativePath(path.join(file.expected, fileName), ROOT_DIR)}`);
      console.log('');
    });

    if (stats.misplaced.length > 10) {
      console.log(c('cyan', `... 还有 ${stats.misplaced.length - 10} 个文件\n`));
    }
  }

  // 显示孤儿文件
  if (stats.orphaned.length > 0) {
    console.log(c('bright', '=== 未被引用的文件（孤儿文件） ===\n'));
    console.log(c('yellow', `发现 ${stats.orphaned.length} 个未被引用的文件：\n`));

    const orphanedSize = stats.orphaned.reduce((sum, f) => sum + f.size, 0);
    console.log(`可释放空间: ${c('red', formatFileSize(orphanedSize))}\n`);

    stats.orphaned.slice(0, 10).forEach(file => {
      const fileName = path.basename(file.path);
      const relativePath = getRelativePath(file.path, ROOT_DIR);
      console.log(`📄 ${fileName}`);
      console.log(`   路径: ${relativePath}`);
      console.log(`   大小: ${formatFileSize(file.size)}`);
      console.log('');
    });

    if (stats.orphaned.length > 10) {
      console.log(c('cyan', `... 还有 ${stats.orphaned.length - 10} 个文件\n`));
    }

    console.log(c('yellow', '⚠️  请手动检查这些文件是否可以删除或归档\n'));
  }

  // 建议
  console.log(c('bright', '=== 建议 ===\n'));

  if (stats.misplaced.length > 0) {
    console.log(`💡 将文件移动到正确的子目录可以提高组织性`);
  }

  if (stats.orphaned.length > 0) {
    console.log(`💡 定期清理未使用的附件可以节省空间`);
  }

  if (stats.totalSize > 100 * 1024 * 1024) {
    console.log(`💡 附件总大小超过 100MB，考虑压缩图片或使用外部存储`);
  }

  console.log('');
}

// 运行整理
organizeAttachments();
