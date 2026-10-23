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
        // 构建查询条件
        const conditions = [
          { isActive: true },
          _.or([{ scope: 'global' }, { scope: 'parent', parentId: openid }])
        ];
        if (category && category.trim()) {
          conditions.push({ category: category.trim() });
        }
        const res = await rewardsCol.where(_.and(conditions)).orderBy('points', 'asc').get();
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
          data: { name: name.trim(), category, points: Math.floor(points), description: description || '', icon: icon || '🎁', isPreset: false, isActive: true, stock: stock || 0, limitPerChild: limitPerChild || 5, validFrom: 0, validTo: 0, scope: 'parent', parentId: openid, createdAt: now, updatedAt: now }
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
        if (!child || child._openid !== openid) return { success: false, error: '孩子不存在' };
        const availablePoints = (child.totalPoints || 0) - (child.redeemedPoints || 0);
        if (availablePoints < reward.points) return { success: false, error: '积分不足，继续努力哦~' };
        if (reward.limitPerChild && reward.limitPerChild > 0) {
          const redeemedCount = await redemptionsCol.where({ rewardId, childId }).count();
          if (redeemedCount.total >= reward.limitPerChild) return { success: false, error: '已达个人兑换上限' };
        }
        const redemptionId = generateId();
        const now = Date.now();
        await redemptionsCol.add({
          data: { _id: redemptionId, rewardId, rewardName: reward.name, rewardIcon: reward.icon, childId, parentId: openid, pointsSpent: reward.points, pointsRequired: reward.points, remark: remark || '', redeemedAt: now, createdAt: now }
        });
        await childrenCol.doc(childId).update({ data: { redeemedPoints: _.inc(reward.points), updatedAt: now } });
        await pointsTxCol.add({
          data: { childId, parentId: openid, type: 'spend', amount: reward.points, source: 'reward', sourceId: redemptionId, sourceName: reward.name, balanceBefore: child.totalPoints || 0, balanceAfter: child.totalPoints || 0, remark: '兑换奖励', createdAt: now }
        });
        return { success: true, redemptionId, pointsSpent: reward.points, newAvailablePoints: availablePoints - reward.points, newRedeemedPoints: (child.redeemedPoints || 0) + reward.points };
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
      case 'initPresetRewards': {
        // 初始化预设奖励
        const PRESET_REWARDS = [
          { category: 'FAMILY_TIME', name: '亲子电影时光', points: 35, icon: '🎬', description: '和爸妈一起看场电影，享受爆米花' },
          { category: 'FAMILY_TIME', name: '家庭游戏大战', points: 40, icon: '🎲', description: '和家人来一局桌游或棋类游戏' },
          { category: 'FAMILY_TIME', name: '一起做甜点', points: 45, icon: '🧁', description: '亲子烘焙，一起做蛋糕或饼干' },
          { category: 'FAMILY_TIME', name: '手工创作日', points: 35, icon: '✂️', description: '一起做手工、折纸或剪纸创作' },
          { category: 'FAMILY_TIME', name: '家庭运动会', points: 40, icon: '⚽', description: '和爸妈一起运动，跳绳/打球/骑车' },
          { category: 'FAMILY_TIME', name: '睡前故事会', points: 20, icon: '📖', description: '让爸妈多讲一个睡前故事' },
          { category: 'FAMILY_TIME', name: '家庭派对策划', points: 80, icon: '🎉', description: '自己策划并举办一次小型家庭派对' },
          { category: 'OUTDOOR', name: '公园探险家', points: 25, icon: '🌳', description: '去公园探索，发现有趣的自然奥秘' },
          { category: 'OUTDOOR', name: '郊外野餐', points: 45, icon: '🧺', description: '和家人一起去郊外野餐，亲近大自然' },
          { category: 'OUTDOOR', name: '徒步小英雄', points: 60, icon: '🥾', description: '完成一次小型徒步或登山探险' },
          { category: 'OUTDOOR', name: '农场体验日', points: 70, icon: '🌾', description: '去农场体验采摘、种植或喂养小动物' },
          { category: 'OUTDOOR', name: '海边度假', points: 150, icon: '🏖️', description: '去海边玩沙、踏浪、堆城堡' },
          { category: 'OUTDOOR', name: '露营初体验', points: 120, icon: '⛺', description: '一次难忘的户外露营体验' },
          { category: 'OUTDOOR', name: '水上乐园', points: 100, icon: '🎢', description: '去水上乐园玩水消暑' },
          { category: 'CULTURE', name: '博物馆奇妙日', points: 45, icon: '🏛️', description: '参观博物馆、科技馆或美术馆' },
          { category: 'CULTURE', name: '剧场观赏', points: 70, icon: '🎭', description: '观看儿童剧、木偶剧或音乐会' },
          { category: 'CULTURE', name: '图书馆借阅', points: 15, icon: '📚', description: '去图书馆借阅喜欢的图书' },
          { category: 'CULTURE', name: '手工艺体验', points: 55, icon: '🏺', description: '陶艺、扎染、木工等传统手工艺' },
          { category: 'CULTURE', name: '海洋馆探索', points: 65, icon: '🐬', description: '参观海洋馆，近距离接触海洋生物' },
          { category: 'CULTURE', name: '动物园之旅', points: 60, icon: '🦁', description: '去动物园观察和了解动物' },
          { category: 'RESPONSIBILITY', name: '一日小管家', points: 35, icon: '🦸', description: '负责安排家庭一天的生活起居' },
          { category: 'RESPONSIBILITY', name: '活动策划师', points: 50, icon: '📋', description: '策划一次家庭活动或出游' },
          { category: 'RESPONSIBILITY', name: '厨房小帮手', points: 40, icon: '🍳', description: '在爸妈指导下学做一道菜' },
          { category: 'RESPONSIBILITY', name: '植物守护者', points: 25, icon: '🌱', description: '负责照顾家里的植物或小宠物' },
          { category: 'RESPONSIBILITY', name: '家庭财务官', points: 45, icon: '💰', description: '参与家庭采购，学会合理消费' },
          { category: 'RESPONSIBILITY', name: '小小设计师', points: 50, icon: '🎨', description: '自己设计房间一角或改造旧物' },
          { category: 'STUDY_PRIVILEGE', name: '心愿书单', points: 30, icon: '📖', description: '选择一本最想读的课外书' },
          { category: 'STUDY_PRIVILEGE', name: '实验家套装', points: 50, icon: '🔬', description: '获得一份科学实验材料包' },
          { category: 'STUDY_PRIVILEGE', name: '知识探险', points: 35, icon: '🧭', description: '去科技馆或自然博物馆探索' },
          { category: 'STUDY_PRIVILEGE', name: '在线学习', points: 80, icon: '💻', description: '学习一门感兴趣的在线课程' },
          { category: 'STUDY_PRIVILEGE', name: '学习工具升级', points: 40, icon: '✏️', description: '获得一套心仪已久的学习工具' },
          { category: 'HOBBY', name: '兴趣体验课', points: 70, icon: '🎯', description: '体验一节乐器/舞蹈/绘画等课程' },
          { category: 'HOBBY', name: '才艺展示', points: 50, icon: '🏅', description: '参加兴趣比赛或表演活动' },
          { category: 'HOBBY', name: '艺术创想', points: 45, icon: '🎨', description: '获得一套绘画或手工创作材料' },
          { category: 'HOBBY', name: '音乐之旅', points: 60, icon: '🎵', description: '获得一次音乐启蒙或乐器体验' },
          { category: 'HOBBY', name: '运动新技能', points: 55, icon: '⛳', description: '学习一项新运动：游泳/滑冰/乒乓球等' },
          { category: 'TECH', name: '科学实验盒', points: 45, icon: '🔭', description: '一个有趣的STEAM科学实验盒子' },
          { category: 'TECH', name: '编程初体验', points: 100, icon: '🤖', description: '一节编程启蒙课或机器人体验' },
          { category: 'TECH', name: '创客工作坊', points: 60, icon: '🚀', description: '参加创客活动或科技制作' },
          { category: 'TECH', name: '数码装备', points: 80, icon: '📱', description: '获得一个儿童手表或学习平板' },
          { category: 'AUTONOMY', name: '我的周末我做主', points: 35, icon: '📅', description: '自主安排一整天的活动' },
          { category: 'AUTONOMY', name: '美食决定权', points: 25, icon: '🍽️', description: '决定一天的三餐吃什么' },
          { category: 'AUTONOMY', name: '晚睡福利', points: 20, icon: '🌙', description: '今晚可以晚睡30分钟' },
          { category: 'AUTONOMY', name: '家务豁免', points: 20, icon: '🧹', description: '免除一次日常家务' },
          { category: 'AUTONOMY', name: '着装自由', points: 15, icon: '👕', description: '自己选择一天想穿的衣服' },
          { category: 'AUTONOMY', name: '电子产品时间', points: 30, icon: '📺', description: '获得额外的电子产品使用时间' },
          { category: 'SOCIAL', name: '派对邀请函', points: 35, icon: '🤝', description: '邀请好朋友来家里玩' },
          { category: 'SOCIAL', name: '生日会出席', points: 40, icon: '🎁', description: '参加好朋友的生日会' },
          { category: 'SOCIAL', name: '亲子约会', points: 50, icon: '💕', description: '和爸妈单独出去约会半天' },
          { category: 'SOCIAL', name: '小使者', points: 30, icon: '📞', description: '给好久不见的朋友打电话' },
          { category: 'BADGE', name: '荣誉墙展示', points: 25, icon: '🏆', description: '照片或成就上家庭荣誉墙' },
          { category: 'BADGE', name: '成就徽章', points: 20, icon: '👑', description: '获得一枚特别成就徽章' },
          { category: 'BADGE', name: '成长日记', points: 25, icon: '📔', description: '爸妈为你的进步写一篇表扬信' },
          { category: 'BADGE', name: '荣誉时刻', points: 30, icon: '⭐', description: '在家庭会议上被公开表扬' },
          { category: 'STATIONERY', name: '精美笔记本', points: 20, icon: '📓', description: '一本设计好看的笔记本' },
          { category: 'STATIONERY', name: '创意文具盒', points: 30, icon: '✏️', description: '一套有趣的文具或画材' },
          { category: 'STATIONERY', name: '书架新成员', points: 50, icon: '📚', description: '在书架上添一本新书' },
          { category: 'STATIONERY', name: '神秘大礼包', points: 200, icon: '🎊', description: '一个期待已久的神秘礼物' },
          { category: 'SPORTS', name: '运动小装备', points: 35, icon: '⚽', description: '一个新的足球、篮球或跳绳' },
          { category: 'SPORTS', name: '骑行装备', points: 80, icon: '🚲', description: '获得头盔、手套等骑行装备' },
          { category: 'SPORTS', name: '运动手表', points: 100, icon: '⌚', description: '一个儿童运动手环或手表' },
          { category: 'SPORTS', name: '梦想清单', points: 300, icon: '✨', description: '实现一个一直想实现的心愿' },
          { category: 'SAVINGS', name: '梦想储蓄罐', points: 25, icon: '🐷', description: '存入储蓄罐，为梦想积攒' },
          { category: 'SAVINGS', name: '理财小账本', points: 15, icon: '💰', description: '一本记录收支的理财笔记本' },
          { category: 'SAVINGS', name: '小小投资家', points: 80, icon: '📈', description: '和爸妈一起了解理财知识' }
        ];

        const now = Date.now();
        let inserted = 0;
        let skipped = 0;
        let errors = [];

        for (const r of PRESET_REWARDS) {
          try {
            // 检查是否已存在（按名称和分类查重）
            const existing = await rewardsCol.where({
              name: r.name,
              category: r.category,
              isPreset: true,
              scope: 'global'
            }).get();

            if (existing.data && existing.data.length > 0) {
              skipped++;
            } else {
              await rewardsCol.add({
                data: {
                  ...r,
                  isPreset: true,
                  isActive: true,
                  stock: 0,
                  limitPerChild: 5,
                  validFrom: 0,
                  validTo: 0,
                  scope: 'global',
                  parentId: '',
                  createdAt: now,
                  updatedAt: now
                }
              });
              inserted++;
            }
          } catch (e) {
            errors.push({ reward: r.name, error: e.message });
          }
        }

        return { success: true, inserted, skipped, errors };
      }
      default:
        return { success: false, error: '未知操作' };
    }
  } catch (e) {
    console.error('bp_reward function error', e);
    return { success: false, error: e.message };
  }
};
