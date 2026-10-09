// pages/child-list/child-list.js
const app = getApp();

Page({
  data: {
    children: [],
    currentChildId: '',
    showAddModal: false,
    editingChild: null,
    selectedGradeName: '',
    formData: {
      name: '',
      grade: '',
      gender: 'male'
    },
    grades: [
      { code: 'kindergarten_small', name: '幼儿园小班' },
      { code: 'kindergarten_medium', name: '幼儿园中班' },
      { code: 'kindergarten_big', name: '幼儿园大班' },
      { code: 'primary_1', name: '小学一年级' },
      { code: 'primary_2', name: '小学二年级' },
      { code: 'primary_3', name: '小学三年级' },
      { code: 'primary_4', name: '小学四年级' },
      { code: 'primary_5', name: '小学五年级' },
      { code: 'primary_6', name: '小学六年级' },
      { code: 'middle_1', name: '初中初一' },
      { code: 'middle_2', name: '初中初二' },
      { code: 'middle_3', name: '初中初三' }
    ],
    loading: false
  },

  onLoad() {
    this.setData({ currentChildId: app.globalData.currentChildId || '' });
    this.loadChildren();
  },

  async loadChildren() {
    try {
      const res = await app.callCloudFunction('child', { action: 'listChildren' });
      if (res.success) {
        this.setData({ children: res.list });
      }
    } catch (e) {
      console.error(e);
    }
  },

  onShowAddModal() {
    this.setData({
      showAddModal: true,
      editingChild: null,
      selectedGradeName: '',
      formData: { name: '', grade: '', gender: 'male' }
    });
  },

  onHideModal() {
    this.setData({ showAddModal: false });
  },

  onNameInput(e) {
    const formData = this.data.formData;
    formData.name = e.detail.value;
    this.setData({ formData });
  },

  onGradeChange(e) {
    const index = e.detail.value;
    const formData = this.data.formData;
    const grade = this.data.grades[index];
    formData.grade = grade.code;
    this.setData({ formData, selectedGradeName: grade.name });
  },

  onGenderChange(e) {
    const formData = this.data.formData;
    formData.gender = e.detail.value;
    this.setData({ formData });
  },

  async onSubmit() {
    const { name, grade, gender } = this.data.formData;
    if (!name.trim() || !grade) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      let res;
      if (this.data.editingChild) {
        res = await app.callCloudFunction('child', {
          action: 'updateChild',
          childId: this.data.editingChild._id,
          name: name.trim(),
          grade,
          gender
        });
      } else {
        res = await app.callCloudFunction('child', {
          action: 'createChild',
          name: name.trim(),
          grade,
          gender
        });
      }

      if (res.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        this.onHideModal();
        this.loadChildren();
      } else {
        wx.showToast({ title: res.error || '保存失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onSelectChild(e) {
    const childId = e.currentTarget.dataset.id;
    app.saveCurrentChildId(childId);
    this.setData({ currentChildId: childId });
    wx.showToast({ title: '已切换', icon: 'success' });
  },

  onEditChild(e) {
    const child = e.currentTarget.dataset.child;
    const gradeItem = this.data.grades.find(g => g.code === child.grade) || { name: '' };
    this.setData({
      showAddModal: true,
      editingChild: child,
      selectedGradeName: gradeItem.name,
      formData: {
        name: child.name,
        grade: child.grade,
        gender: child.gender || 'male'
      }
    });
  },

  onDeleteChild(e) {
    const child = e.currentTarget.dataset.child;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除 ' + child.name + ' 吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await app.callCloudFunction('child', {
              action: 'deleteChild',
              childId: child._id
            });
            if (result.success) {
              wx.showToast({ title: '已删除', icon: 'success' });
              this.loadChildren();
            }
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});
