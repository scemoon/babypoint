// pages/task-complete/task-complete.js
const app = getApp();

const COMPLETION_LEVELS = [
  { key: 'simple', name: '简单完成', ratio: 0.5, desc: '基本做到' },
  { key: 'normal', name: '一般完成', ratio: 0.75, desc: '做得不错' },
  { key: 'perfect', name: '完美完成', ratio: 1.0, desc: '非常出色' }
];

Page({
  data: {
    taskId: '',
    taskName: '',
    basePoints: 0,
    icon: '',
    levels: COMPLETION_LEVELS,
    selectedLevel: 'normal',
    selectedChild: null,
    children: [],
    loading: false
  },

  onLoad(options) {
    this.setData({
      taskId: options.taskId,
      taskName: decodeURIComponent(options.taskName),
      basePoints: parseInt(options.basePoints),
      icon: decodeURIComponent(options.icon)
    });
    this.loadChildren();
    this.calculatePoints();
  },

  async loadChildren() {
    try {
      const res = await app.callCloudFunction('child', { action: 'listChildren' });
      if (res.success && res.list.length > 0) {
        const children = res.list;
        let selectedChild = children.find(c => c._id === app.globalData.currentChildId);
        if (!selectedChild) selectedChild = children[0];
        this.setData({ children, selectedChild });
      }
    } catch (e) {
      console.error(e);
    }
  },

  onLevelChange(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({ selectedLevel: this.data.levels[index].key });
    this.calculatePoints();
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
    this.setData({ actualPoints: actualPoints, ratio: level ? level.ratio : 1 });
  },

  async onSubmit() {
    const { taskId, selectedChild, selectedLevel } = this.data;
    if (!selectedChild) {
      wx.showToast({ title: '请选择孩子', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await app.callCloudFunction('task', {
        action: 'completeTask',
        taskId,
        childId: selectedChild._id,
        completionLevel: selectedLevel
      });

      if (res.success) {
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
});
