// bp_login - 微信登录
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const unionid = wxContext.UNIONID || '';
  const db = cloud.database();
  const usersCol = db.collection('bp_users');

  try {
    const existing = await usersCol.doc(openid).get().catch(() => null);
    if (existing && existing.data) {
      await usersCol.doc(openid).update({ data: { lastActiveAt: Date.now() } });
      return { success: true, isNew: false, openid, unionid, userInfo: existing.data };
    }
    return { success: true, isNew: true, openid, unionid, userInfo: null };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
