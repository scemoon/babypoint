// pages/reward-detail/reward-detail.js
const app = getApp();

Page({
  data: {
    reward: null,
    child: null,
    loading: false
  },

  onLoad(options) {
    this.setData({ rewardId: options.rewardId, childId: options.childId });
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
        child.availablePoints = (child.totalPoints || 0) - (child.redeemedPoints || 0);
        this.setData({ reward: rewardRes.reward, child });
      }
    } catch (e) {
      console.error(e);
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
