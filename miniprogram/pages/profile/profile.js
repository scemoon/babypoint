// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    children: [],
    currentChild: null,
    showChildPicker: false
  },

  onLoad() {
    this.loadChildren();
  },

  onShow() {
    this.loadChildren();
  },

  async loadChildren() {
    try {
      const res = await app.callCloudFunction('child', { action: 'listChildren' });
      if (res.success && res.list.length > 0) {
        const children = res.list;
        let currentChild = children.find(c => c._id === app.globalData.currentChildId);
        if (!currentChild) currentChild = children[0];
        this.setData({ children, currentChild });
      }
    } catch (e) {
      console.error(e);
    }
  },

  onChildManage() {
    wx.navigateTo({ url: '/pages/child-list/child-list' });
  },

  onTaskHistory() {
    wx.navigateTo({ url: '/pages/history/history?type=task' });
  },

  onRewardHistory() {
    wx.navigateTo({ url: '/pages/history/history?type=reward' });
  },

  onCalendar() {
    wx.navigateTo({ url: '/pages/calendar/calendar' });
  }
});
