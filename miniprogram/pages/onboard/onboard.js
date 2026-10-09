// pages/onboard/onboard.js
const app = getApp();

Page({
  data: {
    step: 1,
    nickname: '',
    avatar: '',
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
    loading: false
  },

  onLoad() {
    // 不再自动弹窗获取用户信息
    // 用户信息通过 chooseAvatar 和 nickname input 获取
  },

  onChooseAvatar(e) {
    const avatar = e.detail.avatarUrl;
    this.setData({ avatar });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
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
    this.setData({ gender: e.detail.value });
  },

  async onNext() {
    if (this.data.step === 1) {
      this.setData({ step: 2 });
    } else if (this.data.step === 2) {
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
        const loginRes = await app.callCloudFunction('login', {});
        
        await app.callCloudFunction('child', {
          action: 'register',
          userInfo: { nickname: this.data.nickname, avatar: this.data.avatar }
        });

        const childRes = await app.callCloudFunction('child', {
          action: 'createChild',
          name: this.data.childName.trim(),
          grade: this.data.selectedGrade,
          gender: this.data.gender,
          avatar: ''
        });

        if (childRes.success) {
          app.saveCurrentChildId(childRes.childId);
          wx.switchTab({ url: '/pages/index/index' });
        }
      } catch (e) {
        wx.showToast({ title: e.message || '创建失败', icon: 'none' });
      } finally {
        this.setData({ loading: false });
      }
    }
  }
});
