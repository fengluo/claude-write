#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getAllMarkdownFiles, readFile, getRelativePath, getFileModifiedTime, getMainFolder } = require('../utils/file-helpers');
const { countWords, getTitle } = require('../utils/markdown-parser');

const ROOT_DIR = process.cwd();

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m'
};

function c(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * 获取 Git 提交历史
 */
function getGitCommits(days = 30) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    const output = execSync(
      `git log --since="${sinceStr}" --format="%H|%aI|%s" --name-only 2>/dev/null`,
      { encoding: 'utf8', cwd: ROOT_DIR }
    );

    const commits = [];
    let currentCommit = null;

    output.split('\n').forEach(line => {
      if (line.includes('|')) {
        const [hash, date, message] = line.split('|');
        currentCommit = { hash, date, message, files: [] };
        commits.push(currentCommit);
      } else if (line.trim() && currentCommit) {
        currentCommit.files.push(line.trim());
      }
    });

    return commits;
  } catch {
    return [];
  }
}

/**
 * 分析日期分布
 */
function analyzeByDate(files) {
  const byDate = {};
  const byWeekday = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const byHour = {};

  files.forEach(file => {
    const date = file.mtime;
    const dateStr = date.toISOString().split('T')[0];
    const weekday = date.getDay();
    const hour = date.getHours();

    byDate[dateStr] = (byDate[dateStr] || 0) + 1;
    byWeekday[weekday]++;
    byHour[hour] = (byHour[hour] || 0) + 1;
  });

  return { byDate, byWeekday, byHour };
}

/**
 * 生成日历热力图 (最近30天)
 */
function generateCalendarHeatmap(byDate) {
  const days = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      count: byDate[dateStr] || 0,
      weekday: date.getDay()
    });
  }

  return days;
}

/**
 * 获取活跃度等级
 */
function getActivityLevel(count) {
  if (count === 0) return { symbol: '·', color: 'dim' };
  if (count <= 2) return { symbol: '▪', color: 'green' };
  if (count <= 5) return { symbol: '■', color: 'cyan' };
  return { symbol: '█', color: 'bright' };
}

/**
 * 主函数
 */
