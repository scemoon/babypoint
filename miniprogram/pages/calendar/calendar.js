// pages/calendar/calendar.js
const app = getApp();

Page({
  data: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    days: [],
    monthStats: null,
    selectedDate: '',
    dayDetails: null,
    children: [],
    selectedChild: null,
    loading: false
  },

  onLoad() {
    this.loadChildren();
  },

  onShow() {
    if (app.globalData.currentChildId) {
      this.loadMonthlyData();
    }
  },

  async loadChildren() {
    try {
      const res = await app.callCloudFunction('child', { action: 'listChildren' });
      if (res.success && res.list.length > 0) {
        let selectedChild = res.list.find(c => c._id === app.globalData.currentChildId);
        if (!selectedChild) selectedChild = res.list[0];
        this.setData({ children: res.list, selectedChild });
        this.loadMonthlyData();
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
      this.loadMonthlyData();
    }
  },

  async loadMonthlyData() {
    const { year, month, selectedChild } = this.data;
    if (!selectedChild) return;

    this.setData({ loading: true, dayDetails: null });
    try {
      const res = await app.callCloudFunction('calendar', {
        action: 'getMonthlySummary',
        childId: selectedChild._id,
        year,
        month
      });

      if (res.success) {
        const daysMap = {};
        res.days.forEach(d => { daysMap[d.date] = d; });
        
        // 生成当月日历
        const firstDay = new Date(year, month - 1, 1).getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        const calendarDays = [];

        // 填充空白
        for (let i = 0; i < firstDay; i++) {
          calendarDays.push({ empty: true });
        }

        // 填充日期
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0');
          const dayData = daysMap[dateStr] || {};
          calendarDays.push({
            day: d,
            date: dateStr,
            hasActivity: dayData.hasActivity || false,
            totalEarned: dayData.totalEarned || 0,
            taskCount: dayData.taskCount || 0
          });
        }

        this.setData({ days: calendarDays, monthStats: res.stats });
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ loading: false });
    }
  },

  onPrevMonth() {
    let { year, month } = this.data;
    if (month === 1) {
      month = 12;
      year--;
    } else {
      month--;
    }
    this.setData({ year, month });
    this.loadMonthlyData();
  },

  onNextMonth() {
    let { year, month } = this.data;
    if (month === 12) {
      month = 1;
      year++;
    } else {
      month++;
    }
    this.setData({ year, month });
    this.loadMonthlyData();
  },

  async onDayTap(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return;

    this.setData({ selectedDate: date, loading: true });
    try {
      const res = await app.callCloudFunction('calendar', {
        action: 'getDayDetails',
        childId: this.data.selectedChild._id,
        date
      });

      if (res.success) {
        this.setData({ dayDetails: res });
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ loading: false });
    }
  }
});
