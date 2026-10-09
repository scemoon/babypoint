// bp_child - 孩子档案管理
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const GRADE_META = {
  'kindergarten_small':  { name: '幼儿园小班', level: 1,  stage: 'kindergarten' },
  'kindergarten_medium': { name: '幼儿园中班', level: 2,  stage: 'kindergarten' },
  'kindergarten_big':    { name: '幼儿园大班', level: 3,  stage: 'kindergarten' },
  'primary_1':           { name: '小学一年级', level: 4,  stage: 'primary' },
  'primary_2':           { name: '小学二年级', level: 5,  stage: 'primary' },
  'primary_3':           { name: '小学三年级', level: 6,  stage: 'primary' },
  'primary_4':           { name: '小学四年级', level: 7,  stage: 'primary' },
  'primary_5':           { name: '小学五年级', level: 8,  stage: 'primary' },
  'primary_6':           { name: '小学六年级', level: 9,  stage: 'primary' },
  'middle_1':            { name: '初中初一',   level: 10, stage: 'middle' },
  'middle_2':            { name: '初中初二',   level: 11, stage: 'middle' },
  'middle_3':            { name: '初中初三',   level: 12, stage: 'middle' }
};

async function createParent(openid, userInfo) {
  const db = cloud.database();
  const usersCol = db.collection('bp_users');
  const now = Date.now();
  const userData = {
    _id: openid,
    _openid: openid,
    nickname: userInfo.nickname || '家长',
    avatar: userInfo.avatar || '',
    unionId: '',
    phoneNumber: '',
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now
  };
  await usersCol.add({ data: userData });
  return userData;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const db = cloud.database();
  const usersCol = db.collection('bp_users');
  const childrenCol = db.collection('bp_children');
  const { action } = event;
  const data = event.data || event;

  try {
    switch (action) {
      case 'register': {
        await createParent(openid, data.userInfo || {});
        return { success: true };
      }

      case 'createChild': {
        const { name, avatar, gender, birthDate, grade } = data;
        if (!name || !grade) return { success: false, error: '姓名和年级必填' };
        if (!GRADE_META[grade]) return { success: false, error: '无效的年级' };
        const meta = GRADE_META[grade];
        const now = Date.now();
        const childData = {
          _id: openid + '_' + now,
          _openid: openid,
          name: name.trim(),
          avatar: avatar || '',
          gender: gender || 'other',
          birthDate: birthDate || '',
          grade: grade,
          gradeLevel: meta.level,
          schoolStage: meta.stage,
          schoolStageName: meta.name,
          totalPoints: 0,
          redeemedPoints: 0,
          createdAt: now,
          updatedAt: now
        };
        const res = await childrenCol.add({ data: childData });
        return { success: true, childId: res._id };
      }

      case 'listChildren': {
        const res = await childrenCol.where({ _openid: openid }).get();
        return { success: true, list: res.data };
      }

      case 'getChild': {
        const { childId } = data;
        const res = await childrenCol.doc(childId).get();
        if (!res.data) return { success: false, error: '孩子不存在' };
        return { success: true, child: res.data };
      }

      case 'updateChild': {
        const { childId, name, avatar, gender, birthDate, grade } = data;
        const updateData = { updatedAt: Date.now() };
        if (name) updateData.name = name.trim();
        if (avatar !== undefined) updateData.avatar = avatar;
        if (gender) updateData.gender = gender;
        if (birthDate) updateData.birthDate = birthDate;
        if (grade) {
          if (!GRADE_META[grade]) return { success: false, error: '无效的年级' };
          const meta = GRADE_META[grade];
          updateData.grade = grade;
          updateData.gradeLevel = meta.level;
          updateData.schoolStage = meta.stage;
          updateData.schoolStageName = meta.name;
        }
        await childrenCol.doc(childId).update({ data: updateData });
        return { success: true };
      }

      case 'deleteChild': {
        const { childId } = data;
        await childrenCol.doc(childId).remove();
        return { success: true };
      }

      default:
        return { success: false, error: '未知操作' };
    }
  } catch (e) {
    console.error('bp_child error:', e);
    return { success: false, error: e.message || '服务器错误' };
  }
};
