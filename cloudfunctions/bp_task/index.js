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

// 归一化并校验用户提交的时间范围：缺省按频次默认时长补齐（单次明天、每天 1 个月、
// 每周 3 个月、每月 1 年、自定义按间隔），并保证 结束日期 >= 开始日期
// 修复：晚上6点后创建默认第二天开始，周期性任务的开始日期不早于今天
function resolveRange({ periodType, periodDays, startDate, endDate }, now) {
  const type = periodType || 'once';
  const days = Math.max(1, Number(periodDays) || 1);
  const defDays = type === 'custom' ? days : (DEFAULT_RANGE_DAYS[type] || 1);
  const parsedStart = normalizeDay(startDate);
  const today = dayStart(now);
  const currentHour = new Date(now).getHours();
  // 晚上6点后创建，默认第二天开始
  const effectiveToday = currentHour >= 18 ? addDays(today, 1) : today;
  
  let start;
  if (type === 'once') {
    start = parsedStart || (dayStart(now) + DAY_MS);
  } else {
    start = parsedStart ? Math.max(parsedStart, effectiveToday) : effectiveToday;
  }
  let end = normalizeDay(endDate);
  if (end === null) end = start + (defDays - 1) * DAY_MS;
  if (end < start) end = start;
  return { startDate: start, endDate: end };
}

// ==================== 时间范围 & 周期实例 ====================
const DAY_MS = 86400000;

// 各频次的默认时长（天）：单次明天、每天 1 个月、每周 3 个月、每月 1 年
const DEFAULT_RANGE_DAYS = { once: 1, daily: 30, weekly: 90, monthly: 365 };

// 频率（每天/每周…）→ 间隔天数，自定义周期用 periodDays
const STEP_DAYS = { daily: 1, weekly: 7, monthly: 30 };

const PERIOD_LABELS = { once: '单次', daily: '每天', weekly: '每周', monthly: '每月' };

