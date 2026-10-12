// pages/task-complete/task-complete.js
const app = getApp();
const { keyboardAvoid } = require('../../utils/keyboard');

const COMPLETION_LEVELS = [
  { key: 'simple', name: '简单完成', short: '简单', ratio: 0.5, desc: '基本做到' },
  { key: 'normal', name: '一般完成', short: '一般', ratio: 0.75, desc: '做得不错' },
  { key: 'perfect', name: '完美完成', short: '完美', ratio: 1.0, desc: '非常出色' }
];

Page(keyboardAvoid({
  data: {
    taskId: '',
    // 归属周期起点：提前完成待开始周期时，要把积分记到那个未来周期上
    instanceStart: 0,
    taskName: '',
    basePoints: 0,
    icon: '',
    levels: COMPLETION_LEVELS,
    selectedLevel: 'normal',
    selectedChild: null,
    children: [],
    confirmationCode: '',
    pinConfigured: false,
    showPinModal: false,
    loading: false,
    // 奖状上的副标题（智育 · 每周 · 1/3），由任务页传来的字段拼成
    metaLine: '',
    // 印章行下方的说明，跟随选中的完成度变化
    selectedLevelDesc: '',
    // 切换印章时给积分数字一个短脉冲，让「改了完成度 → 积分变了」看得见
    pointsPulse: false,
    // ready=false 时页面只显示占位骨架，不渲染底部「确认完成」按钮：
    // 底部按钮先于内容出现会让人以为「先蹦出一个确认按钮，确认页才出来」
    ready: false,
    // ctaVisible=false 时按钮根本不在页面上：等页面推进动画走完再出现，
    // 从根上排除「切换过程中按钮先冒出来 / 盖住页面内容」的可能
    ctaVisible: false
  },

  onReady() {
    // 页面推进动画约 300ms，动画期间不放按钮；之后淡入，看起来像底栏"落定"
    this.ctaTimer = setTimeout(() => {
      this.ctaTimer = null;
      this.setData({ ctaVisible: true });
    }, 320);
  },

  onLoad(options) {
    const taskId = options.taskId || '';
    const childId = options.childId || app.globalData.currentChildId || '';
    // 周期实例：任务页点的是"哪一个周期"，完成时必须落到同一个周期上
    const instanceStart = Number(options.instanceStart) || 0;

    const initData = {
      taskId,
      instanceStart,
      taskName: decodeURIComponent(options.taskName || ''),
      basePoints: parseInt(options.basePoints, 10) || 0,
      icon: decodeURIComponent(options.icon || ''),
      metaLine: this.buildMetaLine({
        domainName: decodeURIComponent(options.domainName || ''),
        periodLabel: decodeURIComponent(options.periodLabel || ''),
        progress: parseInt(options.progress, 10) || 0,
        targetCount: parseInt(options.targetCount, 10) || 1
      })
    };

    // 首屏直出：孩子列表任务页已经取过，直接用缓存同步渲染，页面一次性画完整
    const cached = app.getChildrenCache ? app.getChildrenCache() : null;
    if (cached) {
      initData.children = cached;
      initData.selectedChild = cached.find(c => c._id === childId) || cached[0];
      initData.ready = true;
    }

    this.setData(initData);
    this.calculatePoints();
    this.loadChildren(childId);
    this.loadPinStatus();

    // 兜底：网络异常导致孩子列表迟迟不返回时，不能把页面永久卡在骨架态
    this.readyTimer = setTimeout(() => this.markReady(), 1500);
  },

  // 奖状副标题：与任务列表那一行显示的领域/周期/进度保持一致
  buildMetaLine({ domainName, periodLabel, progress, targetCount }) {
    const parts = [];
    if (domainName) parts.push(domainName);
    if (periodLabel) parts.push(periodLabel);
    if (targetCount > 1) parts.push(progress + '/' + targetCount);
    return parts.join(' · ');
  },

  onUnload() {
    if (this.readyTimer) {
      clearTimeout(this.readyTimer);
      this.readyTimer = null;
    }
    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
      this.pulseTimer = null;
    }
    if (this.ctaTimer) {
      clearTimeout(this.ctaTimer);
      this.ctaTimer = null;
    }
  },

  markReady() {
    if (this.readyTimer) {
      clearTimeout(this.readyTimer);
      this.readyTimer = null;
    }
    if (!this.data.ready) this.setData({ ready: true });
  },

  onShow() {
    this.loadPinStatus();
  },

  async loadPinStatus() {
    try {
      const res = await app.callCloudFunction('child', { action: 'getCompletionPinStatus' });
      if (res.success) {
        this.setData({ pinConfigured: res.configured });
        return res.configured;
      }
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  onConfirmationCodeInput(e) {
    this.setData({ confirmationCode: String(e.detail.value || '').replace(/\D/g, '').slice(0, 6) });
  },

  onManageConfirmationCode() {
    wx.navigateTo({ url: '/pages/security/security' });
  },

  async loadChildren(childId) {
    const preferredId = childId
      || (this.data.selectedChild && this.data.selectedChild._id)
      || app.globalData.currentChildId;
    try {
      const res = await app.callCloudFunction('child', { action: 'listChildren' });
      if (res.success && res.list.length > 0) {
        const children = res.list;
        if (app.setChildrenCache) app.setChildrenCache(children);
        // 保留用户在当前页面已选中的孩子，其次优先任务页传来的孩子
        const kept = this.data.selectedChild && children.find(c => c._id === this.data.selectedChild._id);
        let selectedChild = kept || children.find(c => c._id === preferredId);
        if (!selectedChild) selectedChild = children[0];
        this.setData({ children, selectedChild });
      }
    } catch (e) {
      console.error(e);
    } finally {
      // 无论成功失败都要收掉骨架，不能把页面卡在加载态
      this.markReady();
    }
  },

  onLevelChange(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    this.setData({ selectedLevel: this.data.levels[index].key });
    this.calculatePoints();
    this.pulsePoints();
  },

  // 先摘掉动画类再下一帧加回，保证连点不同印章时每次都有反馈
  pulsePoints() {
    if (this.pulseTimer) clearTimeout(this.pulseTimer);
    this.setData({ pointsPulse: false });
    wx.nextTick(() => {
      this.setData({ pointsPulse: true });
      this.pulseTimer = setTimeout(() => {
        this.setData({ pointsPulse: false });
        this.pulseTimer = null;
      }, 260);
    });
  },

  onSelectChild(e) {
    const childId = e.currentTarget.dataset.id;
    const child = this.data.children.find(c => c._id === childId);
    if (child) {
      this.setData({ selectedChild: child });
    }
  },

  calculatePoints() {
    const level = this.data.levels.find(l => l.key === this.data.selectedLevel);
    const actualPoints = Math.floor(this.data.basePoints * (level ? level.ratio : 1));
    this.setData({
      actualPoints: actualPoints,
      ratio: level ? level.ratio : 1,
      // 印章行下方只显示当前档位的说明，不再每格都写一行小字
      selectedLevelDesc: level ? level.desc : ''
    });
  },

  async onSubmit() {
    const { selectedChild } = this.data;
    if (!selectedChild) {
      wx.showToast({ title: '请选择孩子', icon: 'none' });
      return;
    }
    const configured = await this.loadPinStatus();
    if (configured === null) {
      wx.showToast({ title: '暂时无法验证确认码状态', icon: 'none' });
      return;
    }
    if (!configured) {
      wx.showModal({
        title: '请先设置家长确认码',
        content: '设置后才能确认任务并记入积分。',
        confirmText: '去设置',
        success: result => { if (result.confirm) this.onManageConfirmationCode(); }
      });
      return;
    }
    this.setData({ showPinModal: true, confirmationCode: '' });
  },

  onCancelPin() {
    this.setData({ showPinModal: false, confirmationCode: '' });
  },

  stopPropagation() {},

  async onConfirmWithPin() {
    const { taskId, instanceStart, selectedChild, selectedLevel, confirmationCode } = this.data;
    if (!/^\d{6}$/.test(confirmationCode)) {
      wx.showToast({ title: '请输入6位家长确认码', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await app.callCloudFunction('task', {
        action: 'completeTask',
        taskId,
        instanceStart: instanceStart || undefined,
        childId: selectedChild._id,
        completionLevel: selectedLevel,
        confirmationCode
      });

      if (res.success) {
        this.setData({ showPinModal: false });
        wx.showModal({
          title: '完成任务',
          content: '获得 ' + res.actualPoints + ' 积分！',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      } else {
        wx.showToast({ title: res.error || '提交失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: e.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
}));
