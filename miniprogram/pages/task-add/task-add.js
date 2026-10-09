// pages/task-add/task-add.js
const app = getApp();

Page({
  data: {
    categories: [
      { key: 'STUDY', name: '学习', icon: '📚' },
      { key: 'HOUSEWORK', name: '家务', icon: '🏠' },
      { key: 'SPORTS', name: '运动', icon: '⚽' },
      { key: 'ART', name: '艺术', icon: '🎨' },
      { key: 'READING', name: '阅读', icon: '📖' },
      { key: 'HABIT', name: '习惯', icon: '🌱' },
      { key: 'OTHER', name: '其他', icon: '✨' }
    ],
    selectedCategoryName: '',
    formData: { name: '', category: '', basePoints: 10, description: '', icon: '📝' },
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
    formData.basePoints = parseInt(e.detail.value) || 10;
    this.setData({ formData });
  },

  onDescInput(e) {
    const formData = this.data.formData;
    formData.description = e.detail.value;
    this.setData({ formData });
  },

  async onSubmit() {
    const { name, category, basePoints } = this.data.formData;
    if (!name.trim() || !category) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await app.callCloudFunction('task', {
        action: 'createTask',
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
