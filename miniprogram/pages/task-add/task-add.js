// pages/task-add/task-add.js
const app = getApp();
const { analyzeTaskPoints } = require('../../utils/task-score');
const { keyboardAvoid } = require('../../utils/keyboard');

Page(keyboardAvoid({
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
    formData: { name: '', category: '', description: '', icon: '📝', periodType: 'once', periodDays: 1, targetCount: 1 },
    scorePreview: 4,
    scoreReason: '按任务分类与完成要求评估',
    periods: [{ key: 'once', name: '单次任务' }, { key: 'daily', name: '每天任务' }, { key: 'weekly', name: '每周任务' }, { key: 'monthly', name: '每月任务' }, { key: 'custom', name: '自定义周期' }],
    selectedPeriodName: '单次任务',
    loading: false
  },

  onNameInput(e) {
    const formData = this.data.formData;
    formData.name = e.detail.value;
    this.updateScorePreview(formData);
  },

  onCategoryChange(e) {
    const index = e.detail.value;
    const category = this.data.categories[index];
    const formData = this.data.formData;
    formData.category = category.key;
    formData.icon = category.icon;
    this.setData({ selectedCategoryName: category.name });
    this.updateScorePreview(formData);
  },

  onDescInput(e) {
    const formData = this.data.formData;
    formData.description = e.detail.value;
    this.updateScorePreview(formData);
  },

  updateScorePreview(formData = this.data.formData) {
    const preview = analyzeTaskPoints(formData);
    this.setData({ formData, scorePreview: preview.points, scoreReason: preview.reason });
  },

  onPeriodTap(e) {
    const period = this.data.periods.find(item => item.key === e.currentTarget.dataset.type);
    this.setData({ selectedPeriodName: period.name, 'formData.periodType': period.key });
  },

  onNumberInput(e) {
    this.setData({ ['formData.' + e.currentTarget.dataset.field]: e.detail.value });
  },

  async onSubmit() {
    const { name, category } = this.data.formData;
    if (!name.trim() || !category) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await app.callCloudFunction('task', {
        action: 'createTask',
        ...this.data.formData,
        periodDays: Math.max(1, parseInt(this.data.formData.periodDays, 10) || 1),
        targetCount: 1
      });

      if (res.success) {
        wx.showModal({
          title: '任务创建成功',
          content: `系统评估为 ${res.basePoints} 积分/次。${res.scoreReason || ''}`,
          showCancel: false,
          success: () => wx.navigateBack()
        });
      } else {
        wx.showToast({ title: res.error || '创建失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: e.message || '创建失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
}));
