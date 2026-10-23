// pages/index/index.js
const app = getApp();

Page({
  data: {
    currentChild: null,
    currentChildRank: 0,
    children: [],
    // profileReady 为 false 时只显示加载态，避免刷新时先闪一下「先添加孩子档案」
    profileReady: false,
    loadFailed: false,
    ranking: [],
    rankingLimit: 5,
    rankingHasMore: false,
    rankingLoadingMore: false,
    latestRedemptions: [],
    showChildPicker: false
  },

  onLoad() {
    this.checkLogin();
  },

  onShow() {
    if (app.globalData.currentChildId) {
      this.loadData();
      this.refreshChildren();
    }
  },

  async refreshChildren() {
    try {
      const res = await app.callCloudFunction('child', { action: 'listChildren' });
      if (res.success && res.list && res.list.length > 0) {
        this.setData({ children: res.list });
      }
    } catch (e) {
      console.error('刷新孩子列表失败', e);
    }
  },

  async checkLogin() {
    try {
      const loginRes = await app.callCloudFunction('login', {});
      if (!loginRes || !loginRes.success) {
        throw new Error((loginRes && loginRes.error) || '微信登录失败');
      }
      app.globalData.openid = loginRes.openid;
      app.globalData.parentInfo = loginRes.userInfo || null;
      app.globalData.loginChecked = true;
      // 引导页只服务于「首次登录」（云端还没有这个家长账号），之后每次登录都直接进首页。
      // 注意不要拿 userInfo 是否存在来判断：老用户一旦取不到 userInfo 就会被推进引导页，
      // 而引导页发现不是新用户又会立刻跳回首页，表现为刷新时闪一下引导页。
      app.globalData.isNewUser = loginRes.isNew === true;
      if (app.globalData.isNewUser) {
        wx.redirectTo({ url: '/pages/onboard/onboard' });
        return;
      }
      const childRes = await app.callCloudFunction('child', { action: 'listChildren' });
      if (childRes.success && childRes.list.length > 0) {
        const selectedChild = childRes.list.find(child => child._id === app.globalData.currentChildId) || childRes.list[0];
        app.saveCurrentChildId(selectedChild._id);
        // listChildren 与 getChild 返回的是同一份孩子文档，先用列表数据把首页渲染出来，
        // 不必等后面的 getChild/getRanking/getLatestRedemptions 全部返回
        this.setData({
          children: childRes.list,
          currentChild: this.buildChildViewModel(selectedChild),
          profileReady: true,
          loadFailed: false
        });
        this.loadData();
      } else if (childRes.success) {
        app.globalData.currentChildId = '';
        wx.removeStorageSync('currentChildId');
        this.setData({ children: [], currentChild: null, ranking: [], latestRedemptions: [], profileReady: true, loadFailed: false });
      } else {
        throw new Error(childRes.error || '读取孩子档案失败');
      }
    } catch (e) {
      console.error('checkLogin error', e);
      this.setData({ profileReady: true, loadFailed: true });
      wx.showToast({ title: e.message || '登录失败，请重试', icon: 'none' });
    }
  },

  onRetry() {
    this.setData({ profileReady: false, loadFailed: false });
    this.checkLogin();
  },

  // 统一拼装首页用到的孩子数据：可用积分 = 累计获得 - 已兑换
  buildChildViewModel(child) {
    if (!child) return null;
    return { ...child, availablePoints: (child.totalPoints || 0) - (child.redeemedPoints || 0) };
  },

  async loadData() {
    const currentChildId = app.globalData.currentChildId;
    if (!currentChildId) return;

    try {
      const childRes = await app.callCloudFunction('child', { action: 'getChild', childId: currentChildId });
      if (childRes.success) {
        this.setData({ currentChild: this.buildChildViewModel(childRes.child), profileReady: true, loadFailed: false });
      } else {
        this.setData({ loadFailed: true });
      }

      const rankingRes = await app.callCloudFunction('ranking', { action: 'getRanking', currentChildId, limit: 5 });
      if (rankingRes.success) {
        const ranking = rankingRes.list;
        const familyRanking = this.data.children
          .map(item => item._id === currentChildId ? (this.data.currentChild || item) : item)
          .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
        const rankIndex = familyRanking.findIndex(child => child._id === currentChildId);
        this.setData({ ranking, currentChildRank: rankIndex < 0 ? 0 : rankIndex + 1, rankingLimit: 5, rankingHasMore: rankingRes.hasMore, rankingLoadingMore: false });
      }

      const redeemRes = await app.callCloudFunction('reward', { action: 'getLatestRedemptions', limit: 5 });
      if (redeemRes.success) {
        // 兑换记录里积分历史上用过两个字段名：现在写 pointsRequired，更早的记录只有
        // pointsSpent。这里优先取新字段再兜底旧字段，避免右侧只显示「− 积分」。
        const childrenMap = {};
        (this.data.children || []).forEach(c => { childrenMap[c._id] = c.name; });
        const latestRedemptions = (redeemRes.list || []).map(item => {
          const cost = item.pointsRequired != null ? item.pointsRequired
            : (item.pointsSpent != null ? item.pointsSpent : 0);
          const childName = childrenMap[item.childId] || '未知';
          return { ...item, points: Number(cost) || 0, childName };
        });
        this.setData({ latestRedemptions });
      }
    } catch (e) {
      console.error('loadData error', e);
      this.setData({ loadFailed: true });
    }
  },

  onShowChildPicker() {
    this.setData({ showChildPicker: true });
  },

  onHideChildPicker() {
    this.setData({ showChildPicker: false });
  },

  stopPropagation() {},

  onSelectChild(e) {
    const childId = e.currentTarget.dataset.id;
    app.saveCurrentChildId(childId);
    const child = this.data.children.find(c => c._id === childId);
    const currentChild = child ? this.buildChildViewModel(child) : null;
    this.setData({ showChildPicker: false, currentChild });
    this.loadData();
  },

  onOpenTasks() {
    wx.switchTab({ url: '/pages/task/task' });
  },

  onOpenRewards() {
    wx.switchTab({ url: '/pages/reward/reward' });
  },

  onViewHistory() {
    wx.navigateTo({ url: '/pages/history/history?type=task' });
  },

  onViewRewardHistory() {
    wx.navigateTo({ url: '/pages/history/history?type=reward' });
  },

  onViewCalendar() {
    wx.navigateTo({ url: '/pages/calendar/calendar' });
  },

  async onLoadMoreRanking() {
    if (!this.data.rankingHasMore || this.data.rankingLoadingMore) return;
    this.setData({ rankingLoadingMore: true });
    try {
      const res = await app.callCloudFunction('ranking', { action: 'getRanking', currentChildId: app.globalData.currentChildId, limit: 50 });
      if (res.success) this.setData({ ranking: res.list, rankingLimit: 50, rankingHasMore: res.hasMore });
    } catch (e) {
      wx.showToast({ title: e.message || '排行加载失败', icon: 'none' });
    } finally {
      this.setData({ rankingLoadingMore: false });
    }
  },

  onManageChildren() {
    wx.navigateTo({ url: '/pages/child-list/child-list' });
  }
});
