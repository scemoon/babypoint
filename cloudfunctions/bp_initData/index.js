// bp_initData - 初始化预置奖励数据
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 教育专家设计的激励体系
 *
 * 设计原则：
 * 1. 体验类优先：高质量亲子时光是最有效的激励，比物质奖励更有意义
 * 2. 发展类重要：支持兴趣培养和技能发展，激发内在动机
 * 3. 荣誉类辅助：适度使用，增强成就感和自主感
 * 4. 物质类补充：作为辅助手段，不宜作为主要激励
 * 5. 积分梯度合理：从低到高，让子能设定可达成的目标
 * 6. 奖励具体明确：描述清晰，让孩子知道努力的方向
 */
const PRESET_REWARDS = [
  // ========== 体验类（推荐！高质量陪伴）============

  // 亲子时光 - 核心激励，促进亲子关系
  { category: 'FAMILY_TIME', name: '亲子电影时光', points: 35, icon: '🎬', description: '和爸妈一起看场电影，享受爆米花' },
  { category: 'FAMILY_TIME', name: '家庭游戏大战', points: 40, icon: '🎲', description: '和家人来一局桌游或棋类游戏' },
  { category: 'FAMILY_TIME', name: '一起做甜点', points: 45, icon: '🧁', description: '亲子烘焙，一起做蛋糕或饼干' },
  { category: 'FAMILY_TIME', name: '手工创作日', points: 35, icon: '✂️', description: '一起做手工、折纸或剪纸创作' },
  { category: 'FAMILY_TIME', name: '家庭运动会', points: 40, icon: '⚽', description: '和爸妈一起运动，跳绳/打球/骑车' },
  { category: 'FAMILY_TIME', name: '睡前故事会', points: 20, icon: '📖', description: '让爸妈多讲一个睡前故事' },
  { category: 'FAMILY_TIME', name: '家庭派对策划', points: 80, icon: '🎉', description: '自己策划并举办一次小型家庭派对' },

  // 户外探索 - 接触自然，强身健体
  { category: 'OUTDOOR', name: '公园探险家', points: 25, icon: '🌳', description: '去公园探索，发现有趣的自然奥秘' },
  { category: 'OUTDOOR', name: '郊外野餐', points: 45, icon: '🧺', description: '和家人一起去郊外野餐，亲近大自然' },
  { category: 'OUTDOOR', name: '徒步小英雄', points: 60, icon: '🥾', description: '完成一次小型徒步或登山探险' },
  { category: 'OUTDOOR', name: '农场体验日', points: 70, icon: '🌾', description: '去农场体验采摘、种植或喂养小动物' },
  { category: 'OUTDOOR', name: '海边度假', points: 150, icon: '🏖️', description: '去海边玩沙、踏浪、堆城堡' },
  { category: 'OUTDOOR', name: '露营初体验', points: 120, icon: '⛺', description: '一次难忘的户外露营体验' },
  { category: 'OUTDOOR', name: '水上乐园', points: 100, icon: '🎢', description: '去水上乐园玩水消暑' },

  // 文化体验 - 开阔视野，培养品味
  { category: 'CULTURE', name: '博物馆奇妙日', points: 45, icon: '🏛️', description: '参观博物馆、科技馆或美术馆' },
  { category: 'CULTURE', name: '剧场观赏', points: 70, icon: '🎭', description: '观看儿童剧、木偶剧或音乐会' },
  { category: 'CULTURE', name: '图书馆借阅', points: 15, icon: '📚', description: '去图书馆借阅喜欢的图书' },
  { category: 'CULTURE', name: '手工艺体验', points: 55, icon: '🏺', description: '陶艺、扎染、木工等传统手工艺' },
  { category: 'CULTURE', name: '海洋馆探索', points: 65, icon: '🐬', description: '参观海洋馆，近距离接触海洋生物' },
  { category: 'CULTURE', name: '动物园之旅', points: 60, icon: '🦁', description: '去动物园观察和了解动物' },

  // 小大人体验 - 培养责任感，体验成长
  { category: 'RESPONSIBILITY', name: '一日小管家', points: 35, icon: '🦸', description: '负责安排家庭一天的生活起居' },
  { category: 'RESPONSIBILITY', name: '活动策划师', points: 50, icon: '📋', description: '策划一次家庭活动或出游' },
  { category: 'RESPONSIBILITY', name: '厨房小帮手', points: 40, icon: '🍳', description: '在爸妈指导下学做一道菜' },
  { category: 'RESPONSIBILITY', name: '植物守护者', points: 25, icon: '🌱', description: '负责照顾家里的植物或小宠物' },
  { category: 'RESPONSIBILITY', name: '家庭财务官', points: 45, icon: '💰', description: '参与家庭采购，学会合理消费' },
  { category: 'RESPONSIBILITY', name: '小小设计师', points: 50, icon: '🎨', description: '自己设计房间一角或改造旧物' },

  // ========== 发展类（支持兴趣与成长）============

  // 学习特权 - 激发学习兴趣
  { category: 'STUDY_PRIVILEGE', name: '心愿书单', points: 30, icon: '📖', description: '选择一本最想读的课外书' },
  { category: 'STUDY_PRIVILEGE', name: '实验家套装', points: 50, icon: '🔬', description: '获得一份科学实验材料包' },
  { category: 'STUDY_PRIVILEGE', name: '知识探险', points: 35, icon: '🧭', description: '去科技馆或自然博物馆探索' },
  { category: 'STUDY_PRIVILEGE', name: '在线学习', points: 80, icon: '💻', description: '学习一门感兴趣的在线课程' },
  { category: 'STUDY_PRIVILEGE', name: '学习工具升级', points: 40, icon: '✏️', description: '获得一套心仪已久的学习工具' },

  // 兴趣拓展 - 发现天赋，培养特长
  { category: 'HOBBY', name: '兴趣体验课', points: 70, icon: '🎯', description: '体验一节乐器/舞蹈/绘画等课程' },
  { category: 'HOBBY', name: '才艺展示', points: 50, icon: '🏅', description: '参加兴趣比赛或表演活动' },
  { category: 'HOBBY', name: '艺术创想', points: 45, icon: '🎨', description: '获得一套绘画或手工创作材料' },
  { category: 'HOBBY', name: '音乐之旅', points: 60, icon: '🎵', description: '获得一次音乐启蒙或乐器体验' },
  { category: 'HOBBY', name: '运动新技能', points: 55, icon: '⛳', description: '学习一项新运动：游泳/滑冰/乒乓球等' },

  // 科技探索 - 培养创新思维
  { category: 'TECH', name: '科学实验盒', points: 45, icon: '🔭', description: '一个有趣的STEAM科学实验盒子' },
  { category: 'TECH', name: '编程初体验', points: 100, icon: '🤖', description: '一节编程启蒙课或机器人体验' },
  { category: 'TECH', name: '创客工作坊', points: 60, icon: '🚀', description: '参加创客活动或科技制作' },
  { category: 'TECH', name: '数码装备', points: 80, icon: '📱', description: '获得一个儿童手表或学习平板' },

  // ========== 荣誉类（增强自信与自主）============

  // 自主权 - 适度放权，培养自律
  { category: 'AUTONOMY', name: '我的周末我做主', points: 35, icon: '📅', description: '自主安排一整天的活动' },
  { category: 'AUTONOMY', name: '美食决定权', points: 25, icon: '🍽️', description: '决定一天的三餐吃什么' },
  { category: 'AUTONOMY', name: '晚睡福利', points: 20, icon: '🌙', description: '今晚可以晚睡30分钟' },
  { category: 'AUTONOMY', name: '家务豁免', points: 20, icon: '🧹', description: '免除一次日常家务' },
  { category: 'AUTONOMY', name: '着装自由', points: 15, icon: '👕', description: '自己选择一天想穿的衣服' },
  { category: 'AUTONOMY', name: '电子产品时间', points: 30, icon: '📺', description: '获得额外的电子产品使用时间' },

  // 社交特权 - 促进社会交往
  { category: 'SOCIAL', name: '派对邀请函', points: 35, icon: '🤝', description: '邀请好朋友来家里玩' },
  { category: 'SOCIAL', name: '生日会出席', points: 40, icon: '🎁', description: '参加好朋友的生日会' },
  { category: 'SOCIAL', name: '亲子约会', points: 50, icon: '💕', description: '和爸妈单独出去约会半天' },
  { category: 'SOCIAL', name: '小使者', points: 30, icon: '📞', description: '给好久不见的朋友打电话' },

  // 荣誉展示 - 增强成就感
  { category: 'BADGE', name: '荣誉墙展示', points: 25, icon: '🏆', description: '照片或成就上家庭荣誉墙' },
  { category: 'BADGE', name: '成就徽章', points: 20, icon: '👑', description: '获得一枚特别成就徽章' },
  { category: 'BADGE', name: '成长日记', points: 25, icon: '📔', description: '爸妈为你的进步写一篇表扬信' },
  { category: 'BADGE', name: '荣誉时刻', points: 30, icon: '⭐', description: '在家庭会议上被公开表扬' },

  // ========== 物质类（辅助激励）============

  // 文具图书 - 学习支持
  { category: 'STATIONERY', name: '精美笔记本', points: 20, icon: '📓', description: '一本设计好看的笔记本' },
  { category: 'STATIONERY', name: '创意文具盒', points: 30, icon: '✏️', description: '一套有趣的文具或画材' },
  { category: 'STATIONERY', name: '书架新成员', points: 50, icon: '📚', description: '在书架上添一本新书' },

  // 运动装备 - 健康生活
  { category: 'SPORTS', name: '运动小装备', points: 35, icon: '⚽', description: '一个新的足球、篮球或跳绳' },
  { category: 'SPORTS', name: '骑行装备', points: 80, icon: '🚲', description: '获得头盔、手套等骑行装备' },
  { category: 'SPORTS', name: '运动手表', points: 100, icon: '⌚', description: '一个儿童运动手环或手表' },

  // 小小储蓄 - 财商启蒙
  { category: 'SAVINGS', name: '梦想储蓄罐', points: 25, icon: '🐷', description: '存入储蓄罐，为梦想积攒' },
  { category: 'SAVINGS', name: '理财小账本', points: 15, icon: '💰', description: '一本记录收支的理财笔记本' },
  { category: 'SAVINGS', name: '小小投资家', points: 80, icon: '📈', description: '和爸妈一起了解理财知识' },

  // 特别奖励 - 特殊时刻
  { category: 'STATIONERY', name: '神秘大礼包', points: 200, icon: '🎊', description: '一个期待已久的神秘礼物' },
  { category: 'SPORTS', name: '梦想清单', points: 300, icon: '✨', description: '实现一个一直想实现的心愿' }
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
