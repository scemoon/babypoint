// bp_calendar - 积分日历
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function formatDate(timestamp) {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function getMonthStart(year, month) { return new Date(year, month - 1, 1).getTime(); }
function getMonthEnd(year, month) { return new Date(year, month, 0, 23, 59, 59, 999).getTime(); }

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
      if (!childRes.data || childRes.data.parentId !== openid) return { success: false, error: '孩子不存在' };
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
        const dayStart = new Date(date + 'T00:00:00').getTime();
        const dayEnd = new Date(date + 'T23:59:59').getTime();
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
