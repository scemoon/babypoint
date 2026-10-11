// task-score.js - 任务积分分析
// 版本: v2.0 - 五育体系
// 与 cloudfunctions/bp_task/index.js 保持一致

// ==================== 新版五育分类体系 ====================
const CATEGORY_BASE = {
  // 智育
  STUDY: 5,
  // 体育
  SPORTS: 5,
  // 美育
  ART: 5,
  // 劳育 (原 HOUSEWORK)
  HOUSEWORK: 4,
  // 阅读
  READING: 4,
  // 习惯
  HABIT: 3,
  // 其他
  OTHER: 4,
  
  // ===== 新增德育分类 =====
  MORAL_FAMILY: 4,
  MORAL_SOCIAL: 4,
  MORAL_SELF: 3,
  MORAL_CULTURE: 4,
  
  // ===== 劳育细分 =====
  LIFE_SELF: 3,
  LIFE_MONEY: 3,
  LIFE_SOCIAL: 3,
};

// 分类元数据 - 用于前端展示
const CATEGORY_META = {
  STUDY: { name: '学习', icon: '📚', color: '#E3F2FD', domain: 'intelligence', domainName: '智育' },
  SPORTS: { name: '运动', icon: '⚽', color: '#E8F5E9', domain: 'physical', domainName: '体育' },
  ART: { name: '艺术', icon: '🎨', color: '#FCE4EC', domain: 'aesthetic', domainName: '美育' },
  HOUSEWORK: { name: '家务', icon: '🏠', color: '#FFF3E0', domain: 'lifeSkill', domainName: '劳育' },
  LIFE_SELF: { name: '自理', icon: '🧹', color: '#E0F7FA', domain: 'lifeSkill', domainName: '劳育' },
  LIFE_MONEY: { name: '理财', icon: '💰', color: '#FFF8E1', domain: 'lifeSkill', domainName: '劳育' },
  LIFE_SOCIAL: { name: '社交', icon: '🤝', color: '#E1F5FE', domain: 'lifeSkill', domainName: '劳育' },
  READING: { name: '阅读', icon: '📖', color: '#FFF8E1', domain: 'intelligence', domainName: '智育' },
  HABIT: { name: '习惯', icon: '🌱', color: '#E0F2F1', domain: 'moral', domainName: '德育' },
  MORAL_FAMILY: { name: '家庭美德', icon: '💝', color: '#FCE4EC', domain: 'moral', domainName: '德育' },
  MORAL_SOCIAL: { name: '社会公德', icon: '🌟', color: '#FFF9C4', domain: 'moral', domainName: '德育' },
  MORAL_SELF: { name: '自我管理', icon: '⏰', color: '#E8EAF6', domain: 'moral', domainName: '德育' },
  MORAL_CULTURE: { name: '文化传承', icon: '🎭', color: '#FFECB3', domain: 'moral', domainName: '德育' },
  OTHER: { name: '其他', icon: '✨', color: '#F5F5F5', domain: 'other', domainName: '其他' }
};

// 获取育域信息
function getCategoryDomain(category) {
  const meta = CATEGORY_META[category];
  if (!meta) return { domain: 'other', domainName: '其他' };
  return { domain: meta.domain, domainName: meta.domainName };
}

// 分析任务积分
function analyzeTaskPoints(task = {}) {
  const text = `${task.name || ''} ${task.description || ''}`.toLowerCase();
  let points = CATEGORY_BASE[task.category] || CATEGORY_BASE.OTHER;
  const factors = [];

  // 日常轻量任务扣分
  if (/简单|整理|收拾|归位|准备好|打卡|刷牙|叠衣/.test(text)) {
    points--;
    factors.push('日常轻量');
  }

  // 需要持续投入的任务加分
  if (/独立完成|完整完成|专项|复习|预习|难题|全套|长跑|大扫除|做饭/.test(text)) {
    points += 2;
    factors.push('需要持续投入');
  }

  // 德育类任务加分因素
  if (/孝敬|尊重|帮助他人|诚实|守时|自律|主动/.test(text)) {
    points += 1;
    factors.push('品格培养');
  }

  // 家务类加分
  if (/做饭|烹饪|洗涤|大扫除|整理/.test(text)) {
    points += 1;
    factors.push('家务技能');
  }

  // 时间投入加分
  const duration = text.match(/(\d+)\s*(分钟|分|min|小时|时)/);
  if (duration) {
    const amount = Number(duration[1]);
    const minutes = /小时|时/.test(duration[2]) ? amount * 60 : amount;
    const bonus = Math.min(4, Math.floor(minutes / 20));
    points += bonus;
    if (bonus > 0) factors.push(`投入约${minutes}分钟`);
  }

  points = Math.max(2, Math.min(15, points));
  return { 
    points, 
    reason: factors.length ? factors.join('、') : '按任务分类与完成要求评估' 
  };
}

// 获取所有分类
function getAllCategories() {
  return Object.entries(CATEGORY_META).map(([key, meta]) => ({
    key,
    ...meta
  }));
}

// 获取五育领域
function getDomains() {
  return [
    { key: 'intelligence', name: '智育', icon: '🧠', color: '#E3F2FD', description: '学习、阅读、思维训练' },
    { key: 'physical', name: '体育', icon: '💪', color: '#E8F5E9', description: '运动、健康、安全' },
    { key: 'aesthetic', name: '美育', icon: '🎨', color: '#FCE4EC', description: '艺术创作、表演欣赏' },
    { key: 'moral', name: '德育', icon: '💝', color: '#FCE4EC', description: '品格、公德、责任感' },
    { key: 'lifeSkill', name: '劳育', icon: '🏠', color: '#FFF3E0', description: '自理，家务、理财' }
  ];
}

module.exports = { 
  analyzeTaskPoints,
  getAllCategories,
  getDomains,
  getCategoryDomain,
  CATEGORY_BASE,
  CATEGORY_META
};
