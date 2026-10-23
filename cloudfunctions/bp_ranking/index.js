// bp_ranking - 排行榜
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const db = cloud.database();
  const childrenCol = db.collection('bp_children');
  const { action } = event;
  const data = event.data || event;

  try {
    switch (action) {
      case 'getRanking': {
        const requestedLimit = Number(data.limit) || 10;
        const limit = Math.min(50, Math.max(10, Math.floor(requestedLimit)));
        // 查询所有用户的孩子，按累计积分降序排列
        const res = await childrenCol.orderBy('totalPoints', 'desc').limit(limit + 1).get();
        const rows = res.data || [];
        const list = rows.slice(0, limit).map((child, index) => ({
          rank: index + 1,
          childId: child._id,
          childName: child.name || '匿名用户',
          childAvatar: child.avatar || '',
          totalPoints: child.totalPoints || 0,
          redeemedPoints: child.redeemedPoints || 0,
          availablePoints: (child.totalPoints || 0) - (child.redeemedPoints || 0),
          isCurrent: child._id === data.currentChildId
        }));
        return { success: true, list, hasMore: rows.length > limit };
      }
      default:
        return { success: false, error: '未知操作' };
    }
  } catch (e) {
    console.error('bp_ranking function error', e);
    return { success: false, error: e.message };
  }
};
