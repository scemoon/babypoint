// pages/reward-add/reward-add.js
const app = getApp();
const { keyboardAvoid } = require('../../utils/keyboard');

const BUILTIN_CATEGORIES = [
  { key: 'FOOD', name: '美食', icon: '🍔' },
  { key: 'PLAY', name: '娱乐', icon: '🎮' },
  { key: 'TOY', name: '玩具', icon: '🎁' },
  { key: 'OUTING', name: '出行', icon: '🚗' },
  { key: 'PRIVILEGE', name: '特权', icon: '👑' },
  { key: 'DIGITAL', name: '数码', icon: '📱' }
];

function loadCustomCategories() {
  try {
    return wx.getStorageSync('customRewardCategories') || [];
  } catch (e) {
    return [];
  }
}

Page(keyboardAvoid({
  data: {
    categories: BUILTIN_CATEGORIES,
    selectedCategoryName: '',
    formData: { name: '', category: '', points: 50, description: '', icon: '🎁' },
    loading: false,
    showNewCategory: false,
    newCategoryName: '',
    newCategoryIcon: '🎁',
    iconOptions: ['🎁', '🎉', '⭐', '🌈', '🎨', '🎵', '🏆', '✨', '🎯', '🚀', '🌟', '💎']
  },

  onLoad() {
    // 合并内置分类和自定义分类
    const customCategories = loadCustomCategories();
    const merged = [...BUILTIN_CATEGORIES, ...customCategories];
    this.setData({ categories: merged });
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

  // ---------- 新建分类 ----------
  onShowAddCategory() {
    this.setData({
      showNewCategory: true,
      newCategoryName: '',
      newCategoryIcon: '🎁'
    });
  },

  onCancelNewCategory() {
    this.setData({ showNewCategory: false });
  },

  onNewCategoryNameInput(e) {
    this.setData({ newCategoryName: e.detail.value });
  },

  onSelectCategoryIcon(e) {
    this.setData({ newCategoryIcon: e.currentTarget.dataset.icon });
  },

  onConfirmNewCategory() {
    const { newCategoryName, newCategoryIcon } = this.data;
    if (!newCategoryName || !newCategoryName.trim()) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' });
      return;
    }
    const trimmed = newCategoryName.trim();
    if (trimmed.length > 8) {
      wx.showToast({ title: '名称不超过8个字', icon: 'none' });
      return;
    }

    // 保存到存储
    const key = 'CUSTOM_' + Date.now().toString(36);
    const newCat = { key, name: trimmed, icon: newCategoryIcon, custom: true };
    const customCategories = loadCustomCategories();
    const updated = [...customCategories, newCat];
    try {
      wx.setStorageSync('customRewardCategories', updated);
    } catch (e) {
      console.error(e);
    }

    // 更新分类列表并选中
    const merged = [...BUILTIN_CATEGORIES, ...updated];
    const formData = this.data.formData;
    formData.category = key;
    formData.icon = newCategoryIcon;
    this.setData({
      categories: merged,
      formData,
      selectedCategoryName: trimmed,
      showNewCategory: false
    });
    wx.showToast({ title: '已添加', icon: 'success' });
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
}));
