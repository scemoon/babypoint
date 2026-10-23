// bp_reset - 重置所有数据并初始化预设奖励
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 教育专家设计的激励体系
const PRESET_REWARDS = [
  // ========== 体验类 - 高质量陪伴 ==========
  { category: 'FAMILY_TIME', name: '亲子电影时光', points: 35, icon: '🎬', description: '和爸妈一起看场电影，享受爆米花' },
  { category: 'FAMILY_TIME', name: '家庭游戏大战', points: 40, icon: '🎲', description: '和家人来一局桌游或棋类游戏' },
  { category: 'FAMILY_TIME', name: '一起做甜点', points: 45, icon: '🧁', description: '亲子烘焙，一起做蛋糕或饼干' },
  { category: 'FAMILY_TIME', name: '手工创作日', points: 35, icon: '✂️', description: '一起做手工、折纸或剪纸创作' },
  { category: 'FAMILY_TIME', name: '家庭运动会', points: 40, icon: '⚽', description: '和爸妈一起运动，跳绳/打球/骑车' },
  { category: 'FAMILY_TIME', name: '睡前故事会', points: 20, icon: '📖', description: '让爸妈多讲一个睡前故事' },
  { category: 'FAMILY_TIME', name: '家庭派对策划', points: 80, icon: '🎉', description: '自己策划并举办一次小型家庭派对' },
  // 户外探索
  { category: 'OUTDOOR', name: '公园探险家', points: 25, icon: '🌳', description: '去公园探索，发现有趣的自然奥秘' },
  { category: 'OUTDOOR', name: '郊外野餐', points: 45, icon: '🧺', description: '和家人一起去郊外野餐，亲近大自然' },
  { category: 'OUTDOOR', name: '徒步小英雄', points: 60, icon: '🥾', description: '完成一次小型徒步或登山探险' },
  { category: 'OUTDOOR', name: '农场体验日', points: 70, icon: '🌾', description: '去农场体验采摘、种植或喂养小动物' },
  { category: 'OUTDOOR', name: '海边度假', points: 150, icon: '🏖️', description: '去海边玩沙、踏浪、堆城堡' },
  { category: 'OUTDOOR', name: '露营初体验', points: 120, icon: '⛺', description: '一次难忘的户外露营体验' },
  { category: 'OUTDOOR', name: '水上乐园', points: 100, icon: '🎢', description: '去水上乐园玩水消暑' },
  // 文化体验
  { category: 'CULTURE', name: '博物馆奇妙日', points: 45, icon: '🏛️', description: '参观博物馆、科技馆或美术馆' },
  { category: 'CULTURE', name: '剧场观赏', points: 70, icon: '🎭', description: '观看儿童剧、木偶剧或音乐会' },
  { category: 'CULTURE', name: '图书馆借阅', points: 15, icon: '📚', description: '去图书馆借阅喜欢的图书' },
  { category: 'CULTURE', name: '手工艺体验', points: 55, icon: '🏺', description: '陶艺、扎染、木工等传统手工艺' },
  { category: 'CULTURE', name: '海洋馆探索', points: 65, icon: '🐬', description: '参观海洋馆，近距离接触海洋生物' },
  { category: 'CULTURE', name: '动物园之旅', points: 60, icon: '🦁', description: '去动物园观察和了解动物' },
  // 小大人体验
  { category: 'RESPONSIBILITY', name: '一日小管家', points: 35, icon: '🦸', description: '负责安排家庭一天的生活起居' },
  { category: 'RESPONSIBILITY', name: '活动策划师', points: 50, icon: '📋', description: '策划一次家庭活动或出游' },
  { category: 'RESPONSIBILITY', name: '厨房小帮手', points: 40, icon: '🍳', description: '在爸妈指导下学做一道菜' },
  { category: 'RESPONSIBILITY', name: '植物守护者', points: 25, icon: '🌱', description: '负责照顾家里的植物或小宠物' },
  { category: 'RESPONSIBILITY', name: '家庭财务官', points: 45, icon: '💰', description: '参与家庭采购，学会合理消费' },
  { category: 'RESPONSIBILITY', name: '小小设计师', points: 50, icon: '🎨', description: '自己设计房间一角或改造旧物' },
  // ========== 发展类 - 兴趣与成长 ==========
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
  // ========== 荣誉类 - 自信与自主 ==========
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
  // ========== 物质类 - 辅助激励 ==========
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

// 年度成长计划预设模板 - 教育专家设计
const PRESET_GROWTH_PLANS = [
  // ========== 幼儿园模板 ==========
  {
    name: '幼儿园成长计划',
    stage: 'kindergarten',
    icon: '🏠',
    phases: [
      { name: '日常习惯', periodType: 'daily', tasks: [
        { name: '亲子绘本阅读', icon: '📚', category: 'READING', domain: 'intelligence', domainName: '智育', description: '每天亲子共读，培养阅读兴趣' },
        { name: '涂鸦创作', icon: '🎨', category: 'ART', domain: 'aesthetic', domainName: '美育', description: '自由绘画，表达想象力' },
        { name: '户外运动', icon: '⚽', category: 'SPORTS', domain: 'physical', domainName: '体育', description: '每日户外活动，增强体质' },
        { name: '早睡早起', icon: '😴', category: 'HEALTH', domain: 'physical', domainName: '体育', description: '规律作息，养成好习惯' },
        { name: '礼貌问候', icon: '👋', category: 'MORAL_SOCIAL', domain: 'moral', domainName: '德育', description: '主动问好，懂得礼貌' },
      ]},
      { name: '每周家务', periodType: 'weekly', tasks: [
        { name: '帮做家务', icon: '🏠', category: 'HOUSEWORK', domain: 'lifeSkill', domainName: '劳育', description: '力所能及的家务' },
      ]},
    ]
  },
  // ========== 小学低年级模板（1-2年级）==========
  {
    name: '小学低年级计划',
    stage: 'primary_low',
    icon: '📚',
    phases: [
      { name: '日常习惯', periodType: 'daily', tasks: [
        { name: '专注作业20分钟', icon: '✍️', category: 'STUDY', domain: 'intelligence', domainName: '智育', description: '专心写作业，坐姿端正' },
        { name: '阅读20分钟', icon: '📖', category: 'READING', domain: 'intelligence', domainName: '智育', description: '每日阅读，积累词汇' },
        { name: '跳绳练习', icon: '🪢', category: 'SPORTS', domain: 'physical', domainName: '体育', description: '跳绳100个，锻炼体能' },
        { name: '整理书包', icon: '🎒', category: 'SELF_CARE', domain: 'lifeSkill', domainName: '劳育', description: '整理第二天物品' },
        { name: '礼貌问候', icon: '👋', category: 'MORAL_SOCIAL', domain: 'moral', domainName: '德育', description: '主动问好，友爱同学' },
      ]},
      { name: '每周任务', periodType: 'weekly', tasks: [
        { name: '家务分担', icon: '🏠', category: 'HOUSEWORK', domain: 'lifeSkill', domainName: '劳育', description: '承担力所能及的家务' },
      ]},
    ]
  },
  // ========== 小学中年级模板（3-4年级）==========
  {
    name: '小学中年级计划',
    stage: 'primary_mid',
    icon: '📖',
    phases: [
      { name: '日常习惯', periodType: 'daily', tasks: [
        { name: '专注作业30分钟', icon: '✍️', category: 'STUDY', domain: 'intelligence', domainName: '智育', description: '专心写作业，做好检查' },
        { name: '阅读30分钟', icon: '📖', category: 'READING', domain: 'intelligence', domainName: '智育', description: '深度阅读，做好笔记' },
        { name: '户外运动', icon: '⚽', category: 'SPORTS', domain: 'physical', domainName: '体育', description: '每日运动30分钟' },
        { name: '护眼习惯', icon: '👀', category: 'HEALTH', domain: 'physical', domainName: '体育', description: '正确用眼，定时休息' },
      ]},
      { name: '每周任务', periodType: 'weekly', tasks: [
        { name: '时间规划', icon: '⏰', category: 'HABIT', domain: 'moral', domainName: '德育', description: '学习时间管理' },
        { name: '家务分担', icon: '🏠', category: 'HOUSEWORK', domain: 'lifeSkill', domainName: '劳育', description: '承担固定家务' },
      ]},
    ]
  },
  // ========== 小学高年级模板（5-6年级）==========
  {
    name: '小学高年级计划',
    stage: 'primary_high',
    icon: '🎯',
    phases: [
      { name: '日常习惯', periodType: 'daily', tasks: [
        { name: '自主作业', icon: '✍️', category: 'STUDY', domain: 'intelligence', domainName: '智育', description: '独立完成，主动检查' },
        { name: '深度阅读', icon: '📚', category: 'READING', domain: 'intelligence', domainName: '智育', description: '主题阅读，做好批注' },
        { name: '体育锻炼', icon: '🏃', category: 'SPORTS', domain: 'physical', domainName: '体育', description: '每日运动40分钟' },
      ]},
      { name: '每周任务', periodType: 'weekly', tasks: [
        { name: '错题整理', icon: '📒', category: 'STUDY', domain: 'intelligence', domainName: '智育', description: '整理错题本，分析原因' },
        { name: '时间管理', icon: '⏰', category: 'HABIT', domain: 'moral', domainName: '德育', description: '制定计划，执行复盘' },
        { name: '家务承担', icon: '🏠', category: 'HOUSEWORK', domain: 'lifeSkill', domainName: '劳育', description: '独立完成家务' },
      ]},
    ]
  },
  // ========== 初中模板 ==========
  {
    name: '初中成长计划',
    stage: 'middle',
    icon: '🚀',
    phases: [
      { name: '日常习惯', periodType: 'daily', tasks: [
        { name: '自主学习', icon: '📚', category: 'STUDY', domain: 'intelligence', domainName: '智育', description: '制定计划，独立完成' },
        { name: '阅读提升', icon: '📖', category: 'READING', domain: 'intelligence', domainName: '智育', description: '经典阅读，拓展视野' },
        { name: '体育锻炼', icon: '🏃', category: 'SPORTS', domain: 'physical', domainName: '体育', description: '每日运动50分钟' },
        { name: '作息规律', icon: '⏰', category: 'HEALTH', domain: 'physical', domainName: '体育', description: '早睡早起，自我管理' },
      ]},
      { name: '每周任务', periodType: 'weekly', tasks: [
        { name: '周计划复盘', icon: '📋', category: 'HABIT', domain: 'moral', domainName: '德育', description: '制定计划，总结复盘' },
        { name: '家务承担', icon: '🏠', category: 'HOUSEWORK', domain: 'lifeSkill', domainName: '劳育', description: '分担家庭责任' },
      ]},
    ]
  }
];

exports.main = async (event, context) => {
  const db = cloud.database();
  const now = Date.now();

  try {
    const result = {
      deleted: {},
      inserted: 0,
      skipped: 0,
      errors: []
    };

    // 辅助函数：删除集合中所有文档（集合不存在时返回0）
    async function deleteAllDocs(collection) {
      try {
        const res = await collection.limit(100).get();
        const docs = res.data || [];
        if (docs.length === 0) return 0;
        let deleted = 0;
        for (const doc of docs) {
          await collection.doc(doc._id).remove();
          deleted++;
        }
        return deleted;
      } catch (e) {
        if (e.errMsg && e.errMsg.includes('collection not exists')) return 0;
        throw e;
      }
    }

    // 1. 删除 bp_task_completions
    const completionsCol = db.collection('bp_task_completions');
    let deleted = await deleteAllDocs(completionsCol);
    result.deleted.task_completions = deleted;

    // 2. 删除 bp_points_transactions
    const pointsTxCol = db.collection('bp_points_transactions');
    deleted = await deleteAllDocs(pointsTxCol);
    result.deleted.points_transactions = deleted;

    // 3. 删除 bp_reward_redemptions
    const redemptionsCol = db.collection('bp_reward_redemptions');
    deleted = await deleteAllDocs(redemptionsCol);
    result.deleted.reward_redemptions = deleted;

    // 4. 删除 bp_tasks
    const tasksCol = db.collection('bp_tasks');
    deleted = await deleteAllDocs(tasksCol);
    result.deleted.tasks = deleted;

    // 5. 删除 bp_children
    const childrenCol = db.collection('bp_children');
    deleted = await deleteAllDocs(childrenCol);
    result.deleted.children = deleted;

    // 6. 删除 bp_rewards（只删除预设奖励，保留用户自建的）
    const rewardsCol = db.collection('bp_rewards');
    const presetRes = await rewardsCol.where({ isPreset: true }).limit(100).get();
    let presetDeleted = 0;
    for (const doc of presetRes.data) {
      await rewardsCol.doc(doc._id).remove();
      presetDeleted++;
    }
    result.deleted.preset_rewards = presetDeleted;

    // 7. 重新插入预设奖励
    for (const r of PRESET_REWARDS) {
      try {
        // 检查是否已存在
        const existing = await rewardsCol.where({
          name: r.name,
          category: r.category,
          isPreset: true,
          scope: 'global'
        }).get();

        if (existing.data && existing.data.length > 0) {
          result.skipped++;
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
          result.inserted++;
        }
      } catch (e) {
        result.errors.push({ reward: r.name, error: e.message });
      }
    }

    // 8. 重置年度成长计划模板（集合可能不存在，跳过即可）
    try {
      const templatesCol = db.collection('bp_growth_plan_templates');
      const templatesRes = await templatesCol.limit(100).get();
      for (const doc of templatesRes.data) {
        await templatesCol.doc(doc._id).remove();
      }
      let templatesInserted = 0;
      for (const template of PRESET_GROWTH_PLANS) {
        try {
          await templatesCol.add({
            data: {
              ...template,
              isPreset: true,
              createdAt: now,
              updatedAt: now
            }
          });
          templatesInserted++;
        } catch (e) {
          result.errors.push({ template: template.name, error: e.message });
        }
      }
      result.inserted_growth_templates = templatesInserted;
    } catch (e) {
      // 集合不存在时跳过
      result.inserted_growth_templates = 0;
    }

    return {
      success: true,
      message: '数据重置并初始化成功',
      result
    };
  } catch (e) {
    console.error('bp_reset error:', e);
    return { success: false, error: e.message };
  }
};
