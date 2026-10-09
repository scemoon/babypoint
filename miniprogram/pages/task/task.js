// pages/task/task.js
const app = getApp();

Page({
  data: {
    children: [],
    selectedChildId: '',
    currentCategory: '',
    tasks: [],
    loading: false,
    categories: [
      { key: 'STUDY', name: '学习', icon: '📚', bgColor: '#E3F2FD' },
      { key: 'HOUSEWORK', name: '家务', icon: '🏠', bgColor: '#FFF3E0' },
      { key: 'SPORTS', name: '运动', icon: '⚽', bgColor: '#E8F5E9' },
      { key: 'ART', name: '艺术', icon: '🎨', bgColor: '#FCE4EC' },
      { key: 'READING', name: '阅读', icon: '📖', bgColor: '#FFF8E1' },
      { key: 'HABIT', name: '习惯', icon: '🌱', bgColor: '#E0F2F1' },
      { key: 'OTHER', name: '其他', icon: '✨', bgColor: '#F5F5F5' }
    ]
  },

  onLoad() {
    this.loadChildren();
  },

  async loadChildren() {
    try {
      const res = await app.callCloudFunction('child', { action: 'listChildren' });
      if (res.success) {
        this.setData({ children: res.list });
        if (res.list.length > 0) {
          const savedId = app.globalData.currentChildId;
          const childId = savedId || res.list[0]._id;
          this.setData({ selectedChildId: childId });
          if (!savedId) {
            app.saveCurrentChildId(childId);
          }
          this.loadTasks();
        }
      }
    } catch (e) {
      console.error(e);
    }
  },

  async loadTasks() {
    this.setData({ loading: true });
    try {
      const res = await app.callCloudFunction('task', { 
        action: 'listTasks',
        category: this.data.currentCategory || undefined
      });
      if (res.success) {
        const tasks = res.list.map(task => {
          const cat = this.data.categories.find(c => c.key === task.category) || this.data.categories[6];
          return { ...task, bgColor: cat.bgColor };
        });
        this.setData({ tasks });
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ loading: false });
    }
  },

  onSelectChild(e) {
    const childId = e.currentTarget.dataset.id;
    this.setData({ selectedChildId: childId });
    app.saveCurrentChildId(childId);
  },

  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ currentCategory: category });
    this.loadTasks();
  },

  onTaskTap(e) {
    const task = e.currentTarget.dataset.task;
    const childId = this.data.selectedChildId;
    wx.navigateTo({
      url: '/pages/task-complete/task-complete?taskId=' + task._id + '&childId=' + childId
    });
  },

  onAddTask() {
    wx.navigateTo({ url: '/pages/task-add/task-add' });
  },

  onShow() {
    this.loadTasks();
  }
});
