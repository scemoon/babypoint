const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const command = db.command;

// 固定批次：可重复执行、不影响正式数据
const SEED_BATCH = 'bp_init_50_20261017';
const USER_COUNT = 50;

// 天马行空的名字库（50个无重复）
const NICKNAMES = [
  // 神话幻想系
  '哪吒', '敖丙', '白泽', '饕餮', '椒图', '赑屃', '螭吻', '蒲牢', '狴犴', '睚眦',
  // 星空宇宙系
  '星澜', '月吟', '日耀', '辰曜', '云骞', '风逸', '雷亟', '电澈', '霜序', '雾隐',
  // 宝石精灵系
  '琉璃', '琥珀', '翡翠', '玛瑙', '珍珠', '水晶', '珊瑚', '墨玉', '紫晶', '红珊',
  // 诗词典故系
  '子衿', '清扬', '婉兮', '灵犀', '若竹', '沐桑', '白茶', '锦书', '采薇', '南风',
  // 自然万物系
  '松子', '竹青', '梅傲', '兰心', '菊隐', '荷韵', '桂香', '枫火', '桦林', '榕深',
  // 美食奇遇系
  '糖酥', '酪香', '蜜柚', '盐焗', '酱香', '醋溜', '蒜香', '葱翠', '姜暖', '椒麻',
  // 乐器雅韵系
  '琴瑟', '琵琶', '阮咸', '箜篌', '笙箫', '笛韵', '鼓搏', '铃脆', '弦音', '钟鸣',
  // 颜色幻彩系
  '朱砂', '黛青', '鸦黑', '鸦黄', '藕荷', '缃色', '绛紫', '鸦绿', '素白', '玄青'
];

const GRADE_META = {
  kindergarten_small: { name: '幼儿园小班', level: 1, stage: 'kindergarten' },
  kindergarten_medium: { name: '幼儿园中班', level: 2, stage: 'kindergarten' },
  kindergarten_big: { name: '幼儿园大班', level: 3, stage: 'kindergarten' },
  primary_1: { name: '小学一年级', level: 4, stage: 'primary' },
  primary_2: { name: '小学二年级', level: 5, stage: 'primary' },
  primary_3: { name: '小学三年级', level: 6, stage: 'primary' },
  primary_4: { name: '小学四年级', level: 7, stage: 'primary' },
  primary_5: { name: '小学五年级', level: 8, stage: 'primary' },
  primary_6: { name: '小学六年级', level: 9, stage: 'primary' },
  middle_1: { name: '初中初一', level: 10, stage: 'middle' },
  middle_2: { name: '初中初二', level: 11, stage: 'middle' },
  middle_3: { name: '初中初三', level: 12, stage: 'middle' }
};

const GRADE_KEYS = Object.keys(GRADE_META);

// 打乱名字顺序
function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 正态分布随机数（Box-Muller）
function gaussianRandom(mean, std) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.round(mean + z * std);
}

// 生成合理的积分（正态分布，大部分在200-1000，少量高低）
function generatePoints() {
  // 尝试生成在 50-2500 范围内的值
  let points;
  do {
    points = gaussianRandom(600, 300);
  } while (points < 50 || points > 2500);
  // 确保是 10 的倍数
  return Math.floor(points / 10) * 10;
}

