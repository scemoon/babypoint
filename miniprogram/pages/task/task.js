// pages/task/task.js
// 版本: v2.3 - 修复逾期判断bug
const app = getApp();
const { CATEGORY_META, getDomains } = require('../../utils/task-score');

Page({
  data: {
    children: [],
    selectedChildId: '',
    // 默认不筛选：五育领域与任务分类都默认选中「全部」（即其全部标签）
    currentCategory: '',
    currentDomain: '',
    currentStatus: 'in_progress',
    statusCounts: { in_progress: 0, completed: 0, overdue: 0 },
    filteredCategories: [],
    tasks: [],
    loading: false,
    categories: [
      { key: 'STUDY', name: '学习', icon: '📚', bgColor: '#E3F2FD', domain: 'intelligence', domainName: '智育' },
      { key: 'READING', name: '阅读', icon: '📖', bgColor: '#FFF8E1', domain: 'intelligence', domainName: '智育' },
      { key: 'SPORTS', name: '运动', icon: '⚽', bgColor: '#E8F5E9', domain: 'physical', domainName: '体育' },
      { key: 'ART', name: '艺术', icon: '🎨', bgColor: '#FCE4EC', domain: 'aesthetic', domainName: '美育' },
      { key: 'MORAL_FAMILY', name: '家庭美德', icon: '💝', bgColor: '#FCE4EC', domain: 'moral', domainName: '德育' },
      { key: 'MORAL_SOCIAL', name: '社会公德', icon: '🌟', bgColor: '#FFF9C4', domain: 'moral', domainName: '德育' },
      { key: 'MORAL_SELF', name: '自我管理', icon: '⏰', bgColor: '#E8EAF6', domain: 'moral', domainName: '德育' },
      { key: 'MORAL_CULTURE', name: '文化传承', icon: '🎭', bgColor: '#FFECB3', domain: 'moral', domainName: '德育' },
      { key: 'HABIT', name: '习惯', icon: '🌱', bgColor: '#E0F2F1', domain: 'moral', domainName: '德育' },
      { key: 'HOUSEWORK', name: '家务', icon: '🏠', bgColor: '#FFF3E0', domain: 'lifeSkill', domainName: '劳育' },
      { key: 'LIFE_SELF', name: '自理', icon: '🧹', bgColor: '#E0F7FA', domain: 'lifeSkill', domainName: '劳育' },
      { key: 'LIFE_MONEY', name: '理财', icon: '💰', bgColor: '#FFF8E1', domain: 'lifeSkill', domainName: '劳育' },
      { key: 'LIFE_SOCIAL', name: '社交', icon: '🤝', bgColor: '#E1F5FE', domain: 'lifeSkill', domainName: '劳育' },
      { key: 'OTHER', name: '其他', icon: '✨', bgColor: '#F5F5F5', domain: 'other', domainName: '其他' }
    ],
    domains: [
      { key: '', name: '全部', icon: '🌈' },
      { key: 'intelligence', name: '智育', icon: '🧠' },
      { key: 'physical', name: '体育', icon: '💪' },
      { key: 'aesthetic', name: '美育', icon: '🎨' },
      { key: 'moral', name: '德育', icon: '💝' },
      { key: 'lifeSkill', name: '劳育', icon: '🏠' }
    ]
  },

  onLoad() {
    this.loadChildren();
  },

  async loadChildren() {
    try {
      const res = await app.callCloudFunction('child', { action: 'listChildren' });
      if (res.success) {
        // 缓存给任务确认页首屏直出，避免确认页先渲染出按钮、内容后补
        if (app.setChildrenCache) app.setChildrenCache(res.list);
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
        category: this.data.currentCategory || undefined,
        childId: this.data.selectedChildId
      });
      if (res.success) {
        const now = Date.now();
        const tasks = res.list.map(task => {
          const cat = this.data.categories.find(c => c.key === task.category) || this.data.categories[this.data.categories.length - 1];
          const isOverdue = this.checkOverdue(task, now);
          return {
            ...task,
            categoryIcon: task.categoryIcon || cat.icon,
            categoryName: task.categoryName || cat.name,
            bgColor: task.categoryColor || cat.bgColor,
            domain: task.domain || cat.domain,
            domainName: task.domainName || cat.domainName,
            isOverdue: isOverdue
          };
        });

        const allInDomain = this.data.currentDomain
          ? tasks.filter(t => t.domain === this.data.currentDomain)
          : tasks;
        const filteredCategories = this.data.currentDomain
          ? this.data.categories.filter(c => c.domain === this.data.currentDomain)
          : this.data.categories;

        this.setData({
          tasks,
          filteredCategories,
          displayTasks: this.filterTasks(allInDomain),
          statusCounts: this.computeCountsSync(allInDomain)
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 检查任务是否逾期
  checkOverdue(task, now) {
    // 单次任务永远不会逾期
    if (task.periodType === 'once') return false;
    
    // 转换为 Date 对象
    const nowDate = new Date(now);
    
    if (task.periodType === 'daily') {
      // 每天任务：当天23:59截止
      const todayEnd = new Date(nowDate);
      todayEnd.setHours(23, 59, 59, 999);
      return now > todayEnd.getTime() && task.progress < task.targetCount;
    } else if (task.periodType === 'weekly') {
      // 每周任务：周日23:59截止
      const weekEnd = new Date(nowDate);
      weekEnd.setHours(23, 59, 59, 999);
      const dayOfWeek = weekEnd.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      weekEnd.setDate(weekEnd.getDate() + daysUntilSunday);
      return now > weekEnd.getTime() && task.progress < task.targetCount;
    } else if (task.periodType === 'monthly') {
      // 每月任务：月末23:59截止
      const monthEnd = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0, 23, 59, 59, 999);
      return now > monthEnd.getTime() && task.progress < task.targetCount;
    } else if (task.periodType === 'custom') {
      // 自定义周期：按设定的间隔天数计算
      const days = Math.max(1, Number(task.periodDays) || 1);
      const periodStart = this.getPeriodStart(task, now);
      const periodEnd = periodStart + days * 86400000;
      return now > periodEnd && task.progress < task.targetCount;
    }
    
    return false;
  },

  getPeriodStart(task, now) {
    const type = task.periodType || 'once';
    const nowDate = new Date(now);
    if (type === 'daily') nowDate.setHours(0, 0, 0, 0);
    else if (type === 'weekly') {
      nowDate.setHours(0, 0, 0, 0);
      nowDate.setDate(nowDate.getDate() - ((nowDate.getDay() + 6) % 7));
    } else if (type === 'monthly') {
      nowDate.setDate(1);
      nowDate.setHours(0, 0, 0, 0);
    } else if (type === 'custom') {
      const days = Math.max(1, Number(task.periodDays) || 1);
      const anchor = Number(task.createdAt) || now;
      return anchor + Math.floor((now - anchor) / (days * 86400000)) * days * 86400000;
    }
    return type === 'once' ? 0 : nowDate.getTime();
  },

  computeCountsSync(taskList) {
    const counts = { in_progress: 0, completed: 0, overdue: 0 };
    (taskList || []).forEach(task => {
      if (task.status === 'completed') counts.completed += 1;
      else if (task.isOverdue) counts.overdue += 1;
      else counts.in_progress += 1;
    });
    return counts;
  },

  onSelectChild(e) {
    const childId = e.currentTarget.dataset.id;
    this.setData({ selectedChildId: childId });
    app.saveCurrentChildId(childId);
    this.loadTasks();
  },

  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category || '';
    this.setData({ currentCategory: category, currentDomain: '' });
    this.loadTasks();
  },

  onDomainChange(e) {
    const domain = e.currentTarget.dataset.domain || '';
    this.setData({ currentDomain: domain, currentCategory: '' });
    this.loadTasks();
  },

  onStatusChange(e) {
    const currentStatus = e.currentTarget.dataset.status;
    this.setData({ currentStatus, displayTasks: this.filterTasks(this.data.tasks, currentStatus) });
  },

  filterTasks(tasks, status) {
    const selected = status || this.data.currentStatus;
    return (tasks || []).filter(task => {
      if (selected === 'overdue') {
        return task.isOverdue;
      } else if (selected === 'completed') {
        return task.status === 'completed';
      }
      // 进行中：未完成且未逾期
      return task.status !== 'completed' && !task.isOverdue;
    });
  },

  computeStatusCounts(allFiltered) {
    const counts = { in_progress: 0, completed: 0, overdue: 0 };
    (allFiltered || []).forEach(task => {
      if (task.status === 'completed') counts.completed += 1;
      else if (task.isOverdue) counts.overdue += 1;
      else counts.in_progress += 1;
    });
    this.setData({ statusCounts: counts });
  },

  onTaskTap(e) {
    const task = e.currentTarget.dataset.task;
    
    if (task.status === 'completed') return;
    
    if (task.isOverdue) {
      wx.showToast({
        title: '任务已逾期，无法完成',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    const childId = this.data.selectedChildId;
    // 确认页的奖状要显示与列表行一致的身份信息（emoji / 领域 / 周期 / 进度）
    const params = [
      'taskId=' + encodeURIComponent(task._id),
      'childId=' + encodeURIComponent(childId),
      'taskName=' + encodeURIComponent(task.name || ''),
      'basePoints=' + encodeURIComponent(task.basePoints || 0),
      'icon=' + encodeURIComponent(task.categoryIcon || task.icon || '📝'),
      'domainName=' + encodeURIComponent(task.domainName || ''),
      'periodLabel=' + encodeURIComponent(task.periodLabel || ''),
      'progress=' + encodeURIComponent(task.progress || 0),
      'targetCount=' + encodeURIComponent(task.targetCount || 1)
    ].join('&');
    wx.navigateTo({ url: '/pages/task-complete/task-complete?' + params });
  },

  onAddTask() {
    wx.switchTab({ url: '/pages/publish/publish' });
  },

  onShow() {
    if (this.data.selectedChildId) this.loadTasks();
  }
});
