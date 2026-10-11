// pages/history/history.js
const app = getApp();

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

Page({
  data: {
    type: 'task', // task or reward
    records: [],
    children: [],
    selectedChild: null,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    days: [],
    monthStats: null,
    selectedDate: getLocalDate(),
    dayDetails: null,
    page: 1,
    hasMore: true,
    loading: false
  },

  onLoad(options) {
    this.setData({ type: options.type || 'task' });
    this._recordsRequestId = 0;
    this._dayRequestId = 0;
    this.loadChildren();
  },

  async loadChildren() {
    try {
      const res = await app.callCloudFunction('child', { action: 'listChildren' });
      if (res.success && res.list.length > 0) {
        let selectedChild = res.list.find(c => c._id === app.globalData.currentChildId);
        if (!selectedChild) selectedChild = res.list[0];
        this.setData({ children: res.list, selectedChild });
        this.loadMonthlyData();
        this.loadDayRecords(this.data.type, this.data.selectedDate, selectedChild._id);
      }
    } catch (e) {
      console.error(e);
    }
  },

  onTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    if (!type || type === this.data.type) return;
    this.setData({ type, records: [], page: 1, hasMore: true });
    if (this.data.selectedDate) {
      this._recordsRequestId++;
      this.loadDayRecords(type, this.data.selectedDate, this.data.selectedChild && this.data.selectedChild._id);
    }
    else this.loadRecords(true);
  },

  onSelectChild(e) {
    const childId = e.currentTarget.dataset.id;
    const child = this.data.children.find(c => c._id === childId);
    if (child) {
      this.setData({ selectedChild: child, selectedDate: '', dayDetails: null });
      this.loadMonthlyData();
      this.loadRecords(true);
    }
  },

  async loadMonthlyData() {
    const { year, month, selectedChild } = this.data;
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push({ key: `blank-${i}`, dayLabel: '', empty: true });
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ key: date, day, dayLabel: String(day), date, totalEarned: 0, totalSpent: 0, hasActivity: false });
    }
    this.setData({ days, monthStats: null });
    if (!selectedChild) return;
    try {
      const res = await app.callCloudFunction('calendar', {
        action: 'getMonthlySummary', childId: selectedChild._id, year, month
      });
      if (!res.success) return;
      const daysMap = {};
      (res.days || []).forEach(day => { daysMap[day.date] = day; });
      const enrichedDays = days.map(cell => {
        if (cell.empty) return cell;
        const summary = daysMap[cell.date] || {};
        return { ...cell, totalEarned: summary.totalEarned || 0, totalSpent: summary.totalSpent || 0, hasActivity: !!summary.hasActivity };
      });
      this.setData({ days: enrichedDays, monthStats: res.stats || null });
    } catch (e) {
      console.error(e);
    }
  },

  changeMonth(offset) {
    let { year, month } = this.data;
    month += offset;
    if (month < 1) { month = 12; year--; }
    if (month > 12) { month = 1; year++; }
    this.setData({ year, month, selectedDate: '', dayDetails: null });
    this.loadMonthlyData();
    this.loadRecords(true);
  },

  onPrevMonth() { this.changeMonth(-1); },

  onNextMonth() { this.changeMonth(1); },

  async onDayTap(e) {
    const date = e.currentTarget.dataset.date;
    if (!date || !this.data.selectedChild) return;
    this.setData({ selectedDate: date, dayDetails: null, loading: true, records: [] });
    this._recordsRequestId++;
    this.loadDayRecords(this.data.type, date, this.data.selectedChild._id);
  },

  async loadDayRecords(type, date, childId) {
    if (!date || !childId) return;
    const requestId = ++this._dayRequestId;
    this.setData({ loading: true });
    try {
      const res = await app.callCloudFunction('calendar', {
        action: 'getDayDetails', childId, date
      });
      if (!res.success || requestId !== this._dayRequestId || date !== this.data.selectedDate || childId !== this.data.selectedChild._id || type !== this.data.type) return;
      this.setData({ dayDetails: res });
      this.showDayRecords(type, res);
    } catch (e) {
      console.error(e);
    } finally {
      if (requestId === this._dayRequestId) this.setData({ loading: false });
    }
  },

  showDayRecords(type, details) {
    const records = type === 'task' ? (details.tasks || []) : (details.rewards || []);
    this.setData({ records, page: 1, hasMore: false });
  },

  async loadRecords(reset = false) {
    if (!this.data.selectedChild) return;
    
    const page = reset ? 1 : this.data.page;
    if (!reset && !this.data.hasMore) return;

    const requestId = ++this._recordsRequestId;
    this.setData({ loading: true });
    try {
      const action = this.data.type === 'task' ? 'getTaskCompletions' : 'getRedemptions';
      const res = await app.callCloudFunction(this.data.type === 'task' ? 'task' : 'reward', {
        action,
        childId: this.data.selectedChild._id,
        page,
        pageSize: 20
      });

      if (res.success && requestId === this._recordsRequestId && this.data.type === (action === 'getTaskCompletions' ? 'task' : 'reward')) {
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
      if (requestId === this._recordsRequestId) this.setData({ loading: false });
    }
  },

  onReachBottom() {
    this.loadRecords();
  }
});
