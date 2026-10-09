// pages/index/index.js
const app = getApp();

Page({
  data: {
    currentChild: null,
    currentChildRank: 0,
    children: [],
    ranking: [],
    latestRedemptions: [],
    showChildPicker: false
  },

  onLoad() {
    this.checkLogin();
  },

  onShow() {
    if (app.globalData.currentChildId) {
      this.loadData();
    }
  },

  async checkLogin() {
    try {
      const loginRes = await app.callCloudFunction('login', {});
      if (loginRes.isNew || !loginRes.userInfo) {
        wx.redirectTo({ url: '/pages/onboard/onboard' });
        return;
      }
      app.globalData.openid = loginRes.openid;

      const childRes = await app.callCloudFunction('child', { action: 'listChildren' });
      if (childRes.success && childRes.list.length > 0) {
        if (!app.globalData.currentChildId) {
          app.saveCurrentChildId(childRes.list[0]._id);
        }
        this.setData({ children: childRes.list });
        this.loadData();
      } else {
        wx.redirectTo({ url: '/pages/onboard/onboard' });
      }
    } catch (e) {
      console.error('checkLogin error', e);
    }
  },

  async loadData() {
    const currentChildId = app.globalData.currentChildId;
    if (!currentChildId) return;

    try {
      const childRes = await app.callCloudFunction('child', { action: 'getChild', childId: currentChildId });
      if (childRes.success) {
        const child = childRes.child;
        child.availablePoints = (child.totalPoints || 0) - (child.redeemedPoints || 0);
        this.setData({ currentChild: child });
      }

      const rankingRes = await app.callCloudFunction('ranking', { action: 'getRanking', currentChildId });
      if (rankingRes.success) {
        // 计算当前孩子的排名
        const ranking = rankingRes.list;
        let rank = 0;
        for (let i = 0; i < ranking.length; i++) {
          if (ranking[i].childId === currentChildId) {
            rank = i + 1;
            break;
          }
        }
        this.setData({ ranking, currentChildRank: rank });
      }

      const redeemRes = await app.callCloudFunction('reward', { action: 'getLatestRedemptions', limit: 5 });
      if (redeemRes.success) {
        this.setData({ latestRedemptions: redeemRes.list });
      }
    } catch (e) {
      console.error('loadData error', e);
    }
  },

  onShowChildPicker() {
    this.setData({ showChildPicker: true });
  },

  onHideChildPicker() {
    this.setData({ showChildPicker: false });
  },

  onSelectChild(e) {
    const childId = e.currentTarget.dataset.id;
    app.saveCurrentChildId(childId);
    this.setData({ showChildPicker: false });
    this.loadData();
  },

  onViewCalendar() {
    wx.navigateTo({ url: '/pages/calendar/calendar' });
  }
});
