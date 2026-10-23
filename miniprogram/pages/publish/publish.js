// pages/publish/publish.js
// 版本: v2.0 - 五育体系 + 全面任务模板
const app = getApp();
const { analyzeTaskPoints, CATEGORY_META } = require('../../utils/task-score');
const { keyboardAvoid } = require('../../utils/keyboard');
const {
  dayStart, toDateStr, parseDateStr, getDefaultRange, countPeriods, formatRangeSummary, DEFAULT_RANGE_DAYS
} = require('../../utils/date-range');

// ==================== 全面预设任务模板 ====================
const PRESET_TASKS = [
  // ========== 智育 - 学习习惯 ==========
  { name: '按计划开始学习', category: 'STUDY', icon: '✏️', description: '按约定时间开始当天的学习任务', periodType: 'daily' },
  { name: '整理当天学习用品', category: 'STUDY', icon: '📚', description: '检查并收好课本、文具和作业', periodType: 'daily' },
  { name: '完成一项自主练习', category: 'STUDY', icon: '🧩', description: '选择一项适合自己的练习并认真完成', periodType: 'daily' },
  { name: '主动预习第二天内容', category: 'STUDY', icon: '📖', description: '为新内容做准备，大致了解要点', periodType: 'daily' },
  { name: '认真复习当天所学', category: 'STUDY', icon: '🔁', description: '回顾当天课堂内容，查漏补缺', periodType: 'daily' },
  { name: '整理书包和课桌', category: 'STUDY', icon: '🎒', description: '根据第二天课程准备用品，整洁有序', periodType: 'daily' },
  { name: '专注写作业30分钟', category: 'STUDY', icon: '✍️', description: '不玩手机不吃零食，专心完成作业', periodType: 'daily' },
  { name: '自己检查作业错误', category: 'STUDY', icon: '✅', description: '完成后认真检查一遍再提交', periodType: 'daily' },
  { name: '整理错题本', category: 'STUDY', icon: '📒', description: '记录做错的题目，分析原因', periodType: 'weekly' },
  { name: '用康奈尔笔记法做笔记', category: 'STUDY', icon: '📝', description: '学习用康奈尔笔记法整理笔记', periodType: 'weekly' },
  { name: '制定周末学习计划', category: 'STUDY', icon: '📅', description: '规划周末的学习时间和内容', periodType: 'weekly' },
  { name: '完成一项拓展探究', category: 'STUDY', icon: '🔬', description: '围绕兴趣话题做一个小研究', periodType: 'monthly' },
  
  // ========== 智育 - 阅读 ==========
  { name: '自主阅读20分钟', category: 'READING', icon: '📖', description: '安静阅读自己选择的书籍', periodType: 'daily' },
  { name: '阅读30分钟并批注', category: 'READING', icon: '✏️', description: '阅读时做简单批注或划线', periodType: 'daily' },
  { name: '和家人分享阅读内容', category: 'READING', icon: '💬', description: '说说喜欢的角色、情节或新发现', periodType: 'weekly' },
  { name: '听故事并复述', category: 'READING', icon: '📚', description: '听完故事后用自己的话复述', periodType: 'weekly' },
  { name: '背诵一首古诗', category: 'READING', icon: '🗣️', description: '选择一首古诗词认真背诵', periodType: 'weekly' },
  { name: '朗读一段文章', category: 'READING', icon: '🗣️', description: '大声朗读，注意语音语调', periodType: 'weekly' },
  { name: '去图书馆借阅图书', category: 'READING', icon: '📚', description: '到图书馆选一本喜欢的书', periodType: 'monthly' },
  { name: '写一篇读后感', category: 'READING', icon: '✍️', description: '写一段读后的感受和收获', periodType: 'monthly' },
  
  // ========== 体育 - 运动 ==========
  { name: '户外活动30分钟', category: 'SPORTS', icon: '🌳', description: '散步、跑跳、骑车或户外游戏', periodType: 'daily' },
  { name: '跳绳100个', category: 'SPORTS', icon: '🪢', description: '连续跳绳，锻炼协调性', periodType: 'daily' },
  { name: '跑步15分钟', category: 'SPORTS', icon: '🏃', description: '进行适度的跑步锻炼', periodType: 'daily' },
  { name: '做眼保健操', category: 'SPORTS', icon: '👀', description: '保护视力，认真做眼保健操', periodType: 'daily' },
  { name: '步行上学', category: 'SPORTS', icon: '🚶', description: '如果条件允许，步行或骑车上学', periodType: 'daily' },
  { name: '选择一项喜欢的运动', category: 'SPORTS', icon: '⚽', description: '按兴趣选择安全的运动并参与', periodType: 'daily' },
  { name: '练习平衡协调动作', category: 'SPORTS', icon: '🤸', description: '如单脚站立、跳格子或接抛球', periodType: 'weekly' },
  { name: '学会一项新运动技能', category: 'SPORTS', icon: '🏀', description: '体验新项目，重在参与', periodType: 'monthly' },
  { name: '记录一周运动数据', category: 'SPORTS', icon: '📊', description: '记录每天运动时长和内容', periodType: 'weekly' },
  { name: '参加体育比赛', category: 'SPORTS', icon: '🏆', description: '积极参与校内外的体育活动', periodType: 'monthly' },
  
  // ========== 美育 - 艺术 ==========
  { name: '自由绘画创作', category: 'ART', icon: '🎨', description: '用画笔表达自己的想法', periodType: 'weekly' },
  { name: '完成一件手工作品', category: 'ART', icon: '✂️', description: '折纸、剪纸、黏土等手工制作', periodType: 'weekly' },
  { name: '练习乐器30分钟', category: 'ART', icon: '🎹', description: '坚持练习钢琴、吉他等乐器', periodType: 'daily' },
  { name: '唱歌表演给家人', category: 'ART', icon: '🎤', description: '学唱一首新歌并表演', periodType: 'weekly' },
  { name: '舞蹈练习', category: 'ART', icon: '💃', description: '跟着音乐跳舞或练习舞蹈动作', periodType: 'weekly' },
  { name: '讲一个故事表演', category: 'ART', icon: '🎭', description: '故事讲述或角色扮演', periodType: 'weekly' },
  { name: '参观艺术展览', category: 'ART', icon: '🏛️', description: '去博物馆、美术馆参观', periodType: 'monthly' },
  { name: '完成一个创作项目', category: 'ART', icon: '🧱', description: '如模型、陶艺、摄影等', periodType: 'monthly' },
  
  // ========== 德育 - 家庭美德 ==========
  { name: '帮家人捶背按摩', category: 'MORAL_FAMILY', icon: '💆', description: '为辛苦的家人服务', periodType: 'daily' },
  { name: '主动问候长辈', category: 'MORAL_FAMILY', icon: '🙇', description: '见到爷爷奶奶主动问好', periodType: 'daily' },
  { name: '帮忙摆碗筷', category: 'MORAL_FAMILY', icon: '🍽️', description: '餐前帮忙准备餐具', periodType: 'daily' },
  { name: '饭后收拾碗筷', category: 'MORAL_FAMILY', icon: '🥢', description: '吃完饭后收拾自己的碗筷', periodType: 'daily' },
  { name: '给家人倒水递茶', category: 'MORAL_FAMILY', icon: '☕', description: '关心家人，主动递水', periodType: 'daily' },
  { name: '和弟弟妹妹玩', category: 'MORAL_FAMILY', icon: '👶', description: '陪伴照顾弟弟妹妹', periodType: 'daily' },
  { name: '给家人一个拥抱', category: 'MORAL_FAMILY', icon: '🤗', description: '表达对家人的爱', periodType: 'weekly' },
  { name: '帮忙照顾老人', category: 'MORAL_FAMILY', icon: '👴', description: '陪爷爷奶奶说说话', periodType: 'weekly' },
  
  // ========== 德育 - 社会公德 ==========
  { name: '说"谢谢"和"请"', category: 'MORAL_SOCIAL', icon: '🙏', description: '使用文明用语', periodType: 'daily' },
  { name: '主动让座', category: 'MORAL_SOCIAL', icon: '💺', description: '在公交车上给需要的人让座', periodType: 'weekly' },
  { name: '不乱扔垃圾', category: 'MORAL_SOCIAL', icon: '🚮', description: '垃圾扔进垃圾桶', periodType: 'daily' },
  { name: '帮助陌生人', category: 'MORAL_SOCIAL', icon: '🤝', description: '在需要时帮助他人', periodType: 'weekly' },
  { name: '诚实守信', category: 'MORAL_SOCIAL', icon: '⭐', description: '说到做到，不撒谎', periodType: 'weekly' },
  { name: '遵守约定时间', category: 'MORAL_SOCIAL', icon: '⏰', description: '守时不迟到', periodType: 'daily' },
  { name: '公共场合保持安静', category: 'MORAL_SOCIAL', icon: '🤫', description: '在图书馆等场所保持安静', periodType: 'weekly' },
  
  // ========== 德育 - 自我管理 ==========
  { name: '管理好作息时间', category: 'MORAL_SELF', icon: '🌙', description: '按时起床、睡觉，不熬夜', periodType: 'daily' },
  { name: '控制电子产品使用', category: 'MORAL_SELF', icon: '📱', description: '按约定时间使用手机/电视', periodType: 'daily' },
  { name: '遇到问题想办法', category: 'MORAL_SELF', icon: '💡', description: '先自己想办法再求助', periodType: 'daily' },
  { name: '记录心情日记', category: 'MORAL_SELF', icon: '📔', description: '记录今天的心情和感受', periodType: 'weekly' },
  { name: '管理好自己的情绪', category: 'MORAL_SELF', icon: '😤', description: '生气时先深呼吸冷静', periodType: 'daily' },
  { name: '制定并执行计划', category: 'MORAL_SELF', icon: '📋', description: '按计划完成任务', periodType: 'weekly' },
  { name: '整理个人物品', category: 'MORAL_SELF', icon: '📦', description: '保持书包、房间整洁有序', periodType: 'weekly' },
  
  // ========== 德育 - 习惯 ==========
  { name: '早起自己整理床铺', category: 'HABIT', icon: '🛏️', description: '起床后叠好被子整理床单', periodType: 'daily' },
  { name: '早晚刷牙', category: 'HABIT', icon: '🪥', description: '保持口腔卫生', periodType: 'daily' },
  { name: '饭前洗手', category: 'HABIT', icon: '🧼', description: '养成良好卫生习惯', periodType: 'daily' },
  { name: '自己穿好衣服', category: 'HABIT', icon: '👕', description: '自己穿脱衣物系扣子', periodType: 'daily' },
  { name: '独立整理书包', category: 'HABIT', icon: '🎒', description: '自己准备第二天物品', periodType: 'daily' },
  
  // ========== 劳育 - 家务 ==========
  { name: '收拾自己的玩具', category: 'HOUSEWORK', icon: '🧸', description: '玩完后把玩具放回原位', periodType: 'daily' },
  { name: '把脏衣服放进衣篮', category: 'HOUSEWORK', icon: '👕', description: '换下的衣服主动归置', periodType: 'daily' },
  { name: '扫地', category: 'HOUSEWORK', icon: '🧹', description: '帮忙打扫地面', periodType: 'daily' },
  { name: '拖地', category: 'HOUSEWORK', icon: '🪣', description: '用拖把清洁地面', periodType: 'weekly' },
  { name: '擦桌子', category: 'HOUSEWORK', icon: '🧽', description: '擦拭餐桌和茶几', periodType: 'weekly' },
  { name: '整理客厅', category: 'HOUSEWORK', icon: '🛋️', description: '收拾客厅的杂物', periodType: 'weekly' },
  { name: '帮忙洗碗', category: 'HOUSEWORK', icon: '🍳', description: '餐后帮忙清洗碗筷', periodType: 'daily' },
  { name: '参与大扫除', category: 'HOUSEWORK', icon: '🧹', description: '周末全家大扫除', periodType: 'weekly' },
  { name: '照料植物', category: 'HOUSEWORK', icon: '🪴', description: '给植物浇水修剪', periodType: 'custom', periodDays: 3 },
  { name: '垃圾分类处理', category: 'HOUSEWORK', icon: '♻️', description: '按要求进行垃圾分类', periodType: 'daily' },
  
  // ========== 劳育 - 自理 ==========
  { name: '自己整理房间', category: 'LIFE_SELF', icon: '🧹', description: '整理床铺、书桌、玩具', periodType: 'daily' },
  { name: '叠自己的衣服', category: 'LIFE_SELF', icon: '👕', description: '叠好放进衣柜', periodType: 'daily' },
  { name: '自己系鞋带', category: 'LIFE_SELF', icon: '👟', description: '学会系鞋带', periodType: 'daily' },
  { name: '整理个人卫生', category: 'LIFE_SELF', icon: '🚿', description: '洗澡、洗头、剪指甲', periodType: 'weekly' },
  { name: '管理学习用品', category: 'LIFE_SELF', icon: '✏️', description: '铅笔削好、本子备足', periodType: 'daily' },
  
  // ========== 劳育 - 理财 ==========
  { name: '记录零花钱收支', category: 'LIFE_MONEY', icon: '💰', description: '记录每一笔零花钱的来源和去向', periodType: 'weekly' },
  { name: '制定购物计划', category: 'LIFE_MONEY', icon: '🛒', description: '列好购物清单不冲动消费', periodType: 'monthly' },
  { name: '存钱目标达成', category: 'LIFE_MONEY', icon: '🐷', description: '为喜欢的东西存钱', periodType: 'monthly' },
  { name: '比较价格合理消费', category: 'LIFE_MONEY', icon: '✌️', description: '购物时比较价格', periodType: 'monthly' },
  
  // ========== 劳育 - 社交 ==========
  { name: '主动结交新朋友', category: 'LIFE_SOCIAL', icon: '👋', description: '主动认识新同学新伙伴', periodType: 'monthly' },
  { name: '合作完成一件事', category: 'LIFE_SOCIAL', icon: '🤝', description: '和小伙伴一起合作完成任务', periodType: 'weekly' },
  { name: '分享自己的物品', category: 'LIFE_SOCIAL', icon: '🎁', description: '愿意和他人分享', periodType: 'weekly' },
  { name: '解决与同伴的冲突', category: 'LIFE_SOCIAL', icon: '🤝', description: '用沟通解决矛盾', periodType: 'monthly' },

  // ========== 文化传承 MORAL_CULTURE (6) ==========
  { name: '古诗词背诵', category: 'MORAL_CULTURE', icon: '🗣️', description: '背诵一首古诗词', periodType: 'weekly' },
  { name: '传统节日习俗', category: 'MORAL_CULTURE', icon: '🏮', description: '了解一个传统节日的习俗', periodType: 'monthly' },
  { name: '二十四节气学习', category: 'MORAL_CULTURE', icon: '🌤️', description: '了解二十四节气相关知识', periodType: 'monthly' },
  { name: '传统故事聆听', category: 'MORAL_CULTURE', icon: '📖', description: '聆听并复述传统故事', periodType: 'weekly' },
  { name: '非遗文化了解', category: 'MORAL_CULTURE', icon: '🎭', description: '了解一项非物质文化遗产', periodType: 'monthly' },
  { name: '文化传承行动', category: 'MORAL_CULTURE', icon: '🌟', description: '参与一项文化传承活动', periodType: 'monthly' },

  // ========== 安全教育 OTHER (8) ==========
  // 幼儿园
  { name: '认识红绿灯', category: 'OTHER', icon: '🚦', description: '学习认识红绿灯和过马路', periodType: 'weekly' },
  { name: '不跟陌生人走', category: 'OTHER', icon: '🚫', description: '知道不能跟陌生人走', periodType: 'daily' },
  // 小学低年级
  { name: '用电安全知识', category: 'OTHER', icon: '⚡', description: '学习安全用电常识', periodType: 'monthly' },
  { name: '防火安全演练', category: 'OTHER', icon: '🔥', description: '了解火灾逃生基本常识', periodType: 'monthly' },
  // 小学高年级
  { name: '网络安全意识', category: 'OTHER', icon: '💻', description: '学习网络安全和防诈骗知识', periodType: 'monthly' },
  { name: '防溺水安全', category: 'OTHER', icon: '🏊', description: '学习防溺水安全知识', periodType: 'monthly' },
  // 初中
  { name: '急救知识学习', category: 'OTHER', icon: '🩹', description: '学习基本的急救知识', periodType: 'monthly' },
  { name: '应急逃生技能', category: 'OTHER', icon: '🚨', description: '掌握基本的应急逃生技能', periodType: 'monthly' },

  // ========== 科学探索 OTHER (6) ==========
  // 幼儿园
  { name: '玩沙玩水游戏', category: 'OTHER', icon: '💧', description: '在安全环境下玩沙玩水探索', periodType: 'weekly' },
  { name: '动植物观察', category: 'OTHER', icon: '🌱', description: '观察身边的植物或小动物', periodType: 'weekly' },
  // 小学低年级
  { name: '天气记录', category: 'OTHER', icon: '☁️', description: '记录一周的天气变化', periodType: 'weekly' },
  { name: '简单小实验', category: 'OTHER', icon: '🔬', description: '完成一个简单的科学实验', periodType: 'monthly' },
  // 小学高年级
  { name: '编程启蒙学习', category: 'OTHER', icon: '💻', description: '学习基础的编程思维', periodType: 'weekly' },
  // 初中
  { name: '探究学习项目', category: 'OTHER', icon: '🔍', description: '完成一个探究学习项目', periodType: 'monthly' },

  // ========== 亲子互动 OTHER (6) ==========
  { name: '亲子游戏时光', category: 'OTHER', icon: '🎮', description: '和家长一起玩游戏', periodType: 'weekly' },
  { name: '亲子厨房', category: 'OTHER', icon: '👨‍🍳', description: '和家长一起做简单的食物', periodType: 'monthly' },
  { name: '户外踏青', category: 'OTHER', icon: '🌳', description: '和家长一起到户外踏青', periodType: 'monthly' },
  { name: '亲子阅读时光', category: 'OTHER', icon: '📚', description: '和家长一起阅读', periodType: 'weekly' },
  { name: '亲子运动', category: 'OTHER', icon: '⚽', description: '和家长一起运动锻炼', periodType: 'weekly' },
  { name: '家庭会议', category: 'OTHER', icon: '👨‍👩‍👧', description: '参与家庭会议讨论', periodType: 'monthly' },

  // ========== 其他 OTHER (6) ==========
  { name: '照顾小动物', category: 'OTHER', icon: '🐶', description: '喂养和照顾家里的宠物', periodType: 'daily' },
  { name: '参观展览', category: 'OTHER', icon: '🏛️', description: '去博物馆、科技馆等参观', periodType: 'monthly' },
  { name: '益智游戏', category: 'OTHER', icon: '🧩', description: '完成数独、棋类等益智游戏', periodType: 'weekly' },
  { name: '户外写生', category: 'OTHER', icon: '🎨', description: '到户外进行绘画写生', periodType: 'monthly' },
  { name: '环保行动', category: 'OTHER', icon: '♻️', description: '参与一次环保行动', periodType: 'monthly' },
  { name: '照顾植物', category: 'OTHER', icon: '🌻', description: '种植并照顾一种植物', periodType: 'monthly' },
];

