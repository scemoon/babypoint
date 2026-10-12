// pages/publish/publish.js
// 版本: v2.0 - 五育体系 + 全面任务模板
const app = getApp();
const { analyzeTaskPoints, CATEGORY_META } = require('../../utils/task-score');
const { keyboardAvoid } = require('../../utils/keyboard');
const {
  dayStart, toDateStr, parseDateStr, getDefaultRange, countPeriods, formatRangeSummary,
  getDefaultStart, calcEnd, calcCount, getPeriodCountRange, DEFAULT_PERIOD_COUNTS
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
  
  // ========== 其他 - 趣味任务 ==========
  { name: '学做一道新菜', category: 'OTHER', icon: '🍳', description: '在大人指导下学做简单菜肴', periodType: 'monthly' },
  { name: '科学小实验', category: 'OTHER', icon: '🔬', description: '完成一个简单的科学实验', periodType: 'monthly' },
  { name: '照顾小动物', category: 'OTHER', icon: '🐶', description: '喂养和照顾家里的宠物', periodType: 'daily' },
  { name: '参观博物馆', category: 'OTHER', icon: '🏛️', description: '去博物馆或科技馆学习', periodType: 'monthly' },
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
    // 周期次数
    periodCount: 1,
    countRange: { min: 1, max: 1 },
    periods: [
      { key: 'once', name: '单次任务' },
      { key: 'daily', name: '每天任务' },
      { key: 'weekly', name: '每周任务' },
      { key: 'monthly', name: '每月任务' },
      { key: 'custom', name: '自定义周期' }
    ],
    selectedPeriodName: '单次任务',
    loading: false,
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
      { key: 'once', name: '单次' },
      { key: 'custom', name: '自定义' }
    ],
    presetCategory: '',
    presetPeriod: '',
    presetCategoryName: '全部分类',
    presetPeriodName: '全部周期',
    presetKeyword: '',
    presets: PRESET_TASKS.map(task => ({ ...task, basePoints: analyzeTaskPoints(task).points })),
    displayPresets: [],
    scorePreview: 4,
    scoreReason: '按任务分类与完成要求评估'
  },

  onLoad() {
    // 初始化预设任务展示
    this.setData({
      displayPresets: this.data.presets.map(task => ({
        ...task,
        basePoints: analyzeTaskPoints(task).points,
        periodLabel: task.periodType === 'custom' ? `每${task.periodDays}天` : PERIOD_LABELS[task.periodType]
      }))
    });
    // 初始化时间范围：单次默认明天
    const range = getDefaultRange('once');
    this.applyRange(range.startDate, range.endDate, false);
    this.setData({ rangeStart: buildPickerRangeStart() });
  },

  // 次数步进器
  onCountStep(e) {
    const delta = Number(e.currentTarget.dataset.delta) || 0;
    const periodType = this.data.formData.periodType;
    if (periodType === 'custom') return; // 自定义周期不支持次数调整

    const countRange = this.data.countRange;
    let newCount = this.data.periodCount + delta;
    newCount = Math.max(countRange.min, Math.min(countRange.max, newCount));
    if (newCount === this.data.periodCount) return;

    // 重新计算结束日期，保持开始时间不变
    const start = this.data.formData.startDate;
    const newEnd = calcEnd(periodType, start, newCount);
    this.applyRange(start, newEnd, true);
  },

  // 把起止日期写回 data：同时维护 picker 用的字符串与列表用的展示文案
  applyRange(startDate, endDate, endDateTouched) {
    const start = dayStart(startDate);
    const end = Math.max(start, dayStart(endDate));
    const periodType = this.data.formData.periodType;
    const total = calcCount(periodType, start, end);
    const countRange = getPeriodCountRange(periodType);
    this.setData({
      formData: { ...this.data.formData, startDate: start, endDate: end },
      startDateStr: toDateStr(start),
      endDateStr: toDateStr(end),
      rangeSummary: formatRangeSummary(start, end, total),
      endDateTouched: endDateTouched === undefined ? this.data.endDateTouched : endDateTouched,
      periodCount: total,
      countRange
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

    if (periodType === 'custom') {
      // 自定义周期保持原有逻辑
      if (this.data.endDateTouched) {
        const start = this.data.formData.startDate;
        this.applyRange(start, Math.max(start, this.data.formData.endDate), true);
      } else {
        const range = getDefaultRange(periodType, periodDays);
        this.applyRange(range.startDate, range.endDate, false);
      }
      return;
    }

    // 新周期逻辑：根据周期类型计算默认开始日期和次数
    const now = Date.now();
    const defaultStart = getDefaultStart(periodType, now);
    const defaultCount = DEFAULT_PERIOD_COUNTS[periodType] || 1;
    const defaultEnd = calcEnd(periodType, defaultStart, defaultCount);
    const countRange = getPeriodCountRange(periodType);

    this.setData({
      periodCount: defaultCount,
      countRange
    });
    this.applyRange(defaultStart, defaultEnd, false);
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
    // 自定义间隔天数变了：时间段跨度按新间隔重新铺开（用户改过结束日期则保留）
    if (field === 'periodDays' && this.data.formData.periodType === 'custom' && !this.data.endDateTouched) {
      const range = getDefaultRange('custom', value);
      this.applyRange(range.startDate, range.endDate, false);
    }
  },

  updatePresetFilters(values) {
    const presetCategory = values.presetCategory !== undefined ? values.presetCategory : this.data.presetCategory;
    const presetPeriod = values.presetPeriod !== undefined ? values.presetPeriod : this.data.presetPeriod;
    const presetKeyword = (values.presetKeyword !== undefined ? values.presetKeyword : this.data.presetKeyword).trim().toLowerCase();
    
    const displayPresets = this.data.presets
      .filter(task => !presetCategory || task.category === presetCategory)
      .filter(task => !presetPeriod || task.periodType === presetPeriod)
      .filter(task => !presetKeyword || `${task.name} ${task.description}`.toLowerCase().includes(presetKeyword))
      .map(task => ({
        ...task,
        basePoints: analyzeTaskPoints(task).points,
        periodLabel: task.periodType === 'custom' ? `每${task.periodDays}天` : PERIOD_LABELS[task.periodType]
      }));
    this.setData({ ...values, displayPresets });
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

  async createTask(task, clearForm) {
    if (this.data.loading) return;
    if (!task.name || !task.category) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
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
        startDate,
        endDate,
        periodDays: Math.max(1, parseInt(task.periodDays, 10) || 1),
        targetCount: 1
      });

      if (res.success) {
        const total = res.totalPeriods || countPeriods({ ...task, startDate, endDate });
        wx.showToast({ title: `已生成 ${total} 个周期`, icon: 'success' });
        if (clearForm) this.resetCustomForm();
        setTimeout(() => wx.switchTab({ url: '/pages/task/task' }), 1500);
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

  onCustomSubmit(e) {
    const { name, category, description } = e.detail.value;
    if (!name || !category) {
      wx.showToast({ title: '请填写名称和分类', icon: 'none' });
      return;
    }
    this.createTask({
      ...this.data.formData,
      name,
      description
    }, true);
  }
}));
