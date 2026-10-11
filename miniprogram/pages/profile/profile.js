// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    children: [],
    currentChild: null,
    showChildPicker: false,
    showCustomerContact: false,
    parentInfo: app.globalData.parentInfo || {}
  },

  onLoad() {
    this.loadChildren();
  },

  onShow() {
    this.setData({ parentInfo: app.globalData.parentInfo || {} });
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

  onCompletionPin() {
    wx.navigateTo({ url: '/pages/security/security' });
  },

  onCustomerService() {
    this.setData({ showCustomerContact: true });
  },

  onCopyContact(e) {
    const value = e.currentTarget.dataset.value;
    wx.setClipboardData({
      data: value,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    });
  },

  onCloseCustomerContact() { this.setData({ showCustomerContact: false }); },
  stopPropagation() {}
});
