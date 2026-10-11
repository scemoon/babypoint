// bp_child - 孩子档案管理
const cloud = require('wx-server-sdk');
const crypto = require('crypto');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const PIN_ITERATIONS = 120000;

function pinHash(pin, salt) {
  return crypto.pbkdf2Sync(pin, salt, PIN_ITERATIONS, 32, 'sha256').toString('hex');
}

function verifyPin(user, pin) {
  if (!user || !user.completionPinHash || !user.completionPinSalt) return false;
  const expected = Buffer.from(user.completionPinHash, 'hex');
  const hash = crypto.pbkdf2Sync(pin, user.completionPinSalt, Number(user.completionPinIterations) || PIN_ITERATIONS, 32, 'sha256').toString('hex');
  const actual = Buffer.from(hash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function toPublicUserInfo(user) {
  if (!user) return user;
  const { completionPinHash, completionPinSalt, completionPinIterations, completionPinFailCount, completionPinLockedUntil, ...publicInfo } = user;
  return publicInfo;
}

async function registerPinFailure(usersCol, openid, user) {
  const attempts = (Number(user.completionPinFailCount) || 0) + 1;
  const lockedUntil = attempts >= 5 ? Date.now() + 10 * 60 * 1000 : (user.completionPinLockedUntil || 0);
  await usersCol.doc(openid).update({ data: { completionPinFailCount: attempts >= 5 ? 0 : attempts, completionPinLockedUntil: lockedUntil, updatedAt: Date.now() } });
  return lockedUntil > Date.now() ? '确认码错误次数过多，请10分钟后再试' : `确认码错误，还可尝试${5 - attempts}次`;
}

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
        const existing = await usersCol.doc(openid).get().catch(() => null);
        const profile = data.userInfo || {};
        if (existing && existing.data) {
          const updateData = { updatedAt: Date.now(), lastActiveAt: Date.now() };
          if (profile.nickname) updateData.nickname = profile.nickname;
          if (profile.avatar) updateData.avatar = profile.avatar;
          await usersCol.doc(openid).update({ data: updateData });
          return { success: true, userInfo: toPublicUserInfo({ ...existing.data, ...updateData }) };
        }
        const userInfo = await createParent(openid, profile);
        return { success: true, userInfo };
      }

      case 'getCompletionPinStatus': {
        const userRes = await usersCol.doc(openid).get().catch(() => null);
        return { success: true, configured: !!(userRes && userRes.data && userRes.data.completionPinHash) };
      }

      case 'setCompletionPin': {
        const { currentPin, newPin, confirmPin } = data;
        if (!/^\d{6}$/.test(String(newPin || ''))) return { success: false, error: '请设置6位数字确认码' };
        if (newPin !== confirmPin) return { success: false, error: '两次输入的确认码不一致' };
        const userRes = await usersCol.doc(openid).get().catch(() => null);
        if (!userRes || !userRes.data) return { success: false, error: '家长账户不存在，请重新登录' };
        const user = userRes.data;
        if (user.completionPinHash) {
          if ((user.completionPinLockedUntil || 0) > Date.now()) return { success: false, error: '确认码已暂时锁定，请10分钟后再试' };
          if (!verifyPin(user, String(currentPin || ''))) {
            const error = await registerPinFailure(usersCol, openid, user);
            return { success: false, error };
          }
        }
        const salt = crypto.randomBytes(16).toString('hex');
        await usersCol.doc(openid).update({ data: {
          completionPinHash: pinHash(String(newPin), salt),
          completionPinSalt: salt,
          completionPinIterations: PIN_ITERATIONS,
          completionPinFailCount: 0,
          completionPinLockedUntil: 0,
          updatedAt: Date.now()
        } });
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
