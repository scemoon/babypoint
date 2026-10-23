// task-score.js - 任务积分分析
// 版本: v3.0 - 五育分类体系优化
// 与 cloudfunctions/bp_task/index.js 保持一致

// ==================== 五育分类体系 ====================
const CATEGORY_BASE = {
  // 智育
  STUDY: 5,        // 学业学习
  READING: 4,      // 阅读积累
  SCIENCE: 4,      // 科学探索

  // 体育
  SPORTS: 5,       // 体育运动
  HEALTH: 3,      // 健康习惯

  // 美育
  ART: 5,          // 艺术创作
  MUSIC: 4,        // 音乐素养
  AESTHETIC: 4,    // 审美体验

  // 德育
  MORAL_FAMILY: 4,  // 家庭美德
  MORAL_SOCIAL: 4,  // 社会公德
  MORAL_CULTURE: 4, // 文化传承
  HABIT: 3,        // 习惯养成

  // 劳育
  SELF_CARE: 3,     // 自理能力
  HOUSEWORK: 4,     // 家务劳动
  FINANCE: 3,       // 财商教育
  SOCIAL: 3,        // 社交技能
  SAFETY: 3,       // 安全意识

  // 其他
  OTHER: 4,         // 其他任务
  GROWTH_PLAN: 3,   // 成长计划
};

// 分类元数据 - 用于前端展示
const CATEGORY_META = {
  // 智育
  STUDY: { name: '学习', icon: '📚', color: '#E3F2FD', textColor: '#1565C0', domain: 'intelligence', domainName: '智育' },
  READING: { name: '阅读', icon: '📖', color: '#FFF8E1', textColor: '#F57F17', domain: 'intelligence', domainName: '智育' },
  SCIENCE: { name: '科学', icon: '🔬', color: '#E8EAF6', textColor: '#3949AB', domain: 'intelligence', domainName: '智育' },

  // 体育
  SPORTS: { name: '运动', icon: '⚽', color: '#E8F5E9', textColor: '#2E7D32', domain: 'physical', domainName: '体育' },
  HEALTH: { name: '健康', icon: '🌟', color: '#E0F7FA', textColor: '#00838F', domain: 'physical', domainName: '体育' },

  // 美育
  ART: { name: '艺术', icon: '🎨', color: '#FCE4EC', textColor: '#AD1457', domain: 'aesthetic', domainName: '美育' },
  MUSIC: { name: '音乐', icon: '🎵', color: '#F3E5F5', textColor: '#7B1FA2', domain: 'aesthetic', domainName: '美育' },
  AESTHETIC: { name: '审美', icon: '📷', color: '#FFF3E0', textColor: '#E65100', domain: 'aesthetic', domainName: '美育' },

  // 德育
  MORAL_FAMILY: { name: '家庭', icon: '💝', color: '#FCE4EC', textColor: '#C2185B', domain: 'moral', domainName: '德育' },
  MORAL_SOCIAL: { name: '公德', icon: '🌟', color: '#FFF9C4', textColor: '#F9A825', domain: 'moral', domainName: '德育' },
  MORAL_CULTURE: { name: '文化', icon: '🎭', color: '#FFECB3', textColor: '#FF6F00', domain: 'moral', domainName: '德育' },
  HABIT: { name: '习惯', icon: '🌱', color: '#E0F2F1', textColor: '#00695C', domain: 'moral', domainName: '德育' },

  // 劳育
  SELF_CARE: { name: '自理', icon: '🧹', color: '#E0F7FA', textColor: '#00838F', domain: 'lifeSkill', domainName: '劳育' },
  HOUSEWORK: { name: '家务', icon: '🏠', color: '#FFF3E0', textColor: '#E65100', domain: 'lifeSkill', domainName: '劳育' },
  FINANCE: { name: '财商', icon: '💰', color: '#FFF8E1', textColor: '#FF8F00', domain: 'lifeSkill', domainName: '劳育' },
  SOCIAL: { name: '社交', icon: '🤝', color: '#E1F5FE', textColor: '#0277BD', domain: 'lifeSkill', domainName: '劳育' },
  SAFETY: { name: '安全', icon: '🚦', color: '#FFEBEE', textColor: '#C62828', domain: 'lifeSkill', domainName: '劳育' },

  // 其他
  OTHER: { name: '其他', icon: '✨', color: '#F5F5F5', textColor: '#757575', domain: 'other', domainName: '其他' },
  GROWTH_PLAN: { name: '成长', icon: '📋', color: '#E8F5E9', textColor: '#388E3C', domain: 'other', domainName: '其他' },
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
