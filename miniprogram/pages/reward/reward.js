// pages/reward/reward.js
const app = getApp();
const { keyboardAvoid } = require('../../utils/keyboard');

// 内置奖励分类（统一主题色，不使用多彩）
const BUILTIN_CATEGORIES = [
  { key: 'FOOD', name: '美食', icon: '🍔' },
  { key: 'PLAY', name: '娱乐', icon: '🎮' },
  { key: 'TOY', name: '玩具', icon: '🎁' },
  { key: 'OUTING', name: '出行', icon: '🚗' },
  { key: 'PRIVILEGE', name: '特权', icon: '👑' },
  { key: 'DIGITAL', name: '数码', icon: '📱' }
];

Page(keyboardAvoid({
  data: {
    builtinCategories: BUILTIN_CATEGORIES,
    customCategories: [],
    categories: BUILTIN_CATEGORIES,
    currentCategory: '',
    keyword: '',
    rewards: [],
    filteredRewards: [],
    selectedChild: null,
    children: [],
    loading: false,
    showAddCategory: false,
    newCategory: { name: '', icon: '🎁' }
  },

  onLoad() {
    this.loadCustomCategories();
    this.loadChildren();
  },

  onShow() {
    if (app.globalData.currentChildId) {
      this.loadRewards();
    }
  },

  loadCustomCategories() {
    try {
      const list = wx.getStorageSync('customRewardCategories') || [];
      this.setData({ customCategories: list }, () => this.rebuildCategories());
    } catch (e) {
      console.error(e);
    }
  },

  rebuildCategories() {
    const merged = [...this.data.builtinCategories, ...this.data.customCategories];
    this.setData({ categories: merged });
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
    const index = e.currentTarget.dataset.index;
    if (index === -1 || index === undefined) {
      this.setData({ currentCategory: '' }, () => this.loadRewards());
    } else {
      const target = this.data.categories[index];
      if (target) {
        this.setData({ currentCategory: target.key }, () => this.loadRewards());
      } else {
        this.setData({ currentCategory: '' }, () => this.loadRewards());
      }
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
  },

  // ---------- 自定义分类 ----------
  onShowAddCategory() {
    this.setData({
      showAddCategory: true,
      newCategory: { name: '', icon: '🎁' }
    });
  },

  onCloseAddCategory() {
    this.setData({ showAddCategory: false });
  },

  onNewCategoryNameInput(e) {
    this.setData({ 'newCategory.name': e.detail.value });
  },

  onNewCategoryIconTap(e) {
    this.setData({ 'newCategory.icon': e.currentTarget.dataset.icon });
  },

  onSaveCustomCategory() {
    const { name, icon } = this.data.newCategory;
    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' });
      return;
    }
    const trimmed = name.trim();
    if (trimmed.length > 8) {
      wx.showToast({ title: '名称不超过8个字', icon: 'none' });
      return;
    }
    const key = 'CUSTOM_' + Date.now().toString(36);
    const next = [...this.data.customCategories, { key, name: trimmed, icon, custom: true }];
    try {
      wx.setStorageSync('customRewardCategories', next);
    } catch (e) {
      console.error(e);
    }
    this.setData({
      customCategories: next,
      showAddCategory: false,
      currentCategory: key
    }, () => {
      this.rebuildCategories();
      this.loadRewards();
    });
    wx.showToast({ title: '已添加', icon: 'success' });
  },

  onLongPressCategory(e) {
    const index = e.currentTarget.dataset.index;
    const cat = this.data.categories[index];
    if (!cat || !cat.custom) return;
    wx.showActionSheet({
      itemList: ['删除该分类'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '删除分类',
            content: '确认删除「' + cat.name + '」？该分类下的奖励不会被删除。',
            success: (r) => {
              if (r.confirm) {
                const next = this.data.customCategories.filter(c => c.key !== cat.key);
                wx.setStorageSync('customRewardCategories', next);
                const updates = { customCategories: next };
                if (this.data.currentCategory === cat.key) {
                  updates.currentCategory = '';
                }
                this.setData(updates, () => {
                  this.rebuildCategories();
                  if (this.data.currentCategory === '') this.loadRewards();
                });
                wx.showToast({ title: '已删除', icon: 'success' });
              }
            }
          });
        }
      }
    });
  }
}));
