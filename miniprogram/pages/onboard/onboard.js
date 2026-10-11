// pages/onboard/onboard.js
const app = getApp();
const { keyboardAvoid } = require('../../utils/keyboard');

Page(keyboardAvoid({
  data: {
    // 确认是首次登录之前不渲染表单，避免老用户闪一下引导页
    ready: false,
    step: 1,
    childName: '',
    selectedGrade: '',
    selectedGradeName: '',
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
    gender: 'male',
    newPin: '',
    confirmPin: '',
    loading: false
  },

  async onLoad() {
    // 引导页只服务于首次登录。
    // 已知登录态时：是新用户才留在本页，否则直接回首页。
    if (app.globalData.loginChecked) {
      if (app.globalData.isNewUser) {
        this.setData({ ready: true });
      } else {
        wx.switchTab({ url: '/pages/index/index' });
      }
      return;
    }

    // 冷启动直接打开本页（如开发者工具指定启动页）时，先问一次登录态再决定，
    // 老用户一律回首页，且整个确认过程不渲染表单。
    try {
      const loginRes = await app.callCloudFunction('login', {});
      const isNewUser = !!(loginRes && loginRes.success && loginRes.isNew);
      app.globalData.loginChecked = true;
      app.globalData.isNewUser = isNewUser;
      if (!isNewUser) {
        wx.switchTab({ url: '/pages/index/index' });
        return;
      }
      this.setData({ ready: true });
    } catch (e) {
      console.error('onboard checkLogin error', e);
      // 读不到登录态时不展示引导页，回首页由首页给出重试入口
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  onChildNameInput(e) {
    this.setData({ childName: e.detail.value });
  },

  onGradeChange(e) {
    const index = e.detail.value;
    const grade = this.data.grades[index];
    this.setData({
      selectedGrade: grade.code,
      selectedGradeName: grade.name
    });
  },

  onGenderChange(e) {
    const gender = (e.detail && e.detail.value) || e.currentTarget.dataset.gender;
    if (gender) this.setData({ gender });
  },

  async onNext() {
    if (!this.data.childName.trim()) {
      wx.showToast({ title: '请输入孩子姓名', icon: 'none' });
      return;
    }
    if (!this.data.selectedGrade) {
      wx.showToast({ title: '请选择年级', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const registerRes = await app.callCloudFunction('child', {
        action: 'register',
        userInfo: {}
      });
      if (!registerRes.success) {
        throw new Error(registerRes.error || '家长账号创建失败');
      }
      app.globalData.parentInfo = registerRes.userInfo || { nickname: '家长', avatar: '' };
      app.globalData.isNewUser = false;

      const childRes = await app.callCloudFunction('child', {
        action: 'createChild',
        name: this.data.childName.trim(),
        grade: this.data.selectedGrade,
        gender: this.data.gender,
        avatar: ''
      });

      if (childRes.success) {
        app.saveCurrentChildId(childRes.childId);
        this.setData({ step: 2 });
      } else {
        wx.showToast({ title: childRes.error || '创建孩子档案失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: e.message || '创建失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onPinInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = String(e.detail.value || '').replace(/\D/g, '').slice(0, 6);
    this.setData({ [field]: value });
  },

  async onSetCompletionPin() {
    const { newPin, confirmPin } = this.data;
    if (!/^\d{6}$/.test(newPin)) {
      wx.showToast({ title: '请输入6位数字确认码', icon: 'none' });
      return;
    }
    if (newPin !== confirmPin) {
      wx.showToast({ title: '两次输入的确认码不一致', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      const res = await app.callCloudFunction('child', { action: 'setCompletionPin', newPin, confirmPin });
      if (!res.success) {
        wx.showToast({ title: res.error || '设置失败', icon: 'none' });
        return;
      }
      this.finishOnboarding();
    } catch (e) {
      wx.showToast({ title: e.message || '设置失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onSkipCompletionPin() {
    this.finishOnboarding();
  },

  finishOnboarding() {
    wx.switchTab({ url: '/pages/index/index' });
  }
}));
