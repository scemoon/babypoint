// bp_task - 任务管理与完成
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const COMPLETION_LEVELS = {
  simple:  { name: '简单完成', ratio: 0.5 },
  normal:  { name: '一般完成', ratio: 0.75 },
  perfect: { name: '完美完成', ratio: 1.0 }
};

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const db = cloud.database();
  const _ = db.command;
  const tasksCol = db.collection('bp_tasks');
  const childrenCol = db.collection('bp_children');
  const completionsCol = db.collection('bp_task_completions');
  const { action } = event;
  const data = event.data || event;

  try {
    switch (action) {
      case 'listTasks': {
        const { category } = data;
        const where = { isActive: true, scope: _.in(['global', 'parent']) };
        if (category) where.category = category;
        const res = await tasksCol.where(_.and([
          where,
          _.or([{ scope: 'global' }, { scope: 'parent', parentId: openid }])
        ])).orderBy('basePoints', 'desc').get();
        return { success: true, list: res.data || [] };
      }

      case 'getTask': {
        const { taskId } = data;
        const res = await tasksCol.doc(taskId).get();
        return { success: true, task: res.data };
      }

      case 'createTask': {
        const { name, category, basePoints, description, icon, maxDaily, requiresPhoto } = data;
        if (!name || !category || !basePoints) {
          return { success: false, error: '任务名称、分类和积分必填' };
        }
        if (basePoints < 1 || basePoints > 100) {
          return { success: false, error: '积分必须在 1-100 之间' };
        }
        const now = Date.now();
        const result = await tasksCol.add({
          data: {
            name: name.trim(),
            category,
            basePoints: Math.floor(basePoints),
            description: description || '',
            icon: icon || '📝',
            isPreset: false,
            isActive: true,
            maxDaily: maxDaily || 0,
            requiresPhoto: requiresPhoto || false,
            scope: 'parent',
            parentId: openid,
            createdAt: now,
            updatedAt: now
          }
        });
        return { success: true, taskId: result.id };
      }

      case 'updateTask': {
        const { taskId, name, category, basePoints, description, icon, maxDaily, requiresPhoto, isActive } = data;
        if (!taskId) return { success: false, error: 'taskId 必填' };
        const existing = await tasksCol.doc(taskId).get();
        if (!existing.data || existing.data.parentId !== openid || existing.data.isPreset) {
          return { success: false, error: '只能修改自己创建的任务' };
        }
        const updateData = { updatedAt: Date.now() };
        if (name !== undefined) updateData.name = name.trim();
        if (category !== undefined) updateData.category = category;
        if (basePoints !== undefined) {
          if (basePoints < 1 || basePoints > 100) {
            return { success: false, error: '积分必须在 1-100 之间' };
          }
          updateData.basePoints = Math.floor(basePoints);
        }
        if (description !== undefined) updateData.description = description;
        if (icon !== undefined) updateData.icon = icon;
        if (maxDaily !== undefined) updateData.maxDaily = maxDaily;
        if (requiresPhoto !== undefined) updateData.requiresPhoto = requiresPhoto;
        if (isActive !== undefined) updateData.isActive = isActive;
        await tasksCol.doc(taskId).update({ data: updateData });
        return { success: true };
      }

      case 'deleteTask': {
        const { taskId } = data;
        const existing = await tasksCol.doc(taskId).get();
        if (!existing.data || existing.data.parentId !== openid || existing.data.isPreset) {
          return { success: false, error: '只能删除自己创建的任务' };
        }
        await tasksCol.doc(taskId).update({ data: { isActive: false, updatedAt: Date.now() } });
        return { success: true };
      }

      case 'completeTask': {
        const { childId, taskId, completionLevel } = data;
        if (!childId || !taskId) {
          return { success: false, error: '缺少参数' };
        }
        if (!COMPLETION_LEVELS[completionLevel]) {
          return { success: false, error: '无效的完成度' };
        }

        const child = await childrenCol.doc(childId).get();
        if (!child.data) return { success: false, error: '孩子不存在' };

        const task = await tasksCol.doc(taskId).get();
        if (!task.data) return { success: false, error: '任务不存在' };

        const ratio = COMPLETION_LEVELS[completionLevel].ratio;
        const actualPoints = Math.floor(task.data.basePoints * ratio);
        const now = Date.now();

        await Promise.all([
          completionsCol.add({
            data: {
              _id: generateId(),
              childId,
              taskId,
              taskName: task.data.name,
              taskIcon: task.data.icon,
              basePoints: task.data.basePoints,
              completionLevel,
              actualPoints,
              createdAt: now
            }
          }),
          childrenCol.doc(childId).update({
            data: { totalPoints: _.inc(actualPoints), updatedAt: now }
          })
        ]);

        return { success: true, actualPoints, completionLevel };
      }

      default:
        return { success: false, error: '未知操作' };
    }
  } catch (e) {
    console.error('bp_task error:', e);
    return { success: false, error: e.message || '服务器错误' };
  }
};
