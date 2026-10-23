// pages/task/task.js
// 版本: v3.0 - 任务时间段 + 周期实例（待开始/进行中/已完成/已逾期）
const app = getApp();
const { formatInstanceLabel, formatDayLabel } = require('../../utils/date-range');

// 四个进度标签：待开始排在"进行中"前面，符合时间顺序
const STATUS_TABS = [
  { key: 'active', name: '进行中', emptyEmoji: '🎉', emptyText: '太棒了！暂无进行中任务', emptyHint: '所有任务都已完成或已逾期' },
  { key: 'pending', name: '待开始', emptyEmoji: '⏳', emptyText: '还没有待开始的任务', emptyHint: '发布任务后，未来周期的任务会出现在这里' },
  { key: 'completed', name: '已完成', emptyEmoji: '📝', emptyText: '还没有完成的任务', emptyHint: '完成任务获得积分奖励' },
  { key: 'overdue', name: '已逾期', emptyEmoji: '✅', emptyText: '没有逾期任务', emptyHint: '继续保持' }
];

const STATUS_LABELS = { pending: '待开始', active: '进行中', completed: '已完成', overdue: '已逾期' };

Page({
  data: {
    children: [],
    selectedChildId: '',
    // 默认不筛选：五育领域与任务分类都默认选中「全部」（即其全部标签）
    currentCategory: '',
    currentDomain: '',
    currentStatus: 'active',
    // 计数直接挂在 tab 上，避免在 wxml 里写 statusCounts[item.key] 这种动态取值
    statusTabs: STATUS_TABS.map(t => ({ ...t, count: 0 })),
    statusCounts: { pending: 0, active: 0, completed: 0, overdue: 0 },
    currentStatusLabel: '进行中',
    emptyEmoji: '🎉',
    emptyText: '太棒了！暂无进行中任务',
    emptyHint: '所有任务都已完成或已逾期',
    filteredCategories: [],
    tasks: [],
    displayTasks: [],
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

  // 一次取回该孩子在当前筛选下的全部周期实例，四个 Tab 的计数也用同一份数据算
  async loadTasks() {
    this.setData({ loading: true });
    try {
      const res = await app.callCloudFunction('task', {
        action: 'listTasks',
        category: this.data.currentCategory || undefined,
        status: this.data.currentStatus,
        childId: this.data.selectedChildId
      });
      if (res.success) {
        // 统一用同一个"现在"渲染整屏，避免跨零点时同一列表里出现两种当天口径
        const now = Date.now();
        const tasks = (res.list || []).map(instance => {
          const cat = this.data.categories.find(c => c.key === instance.category)
            || this.data.categories[this.data.categories.length - 1];
          return {
            ...instance,
            categoryIcon: instance.categoryIcon || cat.icon,
            categoryName: instance.categoryName || cat.name,
            bgColor: instance.categoryColor || cat.bgColor,
            domain: instance.domain || cat.domain,
            domainName: instance.domainName || cat.domainName,
            statusLabel: STATUS_LABELS[instance.status] || '',
            // 「今天 周一」这种一眼能对上日历的说法
            instanceLabel: formatInstanceLabel(instance, now),
            // 待开始的行额外标一下还有多久，避免"看得见却做不了"的困惑
            startsInLabel: this.buildStartsInLabel(instance, now)
          };
        });

        const allInDomain = this.data.currentDomain
          ? tasks.filter(t => t.domain === this.data.currentDomain)
          : tasks;
        const filteredCategories = this.data.currentDomain
          ? this.data.categories.filter(c => c.domain === this.data.currentDomain)
          : this.data.categories;

        const counts = this.computeCountsSync(allInDomain);
        this.setData({
          tasks,
          filteredCategories,
          displayTasks: this.filterTasks(allInDomain),
          statusTabs: this.withCounts(STATUS_TABS, counts),
          statusCounts: counts
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 把计数写进每个 tab 对象，而不是在 wxml 里做 statusCounts[item.key] 这种动态取值
  withCounts(tabs, counts) {
    return (tabs || []).map(tab => ({ ...tab, count: counts[tab.key] || 0 }));
  },

  // 待开始的周期：显示"明天开始 / 3 天后开始"，让家长知道任务不会漏
  buildStartsInLabel(instance, now = Date.now()) {
    if (instance.status !== 'pending') return '';
    const start = Number(instance.instanceStart) || 0;
    if (!start) return '';
    const label = formatDayLabel(start, now);
    return label === '今天' ? '即将开始' : `${label}开始`;
  },

  computeCountsSync(taskList) {
    const counts = { pending: 0, active: 0, completed: 0, overdue: 0 };
    (taskList || []).forEach(task => {
      if (counts[task.status] === undefined) return;
      counts[task.status] += 1;
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
    if (currentStatus === this.data.currentStatus) return;
    const tab = STATUS_TABS.find(t => t.key === currentStatus) || STATUS_TABS[1];
    this.setData({
      currentStatus,
      currentStatusLabel: tab.name,
      emptyEmoji: tab.emptyEmoji,
      emptyText: tab.emptyText,
      emptyHint: tab.emptyHint,
      displayTasks: this.filterTasks(this.data.tasks, currentStatus)
    });
  },

  // 实例自带状态，这里只负责按 Tab 过滤
  filterTasks(tasks, status) {
    const selected = status || this.data.currentStatus;
    return (tasks || []).filter(task => task.status === selected);
  },

  onTaskTap(e) {
    const task = e.currentTarget.dataset.task;
    if (!task) return;

    if (task.status === 'completed') {
      wx.showToast({ title: '这个周期已经完成了', icon: 'none' });
      return;
    }

    if (task.status === 'overdue') {
      wx.showToast({
        title: '该周期已逾期，无法补做',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const childId = this.data.selectedChildId;
    // 确认页的奖状要显示与列表行一致的身份信息（emoji / 领域 / 周期 / 日期）
    const params = [
      'taskId=' + encodeURIComponent(task.taskId || task._id),
      'instanceStart=' + encodeURIComponent(task.instanceStart || ''),
      'childId=' + encodeURIComponent(childId),
      'taskName=' + encodeURIComponent(task.name || ''),
      'basePoints=' + encodeURIComponent(task.basePoints || 0),
      'icon=' + encodeURIComponent(task.categoryIcon || task.icon || '📝'),
      'domainName=' + encodeURIComponent(task.domainName || ''),
      'periodLabel=' + encodeURIComponent(task.instanceLabel || task.periodLabel || ''),
      'progress=' + encodeURIComponent(task.status === 'completed' ? 1 : 0),
      'targetCount=' + encodeURIComponent(task.targetCount || 1)
    ].join('&');
    wx.navigateTo({ url: '/pages/task-complete/task-complete?' + params });
  },

  // 长按任务显示删除选项（仅进行中/待开始）
  onTaskLongPress(e) {
    const task = e.currentTarget.dataset.task;
    if (!task) return;

    // 只允许删除进行中和待开始的任务
    if (task.status !== 'active' && task.status !== 'pending') {
      return;
    }

    wx.showActionSheet({
      itemList: ['删除任务'],
      itemColor: '#FF3B30',
      success: (res) => {
        if (res.tapIndex === 0) {
          this.confirmDeleteTask(task);
        }
      }
    });
  },

  // 确认删除任务
  confirmDeleteTask(task) {
    const taskName = task.name || '该任务';
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${taskName}」吗？${task.status === 'pending' ? '该任务还未开始，删除后将不会出现在任务列表中。' : '该任务正在进行中，删除后将不再有效。'}`,
      confirmText: '删除',
      confirmColor: '#FF3B30',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.deleteTask(task);
        }
      }
    });
  },

  // 执行删除任务
  async deleteTask(task) {
    try {
      wx.showLoading({ title: '删除中...' });
      const res = await app.callCloudFunction('task', {
        action: 'deleteTask',
        taskId: task.taskId || task._id,
        childId: this.data.selectedChildId
      });

      if (res.success) {
        wx.showToast({ title: '已删除', icon: 'success' });
        // 刷新列表
        this.loadTasks();
      } else {
        wx.showToast({ title: res.error || '删除失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: e.message || '删除失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onAddTask() {
    wx.switchTab({ url: '/pages/publish/publish' });
  },

  onShow() {
    this.loadChildren();
  }
});