// 出生日期按年级推算（约 6 岁入学，每年升一级）
function buildBirthDate(level) {
  const now = new Date();
  const age = 6 + (level - 1);
  const birth = new Date(now.getFullYear() - age, (now.getMonth() + 7) % 12, 1 + (level % 27));
  return formatDate(birth);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pad(n) {
  return String(n).padStart(3, '0');
}

// 生成一份完整的种子数据（50个学生，正态分布积分）
function buildSeedData() {
  const now = Date.now();
  const users = [];
  const children = [];
  const shuffledNames = shuffleArray(NICKNAMES);

  for (let i = 0; i < USER_COUNT; i += 1) {
    const sequence = i + 1;
    const openid = `seed_openid_50_${sequence}`;
    const totalPoints = generatePoints();
    const gradeKey = GRADE_KEYS[i % GRADE_KEYS.length];
    const grade = GRADE_META[gradeKey];
    const gender = ['boy', 'girl', 'other'][i % 3];
    const name = shuffledNames[i % shuffledNames.length];

    users.push({
      _id: `seed_user_50_${sequence}`,
      _openid: openid,
      nickname: `${name}妈`,
      avatar: '',
      unionId: '',
      phoneNumber: '',
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
      seedBatch: SEED_BATCH,
      isMock: true
    });

    children.push({
      _id: `seed_child_50_${sequence}`,
      _openid: openid,
      name: name,
      avatar: '',
      gender,
      birthDate: buildBirthDate(grade.level),
      grade: gradeKey,
      gradeLevel: grade.level,
      schoolStage: grade.stage,
      schoolStageName: grade.name,
      totalPoints,
      redeemedPoints: 0,
      createdAt: now,
      updatedAt: now,
      seedBatch: SEED_BATCH,
      isMock: true
    });
  }

  return { users, children };
}

function summarize() {
  const points = Array.from({ length: USER_COUNT }, () => generatePoints());
  const sorted = [...points].sort((a, b) => a - b);
  return {
    seedBatch: SEED_BATCH,
    userCount: USER_COUNT,
    minPoints: sorted[0],
    maxPoints: sorted[sorted.length - 1],
    avgPoints: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
    distribution: {
      low: sorted.filter(p => p < 300).length,      // 0-300: 约 15%
      mid: sorted.filter(p => p >= 300 && p < 800).length,  // 300-800: 约 68%
      high: sorted.filter(p => p >= 800).length      // 800+: 约 15%
    }
  };
}

async function insertInBatches(collectionName, docs) {
  const col = db.collection(collectionName);
  let created = 0;
  const failed = [];

  for (let i = 0; i < docs.length; i += 20) {
    const chunk = docs.slice(i, i + 20);
    try {
      await col.add({ data: chunk });
      created += chunk.length;
    } catch (err) {
      // 逐条重试，区分冲突与真实失败
      for (const doc of chunk) {
        try {
          await col.add({ data: doc });
          created += 1;
        } catch (innerErr) {
          failed.push({
            collection: collectionName,
            _id: doc._id,
            message: innerErr && innerErr.errMsg ? innerErr.errMsg : String(innerErr)
          });
        }
      }
    }
  }

  return { created, failed };
}

async function seed() {
  const { users, children } = buildSeedData();
  const userResult = await insertInBatches('bp_users', users);
  const childResult = await insertInBatches('bp_children', children);

  const existed = await countBatch('bp_users');
  const existedChildren = await countBatch('bp_children');

  return {
    action: 'seed',
    ...summarize(),
    created: userResult.created + childResult.created,
    skipped: (USER_COUNT - userResult.created) + (USER_COUNT - childResult.created),
    failed: userResult.failed.length + childResult.failed.length,
    failedDetails: [...userResult.failed, ...childResult.failed],
    collections: {
      bp_users: { created: userResult.created, totalInBatch: existed },
      bp_children: { created: childResult.created, totalInBatch: existedChildren }
    }
  };
}

async function countBatch(collectionName) {
  const res = await db
    .collection(collectionName)
    .where({ seedBatch: SEED_BATCH })
    .count();
  return res.total;
}

async function preview() {
  const { users, children } = buildSeedData();
  return {
    action: 'preview',
    ...summarize(),
    sampleUsers: users.slice(0, 3),
    sampleChildren: children.slice(0, 5)
  };
}

async function clear() {
  const users = await db.collection('bp_users').where({ seedBatch: SEED_BATCH }).remove();
  const children = await db.collection('bp_children').where({ seedBatch: SEED_BATCH }).remove();

  return {
    action: 'clear',
    seedBatch: SEED_BATCH,
    collections: {
      bp_users: { deleted: (users && users.deleted) || 0 },
      bp_children: { deleted: (children && children.deleted) || 0 }
    }
  };
}

exports.main = async (event) => {
  const action = (event && event.action) || 'preview';
  try {
    switch (action) {
      case 'preview':
        return { code: 0, ...(await preview()) };
      case 'seed':
        return { code: 0, ...(await seed()) };
      case 'clear':
        return { code: 0, ...(await clear()) };
      default:
        return { code: -1, message: `未知 action: ${action}，可用值: preview / seed / clear` };
    }
  } catch (err) {
    return {
      code: -1,
      message: err && err.errMsg ? err.errMsg : String(err),
      stack: err && err.stack ? err.stack : undefined
    };
  }
};
