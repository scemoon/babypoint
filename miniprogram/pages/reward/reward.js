// pages/reward/reward.js
const app = getApp();
const { keyboardAvoid } = require('../../utils/keyboard');

// 内置奖励分类 - 教育专家设计的激励体系
const BUILTIN_CATEGORIES = [
  // 体验类 - 核心激励，注重亲子时光
  { key: 'FAMILY_TIME', name: '亲子时光', icon: '🎬', domain: 'experience' },
  { key: 'OUTDOOR', name: '户外探索', icon: '⛺', domain: 'experience' },
  { key: 'CULTURE', name: '文化体验', icon: '🏛️', domain: 'experience' },
  { key: 'RESPONSIBILITY', name: '小大人体验', icon: '🦸', domain: 'experience' },
  // 发展类 - 成长导向
  { key: 'STUDY_PRIVILEGE', name: '学习特权', icon: '📚', domain: 'growth' },
  { key: 'HOBBY', name: '兴趣拓展', icon: '🎯', domain: 'growth' },
  { key: 'TECH', name: '科技探索', icon: '🔬', domain: 'growth' },
  // 荣誉类 - 社交货币
  { key: 'AUTONOMY', name: '自主权', icon: '👑', domain: 'honor' },
  { key: 'SOCIAL', name: '社交特权', icon: '🤝', domain: 'honor' },
  { key: 'BADGE', name: '荣誉徽章', icon: '🏆', domain: 'honor' },
  // 物质类 - 适度使用
  { key: 'STATIONERY', name: '文具图书', icon: '✏️', domain: 'material' },
  { key: 'SPORTS', name: '运动装备', icon: '⚽', domain: 'material' },
  { key: 'SAVINGS', name: '小小储蓄', icon: '🐷', domain: 'material' }
];

// 加载自定义分类
function loadCustomCategoriesSync() {
  try {
    return wx.getStorageSync('customRewardCategories') || [];
  } catch (e) {
    return [];
  }
}

Page(keyboardAvoid({
  data: {
    builtinCategories: BUILTIN_CATEGORIES,
    categories: BUILTIN_CATEGORIES,
    currentCategory: '',
    keyword: '',
    rewards: [],
    filteredRewards: [],
    selectedChild: null,
    children: [],
    loading: false
  },

  onLoad() {
    const customCategories = loadCustomCategoriesSync();
    const merged = [...BUILTIN_CATEGORIES, ...customCategories];
    this.setData({
      categories: merged
    });
    this.loadChildren();
  },

  onShow() {
    if (app.globalData.currentChildId) {
      this.loadChildren();
    }
  },

  async loadChildren() {
    try {
      const res = await app.callCloudFunction('child', { action: 'listChildren' });
      if (res.success && res.list.length > 0) {
        const children = res.list;
        let selectedChild = children.find(c => c._id === app.globalData.currentChildId);
        if (!selectedChild) {
          selectedChild = children[0];
          app.saveCurrentChildId(selectedChild._id);
        }
        this.setData({ children, selectedChild });
        this.loadRewards();
      }
    } catch (e) {
      console.error(e);
    }
  },

  async loadRewards() {
    const { currentCategory } = this.data;
    this.setData({ loading: true });
    try {
      const res = await app.callCloudFunction('reward', {
        action: 'listRewards',
        category: currentCategory || undefined
      });
      if (res.success) {
        this.setData({ rewards: res.list || [] }, () => this.applyKeywordFilter());
      } else {
        this.setData({ rewards: [] }, () => this.applyKeywordFilter());
      }
    } catch (e) {
      console.error(e);
      this.setData({ rewards: [] }, () => this.applyKeywordFilter());
    } finally {
      this.setData({ loading: false });
    }
  },

  applyKeywordFilter() {
    const kw = (this.data.keyword || '').trim().toLowerCase();
    const source = this.data.rewards || [];
    if (!kw) {
      this.setData({ filteredRewards: source });
      return;
    }
    const filtered = source.filter(r => {
      return (r.name || '').toLowerCase().includes(kw) ||
             (r.description || '').toLowerCase().includes(kw);
    });
    this.setData({ filteredRewards: filtered });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value }, () => this.applyKeywordFilter());
  },

  onClearSearch() {
    this.setData({ keyword: '' }, () => this.applyKeywordFilter());
  },

  onCategoryChange(e) {
    const key = e.currentTarget.dataset.key;
    if (key === '' || key === undefined) {
      this.setData({ currentCategory: '' }, () => this.loadRewards());
    } else {
      this.setData({ currentCategory: key }, () => this.loadRewards());
    }
  },

  onSelectChild(e) {
    const childId = e.currentTarget.dataset.id;
    const child = this.data.children.find(c => c._id === childId);
    if (child) {
      app.saveCurrentChildId(childId);
      this.setData({ selectedChild: child });
    }
  },

  onRewardTap(e) {
    const reward = e.currentTarget.dataset.reward;
    const child = this.data.selectedChild;
    if (!child) {
      wx.showToast({ title: '请先选择孩子', icon: 'none' });
      return;
    }
    const available = (child.totalPoints || 0) - (child.redeemedPoints || 0);
    if (available < reward.points) {
      wx.showToast({ title: '积分不足 (' + available + ')', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/reward-detail/reward-detail?rewardId=' + reward._id + '&childId=' + child._id
    });
  },

  onAddReward() {
    wx.navigateTo({ url: '/pages/reward-add/reward-add' });
  }
}));
