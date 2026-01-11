const fs = require('fs');
const path = require('path');

/**
 * 递归获取所有 Markdown 文件
 * @param {string} dir - 搜索目录
 * @param {string[]} exclude - 排除的目录
 * @returns {string[]} - 文件路径数组
 */
function getAllMarkdownFiles(dir, exclude = ['node_modules', '.git', '.vscode']) {
  const files = [];

  function walk(currentPath) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      // 检查是否在排除列表中
      if (exclude.some(ex => fullPath.includes(path.sep + ex + path.sep) || fullPath.endsWith(path.sep + ex))) {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile() && item.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * 确保目录存在，不存在则创建
 * @param {string} dirPath - 目录路径
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 移动文件
 * @param {string} source - 源文件路径
 * @param {string} destination - 目标文件路径
 */
function moveFile(source, destination) {
  ensureDir(path.dirname(destination));
  fs.renameSync(source, destination);
}

/**
 * 复制文件
 * @param {string} source - 源文件路径
 * @param {string} destination - 目标文件路径
 */
function copyFile(source, destination) {
  ensureDir(path.dirname(destination));
  fs.copyFileSync(source, destination);
}

/**
 * 备份文件
 * @param {string} filePath - 文件路径
 * @param {string} backupDir - 备份目录
 * @returns {string} - 备份文件路径
 */
function backupFile(filePath, backupDir = '.backup') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = path.basename(filePath);
  const backupPath = path.join(backupDir, `${timestamp}-${fileName}`);

  ensureDir(backupDir);
  copyFile(filePath, backupPath);

  return backupPath;
}

/**
 * 获取文件的修改时间
 * @param {string} filePath - 文件路径
 * @returns {Date} - 修改时间
 */
function getFileModifiedTime(filePath) {
  const stat = fs.statSync(filePath);
  return stat.mtime;
}

/**
 * 获取文件大小（字节）
 * @param {string} filePath - 文件路径
 * @returns {number} - 文件大小
 */
function getFileSize(filePath) {
  const stat = fs.statSync(filePath);
  return stat.size;
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} - 格式化后的大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 读取文件内容
 * @param {string} filePath - 文件路径
 * @returns {string} - 文件内容
 */
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * 写入文件内容
 * @param {string} filePath - 文件路径
 * @param {string} content - 文件内容
 */
function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * 获取相对于工作区根目录的路径
 * @param {string} filePath - 绝对路径
 * @param {string} rootDir - 根目录
 * @returns {string} - 相对路径
 */
function getRelativePath(filePath, rootDir) {
  return path.relative(rootDir, filePath);
}

/**
 * 获取文件所属的主文件夹（00_Inbox, 01_Projects等）
 * @param {string} filePath - 文件路径
 * @returns {string|null} - 主文件夹名称
 */
function getMainFolder(filePath) {
  const normalized = path.normalize(filePath);
  const match = normalized.match(/0[0-6]_\w+/);
  return match ? match[0] : null;
}

module.exports = {
  getAllMarkdownFiles,
  ensureDir,
  moveFile,
  copyFile,
  backupFile,
  getFileModifiedTime,
  getFileSize,
  formatFileSize,
  readFile,
  writeFile,
  getRelativePath,
  getMainFolder
};
