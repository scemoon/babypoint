// pages/history/history.js
const app = getApp();

Page({
  data: {
    type: 'task', // task or reward
    records: [],
    children: [],
    selectedChild: null,
    page: 1,
    hasMore: true,
    loading: false
  },

  onLoad(options) {
    this.setData({ type: options.type || 'task' });
    this.loadChildren();
  },

  async loadChildren() {
    try {
      const res = await app.callCloudFunction('child', { action: 'listChildren' });
      if (res.success && res.list.length > 0) {
        let selectedChild = res.list.find(c => c._id === app.globalData.currentChildId);
        if (!selectedChild) selectedChild = res.list[0];
        this.setData({ children: res.list, selectedChild });
        this.loadRecords(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  onSelectChild(e) {
    const childId = e.currentTarget.dataset.id;
    const child = this.data.children.find(c => c._id === childId);
    if (child) {
      this.setData({ selectedChild: child });
      this.loadRecords(true);
    }
  },

  async loadRecords(reset = false) {
    if (this.data.loading) return;
    
    const page = reset ? 1 : this.data.page;
    if (!reset && !this.data.hasMore) return;

    this.setData({ loading: true });
    try {
      const action = this.data.type === 'task' ? 'getTaskCompletions' : 'getRedemptions';
      const res = await app.callCloudFunction(this.data.type === 'task' ? 'task' : 'reward', {
        action,
        childId: this.data.selectedChild._id,
        page,
        pageSize: 20
      });

      if (res.success) {
        const newRecords = reset ? res.list : [...this.data.records, ...res.list];
        this.setData({
          records: newRecords,
          page: page + 1,
          hasMore: res.list.length === 20
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ loading: false });
    }
  },

  onReachBottom() {
    this.loadRecords();
  }
});
