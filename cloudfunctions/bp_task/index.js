// bp_task - 任务管理与完成
// 版本: v2.0 - 五育体系
const cloud = require('wx-server-sdk');
const crypto = require('crypto');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const COMPLETION_LEVELS = {
  simple:  { name: '简单完成', ratio: 0.5 },
  normal:  { name: '一般完成', ratio: 0.75 },
  perfect: { name: '完美完成', ratio: 1.0 }
};

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// ==================== 新版五育分类体系 ====================
// 五育分类 (兼容旧版，支持新版 MORAL_* 子分类)
const CATEGORY_BASE_POINTS = {
  // 智育
  STUDY: 5,
  // 体育
  SPORTS: 5,
  // 美育
  ART: 5,
  // 劳育 (原 HOUSEWORK)
  HOUSEWORK: 4,
  // 阅读 (保留独立分类)
  READING: 4,
  // 习惯 (保留，部分迁移到德育)
  HABIT: 3,
  // 其他
  OTHER: 4,
  
  // ===== 新增德育分类 =====
  // 家庭美德
  MORAL_FAMILY: 4,
  // 社会公德
  MORAL_SOCIAL: 4,
  // 自我管理
  MORAL_SELF: 3,
  // 文化传承
  MORAL_CULTURE: 4,
  
  // ===== 劳育细分 =====
  // 自理能力
  LIFE_SELF: 3,
  // 理财观念
  LIFE_MONEY: 3,
  // 社交技能
  LIFE_SOCIAL: 3,
};

// 新版分类元数据 - 用于前端展示
const CATEGORY_META = {
  // ========== 智育 ==========
  STUDY: {
    name: '学习', icon: '📚', color: '#E3F2FD',
    domain: 'intelligence', domainName: '智育',
    description: '学习习惯、作业完成、兴趣探索'
  },
  
  // ========== 体育 ==========
  SPORTS: {
    name: '运动', icon: '⚽', color: '#E8F5E9',
    domain: 'physical', domainName: '体育',
    description: '日常运动、运动技能、健康习惯'
  },
  
  // ========== 美育 ==========
  ART: {
    name: '艺术', icon: '🎨', color: '#FCE4EC',
    domain: 'aesthetic', domainName: '美育',
    description: '艺术创作、表演艺术、欣赏体验'
  },
  
  // ========== 劳育 ==========
  HOUSEWORK: {
    name: '家务', icon: '🏠', color: '#FFF3E0',
    domain: 'lifeSkill', domainName: '劳育',
    description: '日常家务、厨房技能'
  },
  LIFE_SELF: {
    name: '自理', icon: '🧹', color: '#E0F7FA',
    domain: 'lifeSkill', domainName: '劳育',
    description: '个人物品管理、自我照顾'
  },
  LIFE_MONEY: {
    name: '理财', icon: '💰', color: '#FFF8E1',
    domain: 'lifeSkill', domainName: '劳育',
    description: '零钱管理、消费观念'
  },
  LIFE_SOCIAL: {
    name: '社交', icon: '🤝', color: '#E1F5FE',
    domain: 'lifeSkill', domainName: '劳育',
    description: '结交朋友、合作分享'
  },
  
  // ========== 阅读 ==========
  READING: {
    name: '阅读', icon: '📖', color: '#FFF8E1',
    domain: 'intelligence', domainName: '智育',
    description: '自主阅读、朗读分享'
  },
  
  // ========== 习惯 ==========
  HABIT: {
    name: '习惯', icon: '🌱', color: '#E0F2F1',
    domain: 'moral', domainName: '德育',
    description: '日常习惯、自我管理'
  },
  
  // ========== 德育 ==========
  MORAL_FAMILY: {
    name: '家庭美德', icon: '💝', color: '#FCE4EC',
    domain: 'moral', domainName: '德育',
    description: '孝敬长辈、分担家务'
  },
  MORAL_SOCIAL: {
    name: '社会公德', icon: '🌟', color: '#FFF9C4',
    domain: 'moral', domainName: '德育',
    description: '礼貌用语、诚实守信'
  },
  MORAL_SELF: {
    name: '自我管理', icon: '⏰', color: '#E8EAF6',
    domain: 'moral', domainName: '德育',
    description: '时间管理、情绪调节'
  },
  MORAL_CULTURE: {
    name: '文化传承', icon: '🎭', color: '#FFECB3',
    domain: 'moral', domainName: '德育',
    description: '传统节日、家风家训'
  },
  
  // ========== 其他 ==========
  OTHER: {
    name: '其他', icon: '✨', color: '#F5F5F5',
    domain: 'other', domainName: '其他',
    description: '自定义任务'
  }
};

