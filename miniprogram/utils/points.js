// utils/points.js - 完成度配置和积分计算
const COMPLETION_LEVELS = {
  simple: {
    name: '简单完成',
    description: '做到了一部分，还需要改进',
    ratio: 0.5,
    icon: '😐',
    color: '#FFA500'
  },
  normal: {
    name: '一般完成',
    description: '基本完成，质量一般',
    ratio: 0.75,
    icon: '🙂',
    color: '#4CAF50'
  },
  perfect: {
    name: '完美完成',
    description: '高质量完成，超出预期',
    ratio: 1.0,
    icon: '🌟',
    color: '#FF6B35'
  }
};

/**
 * 根据完成度计算实际获得积分
 * @param {number} basePoints 基础积分
 * @param {string} level 完成度等级
 */
function calculatePoints(basePoints, level) {
  const cfg = COMPLETION_LEVELS[level];
  if (!cfg) return 0;
  return Math.floor(basePoints * cfg.ratio);
}

const CATEGORY_META = {
  STUDY:      { name: '学习任务', icon: '📚', color: '#4A90E2' },
  HOUSEWORK:  { name: '家务任务', icon: '🏠', color: '#7ED321' },
  SPORTS:     { name: '运动任务', icon: '⚽', color: '#F5A623' },
  ART:        { name: '手工艺术', icon: '🎨', color: '#BD10E0' },
  READING:    { name: '阅读任务', icon: '📖', color: '#9013FE' },
  HABIT:      { name: '习惯养成', icon: '⭐', color: '#FF6B35' },
  OTHER:      { name: '其他任务', icon: '📝', color: '#9B9B9B' },
  FOOD:       { name: '美食奖励', icon: '🍕', color: '#FF8B45' },
  PLAY:       { name: '娱乐奖励', icon: '🎮', color: '#50E3C2' },
  TOY:        { name: '玩具奖励', icon: '🎁', color: '#E91E63' },
  OUTING:     { name: '外出游玩', icon: '🏖️', color: '#4A90E2' },
  PRIVILEGE:  { name: '特权奖励', icon: '👑', color: '#FF6B35' },
  DIGITAL:    { name: '数字奖励', icon: '📱', color: '#9013FE' }
};

function getCategoryMeta(code) {
  return CATEGORY_META[code] || { name: '其他', icon: '📝', color: '#9B9B9B' };
}

function getCategoryName(code) {
  return getCategoryMeta(code).name;
}

function getCategoryIcon(code) {
  return getCategoryMeta(code).icon;
}

/**
 * 格式化时间戳为友好显示
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 86400000 * 7) return Math.floor(diff / 86400000) + '天前';

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 获取今日开始时间戳
 */
function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

module.exports = {
  COMPLETION_LEVELS,
  CATEGORY_META,
  calculatePoints,
  getCategoryMeta,
  getCategoryName,
  getCategoryIcon,
  formatTime,
  formatDate,
  getTodayStart
};