function dayStart(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// 时间戳按天偏移（保持 00:00 对齐），用于「今天 + N 天」
// 修复：resolveRange 里用到了 addDays 但本文件没有定义，导致创建任务直接抛
// "addDays is not defined"
function addDays(ts, days) {
  const d = new Date(ts);
  d.setDate(d.getDate() + Number(days || 0));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// 时间戳 → 'YYYY-MM-DD'
function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 把传入的日期（毫秒时间戳 / 'YYYY-MM-DD' / Date）归一化到当天 00:00
// 修复：手动解析 YYYY-MM-DD 格式，避免 Date.parse 的时区问题
function normalizeDay(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? dayStart(value) : null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : dayStart(value.getTime());
  // 手动解析 YYYY-MM-DD 格式，构造本地时区的日期
  const str = String(value).trim();
  const parts = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (parts) {
    const year = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    const day = parseInt(parts[3], 10);
    const d = new Date(year, month, day, 0, 0, 0, 0);
    return d.getTime();
  }
  const parsed = Date.parse(str);
  return Number.isNaN(parsed) ? null : dayStart(parsed);
}

// 任务的时间范围；老任务没有 startDate/endDate 时按"创建时间 + 该频次默认时长"兜底，
// 保证升级前创建的任务仍然可用
function getTaskRange(task) {
  const type = task.periodType || 'once';
  const created = Number(task.createdAt) || Date.now();
  const fallbackDays = type === 'custom'
    ? Math.max(1, Number(task.periodDays) || 1)
    : (DEFAULT_RANGE_DAYS[type] || 1);
  const startDate = normalizeDay(task.startDate) || dayStart(created);
  let endDate = normalizeDay(task.endDate);
  if (endDate === null) endDate = startDate + (fallbackDays - 1) * DAY_MS;
  if (endDate < startDate) endDate = startDate;
  return { startDate, endDate, type };
}

// 周期长度（毫秒）：单次 = 整个时间段
function getPeriodLength(task, range) {
  if (range.type === 'once') return range.endDate + DAY_MS - range.startDate;
  if (range.type === 'custom') return Math.max(1, Number(task.periodDays) || 1) * DAY_MS;
  if (range.type === 'monthly') return 0; // 月次用日历月计算，不用固定天数
  return (STEP_DAYS[range.type] || 1) * DAY_MS;
}

// 获取下一个月初的时间戳
function getNextMonthStart(ts) {
  const d = new Date(ts);
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// 获取某月的结束日期 23:59:59
function getMonthEndTs(ts) {
  const d = new Date(ts);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// 生成时间段内全部周期实例
// 关键：周期是「天」粒度的闭区间。start 为该周期首日 00:00，end 为末日 00:00（含），
// gate 为排他边界（= end + 1 天，仅供时间比较用），这样周期不会多长出一天。
function generatePeriods(task, range) {
  const rangeEndDay = range.endDate;              // 结束日期当天 00:00，含在范围内
  const rangeEndGate = range.endDate + DAY_MS;    // 排他边界

  if (range.type === 'once') {
    // once 任务：当天 00:00 开始，当天 23:59:59 结束（gate = end + 1天）
    return [{ index: 1, start: range.startDate, end: range.startDate + DAY_MS - 1, gate: rangeEndGate }];
  }

  // 月次任务：按日历月计算
  if (range.type === 'monthly') {
    const periods = [];
    let currentStart = range.startDate;
    let index = 1;
    while (currentStart <= rangeEndDay) {
      const currentEnd = getMonthEndTs(currentStart);
      periods.push({
        index,
        start: currentStart,
        end: Math.min(currentEnd, rangeEndDay),
        gate: Math.min(currentEnd + DAY_MS, rangeEndGate)
      });
      currentStart = getNextMonthStart(currentStart);
      index++;
    }
    return periods;
  }

  const stepMs = getPeriodLength(task, range);
  const total = Math.max(1, Math.ceil((rangeEndGate - range.startDate) / stepMs));
  const periods = [];
  for (let i = 0; i < total; i++) {
    const start = range.startDate + i * stepMs;
    // 最后一个周期的末日不能越过任务的结束日期
    const end = Math.min(start + stepMs - DAY_MS, rangeEndDay);
    periods.push({ index: i + 1, start, end, gate: Math.min(start + stepMs, rangeEndGate) });
  }
  return periods;
}

// 周期实例的四种进度：待开始 / 进行中 / 已完成 / 已逾期
function computeInstanceStatus(period, completedDates, now) {
  if (completedDates.has(period.start)) return 'completed';
  if (now < period.start) return 'pending';
  if (now >= period.gate) return 'overdue';   // 末日当天 23:59 前都还来得及
  return 'active';
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
        const { category, childId, status } = data;
        if (!childId) return { success: false, error: '缺少 childId 参数' };
        // 验证孩子归属
        const childRes = await childrenCol.doc(childId).get();
        if (!childRes.data) return { success: false, error: '孩子不存在' };
        if (childRes.data._openid !== openid) return { success: false, error: '无权查看此孩子的任务' };
        
        const where = { isActive: true, scope: 'child', childId: childId };
        if (category) where.category = category;
        const res = await tasksCol.where(where).orderBy('basePoints', 'desc').get();
        const tasks = res.data || [];
        const now = Date.now();

        // 一次性取该孩子的完成记录，按"周期起点"归组，供实例状态匹配
        const completedDates = new Set();
        const completionsByTask = {};
        if (childId && tasks.length) {
          const taskIdSet = new Set(tasks.map(t => t._id));
          const completionRes = await completionsCol.where({ childId }).limit(1000).get();
          (completionRes.data || []).forEach(item => {
            if (!taskIdSet.has(item.taskId)) return;
            const key = Number(item.instanceStart != null ? item.instanceStart : item.createdAt) || 0;
            completedDates.add(`${item.taskId}@${key}`);
            (completionsByTask[item.taskId] = completionsByTask[item.taskId] || new Set()).add(key);
          });
        }

        // 范围内每个周期都展开成一条实例：时间段内有哪些周期，任务列表就有哪些行
        const instances = [];
        tasks.forEach(task => {
          const range = getTaskRange(task);
          const periods = generatePeriods(task, range);
          const visiblePeriods = (range.type === 'daily')
            ? periods.filter(p => p.gate > now - 30 * DAY_MS)
            : periods;
          const doneSet = completionsByTask[task._id] || new Set();
          const meta = CATEGORY_META[task.category] || CATEGORY_META.OTHER;
          const domainInfo = getCategoryDomain(task.category);

          visiblePeriods.slice(0, 400).forEach(p => {
            instances.push({
              _id: `${task._id}__${p.start}`,
              taskId: task._id,
              instanceStart: p.start,
              instanceEnd: p.end,
              periodIndex: p.index,
              periodTotal: periods.length,
              taskName: task.name,
              name: task.name,
              description: task.description,
              icon: task.icon,
              category: task.category,
              categoryName: meta.name,
              categoryIcon: meta.icon,
              categoryColor: meta.color,
              domain: domainInfo.domain,
              domainName: domainInfo.domainName,
              basePoints: task.basePoints,
              targetCount: Math.max(1, Number(task.targetCount) || 1),
              periodType: task.periodType,
              periodDays: task.periodDays,
              periodLabel: task.periodType === 'custom'
                ? `每${task.periodDays}天`
                : (PERIOD_LABELS[task.periodType] || '单次'),
              rangeStart: range.startDate,
              rangeEnd: range.endDate,
              rangeLabel: `${fmtDate(range.startDate)} ~ ${fmtDate(range.endDate)}`,
              status: computeInstanceStatus(p, doneSet, now)
            });
          });
        });

        // 待开始按最近优先，其余按时间倒序，让"今天的任务"排在最前
        instances.sort((a, b) => {
          if (status === 'pending') {
            if (a.instanceStart !== b.instanceStart) return a.instanceStart - b.instanceStart;
          } else if (a.instanceStart !== b.instanceStart) {
            return b.instanceStart - a.instanceStart;
          }
          return (b.basePoints || 0) - (a.basePoints || 0);
        });

        return { success: true, list: instances };
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
        const { name, category, description, icon, periodType, periodDays, targetCount, maxDaily, requiresPhoto, startDate, endDate, childId } = data;
        if (!name || !category) return { success: false, error: '名称和分类必填' };
        if (!childId) return { success: false, error: '请先选择孩子' };
        
        // 验证孩子归属：该孩子的 _openid 必须是当前用户
        const childRes = await childrenCol.doc(childId).get();
        if (!childRes.data) return { success: false, error: '孩子不存在' };
        if (childRes.data._openid !== openid) return { success: false, error: '无权为此孩子创建任务' };
        
        const score = analyzeTaskPoints({ name, category, description });

        const type = ['once', 'daily', 'weekly', 'monthly', 'custom'].includes(periodType) ? periodType : 'once';
        const days = Math.max(1, Number(periodDays) || 1);
        // 时间范围：前端给默认值，这里做兜底与校正，保证 endDate 不早于 startDate
        const range = resolveRange({ periodType: type, periodDays: days, startDate, endDate }, Date.now());

        const taskData = {
          name: name.trim(),
          category,
          basePoints: score.points,
          scoreReason: score.reason,
          description: (description || '').trim(),
          icon: icon || CATEGORY_META[category]?.icon || '📝',
          isActive: true,
          periodType: type,
          periodDays: days,
          startDate: range.startDate,
          endDate: range.endDate,
          targetCount: Math.max(1, Number(targetCount) || 1),
          maxDaily: Math.max(0, Number(maxDaily) || 0),
          requiresPhoto: !!requiresPhoto,
          scope: 'child',           // 改为绑定到孩子
          childId: childId,        // 绑定到指定孩子
          parentId: openid,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await tasksCol.add({ data: taskData });
        const total = generatePeriods(taskData, getTaskRange(taskData)).length;
        return { success: true, basePoints: score.points, scoreReason: score.reason, totalPeriods: total };
      }

      case 'updateTask': {
        const { taskId, name, category, description, icon, maxDaily, requiresPhoto, isActive, periodType, periodDays, targetCount, startDate, endDate } = data;
        if (!taskId) return { success: false, error: 'taskId 必填' };
        const existing = await tasksCol.doc(taskId).get();
        if (!existing.data) return { success: false, error: '任务不存在' };
        if (existing.data.parentId !== openid) {
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
        // 改周期或改时间范围时，用「新值覆盖旧值」的结果重新校正起止日期
        if (periodType !== undefined || periodDays !== undefined || startDate !== undefined || endDate !== undefined) {
          const range = resolveRange({
            periodType: updateData.periodType || existing.data.periodType,
            periodDays: updateData.periodDays || existing.data.periodDays,
            startDate: startDate !== undefined ? startDate : existing.data.startDate,
            endDate: endDate !== undefined ? endDate : (startDate !== undefined ? null : existing.data.endDate)
          }, Date.now());
          updateData.startDate = range.startDate;
          updateData.endDate = range.endDate;
        }
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
        if (!existing.data) return { success: false, error: '任务不存在' };
        if (existing.data.parentId !== openid) {
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
        const range = getTaskRange(task.data);
        const periods = generatePeriods(task.data, range);

        // 定位要完成的那个周期：优先列表点进来的那个实例；否则取当前周期，
        // 当前无周期时（还没开始）允许完成最近一个待开始周期
        let instanceStart = normalizeDay(data.instanceStart);
        let period = instanceStart === null ? null : periods.find(p => p.start === instanceStart);
        if (!period) {
          const current = periods.find(p => now >= p.start && now < p.gate);
          period = current || periods.find(p => p.start > now) || null;
        }
        if (!period) return { success: false, error: '该任务的时间段已结束' };
        if (now >= period.gate) return { success: false, error: '该周期已逾期，无法完成' };

        // 同一周期内已有完成记录时不重复计分（targetCount 允许一个周期多次）
        const doneRes = await completionsCol.where({ childId, taskId }).limit(1000).get();
        const doneInPeriod = (doneRes.data || []).filter(item => {
          const key = Number(item.instanceStart != null ? item.instanceStart : item.createdAt) || 0;
          return key >= period.start && key < period.gate;
        }).length;
        const targetCount = Math.max(1, Number(task.data.targetCount) || 1);
        if (doneInPeriod >= targetCount) return { success: false, error: '本周期任务已完成' };

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
              // 归属周期起点：任务页按周期匹配完成情况靠这个字段
              instanceStart: period.start,
              periodIndex: period.index,
              completedAt: now,
              createdAt: now
            }
          }),
          childrenCol.doc(childId).update({
            data: { totalPoints: _.inc(actualPoints), updatedAt: now }
          })
        ]);

        // 更新积分后查回最新 totalPoints，以便前端刷新全局数据
        const updatedChild = await childrenCol.doc(childId).get();

        return { success: true, actualPoints, completionLevel, domain: domainInfo, instanceStart: period.start, totalPoints: updatedChild.data.totalPoints };
      }

      default:
        return { success: false, error: '未知操作' };
    }
  } catch (e) {
    console.error('bp_task error:', e);
    return { success: false, error: e.message || '服务器错误' };
  }
};