function main() {
  console.log(c('bright', '\n📈 活跃度分析报告\n'));
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
      mtime: getFileModifiedTime(filePath),
      folder: getMainFolder(filePath)
    };
  });

  // 基础统计
  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const todayFiles = files.filter(f => f.mtime >= oneDayAgo);
  const weekFiles = files.filter(f => f.mtime >= oneWeekAgo);
  const monthFiles = files.filter(f => f.mtime >= oneMonthAgo);

  console.log(c('bright', '=== 活跃度概览 ===\n'));
  console.log(`今日更新: ${c('cyan', todayFiles.length)} 篇`);
  console.log(`本周更新: ${c('cyan', weekFiles.length)} 篇`);
  console.log(`本月更新: ${c('cyan', monthFiles.length)} 篇`);
  console.log(`总文件数: ${c('cyan', files.length)} 篇\n`);

  // 日期分布分析
  const { byDate, byWeekday, byHour } = analyzeByDate(files);

  // 日历热力图
  console.log(c('bright', '=== 最近 30 天活跃度 ===\n'));
  const heatmap = generateCalendarHeatmap(byDate);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  // 按周显示
  let currentWeek = [];
  heatmap.forEach((day, index) => {
    currentWeek.push(day);
    if (day.weekday === 6 || index === heatmap.length - 1) {
      // 补齐一周开头的空位
      while (currentWeek.length < 7 && currentWeek[0].weekday !== 0) {
        currentWeek.unshift(null);
      }

      const line = currentWeek.map(d => {
        if (!d) return ' ';
        const level = getActivityLevel(d.count);
        return c(level.color, level.symbol);
      }).join(' ');

      const weekStart = currentWeek.find(d => d)?.date.slice(5) || '';
      console.log(`  ${line}  ${weekStart}`);
      currentWeek = [];
    }
  });
  console.log(`  ${weekdays.map(w => c('dim', w)).join(' ')}\n`);
  console.log(`图例: ${c('dim', '·')} 无活动  ${c('green', '▪')} 1-2篇  ${c('cyan', '■')} 3-5篇  ${c('bright', '█')} 6+篇\n`);

  // 星期分布
  console.log(c('bright', '=== 星期分布 ===\n'));
  const maxWeekday = Math.max(...Object.values(byWeekday));
  weekdays.forEach((name, day) => {
    const count = byWeekday[day];
    const barLen = maxWeekday > 0 ? Math.round((count / maxWeekday) * 15) : 0;
    const bar = '█'.repeat(barLen) + '░'.repeat(15 - barLen);
    console.log(`  周${name}: ${bar} ${count}`);
  });
  console.log('');

  // 小时分布
  console.log(c('bright', '=== 时段分布 ===\n'));
  const periods = [
    { name: '凌晨 (0-6)', hours: [0, 1, 2, 3, 4, 5] },
    { name: '上午 (6-12)', hours: [6, 7, 8, 9, 10, 11] },
    { name: '下午 (12-18)', hours: [12, 13, 14, 15, 16, 17] },
    { name: '晚间 (18-24)', hours: [18, 19, 20, 21, 22, 23] }
  ];

  const periodCounts = periods.map(p => ({
    name: p.name,
    count: p.hours.reduce((sum, h) => sum + (byHour[h] || 0), 0)
  }));
  const maxPeriod = Math.max(...periodCounts.map(p => p.count));

  periodCounts.forEach(p => {
    const barLen = maxPeriod > 0 ? Math.round((p.count / maxPeriod) * 15) : 0;
    const bar = '█'.repeat(barLen) + '░'.repeat(15 - barLen);
    console.log(`  ${p.name}: ${bar} ${p.count}`);
  });
  console.log('');

  // 最近更新的文件
  console.log(c('bright', '=== 最近更新的文件 ===\n'));
  const recentFiles = [...files]
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 10);

  recentFiles.forEach((file, index) => {
    const relativePath = getRelativePath(file.path, ROOT_DIR);
    const timeAgo = getTimeAgo(file.mtime);
    console.log(`${c('cyan', (index + 1).toString().padStart(2))}. ${file.title}`);
    console.log(`    ${c('dim', timeAgo)} | ${relativePath}`);
  });
  console.log('');

  // Git 活动 (如果有)
  const commits = getGitCommits(30);
  if (commits.length > 0) {
    console.log(c('bright', '=== Git 提交统计 (最近30天) ===\n'));
    console.log(`总提交数: ${c('cyan', commits.length)}`);

    // 按日期统计提交
    const commitsByDate = {};
    commits.forEach(commit => {
      const date = commit.date.split('T')[0];
      commitsByDate[date] = (commitsByDate[date] || 0) + 1;
    });

    const activeDays = Object.keys(commitsByDate).length;
    console.log(`活跃天数: ${c('cyan', activeDays)} 天`);
    console.log(`日均提交: ${c('cyan', (commits.length / 30).toFixed(1))}\n`);

    // 最近提交
    console.log('最近 5 次提交:');
    commits.slice(0, 5).forEach(commit => {
      const date = new Date(commit.date).toLocaleDateString('zh-CN');
      console.log(`  ${c('dim', date)} ${commit.message}`);
    });
    console.log('');
  }

  // 建议
  console.log(c('bright', '=== 建议 ===\n'));

  if (todayFiles.length === 0) {
    console.log('💡 今天还没有更新任何笔记，使用 /quick-capture 记录一些想法吧！');
  }

  const avgWeekly = weekFiles.length;
  if (avgWeekly < 3) {
    console.log('💡 本周活跃度较低，建议养成每天记录的习惯');
  } else if (avgWeekly >= 10) {
    console.log('🎉 本周写作非常活跃，保持这个势头！');
  }

  console.log('');
}

/**
 * 获取相对时间
 */
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  return date.toLocaleDateString('zh-CN');
}

// 运行
main();
