// app.js
const app = getApp();

App({
  globalData: {
    envId: 'cloud1-2gavd8kj8a1ce021',
    openid: '',
    currentChildId: '',
    parentInfo: null,
    loginChecked: false,
    isNewUser: false,
    appVersion: '1.0.9',  // 版本号手动维护，与上传版本一致
    // 孩子列表缓存：任务页已取过一次，任务确认页可直接同步渲染，
    // 避免进入确认页时先闪出底部「确认完成」按钮、内容随后才补齐
    childrenCache: null
  },

  onLaunch() {
    // 初始化云开发
    this.initCloud();

    // 从本地存储恢复当前孩子
    const savedChildId = wx.getStorageSync('currentChildId');
    if (savedChildId) {
      this.globalData.currentChildId = savedChildId;
    }
  },

  initCloud() {
    try {
      if (!wx.cloud) {
        console.error('微信基础库版本过低，请更新');
        return;
      }

      wx.cloud.init({
        env: this.globalData.envId,
        traceUser: true
      });
      
      console.log('云开发初始化完成，环境:', this.globalData.envId);
    } catch (e) {
      console.error('云开发初始化失败:', e);
    }
  },

  // 云函数调用封装
  callCloudFunction(name, data) {
    const fnName = 'bp_' + name;
    console.log('调用云函数:', fnName, data);
    
    return wx.cloud.callFunction({
      name: fnName,
      data: data || {},
      config: { env: this.globalData.envId }
    }).then(res => {
      console.log('云函数返回:', res);
      if (res.errMsg && res.errMsg.includes('ok')) {
        return res.result;
      }
      throw new Error(res.errMsg || '调用失败');
    }).catch(err => {
      console.error('云函数调用失败:', err);
      throw err;
    });
  },

  // 保存当前孩子ID
  saveCurrentChildId(childId) {
    this.globalData.currentChildId = childId;
    wx.setStorageSync('currentChildId', childId);
  },

  // 缓存孩子列表（内存级，仅用于页面间首屏直出）
  setChildrenCache(list) {
    if (Array.isArray(list)) this.globalData.childrenCache = list;
  },

  getChildrenCache() {
    const list = this.globalData.childrenCache;
    return Array.isArray(list) && list.length > 0 ? list : null;
  }
});
