// bp_initData - 初始化预置奖励数据
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const PRESET_REWARDS = [
  { category: 'FOOD', name: '棒棒糖', points: 10, icon: '🍭', description: '一个小棒棒糖' },
  { category: 'FOOD', name: '冰淇淋', points: 15, icon: '🍦', description: '一个冰淇淋' },
  { category: 'FOOD', name: '奶茶', points: 20, icon: '🧋', description: '一杯奶茶' },
  { category: 'FOOD', name: '炸鸡', points: 30, icon: '🍗', description: '一份炸鸡' },
  { category: 'FOOD', name: '蛋糕', points: 40, icon: '🎂', description: '一个蛋糕' },
  { category: 'FOOD', name: '零食大礼包', points: 50, icon: '🍿', description: '一袋零食大礼包' },
  { category: 'FOOD', name: '麦当劳/肯德基', points: 80, icon: '🍔', description: '快餐一顿' },
  { category: 'FOOD', name: '去餐厅吃饭', points: 100, icon: '🍽️', description: '允许选择喜欢的餐厅' },
  { category: 'PLAY', name: '看动画片1集', points: 10, icon: '📺', description: '额外观看动画片' },
  { category: 'PLAY', name: '玩桌游', points: 15, icon: '🎲', description: '和家人一起玩桌游' },
  { category: 'PLAY', name: '玩游戏30分钟', points: 20, icon: '🎮', description: '额外游戏时间30分钟' },
  { category: 'PLAY', name: '多玩1小时', points: 25, icon: '⏰', description: '今天多玩1小时' },
  { category: 'PLAY', name: '看动画片2小时', points: 30, icon: '🎬', description: '电影或连续剧时间' },
  { category: 'PLAY', name: '玩游戏1小时', points: 35, icon: '🎯', description: '额外游戏时间1小时' },
  { category: 'PLAY', name: '游乐场', points: 150, icon: '🎡', description: '去一次游乐场' },
  { category: 'TOY', name: '小贴纸', points: 10, icon: '⭐', description: '一张喜欢的贴纸' },
  { category: 'TOY', name: '拼图', points: 40, icon: '🧩', description: '一个拼图玩具' },
  { category: 'TOY', name: '文具套装', points: 50, icon: '✏️', description: '一套新文具' },
  { category: 'TOY', name: '芭比娃娃/玩偶', points: 150, icon: '🪆', description: '一个玩偶' },
  { category: 'TOY', name: '乐高套装', points: 180, icon: '🏗️', description: '一个乐高套装' },
  { category: 'TOY', name: '遥控车', points: 200, icon: '🚗', description: '一个遥控玩具' },
  { category: 'OUTING', name: '去公园玩', points: 30, icon: '🌳', description: '去附近的公园玩耍' },
  { category: 'OUTING', name: '去书店', points: 40, icon: '📚', description: '去书店买书或看书' },
  { category: 'OUTING', name: '野餐', points: 60, icon: '🧺', description: '和家人一起去野餐' },
  { category: 'OUTING', name: '博物馆', points: 80, icon: '🏛️', description: '去博物馆参观' },
  { category: 'OUTING', name: '电影院', points: 80, icon: '🎦', description: '看一场电影' },
  { category: 'OUTING', name: '动物园', points: 100, icon: '🦁', description: '去动物园游玩' },
  { category: 'OUTING', name: '露营', points: 250, icon: '⛺', description: '一次户外露营体验' },
  { category: 'OUTING', name: '短途旅行', points: 300, icon: '🧳', description: '周末短途旅行' },
  { category: 'PRIVILEGE', name: '晚睡30分钟', points: 15, icon: '🛌', description: '今晚可以晚睡30分钟' },
  { category: 'PRIVILEGE', name: '点播节目', points: 20, icon: '📺', description: '自己选择想看的节目' },
  { category: 'PRIVILEGE', name: '免做一次家务', points: 20, icon: '🧹', description: '免除一次家务任务' },
  { category: 'PRIVILEGE', name: '多玩1小时', points: 25, icon: '⏰', description: '今天多玩1小时' },
  { category: 'PRIVILEGE', name: '决定晚餐吃什么', points: 30, icon: '🍴', description: '今天由你决定晚餐' },
  { category: 'PRIVILEGE', name: '当一天小管家', points: 40, icon: '👑', description: '体验一天小管家特权' },
  { category: 'PRIVILEGE', name: '决定周末活动', points: 50, icon: '🎉', description: '决定周末全家活动' },
  { category: 'DIGITAL', name: '云存储扩容', points: 30, icon: '☁️', description: '云盘存储空间增加' },
  { category: 'DIGITAL', name: '购买电子书', points: 50, icon: '📱', description: '购买一本电子书' },
  { category: 'DIGITAL', name: '充值游戏10元', points: 100, icon: '💎', description: '游戏充值10元' },
  { category: 'DIGITAL', name: '视频会员1个月', points: 200, icon: '🎬', description: '视频平台会员一个月' },
  { category: 'DIGITAL', name: '充值游戏30元', points: 280, icon: '💰', description: '游戏充值30元' }
];

exports.main = async () => {
  const db = cloud.database();
  const rewardsCol = db.collection('bp_rewards');
  const rewardResult = { inserted: 0, skipped: 0, errors: [] };

  for (const r of PRESET_REWARDS) {
    try {
      const existing = await rewardsCol.where({ name: r.name, category: r.category, isPreset: true, scope: 'global' }).get();
      if (existing.data && existing.data.length > 0) { rewardResult.skipped++; }
      else {
        await rewardsCol.add({ data: { ...r, isPreset: true, isActive: true, stock: 0, limitPerChild: 0, validFrom: 0, validTo: 0, scope: 'global', parentId: '', createdAt: Date.now(), updatedAt: Date.now() } });
        rewardResult.inserted++;
      }
    } catch (e) { rewardResult.errors.push({ reward: r.name, error: e.message }); }
  }

  return { success: true, rewards: rewardResult };
};
