// bp_calendar - 积分日历
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 北京时间 (UTC+8) 的毫秒偏移量
const CST_OFFSET = 8 * 60 * 60 * 1000;

// 将时间戳转换为北京时间日期字符串 YYYY-MM-DD
function formatDate(timestamp) {
  const d = new Date(timestamp + CST_OFFSET);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 获取北京时间月初时间戳（毫秒）
function getMonthStart(year, month) {
  // 用 Date.UTC 构造 UTC 0点，再转到北京时间
  const utcMonthStart = Date.UTC(year, month - 1, 1);
  // 北京时间月初 = UTC 月初 + 8小时，但 setHours(0,0,0,0) 是按本地(UTC)时间
  // 所以直接用: UTC 2026-10-01 00:00 UTC = 北京时间 2026-10-01 08:00
  // 我们要的是北京时间 2026-10-01 00:00 = UTC 2026-09-30 16:00
  const cstMonthStart = Date.UTC(year, month - 1, 1) - CST_OFFSET;
  return cstMonthStart;
}

// 获取北京时间月末最后一毫秒的时间戳
function getMonthEnd(year, month) {
  // 北京时间月末 = 北京时间月初的下个月第0天
  const cstNextMonthStart = Date.UTC(year, month, 1) - CST_OFFSET;
  return cstNextMonthStart - 1;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const db = cloud.database();
  const _ = db.command;
  const childrenCol = db.collection('bp_children');
  const completionsCol = db.collection('bp_task_completions');
  const redemptionsCol = db.collection('bp_reward_redemptions');
  const { action } = event;
  const data = event.data || event;

  try {
    if (data.childId) {
      const childRes = await childrenCol.doc(data.childId).get();
      if (!childRes.data) return { success: false, error: '孩子不存在' };
      const child = childRes.data;
      const ownerId = child.parentId || child._openid;
      if (ownerId !== openid) return { success: false, error: '孩子不存在' };
    }

    switch (action) {
      case 'getMonthlySummary': {
        const { childId, year, month } = data;
        if (!childId || !year || !month) return { success: false, error: '参数不完整' };
        const monthStart = getMonthStart(year, month);
        const monthEnd = getMonthEnd(year, month);
        const completions = await completionsCol.where({ childId, completedAt: _.and(_.gte(monthStart), _.lte(monthEnd)) }).get();
        const redemptions = await redemptionsCol.where({ childId, redeemedAt: _.and(_.gte(monthStart), _.lte(monthEnd)) }).get();

        const dailyMap = {};
        for (const c of completions.data || []) {
          const date = formatDate(c.completedAt);
          if (!dailyMap[date]) dailyMap[date] = { date, totalEarned: 0, totalSpent: 0, taskCount: 0, redeemCount: 0 };
          dailyMap[date].totalEarned += c.actualPoints || 0;
          dailyMap[date].taskCount += 1;
        }
        for (const r of redemptions.data || []) {
          const date = formatDate(r.redeemedAt);
          if (!dailyMap[date]) dailyMap[date] = { date, totalEarned: 0, totalSpent: 0, taskCount: 0, redeemCount: 0 };
          dailyMap[date].totalSpent += r.pointsSpent || 0;
          dailyMap[date].redeemCount += 1;
        }

        const days = Object.values(dailyMap).map(d => ({ ...d, hasActivity: d.taskCount > 0 || d.redeemCount > 0 }));
        const monthStats = { totalEarned: 0, totalSpent: 0, taskCount: 0, redeemCount: 0, completionDistribution: { simple: 0, normal: 0, perfect: 0 } };
        for (const c of completions.data || []) {
          monthStats.totalEarned += c.actualPoints || 0;
          monthStats.taskCount += 1;
          if (c.completionLevel && monthStats.completionDistribution[c.completionLevel] !== undefined) monthStats.completionDistribution[c.completionLevel]++;
        }
        for (const r of redemptions.data || []) { monthStats.totalSpent += r.pointsSpent || 0; monthStats.redeemCount += 1; }
        return { success: true, days, stats: monthStats };
      }
      case 'getDayDetails': {
        const { childId, date } = data;
        if (!childId || !date) return { success: false, error: '参数不完整' };
        // date 格式为 YYYY-MM-DD (北京时间)
        // 北京时间 date 00:00 = UTC date-1 16:00
        const [y, m, d] = date.split('-').map(Number);
        const dayStart = Date.UTC(y, m - 1, d) - CST_OFFSET;
        const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
        const completions = await completionsCol.where({ childId, completedAt: _.and(_.gte(dayStart), _.lte(dayEnd)) }).orderBy('completedAt', 'asc').get();
        const redemptions = await redemptionsCol.where({ childId, redeemedAt: _.and(_.gte(dayStart), _.lte(dayEnd)) }).orderBy('redeemedAt', 'asc').get();
        return { success: true, tasks: completions.data || [], rewards: redemptions.data || [] };
      }
      default:
        return { success: false, error: '未知操作' };
    }
  } catch (e) {
    console.error('bp_calendar function error', e);
    return { success: false, error: e.message };
  }
};
