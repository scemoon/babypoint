// pages/reward/reward.js
const app = getApp();

const CATEGORY_META = {
  'FOOD': { name: '美食', icon: '🍔', color: '#FF6B6B' },
  'PLAY': { name: '娱乐', icon: '🎮', color: '#4ECDC4' },
  'TOY': { name: '玩具', icon: '🎁', color: '#9B59B6' },
  'OUTING': { name: '出行', icon: '🚗', color: '#3498DB' },
  'PRIVILEGE': { name: '特权', icon: '👑', color: '#F39C12' },
  'DIGITAL': { name: '数码', icon: '📱', color: '#2ECC71' }
};

Page({
  data: {
    categories: Object.entries(CATEGORY_META).map(([key, val]) => ({ key, ...val })),
    currentCategory: '',
    rewards: [],
    selectedChild: null,
    children: [],
    loading: false
  },

  onLoad() {
    this.loadChildren();
  },

  onShow() {
    if (app.globalData.currentChildId) {
      this.loadRewards();
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
        this.setData({ rewards: res.list });
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ loading: false });
    }
  },

  onCategoryChange(e) {
    const index = e.currentTarget.dataset.index;
    const categories = this.data.categories;
    if (index === -1) {
      this.setData({ currentCategory: '' });
    } else {
      this.setData({ currentCategory: categories[index].key });
    }
    this.loadRewards();
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
});
