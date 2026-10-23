// pages/reward-detail/reward-detail.js
const app = getApp();

Page({
  data: {
    reward: null,
    child: null,
    loading: false,
    // 页面状态：loading 显示骨架，failed 显示重试，避免白屏
    failed: false,
    // 兑换券的余额变化：够不够、兑换后还剩多少 / 还差多少
    enough: false,
    afterPoints: 0,
    shortBy: 0,
    // 主操作等页面推进动画走完再渲染，避免切换过程中按钮先出现 / 盖住页面
    ctaVisible: false
  },

  onLoad(options) {
    this.setData({ rewardId: options.rewardId, childId: options.childId });
    this.loadData();
  },

  onReady() {
    this.ctaTimer = setTimeout(() => {
      this.ctaTimer = null;
      this.setData({ ctaVisible: true });
    }, 320);
  },

  onUnload() {
    if (this.ctaTimer) {
      clearTimeout(this.ctaTimer);
      this.ctaTimer = null;
    }
  },

  onRetry() {
    this.setData({ failed: false });
    this.loadData();
  },

  async loadData() {
    const { rewardId, childId } = this.data;
    try {
      const [rewardRes, childRes] = await Promise.all([
        app.callCloudFunction('reward', { action: 'getReward', rewardId }),
        app.callCloudFunction('child', { action: 'getChild', childId })
      ]);

      if (rewardRes.success && childRes.success) {
        const child = childRes.child;
        const reward = rewardRes.reward;
        child.availablePoints = (child.totalPoints || 0) - (child.redeemedPoints || 0);
        const cost = Number(reward.points) || 0;
        this.setData({
          reward,
          child,
          failed: false,
          enough: child.availablePoints >= cost,
          afterPoints: Math.max(0, child.availablePoints - cost),
          shortBy: Math.max(0, cost - child.availablePoints)
        });
      } else {
        this.setData({ failed: true });
      }
    } catch (e) {
      console.error(e);
      this.setData({ failed: true });
    }
  },

  async onRedeem() {
    const { rewardId, childId, loading } = this.data;
    if (loading) return;

    this.setData({ loading: true });
    try {
      const res = await app.callCloudFunction('reward', {
        action: 'redeemReward',
        rewardId,
        childId
      });

      if (res.success) {
        // 同步全局孩子积分：更新缓存中当前孩子的已兑换积分
        const newRedeemed = res.newRedeemedPoints;
        if (newRedeemed !== undefined && app.globalData.childrenCache) {
          app.globalData.childrenCache = app.globalData.childrenCache.map(c =>
            c._id === childId ? { ...c, redeemedPoints: newRedeemed } : c
          );
        }
        wx.showModal({
          title: '兑换成功',
          content: '恭喜！已成功兑换 ' + this.data.reward.name,
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      } else {
        wx.showToast({ title: res.error || '兑换失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: e.message || '兑换失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
