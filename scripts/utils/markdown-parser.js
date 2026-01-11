const matter = require('gray-matter');

/**
 * 解析 Markdown 文件的 Front Matter
 * @param {string} content - Markdown 文件内容
 * @returns {Object} - { data: 元数据对象, content: 正文内容 }
 */
function parseFrontMatter(content) {
  try {
    const parsed = matter(content);
    return {
      data: parsed.data,
      content: parsed.content
    };
  } catch (error) {
    return {
      data: {},
      content: content
    };
  }
}

/**
 * 从内容中提取标签
 * @param {string} content - Markdown 内容
 * @returns {string[]} - 标签数组
 */
function extractTags(content) {
  const tags = new Set();

  // 从 Front Matter 提取
  const { data } = parseFrontMatter(content);
  if (data.tags && Array.isArray(data.tags)) {
    data.tags.forEach(tag => tags.add(tag));
  }

  // 从正文提取 #tag 格式
  const hashtagRegex = /#([\w-]+)/g;
  let match;
  while ((match = hashtagRegex.exec(content)) !== null) {
    tags.add(match[1]);
  }

  return Array.from(tags);
}

/**
 * 统计字数（中英文混合）
 * @param {string} content - Markdown 内容
 * @returns {number} - 字数
 */
function countWords(content) {
  // 移除 Front Matter
  const { content: mainContent } = parseFrontMatter(content);

  // 移除代码块
  const withoutCodeBlocks = mainContent.replace(/```[\s\S]*?```/g, '');

  // 移除行内代码
  const withoutInlineCode = withoutCodeBlocks.replace(/`[^`]+`/g, '');

  // 移除链接
  const withoutLinks = withoutInlineCode.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  // 移除标题标记
  const withoutHeaders = withoutLinks.replace(/^#+\s+/gm, '');

  // 统计中文字符
  const chineseChars = (withoutHeaders.match(/[\u4e00-\u9fa5]/g) || []).length;

  // 统计英文单词
  const englishWords = (withoutHeaders.match(/[a-zA-Z]+/g) || []).length;

  return chineseChars + englishWords;
}

/**
 * 提取内部链接 [[note-name]]
 * @param {string} content - Markdown 内容
 * @returns {string[]} - 链接数组
 */
function extractLinks(content) {
  const links = new Set();

  // Wiki 风格链接 [[link]]
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    links.add(match[1]);
  }

  return Array.from(links);
}

/**
 * 提取标题
 * @param {string} content - Markdown 内容
 * @returns {Object[]} - 标题数组 [{level, text}]
 */
function extractHeadings(content) {
  const headings = [];
  const { content: mainContent } = parseFrontMatter(content);

  const headingRegex = /^(#+)\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(mainContent)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim()
    });
  }

  return headings;
}

/**
 * 获取文件的第一个标题作为标题
 * @param {string} content - Markdown 内容
 * @returns {string|null} - 标题文本
 */
function getTitle(content) {
  const { data, content: mainContent } = parseFrontMatter(content);

  // 优先使用 Front Matter 中的 title
  if (data.title) {
    return data.title;
  }

  // 否则使用第一个一级标题
  const headings = extractHeadings(mainContent);
  const h1 = headings.find(h => h.level === 1);

  return h1 ? h1.text : null;
}

/**
 * 从内容中提取任务列表项
 * @param {string} content - Markdown 内容
 * @returns {Object[]} - 任务数组 [{checked, text}]
 */
function extractTasks(content) {
  const tasks = [];
  const { content: mainContent } = parseFrontMatter(content);

  const taskRegex = /^[\s-]*\[([ x])\]\s+(.+)$/gm;
  let match;
  while ((match = taskRegex.exec(mainContent)) !== null) {
    tasks.push({
      checked: match[1].toLowerCase() === 'x',
      text: match[2].trim()
    });
  }

  return tasks;
}

/**
 * 更新或添加 Front Matter
 * @param {string} content - 原始 Markdown 内容
 * @param {Object} newData - 新的元数据
 * @returns {string} - 更新后的内容
 */
function updateFrontMatter(content, newData) {
  const { data, content: mainContent } = parseFrontMatter(content);

  const updatedData = { ...data, ...newData };

  return matter.stringify(mainContent, updatedData);
}

/**
 * 生成内容摘要（前N个字符）
 * @param {string} content - Markdown 内容
 * @param {number} length - 摘要长度
 * @returns {string} - 摘要
 */
function generateSummary(content, length = 200) {
  const { content: mainContent } = parseFrontMatter(content);

  // 移除代码块和链接
  let cleaned = mainContent.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  cleaned = cleaned.replace(/^#+\s+/gm, '');
  cleaned = cleaned.replace(/\n+/g, ' ');
  cleaned = cleaned.trim();

  if (cleaned.length <= length) {
    return cleaned;
  }

  return cleaned.substring(0, length).trim() + '...';
}

module.exports = {
  parseFrontMatter,
  extractTags,
  countWords,
  extractLinks,
  extractHeadings,
  getTitle,
  extractTasks,
  updateFrontMatter,
  generateSummary
};
