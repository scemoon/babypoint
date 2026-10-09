// pages/reward-add/reward-add.js
const app = getApp();

Page({
  data: {
    categories: [
      { key: 'FOOD', name: '美食', icon: '🍔' },
      { key: 'PLAY', name: '娱乐', icon: '🎮' },
      { key: 'TOY', name: '玩具', icon: '🎁' },
      { key: 'OUTING', name: '出行', icon: '🚗' },
      { key: 'PRIVILEGE', name: '特权', icon: '👑' },
      { key: 'DIGITAL', name: '数码', icon: '📱' }
    ],
    selectedCategoryName: '',
    formData: { name: '', category: '', points: 50, description: '', icon: '🎁' },
    loading: false
  },

  onNameInput(e) {
    const formData = this.data.formData;
    formData.name = e.detail.value;
    this.setData({ formData });
  },

  onCategoryChange(e) {
    const index = e.detail.value;
    const category = this.data.categories[index];
    const formData = this.data.formData;
    formData.category = category.key;
    formData.icon = category.icon;
    this.setData({ formData, selectedCategoryName: category.name });
  },

  onPointsInput(e) {
    const formData = this.data.formData;
    formData.points = parseInt(e.detail.value) || 50;
    this.setData({ formData });
  },

  onDescInput(e) {
    const formData = this.data.formData;
    formData.description = e.detail.value;
    this.setData({ formData });
  },

  async onSubmit() {
    const { name, category, points } = this.data.formData;
    if (!name.trim() || !category) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await app.callCloudFunction('reward', {
        action: 'createReward',
        ...this.data.formData
      });

      if (res.success) {
        wx.showToast({ title: '创建成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        wx.showToast({ title: res.error || '创建失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: e.message || '创建失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