const PERIOD_LABELS = { once: '单次', daily: '每天', weekly: '每周', monthly: '每月' };

// 各频次的时间段默认值与说明：单次默认明天，每天默认 1 个月，每周默认 3 个月，每月默认 1 年
const RANGE_HINTS = {
  once: '单次任务默认安排在明天，可在下方修改',
  daily: '每天任务默认持续 1 个月，可在下方修改',
  weekly: '每周任务默认持续 3 个月，可在下方修改',
  monthly: '每月任务默认持续 1 年，可在下方修改',
  custom: '按自定义间隔持续，请选择开始与结束日期'
};

// 日期选择器起点：今天
function buildPickerRangeStart() {
  return toDateStr(dayStart(Date.now()));
}

Page(keyboardAvoid({
  data: {
    children: [],
    selectedChildId: '',
    categories: [
      // 智育
      { key: 'STUDY', name: '学习', icon: '📚' },
      { key: 'READING', name: '阅读', icon: '📖' },
      // 体育
      { key: 'SPORTS', name: '运动', icon: '⚽' },
      // 美育
      { key: 'ART', name: '艺术', icon: '🎨' },
      // 德育
      { key: 'MORAL_FAMILY', name: '家庭美德', icon: '💝' },
      { key: 'MORAL_SOCIAL', name: '社会公德', icon: '🌟' },
      { key: 'MORAL_SELF', name: '自我管理', icon: '⏰' },
      { key: 'HABIT', name: '习惯', icon: '🌱' },
      // 劳育
      { key: 'HOUSEWORK', name: '家务', icon: '🏠' },
      { key: 'LIFE_SELF', name: '自理', icon: '🧹' },
      { key: 'LIFE_MONEY', name: '理财', icon: '💰' },
      { key: 'LIFE_SOCIAL', name: '社交', icon: '🤝' },
      // 其他
      { key: 'OTHER', name: '其他', icon: '✨' }
    ],
    selectedCategoryName: '',
    formData: {
      name: '', category: '', basePoints: 10, description: '', icon: '📝',
      periodType: 'once', periodDays: 1, targetCount: 1,
      // 时间范围：单次默认明天一天，其余频次按默认时长铺开
      startDate: 0, endDate: 0
    },
    // 日期选择器的值（'YYYY-MM-DD'）与可选下限
    startDateStr: '',
    endDateStr: '',
    rangeStart: buildPickerRangeStart(),
    rangeHint: RANGE_HINTS.once,
    rangeSummary: '',
    // 用户是否手动改过结束日期：改过之后切换频次不再覆盖他的选择
    endDateTouched: false,
    periods: [
      { key: 'once', name: '单次任务' },
      { key: 'daily', name: '每天任务' },
      { key: 'weekly', name: '每周任务' },
      { key: 'monthly', name: '每月任务' }
    ],
    selectedPeriodName: '单次任务',
    loading: false,
    // 五育领域筛选
    presetDomains: [
      { key: '', name: '全部' },
      { key: 'intelligence', name: '🧠智育' },
      { key: 'physical', name: '💪体育' },
      { key: 'aesthetic', name: '🎨美育' },
      { key: 'moral', name: '💝德育' },
      { key: 'lifeSkill', name: '🏠劳育' },
      { key: 'other', name: '✨其他' }
    ],
    presetDomain: '',
    // 新版筛选分类 - 按育域分组
    presetCategories: [
      { key: '', name: '全部', domain: '' },
      // 智育
      { key: 'STUDY', name: '学习', domain: 'intelligence', domainName: '🧠智育' },
      { key: 'READING', name: '阅读', domain: 'intelligence', domainName: '🧠智育' },
      // 体育
      { key: 'SPORTS', name: '运动', domain: 'physical', domainName: '💪体育' },
      // 美育
      { key: 'ART', name: '艺术', domain: 'aesthetic', domainName: '🎨美育' },
      // 德育
      { key: 'MORAL_FAMILY', name: '家庭美德', domain: 'moral', domainName: '💝德育' },
      { key: 'MORAL_SOCIAL', name: '社会公德', domain: 'moral', domainName: '💝德育' },
      { key: 'MORAL_SELF', name: '自我管理', domain: 'moral', domainName: '💝德育' },
      { key: 'HABIT', name: '习惯', domain: 'moral', domainName: '💝德育' },
      // 劳育
      { key: 'HOUSEWORK', name: '家务', domain: 'lifeSkill', domainName: '🏠劳育' },
      { key: 'LIFE_SELF', name: '自理', domain: 'lifeSkill', domainName: '🏠劳育' },
      { key: 'LIFE_MONEY', name: '理财', domain: 'lifeSkill', domainName: '🏠劳育' },
      { key: 'LIFE_SOCIAL', name: '社交', domain: 'lifeSkill', domainName: '🏠劳育' },
      // 其他
      { key: 'OTHER', name: '其他', domain: 'other', domainName: '✨其他' }
    ],
    presetPeriods: [
      { key: '', name: '全部周期' },
      { key: 'daily', name: '每天' },
      { key: 'weekly', name: '每周' },
      { key: 'monthly', name: '每月' },
      { key: 'once', name: '单次' }
    ],
    presetCategory: '',
    presetPeriod: '',
    presetCategoryName: '全部分类',
    presetPeriodName: '全部周期',
    presetKeyword: '',
    presets: PRESET_TASKS.map(task => ({ ...task, basePoints: analyzeTaskPoints(task).points })),
    displayPresets: [],
    displayCategories: [],
    scorePreview: 4,
    scoreReason: '按任务分类与完成要求评估',
    // 智能成长计划弹窗
    showGrowthPlan: false,
    selectedGrade: '',
    currentMonthName: '',
    growthPlan: { phases: [], totalTasks: 0, coveredMonths: 0 },
    selectedGrowthTasksCount: 0
  },

  onLoad() {
    // 初始化预设任务展示
    this.setData({
      displayPresets: this.data.presets.map(task => ({
        ...task,
        basePoints: analyzeTaskPoints(task).points,
        periodLabel: task.periodType === 'custom' ? `每${task.periodDays}天` : PERIOD_LABELS[task.periodType]
      })),
      displayCategories: this.data.presetCategories
    });
    // 初始化时间范围：单次默认明天
    const range = getDefaultRange('once');
    this.applyRange(range.startDate, range.endDate, false);
    this.setData({ rangeStart: buildPickerRangeStart() });
    // 加载孩子列表
    this.loadChildren();
  },

  onShow() {
    // 每次显示时刷新孩子列表
    this.loadChildren();
  },

  async loadChildren() {
    try {
      const res = await app.callCloudFunction('child', { action: 'listChildren' });
      if (res.success && res.list && res.list.length > 0) {
        const children = res.list;
        const currentChildId = app.globalData.currentChildId;
        const selectedChildId = children.find(c => c._id === currentChildId)?._id || children[0]._id;
        this.setData({ children, selectedChildId });
        // 当前孩子失效（被删除）时回退到第一个孩子，并同步全局状态
        if (currentChildId !== selectedChildId) app.saveCurrentChildId(selectedChildId);
      }
    } catch (e) {
      console.error('加载孩子列表失败', e);
    }
  },

  onSelectChild(e) {
    const childId = e.currentTarget.dataset.id;
    app.saveCurrentChildId(childId);
    this.setData({ selectedChildId: childId });
  },

  // 次数步进器已移除：任务数量改由开始/结束日期决定
  applyRange(startDate, endDate, endDateTouched) {
    const start = dayStart(startDate);
    const end = Math.max(start, dayStart(endDate));
    const periodType = this.data.formData.periodType;
    const total = countPeriods({
      periodType,
      periodDays: this.data.formData.periodDays,
      startDate: start,
      endDate: end
    });
    this.setData({
      formData: { ...this.data.formData, startDate: start, endDate: end },
      startDateStr: toDateStr(start),
      endDateStr: toDateStr(end),
      rangeSummary: formatRangeSummary(start, end, total),
      endDateTouched: endDateTouched === undefined ? this.data.endDateTouched : endDateTouched
    });
  },

  // 切换频次时按该频次的默认时间段重新铺开（用户手动改过结束日期则只校正起点）
  onPeriodTap(e) {
    const period = this.data.periods.find(item => item.key === e.currentTarget.dataset.type);
    if (!period) return;
    const periodType = period.key;
    const periodDays = this.data.formData.periodDays;

    this.setData({
      selectedPeriodName: period.name,
      'formData.periodType': periodType,
      rangeHint: RANGE_HINTS[periodType] || RANGE_HINTS.once
    });

    if (this.data.endDateTouched) {
      const start = this.data.formData.startDate;
      this.applyRange(start, Math.max(start, this.data.formData.endDate), true);
    } else {
      const range = getDefaultRange(periodType, periodDays);
      this.applyRange(range.startDate, range.endDate, false);
    }
  },

  onStartDateChange(e) {
    const start = parseDateStr(e.detail.value);
    if (start === null) return;
    // 开始日期变了：保持结束日期不变，重新计算次数
    const end = this.data.formData.endDate;
    this.applyRange(start, end, this.data.endDateTouched);
  },

  onEndDateChange(e) {
    const end = parseDateStr(e.detail.value);
    if (end === null) return;
    // 结束日期变了：保持开始日期不变，重新计算次数
    const start = this.data.formData.startDate;
    this.applyRange(start, Math.max(start, end), true);
  },

  onNameInput(e) {
    const formData = { ...this.data.formData, name: e.detail.value };
    this.updateScorePreview(formData);
  },

  onCategoryChange(e) {
    const category = this.data.categories[e.detail.value];
    const formData = { ...this.data.formData, category: category.key, icon: category.icon };
    this.setData({
      selectedCategoryName: category.name,
      'formData.category': category.key,
      'formData.icon': category.icon
    });
    this.updateScorePreview(formData);
  },

  onDescriptionInput(e) {
    const formData = { ...this.data.formData, description: e.detail.value };
    this.updateScorePreview(formData);
  },

  updateScorePreview(formData) {
    const preview = analyzeTaskPoints(formData);
    this.setData({ formData, scorePreview: preview.points, scoreReason: preview.reason });
  },

  onNumberInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ ['formData.' + field]: value });
  },

  updatePresetFilters(values) {
    const presetCategory = values.presetCategory !== undefined ? values.presetCategory : this.data.presetCategory;
    const presetPeriod = values.presetPeriod !== undefined ? values.presetPeriod : this.data.presetPeriod;
    const presetDomain = values.presetDomain !== undefined ? values.presetDomain : this.data.presetDomain;
    const presetKeyword = (values.presetKeyword !== undefined ? values.presetKeyword : this.data.presetKeyword).trim().toLowerCase();

    // 先按领域过滤 presetCategories 的展示范围
    const visibleCats = this.data.presetCategories
      .filter(c => !presetDomain || c.domain === presetDomain);
    const visibleKeys = new Set(visibleCats.map(c => c.key));

    // 当选择了具体领域时，只显示该领域下的分类；否则显示全部分类
    const displayCategories = presetDomain ? visibleCats : this.data.presetCategories;

    const displayPresets = this.data.presets
      .filter(task => !presetDomain || visibleKeys.has(task.category))
      .filter(task => !presetCategory || task.category === presetCategory)
      .filter(task => !presetPeriod || task.periodType === presetPeriod)
      .filter(task => !presetKeyword || `${task.name} ${task.description}`.toLowerCase().includes(presetKeyword))
      .map(task => ({
        ...task,
        basePoints: analyzeTaskPoints(task).points,
        periodLabel: task.periodType === 'custom' ? `每${task.periodDays}天` : PERIOD_LABELS[task.periodType]
      }));
    this.setData({ ...values, displayPresets, displayCategories });
  },

  onPresetSearchInput(e) {
    this.updatePresetFilters({ presetKeyword: e.detail.value });
  },

  onPresetCategoryChange(e) {
    // 兼容保留原 picker 调用
    const presetCategory = this.data.presetCategories[e.detail.value];
    this.updatePresetFilters({
      presetCategory: presetCategory.key,
      presetCategoryName: presetCategory.key ? presetCategory.name : '全部分类'
    });
  },

  onPresetCategoryTap(e) {
    const key = e.currentTarget.dataset.key;
    const cat = this.data.presetCategories.find(c => c.key === key) || this.data.presetCategories[0];
    this.updatePresetFilters({
      presetCategory: cat.key,
      presetCategoryName: cat.key ? cat.name : '全部分类'
    });
  },

  onPresetPeriodChange(e) {
    const presetPeriod = this.data.presetPeriods[e.detail.value];
    this.updatePresetFilters({
      presetPeriod: presetPeriod.key,
      presetPeriodName: presetPeriod.key ? presetPeriod.name : '全部周期'
    });
  },

  onPresetPeriodTap(e) {
    const key = e.currentTarget.dataset.key;
    const period = this.data.presetPeriods.find(p => p.key === key) || this.data.presetPeriods[0];
    this.updatePresetFilters({
      presetPeriod: period.key,
      presetPeriodName: period.key ? period.name : '全部周期'
    });
  },

  onPresetDomainTap(e) {
    const key = e.currentTarget.dataset.key;
    const domain = this.data.presetDomains.find(d => d.key === key) || this.data.presetDomains[0];
    // 选领域时同时清空已选分类，避免组合出空结果
    this.updatePresetFilters({
      presetDomain: domain.key,
      presetCategory: '',
      presetCategoryName: domain.key ? '全部' : '全部分类'
    });
  },

  async createTask(task, clearForm, options = {}) {
    if (this.data.loading) return;
    if (!task.name || !task.category) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    // 任务必须绑定到具体孩子：云函数 createTask 缺 childId 会返回「请先选择孩子」
    const childId = task.childId || this.data.selectedChildId || app.globalData.currentChildId;
    if (!childId) {
      wx.showToast({ title: '请先选择孩子', icon: 'none' });
      return;
    }
    // 时间段必填：起止日期决定任务在任务页里会展开成哪些周期
    const startDate = Number(task.startDate) || 0;
    const endDate = Number(task.endDate) || 0;
    if (!startDate || !endDate) {
      wx.showToast({ title: '请选择任务时间段', icon: 'none' });
      return;
    }
    if (endDate < startDate) {
      wx.showToast({ title: '结束日期不能早于开始日期', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await app.callCloudFunction('task', {
        action: 'createTask',
        ...task,
        childId,
        startDate,
        endDate,
        periodDays: Math.max(1, parseInt(task.periodDays, 10) || 1),
        targetCount: 1
      });

      if (res.success) {
        const total = res.totalPeriods || countPeriods({ ...task, startDate, endDate });
        // silent 模式不弹 toast，用于批量创建场景
        if (!options.silent) {
          wx.showToast({ title: `已生成 ${total} 个周期`, icon: 'success' });
          if (clearForm) this.resetCustomForm();
          setTimeout(() => wx.switchTab({ url: '/pages/task/task' }), 1500);
        }
      } else {
        wx.showToast({ title: res.error || '创建失败', icon: 'none' });
      }
    } catch (e) {
      console.error(e);
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 创建成功后清空表单，并让时间范围回到「单次 = 明天」的默认状态
  resetCustomForm() {
    this.setData({
      formData: {
        name: '', category: '', basePoints: 10, description: '', icon: '📝',
        periodType: 'once', periodDays: 1, targetCount: 1, startDate: 0, endDate: 0
      },
      selectedCategoryName: '',
      selectedPeriodName: '单次任务',
      scorePreview: 4,
      scoreReason: '按任务分类与完成要求评估',
      rangeHint: RANGE_HINTS.once,
      endDateTouched: false
    });
    const range = getDefaultRange('once');
    this.applyRange(range.startDate, range.endDate, false);
  },

  async onPresetTap(e) {
    const task = e.currentTarget.dataset.task;
    // 正在创建时忽略重复点击，避免弹出第二个确认框
    if (this.data.loading) return;

    const periodLabel = task.periodLabel || (task.periodType === 'custom' ? `每${task.periodDays || 1}天` : PERIOD_LABELS[task.periodType] || '单次');
    const points = analyzeTaskPoints(task).points;
    // 模板按该频次的默认时间段创建，弹窗里写清楚会生成多少个周期
    const range = getDefaultRange(task.periodType, task.periodDays || 1);
    const total = countPeriods({
      periodType: task.periodType,
      periodDays: task.periodDays || 1,
      startDate: range.startDate,
      endDate: range.endDate
    });
    const rangeText = formatRangeSummary(range.startDate, range.endDate, total);

    // 添加确认弹窗，避免误点直接创建任务
    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '添加任务',
        content: `「${task.name}」\n${periodLabel} · ${points} 积分\n${rangeText}\n确定要添加这个任务吗？`,
        confirmText: '确认添加',
        cancelText: '取消',
        success: (result) => resolve(!!result.confirm),
        // 弹窗失败（例如同时有其他弹窗）时不静默卡住，按未确认处理
        fail: () => resolve(false)
      });
    });

    if (!confirmed) return;
    
    await this.createTask({
      name: task.name,
      category: task.category,
      description: task.description,
      icon: task.icon,
      periodType: task.periodType,
      periodDays: task.periodDays || 1,
      startDate: range.startDate,
      endDate: range.endDate
    }, false);
  },

  // 点击"创建自定义任务"：数据全在 this.data.formData 里（bindtap 不走 e.detail.value）
  onCustomSubmit() {
    const { formData } = this.data;
    if (!formData.name || !formData.category) {
      wx.showToast({ title: '请填写名称和分类', icon: 'none' });
      return;
    }
    this.createTask({ ...formData }, true);
  },

  // ========== 智能年成长计划 ==========
  // 年级列表 - 与 grade.js 的年级代码对应
  grades: [
    { key: 'K', name: '幼儿园', icon: '🏠', stage: 'kindergarten', codes: ['kindergarten_small', 'kindergarten_medium', 'kindergarten_big'] },
    { key: 'G1', name: '小一', icon: '📒', stage: 'primary', codes: ['primary_1'] },
    { key: 'G2', name: '小二', icon: '📓', stage: 'primary', codes: ['primary_2'] },
    { key: 'G3', name: '小三', icon: '📔', stage: 'primary', codes: ['primary_3'] },
    { key: 'G4', name: '小四', icon: '📕', stage: 'primary', codes: ['primary_4'] },
    { key: 'G5', name: '小五', icon: '📗', stage: 'primary', codes: ['primary_5'] },
    { key: 'G6', name: '小六', icon: '📘', stage: 'primary', codes: ['primary_6'] },
    { key: 'J1', name: '初一', icon: '📙', stage: 'junior', codes: ['middle_1'] },
    { key: 'J2', name: '初二', icon: '📚', stage: 'junior', codes: ['middle_2'] },
    { key: 'J3', name: '初三', icon: '📛', stage: 'junior', codes: ['middle_3'] },
  ],

  // 打开成长计划弹窗 - 自动选中孩子年级
  async onOpenGrowthPlan() {
    // 先获取当前选中孩子的年级
    let defaultGrade = '';
    let hasChildren = false;

    try {
      const res = await app.callCloudFunction('child', { action: 'listChildren' });
      if (res.success && res.list && res.list.length) {
        hasChildren = true;
        const currentChildId = app.globalData.currentChildId;
        const child = res.list.find(c => c._id === currentChildId) || res.list[0];
        if (child && child.grade) {
          // 将孩子的年级代码映射到成长计划年级
          const gradeItem = (this.grades || []).find(g => g.codes && g.codes.includes(child.grade));
          if (gradeItem) {
            defaultGrade = gradeItem.key;
          }
        }
      }
    } catch (e) {
      console.error('获取孩子年级失败', e);
    }

    this.setData({
      showGrowthPlan: true,
      selectedGrade: defaultGrade,
      hasChildrenInPlan: hasChildren,
      growthPlan: { phases: [], totalTasks: 0, coveredMonths: 0 }
    });

    // 如果有默认年级，生成成长计划
    if (defaultGrade) {
      this.generateGrowthPlan(defaultGrade);
    }
  },

  // 关闭成长计划弹窗
  onCloseGrowthPlan() {
    this.setData({ showGrowthPlan: false });
  },

  // 选择年级
  onGradeSelect(e) {
    const grade = e.currentTarget.dataset.grade;
    this.setData({ selectedGrade: grade });
    this.generateGrowthPlan(grade);
  },

  // 获取当前月份名称
  getCurrentMonthName() {
    const now = new Date();
    const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    return months[now.getMonth()];
  },

  // 生成成长计划
  generateGrowthPlan(grade) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // 根据年级确定年龄段和年级级别
    const stage = this.getGradeStage(grade);
    const gradeLevel = this.getGradeLevel(grade);

    // 生成时间阶段（考虑暑假、寒假）
    const phases = this.generatePhases(currentMonth, currentYear, stage, gradeLevel);

    // 计算总任务数和覆盖月数
    let totalTasks = 0;
    let coveredMonths = 0;
    let selectedCount = 0;
    phases.forEach(phase => {
      const taskCount = phase.tasks.length;
      totalTasks += taskCount;
      if (taskCount > 0) coveredMonths++;
      phase.tasks.forEach(t => {
        if (t.selected) selectedCount++;
      });
    });

    // 获取月份名称
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const currentMonthName = monthNames[currentMonth - 1];

    this.setData({
      currentMonthName,
      growthPlan: { phases, totalTasks, coveredMonths },
      selectedGrowthTasksCount: selectedCount
    });
  },

  // 获取年级阶段
  getGradeStage(grade) {
    if (!grade) return 'primary';
    if (grade.startsWith('kindergarten')) return 'kindergarten';
    if (grade.startsWith('primary')) return 'primary';
    if (grade.startsWith('middle')) return 'middle';
    return 'primary';
  },

  // 获取年级级别（用于能力梯度递进）
  // 返回该阶段内的年级数字：幼儿园1-3，小学1-6，初中1-3
  getGradeLevel(grade) {
    if (!grade) return 1;
    if (grade.startsWith('kindergarten')) {
      if (grade === 'kindergarten_big') return 3;
      if (grade === 'kindergarten_medium') return 2;
      return 1;
    }
    if (grade.startsWith('primary_')) {
      return parseInt(grade.split('_')[1]) || 1;
    }
    if (grade.startsWith('middle_')) {
      return parseInt(grade.split('_')[1]) || 1;
    }
    return 1;
  },

  // 生成时间阶段
  generatePhases(currentMonth, currentYear, stage, gradeLevel) {
    const phases = [];

    // 根据当前月份确定各阶段
    if (currentMonth <= 6) {
      // 上半年：当前月 -> 6月底
      if (currentMonth >= 7) {
        // 暑假阶段
        phases.push(this.createPhase('暑假时光', `${currentMonth}月-8月`, this.getVacationTasks(stage, 'summer', gradeLevel), currentMonth));
      }
      phases.push(this.createPhase('学期成长', `${currentMonth}月-6月`, this.getSemesterTasks(stage, gradeLevel), currentMonth));
      phases.push(this.createPhase('期末冲刺', '6月', this.getExamTasks(stage, gradeLevel), 6));
    }

    if (currentMonth >= 7 || currentMonth <= 2) {
      // 暑假/寒假阶段
      const vacationType = currentMonth >= 6 && currentMonth <= 8 ? 'summer' : 'winter';
      const startMonth = currentMonth >= 6 && currentMonth <= 8 ? Math.max(currentMonth, 7) : 1;
      const endMonth = currentMonth >= 6 && currentMonth <= 8 ? 8 : 2;
      phases.push(this.createPhase(
        vacationType === 'summer' ? '暑假时光' : '寒假时光',
        `${startMonth}月-${endMonth}月`,
        this.getVacationTasks(stage, vacationType, gradeLevel),
        startMonth
      ));
    }

    if (currentMonth >= 9 || (currentMonth >= 1 && currentMonth <= 2)) {
      // 下半年/春季学期
      const startMonth = currentMonth <= 2 ? 2 : Math.max(currentMonth, 9);
      phases.push(this.createPhase('新学期规划', `${startMonth}月-12月`, this.getSemesterTasks(stage, gradeLevel), startMonth));
      phases.push(this.createPhase('年末总结', '12月', this.getYearEndTasks(stage, gradeLevel), 12));
    }

    // 按月份排序
    phases.sort((a, b) => a.startMonth - b.startMonth);

    return phases;
  },

  // 创建阶段
  createPhase(name, dateRange, tasks, startMonth) {
    const periodLabels = { once: '单次', daily: '每天', weekly: '每周', monthly: '每月' };
    return {
      name,
      dateRange,
      startMonth,
      tasks: tasks.map(t => ({
        ...t,
        selected: true, // 默认全选
        periodLabel: periodLabels[t.periodType] || t.periodType,
        domainName: t.domainName || '其他',
        domain: t.domain || 'other'
      }))
    };
  },

  // 学期任务 - 教育专家设计：五育并举，因龄施教
  getSemesterTasks(stage, gradeLevel) {
    if (stage === 'kindergarten') {
      // 幼儿园：感官探索+习惯萌芽+亲子陪伴
      return [
        { name: '亲子绘本阅读', icon: '📚', category: 'READING', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '每天亲子共读，培养阅读兴趣' },
        { name: '涂鸦创作', icon: '🎨', category: 'ART', domain: 'aesthetic', domainName: '美育', periodType: 'daily', description: '自由绘画，表达想象力' },
        { name: '户外运动', icon: '⚽', category: 'SPORTS', domain: 'physical', domainName: '体育', periodType: 'daily', description: '每日户外活动，增强体质' },
        { name: '早睡早起', icon: '😴', category: 'HEALTH', domain: 'physical', domainName: '体育', periodType: 'daily', description: '规律作息，养成好习惯' },
        { name: '礼貌问候', icon: '👋', category: 'MORAL_SOCIAL', domain: 'moral', domainName: '德育', periodType: 'daily', description: '主动问好，懂得礼貌' },
        { name: '帮做家务', icon: '🏠', category: 'HOUSEWORK', domain: 'lifeSkill', domainName: '劳育', periodType: 'weekly', description: '力所能及的家务' },
      ];
    } else if (stage === 'primary') {
      if (gradeLevel <= 2) {
        // 小学低年级：习惯养成+学习适应+同伴交往
        return [
          { name: '专注作业20分钟', icon: '✍️', category: 'STUDY', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '专心写作业，坐姿端正' },
          { name: '阅读20分钟', icon: '📖', category: 'READING', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '每日阅读，积累词汇' },
          { name: '跳绳练习', icon: '🪢', category: 'SPORTS', domain: 'physical', domainName: '体育', periodType: 'daily', description: '跳绳100个，锻炼体能' },
          { name: '整理书包', icon: '🎒', category: 'SELF_CARE', domain: 'lifeSkill', domainName: '劳育', periodType: 'daily', description: '整理第二天物品' },
          { name: '礼貌问候', icon: '👋', category: 'MORAL_SOCIAL', domain: 'moral', domainName: '德育', periodType: 'daily', description: '主动问好，友爱同学' },
          { name: '家务分担', icon: '🏠', category: 'HOUSEWORK', domain: 'lifeSkill', domainName: '劳育', periodType: 'weekly', description: '承担力所能及的家务' },
        ];
      } else if (gradeLevel <= 4) {
        // 小学中年级：能力提升+兴趣培养
        return [
          { name: '专注作业30分钟', icon: '✍️', category: 'STUDY', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '专心写作业，做好检查' },
          { name: '阅读30分钟', icon: '📖', category: 'READING', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '深度阅读，做好笔记' },
          { name: '户外运动', icon: '⚽', category: 'SPORTS', domain: 'physical', domainName: '体育', periodType: 'daily', description: '每日运动30分钟' },
          { name: '护眼习惯', icon: '👀', category: 'HEALTH', domain: 'physical', domainName: '体育', periodType: 'daily', description: '正确用眼，定时休息' },
          { name: '时间规划', icon: '⏰', category: 'HABIT', domain: 'moral', domainName: '德育', periodType: 'weekly', description: '学习时间管理' },
          { name: '家务分担', icon: '🏠', category: 'HOUSEWORK', domain: 'lifeSkill', domainName: '劳育', periodType: 'weekly', description: '承担固定家务' },
        ];
      } else {
        // 小学高年级：自主管理+价值观形成
        return [
          { name: '自主作业', icon: '✍️', category: 'STUDY', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '独立完成，主动检查' },
          { name: '深度阅读', icon: '📚', category: 'READING', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '主题阅读，做好批注' },
          { name: '体育锻炼', icon: '🏃', category: 'SPORTS', domain: 'physical', domainName: '体育', periodType: 'daily', description: '每日运动40分钟' },
          { name: '错题整理', icon: '📒', category: 'STUDY', domain: 'intelligence', domainName: '智育', periodType: 'weekly', description: '整理错题本，分析原因' },
          { name: '时间管理', icon: '⏰', category: 'HABIT', domain: 'moral', domainName: '德育', periodType: 'weekly', description: '制定计划，执行复盘' },
          { name: '家务承担', icon: '🏠', category: 'HOUSEWORK', domain: 'lifeSkill', domainName: '劳育', periodType: 'weekly', description: '独立完成家务' },
        ];
      }
    } else {
      // 初中：自主学习+情绪成熟+社会责任
      return [
        { name: '自主学习', icon: '📚', category: 'STUDY', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '制定计划，独立完成' },
        { name: '阅读提升', icon: '📖', category: 'READING', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '经典阅读，拓展视野' },
        { name: '体育锻炼', icon: '🏃', category: 'SPORTS', domain: 'physical', domainName: '体育', periodType: 'daily', description: '每日运动50分钟' },
        { name: '作息规律', icon: '⏰', category: 'HEALTH', domain: 'physical', domainName: '体育', periodType: 'daily', description: '早睡早起，自我管理' },
        { name: '周计划复盘', icon: '📋', category: 'HABIT', domain: 'moral', domainName: '德育', periodType: 'weekly', description: '制定计划，总结复盘' },
        { name: '家务承担', icon: '🏠', category: 'HOUSEWORK', domain: 'lifeSkill', domainName: '劳育', periodType: 'weekly', description: '分担家庭责任' },
      ];
    }
  },

  // 假期任务 - 教育专家设计：暑假重体验探索，寒假重传统文化
  getVacationTasks(stage, vacationType, gradeLevel) {
    if (vacationType === 'summer') {
      // 暑假：体验式学习 + 户外探索 + 亲子协作
      if (stage === 'kindergarten') {
        return [
          { name: '暑期作息', icon: '😴', category: 'HABIT', domain: 'moral', domainName: '德育', periodType: 'daily', description: '保持规律作息' },
          { name: '涂鸦创作', icon: '🎨', category: 'ART', domain: 'aesthetic', domainName: '美育', periodType: 'daily', description: '每日自由绘画' },
          { name: '户外探索', icon: '🌳', category: 'SPORTS', domain: 'physical', domainName: '体育', periodType: 'weekly', description: '大自然探索' },
          { name: '亲子戏水', icon: '🏊', category: 'SPORTS', domain: 'physical', domainName: '体育', periodType: 'weekly', description: '安全玩水' },
          { name: '照顾植物', icon: '🌱', category: 'HOUSEWORK', domain: 'lifeSkill', domainName: '劳育', periodType: 'weekly', description: '照料植物' },
          { name: '亲子游戏', icon: '🎮', category: 'SOCIAL', domain: 'lifeSkill', domainName: '劳育', periodType: 'weekly', description: '亲子互动时光' },
        ];
      } else if (stage === 'primary') {
        if (gradeLevel <= 3) {
          // 小学低中年级：趣味探索为主
          return [
            { name: '游泳学习', icon: '🏊', category: 'SPORTS', domain: 'physical', domainName: '体育', periodType: 'weekly', description: '学会游泳' },
            { name: '阅读打卡', icon: '📖', category: 'READING', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '每日阅读30分钟' },
            { name: '科学实验', icon: '🔬', category: 'SCIENCE', domain: 'intelligence', domainName: '智育', periodType: 'weekly', description: '动手小实验' },
            { name: '户外徒步', icon: '🥾', category: 'SPORTS', domain: 'physical', domainName: '体育', periodType: 'weekly', description: '徒步探索自然' },
            { name: '才艺练习', icon: '🎨', category: 'ART', domain: 'aesthetic', domainName: '美育', periodType: 'weekly', description: '乐器/绘画练习' },
            { name: '亲子游戏', icon: '🎮', category: 'SOCIAL', domain: 'lifeSkill', domainName: '劳育', periodType: 'weekly', description: '亲子互动时光' },
          ];
        } else {
          // 小学高年级：兴趣深化 + 适度预习
          return [
            { name: '游泳训练', icon: '🏊', category: 'SPORTS', domain: 'physical', domainName: '体育', periodType: 'weekly', description: '游泳技能提升' },
            { name: '深度阅读', icon: '📚', category: 'READING', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '主题阅读' },
            { name: '科学探究', icon: '🔬', category: 'SCIENCE', domain: 'intelligence', domainName: '智育', periodType: 'weekly', description: '科学小课题研究' },
            { name: '户外探险', icon: '🥾', category: 'SPORTS', domain: 'physical', domainName: '体育', periodType: 'weekly', description: '户外探险活动' },
            { name: '艺术创作', icon: '🎨', category: 'ART', domain: 'aesthetic', domainName: '美育', periodType: 'weekly', description: '艺术创作项目' },
            { name: '亲子旅行', icon: '🌍', category: 'SOCIAL', domain: 'lifeSkill', domainName: '劳育', periodType: 'monthly', description: '家庭旅行计划' },
          ];
        }
      } else {
        // 初中：自主管理 + 职业探索 + 社会实践
        return [
          { name: '体能训练', icon: '💪', category: 'SPORTS', domain: 'physical', domainName: '体育', periodType: 'daily', description: '每日锻炼' },
          { name: '名著阅读', icon: '📚', category: 'READING', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '经典名著阅读' },
          { name: '自主预习', icon: '🧠', category: 'STUDY', domain: 'intelligence', domainName: '智育', periodType: 'weekly', description: '下学期知识预习' },
          { name: '志愿服务', icon: '🙋', category: 'MORAL_SOCIAL', domain: 'moral', domainName: '德育', periodType: 'monthly', description: '社区志愿服务' },
          { name: '职业探索', icon: '🔭', category: 'OTHER', domain: 'intelligence', domainName: '智育', periodType: 'monthly', description: '了解感兴趣的职业' },
          { name: '家庭会议', icon: '👨‍👩‍👧', category: 'SOCIAL', domain: 'lifeSkill', domainName: '劳育', periodType: 'monthly', description: '家庭沟通交流' },
        ];
      }
    } else {
      // 寒假：传统文化 + 家庭团聚 + 亲子协作
      if (stage === 'kindergarten') {
        return [
          { name: '新年习俗', icon: '🏮', category: 'MORAL_CULTURE', domain: 'moral', domainName: '德育', periodType: 'weekly', description: '了解春节习俗' },
          { name: '亲子手工', icon: '✂️', category: 'ART', domain: 'aesthetic', domainName: '美育', periodType: 'weekly', description: '新年手工制作' },
          { name: '健康作息', icon: '😴', category: 'HABIT', domain: 'moral', domainName: '德育', periodType: 'daily', description: '规律作息' },
          { name: '家庭聚会礼仪', icon: '👨‍👩‍👧', category: 'MORAL_FAMILY', domain: 'moral', domainName: '德育', periodType: 'weekly', description: '礼貌待客' },
          { name: '亲子游戏', icon: '🎮', category: 'SOCIAL', domain: 'lifeSkill', domainName: '劳育', periodType: 'weekly', description: '亲子互动时光' },
        ];
      } else if (stage === 'primary') {
        if (gradeLevel <= 3) {
          // 小学低中年级
          return [
            { name: '年味参与', icon: '🏮', category: 'MORAL_CULTURE', domain: 'moral', domainName: '德育', periodType: 'weekly', description: '春节习俗体验' },
            { name: '阅读时光', icon: '📖', category: 'READING', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '每日阅读' },
            { name: '体育锻炼', icon: '🏃', category: 'SPORTS', domain: 'physical', domainName: '体育', periodType: 'daily', description: '每日运动' },
            { name: '家务帮手', icon: '🏠', category: 'HOUSEWORK', domain: 'lifeSkill', domainName: '劳育', periodType: 'weekly', description: '春节大扫除' },
            { name: '新年祝福', icon: '🎁', category: 'MORAL_SOCIAL', domain: 'moral', domainName: '德育', periodType: 'weekly', description: '学会送祝福' },
          ];
        } else {
          // 小学高年级
          return [
            { name: '传统文化', icon: '🏮', category: 'MORAL_CULTURE', domain: 'moral', domainName: '德育', periodType: 'weekly', description: '传统文化学习' },
            { name: '深度阅读', icon: '📚', category: 'READING', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '主题阅读' },
            { name: '体育锻炼', icon: '🏃', category: 'SPORTS', domain: 'physical', domainName: '体育', periodType: 'daily', description: '每日运动' },
            { name: '新年规划', icon: '🎯', category: 'HABIT', domain: 'moral', domainName: '德育', periodType: 'once', description: '制定新年目标' },
            { name: '家庭责任', icon: '💪', category: 'HOUSEWORK', domain: 'lifeSkill', domainName: '劳育', periodType: 'weekly', description: '分担家务' },
          ];
        }
      } else {
        // 初中
        return [
          { name: '传统文化', icon: '🏮', category: 'MORAL_CULTURE', domain: 'moral', domainName: '德育', periodType: 'weekly', description: '春节文化传承' },
          { name: '名著阅读', icon: '📚', category: 'READING', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '经典名著阅读' },
          { name: '体能锻炼', icon: '💪', category: 'SPORTS', domain: 'physical', domainName: '体育', periodType: 'daily', description: '每日锻炼' },
          { name: '人际互动', icon: '🤝', category: 'SOCIAL', domain: 'lifeSkill', domainName: '劳育', periodType: 'weekly', description: '亲友社交互动' },
          { name: '下学期预习', icon: '📚', category: 'STUDY', domain: 'intelligence', domainName: '智育', periodType: 'weekly', description: '预习新知识' },
          { name: '家庭责任', icon: '💪', category: 'HOUSEWORK', domain: 'lifeSkill', domainName: '劳育', periodType: 'weekly', description: '承担家庭责任' },
        ];
      }
    }
  },

  // 考试阶段任务 - 精简版，专注复习
  getExamTasks(stage, gradeLevel) {
    if (stage === 'primary' || stage === 'junior') {
      return [
        { name: '错题回顾', icon: '📒', category: 'STUDY', domain: 'intelligence', domainName: '智育', periodType: 'daily', description: '复习错题' },
        { name: '作息调整', icon: '😴', category: 'HEALTH', domain: 'physical', domainName: '体育', periodType: 'daily', description: '早睡早起' },
        { name: '心理调适', icon: '🌈', category: 'HABIT', domain: 'moral', domainName: '德育', periodType: 'weekly', description: '放松心态' },
        { name: '模拟测试', icon: '📝', category: 'STUDY', domain: 'intelligence', domainName: '智育', periodType: 'weekly', description: '做模拟卷' },
      ];
    }
    return [];
  },

  // 年末任务 - 反思与规划
  getYearEndTasks(stage, gradeLevel) {
    if (stage === 'kindergarten') {
      return [
        { name: '年度回顾', icon: '📅', category: 'HABIT', domain: 'moral', domainName: '德育', periodType: 'once', description: '回顾这一年成长' },
        { name: '新年愿望', icon: '🎆', category: 'HABIT', domain: 'moral', domainName: '德育', periodType: 'once', description: '说出新年愿望' },
        { name: '感恩家人', icon: '💝', category: 'MORAL_FAMILY', domain: 'moral', domainName: '德育', periodType: 'once', description: '感谢家人陪伴' },
      ];
    } else if (stage === 'primary') {
      return [
        { name: '年度总结', icon: '📊', category: 'STUDY', domain: 'intelligence', domainName: '智育', periodType: 'once', description: '总结全年学习' },
        { name: '新年计划', icon: '🎯', category: 'HABIT', domain: 'moral', domainName: '德育', periodType: 'once', description: '制定新目标' },
        { name: '感恩家人', icon: '💝', category: 'MORAL_FAMILY', domain: 'moral', domainName: '德育', periodType: 'once', description: '感谢家人支持' },
      ];
    } else {
      return [
        { name: '学期总结', icon: '📊', category: 'STUDY', domain: 'intelligence', domainName: '智育', periodType: 'once', description: '总结本学期' },
        { name: '新年规划', icon: '🎯', category: 'HABIT', domain: 'moral', domainName: '德育', periodType: 'once', description: '制定新目标' },
        { name: '成长反思', icon: '🔄', category: 'HABIT', domain: 'moral', domainName: '德育', periodType: 'once', description: '自我复盘' },
        { name: '家庭责任', icon: '💪', category: 'HOUSEWORK', domain: 'lifeSkill', domainName: '劳育', periodType: 'once', description: '承担家庭责任' },
      ];
    }
  },

  // 切换成长任务勾选
  onToggleGrowthTask(e) {
    const { phaseIdx, taskIdx } = e.currentTarget.dataset;
    const { growthPlan } = this.data;
    const phases = [...growthPlan.phases];
    const phase = { ...phases[phaseIdx] };
    phase.tasks = [...phase.tasks];
    phase.tasks[taskIdx] = { ...phase.tasks[taskIdx], selected: !phase.tasks[taskIdx].selected };
    phases[phaseIdx] = phase;

    // 计算选中的任务数
    let selectedCount = 0;
    phases.forEach(p => {
      p.tasks.forEach(t => {
        if (t.selected) selectedCount++;
      });
    });

    this.setData({
      growthPlan: { ...growthPlan, phases },
      selectedGrowthTasksCount: selectedCount
    });
  },

  // 确认添加成长计划
  async onConfirmGrowthPlan() {
    const { growthPlan, selectedGrade } = this.data;

    // 收集选中的任务
    const selectedTasks = [];
    growthPlan.phases.forEach(phase => {
      phase.tasks.forEach(task => {
        if (task.selected) {
          selectedTasks.push(task);
        }
      });
    });

    if (selectedTasks.length === 0) {
      wx.showToast({ title: '请至少选择一个任务', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '添加中...' });

    try {
      // 获取当前日期
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // 为每个选中的任务创建周期实例（silent模式不弹toast）
      const gradeInfo = (this.grades || []).find(g => g.key === selectedGrade);
      const childId = this.data.selectedChildId;

      for (const task of selectedTasks) {
        // 根据周期类型确定时间段，periodDays 使用该频次的默认时长
        const periodDays = DEFAULT_RANGE_DAYS[task.periodType] || 30;
        const range = getDefaultRange(task.periodType, periodDays);

        await this.createTask({
          name: task.name,
          category: task.category,
          description: task.description,
          icon: task.icon,
          periodType: task.periodType,
          periodDays: periodDays,
          startDate: range.startDate,
          endDate: range.endDate,
          childId: childId
        }, false, { silent: true });
      }

      wx.hideLoading();
      wx.showToast({ title: `已添加 ${selectedTasks.length} 个任务`, icon: 'success' });

      // 关闭弹窗
      this.setData({ showGrowthPlan: false });

      // 跳转到任务页
      setTimeout(() => wx.switchTab({ url: '/pages/task/task' }), 1500);
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: e.message || '添加失败', icon: 'none' });
    }
  }
}));
