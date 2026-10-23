// utils/date-range.js - 任务时间范围与周期工具
// 与 cloudfunctions/bp_task/index.js 的周期算法保持一致：
// 单次 = 明天一天；每天默认 1 个月、每周默认 3 个月、每月默认 1 年；自定义按间隔天数
const DAY_MS = 86400000;

// 各频次的默认时长（天）
const DEFAULT_RANGE_DAYS = { once: 1, daily: 30, weekly: 90, monthly: 365 };

// 频次 → 周期间隔天数（自定义周期用 periodDays）
const STEP_DAYS = { daily: 1, weekly: 7, monthly: 30 };

// 默认周期次数
const DEFAULT_PERIOD_COUNTS = { once: 1, daily: 60, weekly: 30, monthly: 12 };

const PERIOD_LABELS = { once: '单次', daily: '每天', weekly: '每周', monthly: '每月' };

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function dayStart(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addDays(ts, days) {
  return ts + days * DAY_MS;
}

// 时间戳 → 'YYYY-MM-DD'（picker 需要的格式）
function toDateStr(ts) {
  const d = new Date(ts);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
}

// 'YYYY-MM-DD' → 当天 00:00 时间戳；iOS 不支持 '-' 分隔，替换为 '/'
function parseDateStr(str) {
  if (!str) return null;
  const t = new Date(String(str).replace(/-/g, '/')).getTime();
  if (Number.isNaN(t)) return null;
  return dayStart(t);
}

// 周期长度（毫秒）
function getStepMs(periodType, periodDays) {
  if (periodType === 'custom') return Math.max(1, Number(periodDays) || 1) * DAY_MS;
  return (STEP_DAYS[periodType] || 1) * DAY_MS;
}

// 某频次下的默认起止日期（单次 = 明天一天，其余从今天开始）
function getDefaultRange(periodType, periodDays, now = Date.now()) {
  const today = dayStart(now);
  const currentHour = new Date(now).getHours();
  // 晚上6点后创建，默认第二天开始，给当天留出充足时间
  const startDay = currentHour >= 18 ? addDays(today, 1) : today;
  
  if (periodType === 'once') {
    const tomorrow = addDays(today, 1);
    return { startDate: tomorrow, endDate: tomorrow };
  }
  const days = periodType === 'custom'
    ? Math.max(1, Number(periodDays) || 1)
    : (DEFAULT_RANGE_DAYS[periodType] || 1);
  return { startDate: startDay, endDate: addDays(startDay, days - 1) };
}

// 时间段内共有多少个周期（与云端 generatePeriods 同一套算法）
// 余数不足一个周期时也算一个（末周期天数会缩短），因此这里用 ceil
function countPeriods({ periodType, periodDays, startDate, endDate }) {
  const start = Number(startDate);
  const end = Number(endDate);
  if (!start || !end || end < start) return 0;
  if (periodType === 'once') return 1;
  const stepMs = getStepMs(periodType, periodDays);
  return Math.max(1, Math.ceil((end + DAY_MS - start) / stepMs));
}

// ========== 新周期任务计算函数 ==========

// 获取某个日期对应的周一 00:00
function getMondayOf(ts) {
  const d = new Date(ts);
  const day = d.getDay(); // 0=周日
  const diff = day === 0 ? -6 : 1 - day; // 到周一的差值
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// 获取某个日期对应的周日 23:59:59
function getSundayEndOf(ts) {
  const monday = getMondayOf(ts);
  return monday + 7 * DAY_MS - 1;
}

// 获取某个日期对应的月初 00:00
function getMonthStart(ts) {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// 获取某个日期对应的月末 23:59:59
function getMonthEnd(ts) {
  const d = new Date(ts);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// 根据周期类型获取默认开始日期
// 每天: 明天
// 每周: 周三前=本周一，周四后=下周一
// 每月: 每月后10天=下月1号，否则当月1号
// 单次: 明天
function getDefaultStart(periodType, now = Date.now()) {
  const today = dayStart(now);
  const tomorrow = addDays(today, 1);
  const dayOfWeek = new Date(now).getDay();
  const currentMonday = getMondayOf(now);

  switch (periodType) {
    case 'daily':
      return tomorrow;
    case 'weekly':
      // 周三(3)之前(含)从本周一，周四(4)之后从下周一开始
      return dayOfWeek <= 3 ? currentMonday : addDays(currentMonday, 7);
    case 'monthly': {
      const d = new Date(now);
      const dayOfMonth = d.getDate();
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      // 每月后10天从下月开始
      return lastDay - dayOfMonth < 10
        ? new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
        : new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    }
    case 'once':
    default:
      return tomorrow;
  }
}

// 根据周期类型和开始日期计算结束日期
function calcEnd(periodType, startDate, count) {
  switch (periodType) {
    case 'daily':
      return startDate + (count - 1) * DAY_MS;
    case 'weekly': {
      // 开始日期对齐到周一
      const monday = getMondayOf(startDate);
      const lastWeekStart = monday + (count - 1) * 7 * DAY_MS;
      return lastWeekStart + 7 * DAY_MS - 1;
    }
    case 'monthly': {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + count);
      d.setDate(0); // 上月最后一天
      d.setHours(23, 59, 59, 999);
      return d.getTime();
    }
    case 'once':
    default:
      return startDate;
  }
}

// 根据周期类型、开始日期、结束日期计算次数
function calcCount(periodType, startDate, endDate) {
  if (!startDate || !endDate || endDate < startDate) return 0;

  switch (periodType) {
    case 'daily':
      return Math.floor((endDate - startDate) / DAY_MS) + 1;
    case 'weekly': {
      const startMonday = getMondayOf(startDate);
      const endSunday = getSundayEndOf(endDate);
      return Math.floor((endSunday - startMonday) / (7 * DAY_MS)) + 1;
    }
    case 'monthly': {
      const s = new Date(startDate);
      const e = new Date(endDate);
      return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
    }
    case 'once':
    default:
      return 1;
  }
}

// 根据周期类型获取周期次数范围
function getPeriodCountRange(periodType) {
  switch (periodType) {
    case 'daily':
      return { min: 1, max: 365 };
    case 'weekly':
      return { min: 1, max: 52 };
    case 'monthly':
      return { min: 1, max: 24 };
    case 'once':
    default:
      return { min: 1, max: 1 };
  }
}

// ========== 原有函数 ==========

// 相对今天的说法：昨天/今天/明天，其余用「X月X日」
// 必须显式传入 now，否则跨天时标签会跟着"调用时刻"漂移
function formatDayLabel(ts, now = Date.now()) {
  const day = dayStart(ts);
  const today = dayStart(now);
  const diffDays = Math.round((day - today) / DAY_MS);
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '明天';
  if (diffDays === -1) return '昨天';
  const d = new Date(day);
  const base = `${d.getMonth() + 1}月${d.getDate()}日`;
  if (d.getFullYear() !== new Date(today).getFullYear()) return `${d.getFullYear()}年${base}`;
  return base;
}

// 周期标签：单次看整天，每天看日期，每周看「周几」，每月看「X月」
function formatInstanceLabel(instance, now = Date.now()) {
  const start = Number(instance.instanceStart || instance.start || 0);
  const d = new Date(start);
  const type = instance.periodType || 'once';
  if (type === 'weekly') return `${d.getMonth() + 1}月${d.getDate()}日当周`;
  if (type === 'monthly') return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  if (type === 'once') return formatDayLabel(start, now);
  const prefix = formatDayLabel(start, now);
  const weekday = WEEKDAY_NAMES[d.getDay()];
  return `${prefix} ${weekday}`;
}

// 时间段摘要：'2026-10-13 ~ 2026-11-11 · 共 30 次'
function formatRangeSummary(startDate, endDate, total) {
  if (!startDate || !endDate) return '';
  const parts = [`${toDateStr(startDate)} ~ ${toDateStr(endDate)}`];
  if (total) parts.push(`共 ${total} 次`);
  return parts.join(' · ');
}

module.exports = {
  DAY_MS,
  DEFAULT_RANGE_DAYS,
  DEFAULT_PERIOD_COUNTS,
  PERIOD_LABELS,
  dayStart,
  addDays,
  toDateStr,
  parseDateStr,
  getStepMs,
  getDefaultRange,
  countPeriods,
  getMondayOf,
  getSundayEndOf,
  getMonthStart,
  getMonthEnd,
  getDefaultStart,
  calcEnd,
  calcCount,
  getPeriodCountRange,
  formatDayLabel,
  formatInstanceLabel,
  formatRangeSummary
};
