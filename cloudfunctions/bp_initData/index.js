// bp_initData - 初始化预置任务和奖励数据
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const PRESET_TASKS = [
  { category: 'STUDY', name: '完成数学作业', basePoints: 10, icon: '📚', description: '按时完成老师布置的数学作业' },
  { category: 'STUDY', name: '完成语文作业', basePoints: 10, icon: '📚', description: '按时完成老师布置的语文作业' },
  { category: 'STUDY', name: '完成英语作业', basePoints: 10, icon: '📚', description: '按时完成老师布置的英语作业' },
  { category: 'STUDY', name: '完成其他作业', basePoints: 8, icon: '📚', description: '按时完成其他科目作业' },
  { category: 'STUDY', name: '预习新课', basePoints: 5, icon: '📚', description: '主动预习明天课程内容' },
  { category: 'STUDY', name: '复习旧知', basePoints: 5, icon: '📚', description: '主动复习已学知识' },
  { category: 'STUDY', name: '练字', basePoints: 5, icon: '✍️', description: '练习硬笔/软笔书法' },
  { category: 'STUDY', name: '口算练习', basePoints: 3, icon: '🔢', description: '完成一页口算题' },
  { category: 'STUDY', name: '背诵课文', basePoints: 5, icon: '📖', description: '背诵老师要求的课文段落' },
  { category: 'STUDY', name: '上课认真听讲', basePoints: 3, icon: '🎧', description: '获得家长/老师表扬' },
  { category: 'HOUSEWORK', name: '整理自己的房间', basePoints: 10, icon: '🛏️', description: '将房间收拾整齐' },
  { category: 'HOUSEWORK', name: '打扫卧室', basePoints: 8, icon: '🧹', description: '扫地、拖地、擦桌子' },
  { category: 'HOUSEWORK', name: '收拾书包', basePoints: 3, icon: '🎒', description: '主动整理第二天书包' },
  { category: 'HOUSEWORK', name: '洗袜子', basePoints: 3, icon: '🧦', description: '自己的袜子自己洗' },
  { category: 'HOUSEWORK', name: '洗小件衣物', basePoints: 5, icon: '👕', description: '学会使用洗衣机洗衣服' },
  { category: 'HOUSEWORK', name: '帮妈妈洗碗', basePoints: 5, icon: '🍽️', description: '饭后主动帮忙洗碗' },
  { category: 'HOUSEWORK', name: '帮忙倒垃圾', basePoints: 3, icon: '🗑️', description: '主动将垃圾带到楼下' },
  { category: 'HOUSEWORK', name: '整理餐桌', basePoints: 3, icon: '🍴', description: '饭后帮忙收拾餐桌' },
  { category: 'HOUSEWORK', name: '帮忙晾衣服', basePoints: 3, icon: '👔', description: '帮助家人晾晒衣物' },
  { category: 'HOUSEWORK', name: '帮忙收衣服', basePoints: 3, icon: '🧺', description: '将干衣物收回来叠好' },
  { category: 'HOUSEWORK', name: '浇花', basePoints: 2, icon: '🌷', description: '记得给植物浇水' },
  { category: 'HOUSEWORK', name: '喂宠物', basePoints: 3, icon: '🐶', description: '照顾家里的小动物' },
  { category: 'SPORTS', name: '跑步30分钟', basePoints: 8, icon: '🏃', description: '进行户外跑步锻炼' },
  { category: 'SPORTS', name: '跳绳100个', basePoints: 5, icon: '🤸', description: '完成100个跳绳' },
  { category: 'SPORTS', name: '骑自行车', basePoints: 5, icon: '🚴', description: '户外骑行锻炼' },
  { category: 'SPORTS', name: '游泳', basePoints: 10, icon: '🏊', description: '进行游泳运动' },
  { category: 'SPORTS', name: '打篮球', basePoints: 8, icon: '⛹️', description: '篮球运动或练习' },
  { category: 'SPORTS', name: '打羽毛球', basePoints: 5, icon: '🏸', description: '羽毛球运动或练习' },
  { category: 'SPORTS', name: '做早操', basePoints: 3, icon: '🤸', description: '早上做广播体操' },
  { category: 'SPORTS', name: '眼保健操', basePoints: 2, icon: '👀', description: '认真做眼保健操' },
  { category: 'SPORTS', name: '户外活动1小时', basePoints: 5, icon: '⚽', description: '到户外玩耍运动' },
  { category: 'ART', name: '完成一幅画', basePoints: 8, icon: '🎨', description: '用画笔完成一幅作品' },
  { category: 'ART', name: '做手工', basePoints: 8, icon: '✂️', description: '完成一个手工制作' },
  { category: 'ART', name: '折纸作品', basePoints: 5, icon: '🪺', description: '完成一个折纸作品' },
  { category: 'ART', name: '捏橡皮泥', basePoints: 5, icon: '🎭', description: '用橡皮泥完成一个造型' },
  { category: 'ART', name: '乐高积木', basePoints: 5, icon: '🧱', description: '完成一个乐高作品' },
  { category: 'ART', name: '做黏土', basePoints: 5, icon: '🌸', description: '用超轻黏土做手工作品' },
  { category: 'READING', name: '阅读30分钟', basePoints: 5, icon: '📚', description: '安静阅读30分钟' },
  { category: 'READING', name: '阅读1小时', basePoints: 10, icon: '📖', description: '深度阅读1小时' },
  { category: 'READING', name: '复述故事', basePoints: 8, icon: '🗣️', description: '将读过的故事讲给家人听' },
  { category: 'READING', name: '背诵古诗', basePoints: 5, icon: '📜', description: '学习并背诵一首古诗' },
  { category: 'READING', name: '朗读课文', basePoints: 3, icon: '📣', description: '有感情地朗读文章' },
  { category: 'READING', name: '看科普视频', basePoints: 3, icon: '🎥', description: '观看学习类科普视频' },
  { category: 'HABIT', name: '早起不赖床', basePoints: 3, icon: '☀️', description: '按时起床不哭闹' },
  { category: 'HABIT', name: '自己穿衣服', basePoints: 3, icon: '👕', description: '独立穿好衣服' },
  { category: 'HABIT', name: '按时睡觉', basePoints: 3, icon: '🌙', description: '按时上床睡觉' },
  { category: 'HABIT', name: '饭前洗手', basePoints: 2, icon: '🧼', description: '养成良好卫生习惯' },
  { category: 'HABIT', name: '少吃零食', basePoints: 3, icon: '🍭', description: '控制零食摄入' },
  { category: 'HABIT', name: '不挑食', basePoints: 3, icon: '🥗', description: '均衡饮食不挑食' },
  { category: 'HABIT', name: '主动问好', basePoints: 2, icon: '👋', description: '见到长辈主动打招呼' },
  { category: 'HABIT', name: '使用礼貌用语', basePoints: 2, icon: '🙏', description: '说"请""谢谢""对不起"' },
  { category: 'HABIT', name: '整理玩具', basePoints: 3, icon: '🧸', description: '玩完玩具主动收拾' },
  { category: 'HABIT', name: '独立完成洗漱', basePoints: 5, icon: '🪥', description: '自己刷牙洗脸洗澡' }
];

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
  const tasksCol = db.collection('bp_tasks');
  const rewardsCol = db.collection('bp_rewards');
  const taskResult = { inserted: 0, skipped: 0, errors: [] };
  const rewardResult = { inserted: 0, skipped: 0, errors: [] };

  for (const t of PRESET_TASKS) {
    try {
      const existing = await tasksCol.where({ name: t.name, category: t.category, isPreset: true, scope: 'global' }).get();
      if (existing.data && existing.data.length > 0) { taskResult.skipped++; }
      else {
        await tasksCol.add({ data: { ...t, isPreset: true, isActive: true, maxDaily: 0, requiresPhoto: false, scope: 'global', parentId: '', createdAt: Date.now(), updatedAt: Date.now() } });
        taskResult.inserted++;
      }
    } catch (e) { taskResult.errors.push({ task: t.name, error: e.message }); }
  }

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

  return { success: true, tasks: taskResult, rewards: rewardResult };
};
