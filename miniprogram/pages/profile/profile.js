// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    children: [],
    currentChild: null,
    currentChildId: '',
    showChildPicker: false,
    showCustomerContact: false,
    showAbout: false,
    parentInfo: app.globalData.parentInfo || {},
    appVersion: app.globalData.appVersion || '1.0.0'
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
        const currentChildId = app.globalData.currentChildId;
        let currentChild = children.find(c => c._id === currentChildId);
        if (!currentChild) currentChild = children[0];
        this.setData({ children, currentChild, currentChildId: currentChild._id });
      }
    } catch (e) {
      console.error(e);
    }
  },

  onSelectChildInProfile(e) {
    const childId = e.currentTarget.dataset.id;
    app.saveCurrentChildId(childId);
    const child = this.data.children.find(c => c._id === childId);
    if (child) {
      this.setData({ currentChild: child, currentChildId: childId });
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

  onAbout() {
    this.setData({ showAbout: true });
  },

  onCloseAbout() {
    this.setData({ showAbout: false });
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出当前账号吗？退出后将返回登录页。\n\n提示：如需切换账号，请重新打开小程序。',
      confirmText: '退出',
      confirmColor: '#FF3B30',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 清除所有本地存储数据
          try {
            wx.clearStorageSync();
          } catch (e) {}
          // 设置主动退出标记，让 onboarding 页面知道这是主动退出
          wx.setStorageSync('logoutFlag', Date.now());
          // 重置全局状态
          app.globalData.parentInfo = null;
          app.globalData.currentChildId = '';
          app.globalData.loginChecked = false; // 设为 false 让 onboard 重新检查
          app.globalData.isNewUser = true;
          app.globalData.childrenCache = null;
          // 跳转到 onboarding
          wx.reLaunch({ url: '/pages/onboard/onboard' });
        }
      }
    });
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
