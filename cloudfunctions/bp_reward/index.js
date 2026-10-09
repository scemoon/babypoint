// bp_reward - 奖励管理与兑换
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const db = cloud.database();
  const _ = db.command;
  const rewardsCol = db.collection('bp_rewards');
  const childrenCol = db.collection('bp_children');
  const redemptionsCol = db.collection('bp_reward_redemptions');
  const pointsTxCol = db.collection('bp_points_transactions');
  const { action } = event;
  const data = event.data || event;

  try {
    switch (action) {
      case 'listRewards': {
        const { category } = data;
        const res = await rewardsCol.where(_.and([
          { isActive: true },
          _.or([{ scope: 'global' }, { scope: 'parent', parentId: openid }]),
          category ? { category } : {}
        ])).orderBy('points', 'asc').get();
        return { success: true, list: res.data || [] };
      }
      case 'getReward': {
        const { rewardId } = data;
        const res = await rewardsCol.doc(rewardId).get();
        return { success: true, reward: res.data };
      }
      case 'createReward': {
        const { name, category, points, description, icon, stock, limitPerChild } = data;
        if (!name || !category || points === undefined) return { success: false, error: '奖励名称、分类和积分必填' };
        if (points < 1 || points > 1000) return { success: false, error: '积分必须在 1-1000 之间' };
        const now = Date.now();
        const result = await rewardsCol.add({
          data: { name: name.trim(), category, points: Math.floor(points), description: description || '', icon: icon || '🎁', isPreset: false, isActive: true, stock: stock || 0, limitPerChild: limitPerChild || 0, validFrom: 0, validTo: 0, scope: 'parent', parentId: openid, createdAt: now, updatedAt: now }
        });
        return { success: true, rewardId: result.id };
      }
      case 'updateReward': {
        const { rewardId, name, category, points, description, icon, stock, limitPerChild, isActive } = data;
        if (!rewardId) return { success: false, error: 'rewardId 必填' };
        const existing = await rewardsCol.doc(rewardId).get();
        if (!existing.data || existing.data.parentId !== openid || existing.data.isPreset) return { success: false, error: '只能修改自己创建的奖励' };
        const updateData = { updatedAt: Date.now() };
        if (name !== undefined) updateData.name = name.trim();
        if (category !== undefined) updateData.category = category;
        if (points !== undefined) { if (points < 1 || points > 1000) return { success: false, error: '积分必须在 1-1000 之间' }; updateData.points = Math.floor(points); }
        if (description !== undefined) updateData.description = description;
        if (icon !== undefined) updateData.icon = icon;
        if (stock !== undefined) updateData.stock = stock;
        if (limitPerChild !== undefined) updateData.limitPerChild = limitPerChild;
        if (isActive !== undefined) updateData.isActive = isActive;
        await rewardsCol.doc(rewardId).update({ data: updateData });
        return { success: true };
      }
      case 'deleteReward': {
        const { rewardId } = data;
        if (!rewardId) return { success: false, error: 'rewardId 必填' };
        const existing = await rewardsCol.doc(rewardId).get();
        if (!existing.data || existing.data.parentId !== openid || existing.data.isPreset) return { success: false, error: '只能删除自己创建的奖励' };
        await rewardsCol.doc(rewardId).update({ data: { isActive: false, updatedAt: Date.now() } });
        return { success: true };
      }
      case 'redeemReward': {
        const { rewardId, childId, remark } = data;
        if (!rewardId || !childId) return { success: false, error: '参数不完整' };
        const rewardRes = await rewardsCol.doc(rewardId).get();
        const reward = rewardRes.data;
        if (!reward || !reward.isActive) return { success: false, error: '奖励不存在或已下架' };
        if (reward.stock && reward.stock > 0) {
          if (reward.stock <= 0) return { success: false, error: '库存不足' };
          await rewardsCol.doc(rewardId).update({ data: { stock: _.inc(-1) } });
        }
        const childRes = await childrenCol.doc(childId).get();
        const child = childRes.data;
        if (!child || child.parentId !== openid) return { success: false, error: '孩子不存在' };
        const availablePoints = (child.totalPoints || 0) - (child.redeemedPoints || 0);
        if (availablePoints < reward.points) return { success: false, error: '积分不足，继续努力哦~' };
        if (reward.limitPerChild && reward.limitPerChild > 0) {
          const redeemedCount = await redemptionsCol.where({ rewardId, childId }).count();
          if (redeemedCount.total >= reward.limitPerChild) return { success: false, error: '已达个人兑换上限' };
        }
        const redemptionId = generateId();
        const now = Date.now();
        await redemptionsCol.add({
          data: { _id: redemptionId, rewardId, rewardName: reward.name, rewardIcon: reward.icon, childId, parentId: openid, pointsSpent: reward.points, remark: remark || '', redeemedAt: now, createdAt: now }
        });
        await childrenCol.doc(childId).update({ data: { redeemedPoints: _.inc(reward.points), updatedAt: now } });
        await pointsTxCol.add({
          data: { childId, parentId: openid, type: 'spend', amount: reward.points, source: 'reward', sourceId: redemptionId, sourceName: reward.name, balanceBefore: child.totalPoints || 0, balanceAfter: child.totalPoints || 0, remark: '兑换奖励', createdAt: now }
        });
        return { success: true, redemptionId, pointsSpent: reward.points, newAvailablePoints: availablePoints - reward.points };
      }
      case 'getRedemptions': {
        const { childId, page = 1, pageSize = 20 } = data;
        const skip = (page - 1) * pageSize;
        const res = await redemptionsCol.where({ childId }).orderBy('redeemedAt', 'desc').skip(skip).limit(pageSize).get();
        return { success: true, list: res.data || [] };
      }
      case 'getLatestRedemptions': {
        const { limit = 10 } = data;
        const res = await redemptionsCol.where({ parentId: openid }).orderBy('redeemedAt', 'desc').limit(limit).get();
        return { success: true, list: res.data || [] };
      }
      default:
        return { success: false, error: '未知操作' };
    }
  } catch (e) {
    console.error('bp_reward function error', e);
    return { success: false, error: e.message };
  }
};
