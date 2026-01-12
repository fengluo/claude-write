#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ensureDir, formatFileSize, getFileSize, getRelativePath, backupFile } = require('../utils/file-helpers');

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

// 支持的图片格式
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// 默认配置
const DEFAULT_CONFIG = {
  maxWidth: 1920,        // 最大宽度
  quality: 85,           // 压缩质量 (1-100)
  minSize: 100 * 1024,   // 最小处理大小 (100KB)
  backup: true,          // 是否备份
  dryRun: false          // 预览模式
};

/**
 * 检查是否安装了 sips (macOS 内置)
 */
function checkSips() {
  try {
    execSync('which sips', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查是否安装了 ImageMagick
 */
function checkImageMagick() {
  try {
    execSync('which convert', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取图片尺寸 (使用 sips)
 */
function getImageDimensions(filePath) {
  try {
    const output = execSync(`sips -g pixelWidth -g pixelHeight "${filePath}" 2>/dev/null`, { encoding: 'utf8' });
    const widthMatch = output.match(/pixelWidth:\s*(\d+)/);
    const heightMatch = output.match(/pixelHeight:\s*(\d+)/);
    if (widthMatch && heightMatch) {
      return {
        width: parseInt(widthMatch[1]),
        height: parseInt(heightMatch[1])
      };
    }
  } catch {
    // 忽略错误
  }
  return null;
}

/**
 * 使用 sips 压缩图片 (macOS)
 */
function compressWithSips(filePath, config) {
  const ext = path.extname(filePath).toLowerCase();
  const dimensions = getImageDimensions(filePath);

  let resized = false;

  // 调整尺寸
  if (dimensions && dimensions.width > config.maxWidth) {
    execSync(`sips --resampleWidth ${config.maxWidth} "${filePath}" 2>/dev/null`);
    resized = true;
  }

  // JPEG 质量压缩
  if (ext === '.jpg' || ext === '.jpeg') {
    execSync(`sips -s formatOptions ${config.quality} "${filePath}" 2>/dev/null`);
  }

  return resized;
}

/**
 * 使用 ImageMagick 压缩图片
 */
function compressWithImageMagick(filePath, config) {
  const tempPath = filePath + '.tmp';
  execSync(`convert "${filePath}" -resize "${config.maxWidth}>" -quality ${config.quality} "${tempPath}" 2>/dev/null`);
  fs.renameSync(tempPath, filePath);
}

/**
 * 获取所有图片文件
 */
function getAllImages() {
  const images = [];

  if (!fs.existsSync(ATTACHMENTS_DIR)) {
    return images;
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
        const ext = path.extname(item).toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext)) {
          images.push(fullPath);
        }
      }
    }
  }

  walk(ATTACHMENTS_DIR);
  return images;
}

/**
 * 压缩图片
 */
function compressImages() {
  console.log(c('bright', '\n🗜️  图片压缩工具\n'));

  // 解析命令行参数
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  if (args.includes('--dry-run')) {
    config.dryRun = true;
    console.log(c('yellow', '预览模式: 不会实际修改文件\n'));
  }

  if (args.includes('--no-backup')) {
    config.backup = false;
  }

  const qualityArg = args.find(a => a.startsWith('--quality='));
  if (qualityArg) {
    config.quality = parseInt(qualityArg.split('=')[1]) || 85;
  }

  const maxWidthArg = args.find(a => a.startsWith('--max-width='));
  if (maxWidthArg) {
    config.maxWidth = parseInt(maxWidthArg.split('=')[1]) || 1920;
  }

  // 检查工具
  const hasSips = checkSips();
  const hasImageMagick = checkImageMagick();

  if (!hasSips && !hasImageMagick) {
    console.log(c('red', '错误: 需要安装 sips (macOS 内置) 或 ImageMagick'));
    console.log('\n安装 ImageMagick:');
    console.log(c('yellow', '  brew install imagemagick'));
    process.exit(1);
  }

  const tool = hasSips ? 'sips' : 'ImageMagick';
  console.log(`使用工具: ${c('cyan', tool)}`);
  console.log(`最大宽度: ${c('cyan', config.maxWidth + 'px')}`);
  console.log(`压缩质量: ${c('cyan', config.quality + '%')}`);
  console.log(`最小大小: ${c('cyan', formatFileSize(config.minSize))}\n`);

  // 获取所有图片
  const images = getAllImages();

  if (images.length === 0) {
    console.log('没有找到可处理的图片。\n');
    return;
  }

  // 过滤需要处理的图片
  const toProcess = images.filter(img => {
    const size = getFileSize(img);
    return size >= config.minSize;
  });

  console.log(`找到图片: ${images.length} 个`);
  console.log(`需要处理: ${toProcess.length} 个 (>= ${formatFileSize(config.minSize)})\n`);

  if (toProcess.length === 0) {
    console.log(c('green', '✓ 所有图片已经是合适的大小\n'));
    return;
  }

  // 处理图片
  let processed = 0;
  let totalSaved = 0;
  const results = [];

  toProcess.forEach((imagePath, index) => {
    const relativePath = getRelativePath(imagePath, ROOT_DIR);
    const originalSize = getFileSize(imagePath);
    const dimensions = getImageDimensions(imagePath);

    console.log(`[${index + 1}/${toProcess.length}] ${relativePath}`);
    console.log(`  原始大小: ${formatFileSize(originalSize)}`);
    if (dimensions) {
      console.log(`  原始尺寸: ${dimensions.width} x ${dimensions.height}`);
    }

    if (config.dryRun) {
      console.log(c('yellow', '  [预览] 将被压缩\n'));
      return;
    }

    try {
      // 备份
      if (config.backup) {
        backupFile(imagePath, path.join(ROOT_DIR, '.backup', 'images'));
      }

      // 压缩
      if (hasSips) {
        compressWithSips(imagePath, config);
      } else {
        compressWithImageMagick(imagePath, config);
      }

      const newSize = getFileSize(imagePath);
      const saved = originalSize - newSize;

      if (saved > 0) {
        processed++;
        totalSaved += saved;
        results.push({ path: relativePath, saved, originalSize, newSize });
        console.log(c('green', `  ✓ 压缩后: ${formatFileSize(newSize)} (节省 ${formatFileSize(saved)})\n`));
      } else {
        console.log(c('yellow', `  - 无变化或略有增加，保持原样\n`));
      }
    } catch (err) {
      console.log(c('red', `  ✗ 压缩失败: ${err.message}\n`));
    }
  });

  // 汇总
  console.log(c('bright', '\n=== 处理完成 ===\n'));
  console.log(`处理成功: ${c('green', processed)} 个`);
  console.log(`总共节省: ${c('cyan', formatFileSize(totalSaved))}`);

  if (config.backup && !config.dryRun) {
    console.log(`\n原始文件已备份到: ${c('yellow', '.backup/images/')}`);
  }

  console.log('');
}

// 显示帮助
if (process.argv.includes('--help')) {
  console.log(`
图片压缩工具

用法: npm run file:compress [选项]

选项:
  --dry-run         预览模式，不实际修改文件
  --no-backup       不备份原始文件
  --quality=N       压缩质量 (1-100，默认 85)
  --max-width=N     最大宽度 (默认 1920)
  --help            显示帮助

示例:
  npm run file:compress
  npm run file:compress -- --dry-run
  npm run file:compress -- --quality=70 --max-width=1200
`);
  process.exit(0);
}

// 运行
compressImages();