// 获取分类的育域信息
function getCategoryDomain(category) {
  const meta = CATEGORY_META[category];
  if (!meta) return { domain: 'other', domainName: '其他' };
  return { domain: meta.domain, domainName: meta.domainName };
}

const PIN_ITERATIONS = 120000;

function analyzeTaskPoints(task = {}) {
  const text = `${task.name || ''} ${task.description || ''}`.toLowerCase();
  let points = CATEGORY_BASE_POINTS[task.category] || CATEGORY_BASE_POINTS.OTHER;
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
  
  return { 
    points: Math.max(2, Math.min(15, points)), 
    reason: factors.length ? factors.join('、') : '按任务分类与完成要求评估' 
  };
}

function pinHash(pin, salt) {
  return crypto.pbkdf2Sync(pin, salt, PIN_ITERATIONS, 32, 'sha256').toString('hex');
}

function verifyPin(user, pin) {
  if (!user || !user.completionPinHash || !user.completionPinSalt) return false;
  const expected = Buffer.from(user.completionPinHash, 'hex');
  const hash = crypto.pbkdf2Sync(pin, user.completionPinSalt, Number(user.completionPinIterations) || PIN_ITERATIONS, 32, 'sha256').toString('hex');
  const actual = Buffer.from(hash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

async function recordPinFailure(usersCol, openid, user) {
  const attempts = (Number(user.completionPinFailCount) || 0) + 1;
  const lockedUntil = attempts >= 5 ? Date.now() + 10 * 60 * 1000 : (user.completionPinLockedUntil || 0);
  await usersCol.doc(openid).update({ data: { completionPinFailCount: attempts >= 5 ? 0 : attempts, completionPinLockedUntil: lockedUntil, updatedAt: Date.now() } });
  return lockedUntil > Date.now() ? '确认码错误次数过多，请10分钟后再试' : `确认码错误，还可尝试${5 - attempts}次`;
}

function getPeriodStart(task, now) {
  const type = task.periodType || 'once';
  const date = new Date(now);
  if (type === 'daily') date.setHours(0, 0, 0, 0);
  else if (type === 'weekly') {
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  } else if (type === 'monthly') date.setDate(1), date.setHours(0, 0, 0, 0);
  else if (type === 'custom') {
    const days = Math.max(1, Number(task.periodDays) || 1);
    const anchor = Number(task.createdAt) || now;
    return anchor + Math.floor((now - anchor) / (days * 86400000)) * days * 86400000;
  }
  return type === 'once' ? 0 : date.getTime();
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const db = cloud.database();
  const _ = db.command;
  const tasksCol = db.collection('bp_tasks');
  const childrenCol = db.collection('bp_children');
  const completionsCol = db.collection('bp_task_completions');
  const usersCol = db.collection('bp_users');
  const { action } = event;
  const data = event.data || event;

  try {
    switch (action) {
      case 'listTasks': {
        const { category, childId } = data;
        const where = { isActive: true, scope: 'parent', parentId: openid };
        if (category) where.category = category;
        const res = await tasksCol.where(where).orderBy('basePoints', 'desc').get();
        const list = res.data || [];
        let completionList = [];
        if (childId && list.length) {
          const completionRes = await completionsCol.where({ childId }).get();
          completionList = completionRes.data || [];
        }
        const now = Date.now();
        const enriched = list.map(task => {
          const periodStart = getPeriodStart(task, now);
          const doneCount = completionList.filter(item => item.taskId === task._id && (task.periodType === 'once' || (item.createdAt || 0) >= periodStart)).length;
          const targetCount = Math.max(1, Number(task.targetCount) || 1);
          const progress = Math.min(doneCount, targetCount);
          const status = progress >= targetCount ? 'completed' : (progress > 0 ? 'incomplete' : 'pending');
          
          // 获取分类元数据
          const meta = CATEGORY_META[task.category] || CATEGORY_META.OTHER;
          const domainInfo = getCategoryDomain(task.category);
          
          return {
            ...task,
            progress,
            targetCount,
            status,
            categoryName: meta.name,
            categoryIcon: meta.icon,
            categoryColor: meta.color,
            domain: domainInfo.domain,
            domainName: domainInfo.domainName,
            periodLabel: task.periodType === 'custom' ? `每${task.periodDays}天` : 
              ({ once: '单次', daily: '每天', weekly: '每周', monthly: '每月' }[task.periodType] || '单次')
          };
        });
        return { success: true, list: enriched };
      }

      case 'getCategories': {
        // 返回所有分类的元数据
        const categoryList = Object.entries(CATEGORY_META).map(([key, meta]) => ({
          key,
          ...meta
        }));
        return { success: true, categories: categoryList };
      }

      case 'getDomains': {
        // 返回五育领域
        const domains = [
          { key: 'intelligence', name: '智育', icon: '🧠', color: '#E3F2FD', description: '学习、阅读、思维训练' },
          { key: 'physical', name: '体育', icon: '💪', color: '#E8F5E9', description: '运动、健康、安全' },
          { key: 'aesthetic', name: '美育', icon: '🎨', color: '#FCE4EC', description: '艺术创作、表演欣赏' },
          { key: 'moral', name: '德育', icon: '💝', color: '#FCE4EC', description: '品格、公德、责任感' },
          { key: 'lifeSkill', name: '劳育', icon: '🏠', color: '#FFF3E0', description: '自理、家务、理财' }
        ];
        return { success: true, domains };
      }

      case 'createTask': {
        const { name, category, description, icon, periodType, periodDays, targetCount, maxDaily, requiresPhoto } = data;
        if (!name || !category) return { success: false, error: '名称和分类必填' };
        const score = analyzeTaskPoints({ name, category, description });
        
        const taskData = {
          name: name.trim(),
          category,
          basePoints: score.points,
          scoreReason: score.reason,
          description: (description || '').trim(),
          icon: icon || CATEGORY_META[category]?.icon || '📝',
          isActive: true,
          periodType: ['once', 'daily', 'weekly', 'monthly', 'custom'].includes(periodType) ? periodType : 'once',
          periodDays: Math.max(1, Number(periodDays) || 1),
          targetCount: Math.max(1, Number(targetCount) || 1),
          maxDaily: Math.max(0, Number(maxDaily) || 0),
          requiresPhoto: !!requiresPhoto,
          scope: 'parent',
          parentId: openid,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        await tasksCol.add({ data: taskData });
        return { success: true, basePoints: score.points, scoreReason: score.reason };
      }

      case 'updateTask': {
        const { taskId, name, category, description, icon, maxDaily, requiresPhoto, isActive, periodType, periodDays, targetCount } = data;
        if (!taskId) return { success: false, error: 'taskId 必填' };
        const existing = await tasksCol.doc(taskId).get();
        if (!existing.data || existing.data.parentId !== openid) {
          return { success: false, error: '只能修改自己创建的任务' };
        }
        const updateData = { updatedAt: Date.now() };
        if (name !== undefined) updateData.name = name.trim();
        if (category !== undefined) updateData.category = category;
        if (description !== undefined) updateData.description = description;
        if (icon !== undefined) updateData.icon = icon;
        if (maxDaily !== undefined) updateData.maxDaily = maxDaily;
        if (requiresPhoto !== undefined) updateData.requiresPhoto = requiresPhoto;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (periodType !== undefined) updateData.periodType = ['once', 'daily', 'weekly', 'monthly', 'custom'].includes(periodType) ? periodType : 'once';
        if (periodDays !== undefined) updateData.periodDays = Math.max(1, Number(periodDays) || 1);
        if (targetCount !== undefined) updateData.targetCount = Math.max(1, Number(targetCount) || 1);
        if (name !== undefined || category !== undefined || description !== undefined) {
          const score = analyzeTaskPoints({ ...existing.data, ...updateData });
          updateData.basePoints = score.points;
          updateData.scoreReason = score.reason;
        }
        await tasksCol.doc(taskId).update({ data: updateData });
        return { success: true };
      }

      case 'deleteTask': {
        const { taskId } = data;
        const existing = await tasksCol.doc(taskId).get();
        if (!existing.data || existing.data.parentId !== openid) {
          return { success: false, error: '只能删除自己创建的任务' };
        }
        await tasksCol.doc(taskId).update({ data: { isActive: false, updatedAt: Date.now() } });
        return { success: true };
      }

      case 'completeTask': {
        const { childId, taskId, completionLevel, confirmationCode } = data;
        if (!childId || !taskId || !confirmationCode) return { success: false, error: '请填写家长确认码' };
        if (!/^\d{6}$/.test(String(confirmationCode))) return { success: false, error: '请输入6位家长确认码' };
        if (!COMPLETION_LEVELS[completionLevel]) {
          return { success: false, error: '无效的完成度' };
        }

        const child = await childrenCol.doc(childId).get();
        if (!child.data || (child.data._openid !== openid && child.data.parentId !== openid)) return { success: false, error: '孩子不存在' };

        const parentRes = await usersCol.doc(openid).get();
        const parent = parentRes.data;
        if (!parent || !parent.completionPinHash) return { success: false, error: '请先在"我的"中设置任务确认码' };
        if ((parent.completionPinLockedUntil || 0) > Date.now()) return { success: false, error: '确认码已暂时锁定，请10分钟后再试' };
        if (!verifyPin(parent, String(confirmationCode))) {
          const error = await recordPinFailure(usersCol, openid, parent);
          return { success: false, error };
        }
        if ((parent.completionPinFailCount || 0) || (parent.completionPinLockedUntil || 0)) {
          await usersCol.doc(openid).update({ data: { completionPinFailCount: 0, completionPinLockedUntil: 0, updatedAt: Date.now() } });
        }

        const task = await tasksCol.doc(taskId).get();
        if (!task.data || task.data.parentId !== openid) return { success: false, error: '任务不存在' };

        const now = Date.now();
        const periodStart = getPeriodStart(task.data, now);
        const targetCount = Math.max(1, Number(task.data.targetCount) || 1);
        const completedCount = await completionsCol.where({ childId, taskId, createdAt: _.gte(periodStart) }).count();
        if (completedCount.total >= targetCount) return { success: false, error: '本周期任务已完成' };

        const ratio = COMPLETION_LEVELS[completionLevel].ratio;
        const actualPoints = Math.floor(task.data.basePoints * ratio);
        
        // 获取育域信息
        const domainInfo = getCategoryDomain(task.data.category);

        await Promise.all([
          completionsCol.add({
            data: {
              _id: generateId(),
              childId,
              taskId,
              taskName: task.data.name,
              taskIcon: task.data.icon,
              taskCategory: task.data.category,
              basePoints: task.data.basePoints,
              completionLevel,
              actualPoints,
              domain: domainInfo.domain,
              domainName: domainInfo.domainName,
              completedAt: now,
              createdAt: now
            }
          }),
          childrenCol.doc(childId).update({
            data: { totalPoints: _.inc(actualPoints), updatedAt: now }
          })
        ]);

        return { success: true, actualPoints, completionLevel, domain: domainInfo };
      }

      default:
        return { success: false, error: '未知操作' };
    }
  } catch (e) {
    console.error('bp_task error:', e);
    return { success: false, error: e.message || '服务器错误' };
  }
};
