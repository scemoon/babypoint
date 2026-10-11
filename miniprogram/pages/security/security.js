const app = getApp();
const { keyboardAvoid } = require('../../utils/keyboard');

Page(keyboardAvoid({
  data: {
    configured: false,
    currentPin: '',
    newPin: '',
    confirmPin: '',
    loading: false
  },

  onLoad() { this.loadStatus(); },

  async loadStatus() {
    try {
      const res = await app.callCloudFunction('child', { action: 'getCompletionPinStatus' });
      if (res.success) this.setData({ configured: res.configured });
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = String(e.detail.value || '').replace(/\D/g, '').slice(0, 6);
    this.setData({ [field]: value });
  },

  async onSubmit() {
    const { configured, currentPin, newPin, confirmPin } = this.data;
    if (configured && !/^\d{6}$/.test(currentPin)) {
      wx.showToast({ title: '请输入当前6位确认码', icon: 'none' });
      return;
    }
    if (!/^\d{6}$/.test(newPin)) {
      wx.showToast({ title: '新确认码需为6位数字', icon: 'none' });
      return;
    }
    if (newPin !== confirmPin) {
      wx.showToast({ title: '两次输入的确认码不一致', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await app.callCloudFunction('child', {
        action: 'setCompletionPin', currentPin, newPin, confirmPin
      });
      if (!res.success) {
        wx.showToast({ title: res.error || '设置失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: configured ? '确认码已修改' : '确认码已设置', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {
      wx.showToast({ title: e.message || '设置失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
}));
