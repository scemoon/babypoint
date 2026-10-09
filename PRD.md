# 宝贝积分 - 儿童积分管理小程序 需求规格说明书

> 文档版本: v1.1
> 最后更新: 2024年
> 作者: 宝贝积分团队

---

## 一、项目概述

### 1.1 产品定位

**宝贝积分**是一款面向家庭的微信小程序，帮助家长通过积分激励机制培养孩子的良好习惯。

### 1.2 核心设计理念（关键决策）

| 决策项 | 结论 | 说明 |
|--------|------|------|
| **主要用户** | 家长 | 整个应用的核心用户是家长，而非孩子本身 |
| **孩子角色** | 子资料 | 孩子以"档案"形式存在，由家长管理 |
| **完成任务** | 家长操作 | 家长记录孩子完成任务的情况 |
| **兑换奖励** | 直接兑换 | 家长直接兑换，无需审批流程 |
| **完成度** | 三档制 | 简单 50% / 一般 75% / 完美 100%，积分按比例折算 |
| **审核机制** | 不需要 | 因为是家长在操作，无需额外的审核流程 |

### 1.3 目标用户画像

| 用户类型 | 占比 | 主要诉求 |
|----------|------|----------|
| 家长 | 100% | 培养孩子好习惯、记录成长过程、激励孩子进步 |
| 孩子 | 0%（不直接使用） | 通过家长代为操作，间接参与积分激励 |

### 1.4 核心价值

- 简单易用：家长一个人完成所有操作，无需切换身份
- 习惯养成：通过持续的积分奖励建立孩子的良好习惯
- 即时激励：完成任务立即获得积分反馈，提升成就感
- 成长记录：积分日历和历史记录见证孩子的每一步成长

---

## 二、功能架构

### 2.1 整体架构

```
宝贝积分小程序
├── 微信登录模块（家长）
├── 孩子档案管理
├── 任务系统
│   ├── 预置任务库
│   └── 自定义任务
├── 积分系统
│   ├── 完成度折算
│   └── 积分日历
├── 奖励系统
│   ├── 预置奖励库
│   ├── 自定义奖励
│   └── 直接兑换
└── 排行榜
    └── 孩子积分排行
```

### 2.2 TabBar 页面

| Tab | 图标 | 名称 | 主要功能 |
|-----|------|------|----------|
| 1 | 首页 | 首页 | 孩子积分排名 + 我的信息 + 最新兑换 |
| 2 | 任务 | 任务 | 浏览任务，记录完成情况获得积分 |
| 3 | 奖励 | 奖励 | 浏览奖励，直接兑换 |
| 4 | 我的 | 我的 | 个人中心，账号管理 |

---

## 三、用户与孩子档案

### 3.1 用户与孩子关系

**重要设计**：家长是唯一登录用户，孩子作为"档案"归属于家长账号下。一个家长账号可以管理多个孩子的档案。

```
家长账号（微信登录）
├── 家长个人信息
└── 孩子档案列表
    ├── 孩子 A（小明）
    │   ├── 基本信息（姓名、年级、头像）
    │   └── 积分信息（累计、已兑换、可用）
    ├── 孩子 B（小红）
    └── ...
```

### 3.2 家长用户模型

```typescript
interface ParentUser {
  id: string;              // 用户ID（微信openId）
  nickname: string;        // 家长昵称（默认微信昵称）
  avatar: string;          // 头像URL
  wechatOpenId: string;    // 微信openId
  unionId: string;         // 微信unionId
  phoneNumber: string;     // 手机号（可选）
  createdAt: number;       // 注册时间
  updatedAt: number;       // 更新时间
  lastActiveAt: number;    // 最后活跃时间
}
```

### 3.3 孩子档案模型

```typescript
interface ChildProfile {
  id: string;              // 档案ID
  parentId: string;        // 所属家长ID
  name: string;            // 孩子姓名
  avatar: string;          // 头像URL（可使用预设卡通头像）
  gender: "male" | "female" | "other";  // 性别
  birthDate: number;       // 出生日期（用于计算年龄）
  grade: Grade;            // 当前年级
  gradeLevel: number;      // 年级层级数字（用于排序和升级判断）
  schoolStage: SchoolStage;// 学段（幼儿园/小学/初中）
  gradeEnterYear: number;  // 入年级年份（用于自动升级判断）
  totalPoints: number;     // 累计积分
  redeemedPoints: number;  // 已兑换积分
  availablePoints: number; // 可用积分（自动计算）
  createdAt: number;       // 档案创建时间
  updatedAt: number;       // 更新时间
}

// 年级枚举
type Grade =
  | "kindergarten_small"   // 幼儿园小班
  | "kindergarten_medium"  // 幼儿园中班
  | "kindergarten_big"     // 幼儿园大班
  | "primary_1"            // 小学一年级
  | "primary_2"            // 小学二年级
  | "primary_3"            // 小学三年级
  | "primary_4"            // 小学四年级
  | "primary_5"            // 小学五年级
  | "primary_6"            // 小学六年级
  | "middle_1"             // 初一
  | "middle_2"             // 初二
  | "middle_3";            // 初三

type SchoolStage = "kindergarten" | "primary" | "middle";
```

### 3.4 年级列表

| 年级代码 | 显示名称 | 层级 | 学段 | 适合年龄 |
|----------|----------|------|------|----------|
| kindergarten_small | 幼儿园小班 | 1 | 幼儿园 | 3-4岁 |
| kindergarten_medium | 幼儿园中班 | 2 | 幼儿园 | 4-5岁 |
| kindergarten_big | 幼儿园大班 | 3 | 幼儿园 | 5-6岁 |
| primary_1 | 小学一年级 | 4 | 小学 | 6-7岁 |
| primary_2 | 小学二年级 | 5 | 小学 | 7-8岁 |
| primary_3 | 小学三年级 | 6 | 小学 | 8-9岁 |
| primary_4 | 小学四年级 | 7 | 小学 | 9-10岁 |
| primary_5 | 小学五年级 | 8 | 小学 | 10-11岁 |
| primary_6 | 小学六年级 | 9 | 小学 | 11-12岁 |
| middle_1 | 初中初一 | 10 | 初中 | 12-13岁 |
| middle_2 | 初中初二 | 11 | 初中 | 13-14岁 |
| middle_3 | 初中初三 | 12 | 初中 | 14-15岁 |

### 3.5 年级自动升级规则

**升级时机**：每年 9 月 1 日自动升级

```typescript
// 年级升级映射表
const GRADE_UPGRADE_MAP: Record<Grade, Grade | null> = {
  "kindergarten_small":  "kindergarten_medium",
  "kindergarten_medium": "kindergarten_big",
  "kindergarten_big":    "primary_1",
  "primary_1":           "primary_2",
  "primary_2":           "primary_3",
  "primary_3":           "primary_4",
  "primary_4":           "primary_5",
  "primary_5":           "primary_6",
  "primary_6":           "middle_1",
  "middle_1":            "middle_2",
  "middle_2":            "middle_3",
  "middle_3":            null  // 初三毕业，不再自动升级
};

// 检查并升级年级
async function checkAndUpgradeGrade(childId: string): Promise<void> {
  const child = await db.getChild(childId);
  const now = new Date();
  const currentYear = now.getFullYear();

  // 升级条件：当前是9月1日之后，且孩子的年级入学年份在当前年份之前
  const isAfterUpgradeDate = (now.getMonth() >= 8); // 9月 = 月份8（0-indexed）
  const needsUpgrade = currentYear > child.gradeEnterYear;

  if (isAfterUpgradeDate && needsUpgrade) {
    const nextGrade = GRADE_UPGRADE_MAP[child.grade];
    if (nextGrade) {
      await db.updateChild(childId, {
        grade: nextGrade,
        gradeLevel: GRADE_META[nextGrade].level,
        schoolStage: GRADE_META[nextGrade].stage,
        gradeEnterYear: currentYear,
        updatedAt: Date.now()
      });
      // 发送升级通知
      await notification.sendGradeUpgradeNotice(child, nextGrade);
    }
  }
}
```

**升级规则说明**：

- 默认每年的 9 月 1 日触发自动升级
- 升级判断依据：当前年份 > 年级入学年份
- 用户可以手动修改年级，修改后会重置 `gradeEnterYear` 为当前年份，下次升级在明年 9 月
- 初三毕业后不再自动升级

### 3.6 注册登录流程

```
启动小程序
   ↓
调用 wx.login() 获取 code
   ↓
云函数使用 code 换取 openId 和 session_key
   ↓
查询用户表
   ├─ 已注册 → 直接进入首页（需先选择当前操作的孩子）
   └─ 未注册 → 进入引导页
              ├─ 步骤1: 显示微信头像昵称（可编辑）
              ├─ 步骤2: 创建第一个孩子档案
              │        ├─ 输入孩子姓名
              │        ├─ 选择年级
              │        └─ 选择性别/上传头像（可选）
              └─ 步骤3: 进入首页
```

---

## 四、任务系统

### 4.1 任务分类

| 分类ID | 名称 | 图标 | 适用年龄 | 说明 |
|--------|------|------|----------|------|
| STUDY | 学习任务 | 📚 | 小学以上 | 与学习相关的任务 |
| HOUSEWORK | 家务任务 | 🏠 | 3岁以上 | 日常生活自理任务 |
| SPORTS | 运动任务 | ⚽ | 3岁以上 | 体育锻炼类任务 |
| ART | 手工艺术 | 🎨 | 3岁以上 | 创意手工类任务 |
| READING | 阅读任务 | 📖 | 4岁以上 | 阅读书籍类任务 |
| HABIT | 习惯养成 | ⭐ | 3岁以上 | 日常习惯类任务 |
| OTHER | 其他任务 | 📝 | 全年龄 | 自定义任务 |

### 4.2 预置任务清单

#### 📚 学习任务 (STUDY)

| 任务名称 | 基础积分 | 说明 |
|----------|----------|------|
| 完成数学作业 | 10 | 按时完成老师布置的数学作业 |
| 完成语文作业 | 10 | 按时完成老师布置的语文作业 |
| 完成英语作业 | 10 | 按时完成老师布置的英语作业 |
| 完成其他作业 | 8 | 按时完成其他科目作业 |
| 预习新课 | 5 | 主动预习明天课程内容 |
| 复习旧知 | 5 | 主动复习已学知识 |
| 练字 | 5 | 练习硬笔/软笔书法 |
| 口算练习 | 3 | 完成一页口算题 |
| 背诵课文 | 5 | 背诵老师要求的课文段落 |
| 上课认真听讲 | 3 | 获得家长/老师表扬 |

#### 🏠 家务任务 (HOUSEWORK)

| 任务名称 | 基础积分 | 说明 |
|----------|----------|------|
| 整理自己的房间 | 10 | 将房间收拾整齐 |
| 打扫卧室 | 8 | 扫地、拖地、擦桌子 |
| 收拾书包 | 3 | 主动整理第二天书包 |
| 洗袜子 | 3 | 自己的袜子自己洗 |
| 洗小件衣物 | 5 | 学会使用洗衣机洗衣服 |
| 帮妈妈洗碗 | 5 | 饭后主动帮忙洗碗 |
| 帮忙倒垃圾 | 3 | 主动将垃圾带到楼下 |
| 整理餐桌 | 3 | 饭后帮忙收拾餐桌 |
| 帮忙晾衣服 | 3 | 帮助家人晾晒衣物 |
| 帮忙收衣服 | 3 | 将干衣物收回来叠好 |
| 浇花 | 2 | 记得给植物浇水 |
| 喂宠物 | 3 | 照顾家里的小动物 |

#### ⚽ 运动任务 (SPORTS)

| 任务名称 | 基础积分 | 说明 |
|----------|----------|------|
| 跑步30分钟 | 8 | 进行户外跑步锻炼 |
| 跳绳100个 | 5 | 完成100个跳绳 |
| 骑自行车 | 5 | 户外骑行锻炼 |
| 游泳 | 10 | 进行游泳运动 |
| 打篮球 | 8 | 篮球运动或练习 |
| 打羽毛球 | 5 | 羽毛球运动或练习 |
| 做早操 | 3 | 早上做广播体操 |
| 眼保健操 | 2 | 认真做眼保健操 |
| 户外活动1小时 | 5 | 到户外玩耍运动 |

#### 🎨 手工艺术 (ART)

| 任务名称 | 基础积分 | 说明 |
|----------|----------|------|
| 完成一幅画 | 8 | 用画笔完成一幅作品 |
| 做手工 | 8 | 完成一个手工制作 |
| 折纸作品 | 5 | 完成一个折纸作品 |
| 捏橡皮泥 | 5 | 用橡皮泥完成一个造型 |
| 乐高积木 | 5 | 完成一个乐高作品 |
| 做黏土 | 5 | 用超轻黏土做手工作品 |

#### 📖 阅读任务 (READING)

| 任务名称 | 基础积分 | 说明 |
|----------|----------|------|
| 阅读30分钟 | 5 | 安静阅读30分钟 |
| 阅读1小时 | 10 | 深度阅读1小时 |
| 复述故事 | 8 | 将读过的故事讲给家人听 |
| 背诵古诗 | 5 | 学习并背诵一首古诗 |
| 朗读课文 | 3 | 有感情地朗读文章 |
| 看科普视频 | 3 | 观看学习类科普视频 |

#### ⭐ 习惯养成 (HABIT)

| 任务名称 | 基础积分 | 说明 |
|----------|----------|------|
| 早起不赖床 | 3 | 按时起床不哭闹 |
| 自己穿衣服 | 3 | 独立穿好衣服 |
| 按时睡觉 | 3 | 按时上床睡觉 |
| 饭前洗手 | 2 | 养成良好卫生习惯 |
| 少吃零食 | 3 | 控制零食摄入 |
| 不挑食 | 3 | 均衡饮食不挑食 |
| 主动问好 | 2 | 见到长辈主动打招呼 |
| 使用礼貌用语 | 2 | 说"请""谢谢""对不起" |
| 整理玩具 | 3 | 玩完玩具主动收拾 |
| 独立完成洗漱 | 5 | 自己刷牙洗脸洗澡 |

### 4.3 任务数据模型

```typescript
interface Task {
  id: string;                // 任务ID
  name: string;              // 任务名称
  category: TaskCategory;    // 任务分类
  basePoints: number;        // 基础积分（满分时获得）
  description: string;       // 任务描述
  icon: string;              // 任务图标
  isPreset: boolean;         // 是否预置任务
  isActive: boolean;         // 是否启用
  maxDaily: number;          // 每日最大完成次数（0=不限制）
  requiresPhoto: boolean;    // 是否必须上传照片
  scope: "global" | "parent";// 任务范围：全局预置 or 家长私有
  parentId: string;          // 创建者家长ID（自定义任务必填）
  createdAt: number;
  updatedAt: number;
}

// 任务分类枚举
type TaskCategory = "STUDY" | "HOUSEWORK" | "SPORTS" | "ART" | "READING" | "HABIT" | "OTHER";
```

### 4.4 任务唯一性规则

- **预置任务**：全局唯一，由系统维护，所有家长共享
- **自定义任务**：在同一家长账号下唯一（同一家长不能创建相同名称的任务）
- **预置 + 自定义**：自定义任务的优先级高于预置任务（家长可调整积分）

---

## 五、完成度系统（核心特性）

### 5.1 完成度定义

完成任务时，家长需要选择完成度等级。系统根据完成度按比例折算积分。

| 完成度等级 | 描述 | 积分比例 | 图标 |
|------------|------|----------|------|
| **简单完成** | 任务做到了一部分，需要改进 | 50% | 😐 |
| **一般完成** | 任务基本完成，质量一般 | 75% | 🙂 |
| **完美完成** | 任务高质量完成，超出预期 | 100% | 🌟 |

### 5.2 积分折算公式

```
实际获得积分 = floor(基础积分 × 完成度比例)
```

向下取整保证积分的简洁性。

### 5.3 积分折算示例

| 任务 | 基础积分 | 简单 (50%) | 一般 (75%) | 完美 (100%) |
|------|----------|-----------|-----------|------------|
| 完成数学作业 | 10 | 5 | 7 | 10 |
| 整理自己的房间 | 10 | 5 | 7 | 10 |
| 阅读30分钟 | 5 | 2 | 3 | 5 |
| 跑步30分钟 | 8 | 4 | 6 | 8 |
| 游泳 | 10 | 5 | 7 | 10 |
| 独立完成洗漱 | 5 | 2 | 3 | 5 |
| 浇花 | 2 | 1 | 1 | 2 |
| 口算练习 | 3 | 1 | 2 | 3 |

### 5.4 任务完成记录模型

```typescript
interface TaskCompletion {
  id: string;              // 记录ID
  taskId: string;          // 任务ID
  taskName: string;        // 任务名称（冗余存储）
  taskCategory: TaskCategory; // 任务分类（冗余存储）
  childId: string;         // 孩子档案ID
  parentId: string;        // 家长ID
  basePoints: number;      // 任务基础积分
  completionLevel: CompletionLevel;  // 完成度等级
  completionRatio: number; // 完成度比例（0.5/0.75/1.0）
  actualPoints: number;    // 实际获得积分
  photoUrls: string[];     // 凭证图片URL列表（可选）
  remark: string;          // 备注说明
  completedAt: number;     // 完成时间
  createdAt: number;
}

// 完成度等级
type CompletionLevel = "simple" | "normal" | "perfect";

// 完成度配置
const COMPLETION_LEVELS: Record<CompletionLevel, {
  name: string;
  description: string;
  ratio: number;
  icon: string;
  color: string;
}> = {
  simple: {
    name: "简单完成",
    description: "做到了一部分，还需要改进",
    ratio: 0.5,
    icon: "😐",
    color: "#FFA500"
  },
  normal: {
    name: "一般完成",
    description: "基本完成，质量一般",
    ratio: 0.75,
    icon: "🙂",
    color: "#4CAF50"
  },
  perfect: {
    name: "完美完成",
    description: "高质量完成，超出预期",
    ratio: 1.0,
    icon: "🌟",
    color: "#FF6B35"
  }
};
```

### 5.5 任务完成流程

```
任务列表页
   ↓
家长选择某个任务，点击"完成任务"
   ↓
进入任务完成页（task-complete）
   ├─ 显示任务信息（名称、图标、基础积分）
   ├─ 选择完成度（三档：简单/一般/完美）
   ├─ 上传凭证照片（可选）
   ├─ 填写备注（可选）
   └─ 点击"确认完成"
        ↓
   系统计算实际积分 = floor(基础积分 × 完成度比例)
        ↓
   保存完成记录
        ↓
   累加孩子积分
        ↓
   显示获得积分动画 + 提示
        ↓
   返回任务列表（带更新）
```

### 5.6 完成度的设计意图

三档完成度的设计基于以下几个考量：

1. **教育意义**：让家长客观评价孩子的完成质量，培养孩子"做好一件事"的意识，而不仅仅是"完成"
2. **避免虚高**：相比 1-5 星评分，三档制更不容易出现"全五星"的情况，引导家长认真评估
3. **操作便捷**：三档选择比进度条拖动更快速，比星级评分更不易纠结
4. **积分合理**：50% / 75% / 100% 的设计兼顾了"做了总比没做好"和"完美应得更多"

---

## 六、奖励系统

### 6.1 奖励分类

| 分类ID | 名称 | 图标 | 积分区间 |
|--------|------|------|----------|
| FOOD | 美食奖励 | 🍕 | 10-100 |
| PLAY | 娱乐奖励 | 🎮 | 10-150 |
| TOY | 玩具奖励 | 🎁 | 10-200 |
| OUTING | 外出游玩 | 🏖️ | 30-300 |
| PRIVILEGE | 特权奖励 | 👑 | 15-50 |
| DIGITAL | 数字奖励 | 📱 | 30-280 |
| OTHER | 其他奖励 | ✨ | 自定义 |

### 6.2 预置奖励清单

#### 🍕 美食奖励 (FOOD)

| 奖励名称 | 所需积分 | 说明 |
|----------|----------|------|
| 棒棒糖 | 10 | 一个小棒棒糖 |
| 冰淇淋 | 15 | 一个冰淇淋 |
| 奶茶 | 20 | 一杯奶茶 |
| 炸鸡 | 30 | 一份炸鸡 |
| 蛋糕 | 40 | 一个蛋糕 |
| 零食大礼包 | 50 | 一袋零食大礼包 |
| 麦当劳/肯德基 | 80 | 快餐一顿 |
| 去餐厅吃饭 | 100 | 允许选择喜欢的餐厅 |

#### 🎮 娱乐奖励 (PLAY)

| 奖励名称 | 所需积分 | 说明 |
|----------|----------|------|
| 看动画片1集 | 10 | 额外观看动画片 |
| 玩桌游 | 15 | 和家人一起玩桌游 |
| 玩游戏30分钟 | 20 | 额外游戏时间30分钟 |
| 多玩1小时 | 25 | 今天多玩1小时 |
| 看动画片2小时 | 30 | 电影或连续剧时间 |
| 玩游戏1小时 | 35 | 额外游戏时间1小时 |
| 游乐场 | 150 | 去一次游乐场 |

#### 🎁 玩具奖励 (TOY)

| 奖励名称 | 所需积分 | 说明 |
|----------|----------|------|
| 小贴纸 | 10 | 一张喜欢的贴纸 |
| 拼图 | 40 | 一个拼图玩具 |
| 文具套装 | 50 | 一套新文具 |
| 芭比娃娃/玩偶 | 150 | 一个玩偶 |
| 乐高套装 | 180 | 一个乐高套装 |
| 遥控车 | 200 | 一个遥控玩具 |

#### 🏖️ 外出游玩 (OUTING)

| 奖励名称 | 所需积分 | 说明 |
|----------|----------|------|
| 去公园玩 | 30 | 去附近的公园玩耍 |
| 去书店 | 40 | 去书店买书或看书 |
| 野餐 | 60 | 和家人一起去野餐 |
| 博物馆 | 80 | 去博物馆参观 |
| 电影院 | 80 | 看一场电影 |
| 动物园 | 100 | 去动物园游玩 |
| 露营 | 250 | 一次户外露营体验 |
| 短途旅行 | 300 | 周末短途旅行 |

#### 👑 特权奖励 (PRIVILEGE)

| 奖励名称 | 所需积分 | 说明 |
|----------|----------|------|
| 晚睡30分钟 | 15 | 今晚可以晚睡30分钟 |
| 点播节目 | 20 | 自己选择想看的节目 |
| 免做一次家务 | 20 | 免除一次家务任务 |
| 多玩1小时 | 25 | 今天多玩1小时 |
| 决定晚餐吃什么 | 30 | 今天由你决定晚餐 |
| 当一天小管家 | 40 | 体验一天小管家特权 |
| 决定周末活动 | 50 | 决定周末全家活动 |

#### 📱 数字奖励 (DIGITAL)

| 奖励名称 | 所需积分 | 说明 |
|----------|----------|------|
| 云存储扩容 | 30 | 云盘存储空间增加 |
| 购买电子书 | 50 | 购买一本电子书 |
| 充值游戏10元 | 100 | 游戏充值10元 |
| 视频会员1个月 | 200 | 视频平台会员一个月 |
| 充值游戏30元 | 280 | 游戏充值30元 |

### 6.3 奖励数据模型

```typescript
interface Reward {
  id: string;              // 奖励ID
  name: string;            // 奖励名称
  category: RewardCategory;// 奖励分类
  points: number;          // 所需积分
  description: string;     // 奖励描述
  icon: string;            // 奖励图标
  isPreset: boolean;       // 是否预置
  isActive: boolean;       // 是否启用
  stock: number;           // 库存（0=无限）
  limitPerChild: number;   // 每个孩子兑换上限（0=不限制）
  validFrom: number;       // 有效期起
  validTo: number;         // 有效期止
  scope: "global" | "parent";// 范围
  parentId: string;        // 创建者家长ID
  createdAt: number;
  updatedAt: number;
}

type RewardCategory = "FOOD" | "PLAY" | "TOY" | "OUTING" | "PRIVILEGE" | "DIGITAL" | "OTHER";
```

### 6.4 奖励兑换记录模型

```typescript
interface RewardRedemption {
  id: string;              // 兑换记录ID
  rewardId: string;        // 奖励ID
  rewardName: string;      // 奖励名称（冗余）
  rewardIcon: string;      // 奖励图标（冗余）
  childId: string;         // 兑换的孩子档案ID
  parentId: string;        // 操作的家长ID
  pointsSpent: number;     // 消耗积分
  remark: string;          // 备注
  redeemedAt: number;      // 兑换时间
  createdAt: number;
}
```

### 6.5 兑换流程（直接兑换，无需审批）

```
奖励列表页
   ↓
家长选择某个奖励，点击"立即兑换"
   ↓
弹出确认对话框
   ├─ 显示奖励信息
   ├─ 显示孩子当前积分
   ├─ 显示兑换后剩余积分
   └─ 确认/取消
        ↓
   确认兑换
        ↓
   检查积分是否充足
   ├─ 充足 → 扣减积分 + 保存记录 + 显示成功
   └─ 不足 → 提示"积分不足，继续努力哦~"
```

### 6.6 兑换的设计理念

- **不需要审批**：因为是家长自己操作，无需审批环节，减少流程复杂度
- **直接扣分**：兑换成功立即扣减积分，避免积分虚高导致孩子误解
- **不可撤销**：普通用户不能撤销兑换（避免反复操作造成混乱）
- **记录可查**：所有兑换记录保留，可在历史中查看

---

## 七、积分系统

### 7.1 积分字段

每个孩子档案维护以下积分字段：

| 字段 | 说明 | 计算方式 |
|------|------|----------|
| `totalPoints` | 累计积分 | 所有任务完成获得的积分总和 |
| `redeemedPoints` | 已兑换积分 | 所有兑换奖励消耗的积分总和 |
| `availablePoints` | 可用积分 | `totalPoints - redeemedPoints` |

### 7.2 积分变动流水

所有积分变动都记录流水，便于追溯。

```typescript
interface PointsTransaction {
  id: string;              // 流水ID
  childId: string;         // 孩子档案ID
  parentId: string;        // 家长ID
  type: "earn" | "spend";  // 类型：获取/消耗
  amount: number;          // 变动数量（正数）
  source: "task" | "reward"; // 来源：任务/奖励
  sourceId: string;        // 源记录ID（任务完成ID或兑换ID）
  sourceName: string;      // 源名称（任务名或奖励名）
  balanceBefore: number;   // 变动前余额
  balanceAfter: number;    // 变动后余额
  remark: string;          // 备注
  createdAt: number;       // 变动时间
}
```

### 7.3 积分变动时机

| 触发事件 | 变动类型 | 积分变动 |
|----------|----------|----------|
| 完成任务（简单完成） | earn | +floor(basePoints × 0.5) |
| 完成任务（一般完成） | earn | +floor(basePoints × 0.75) |
| 完成任务（完美完成） | earn | +floor(basePoints × 1.0) |
| 兑换奖励 | spend | -reward.points |
| 撤销任务完成（管理员操作） | earn | -原获取积分 |
| 撤销兑换（管理员操作） | spend | +原消耗积分 |

### 7.4 积分排行榜

排行榜基于 `totalPoints` 倒序展示同一家长账号下的所有孩子。

```typescript
interface RankingItem {
  rank: number;            // 排名
  childId: string;         // 孩子ID
  childName: string;       // 孩子姓名
  childAvatar: string;     // 孩子头像
  totalPoints: number;     // 累计积分
  redeemedPoints: number;  // 已兑换积分
  availablePoints: number; // 可用积分
  isCurrent: boolean;      // 是否当前操作的孩子
}
```

### 7.5 积分体系合理性说明

**任务积分区间设计**：

| 任务难度 | 基础积分 | 适用场景 |
|----------|----------|----------|
| 简单任务 | 1-5分 | 日常小习惯（收拾书包、浇花、问好） |
| 一般任务 | 5-15分 | 常规任务（作业、家务、阅读） |
| 困难任务 | 15-30分 | 需要努力的任务（打扫房间、运动1小时） |
| 挑战任务 | 30-50分 | 高度专注的任务（深度学习、长时间运动） |

**奖励积分区间设计**：

| 奖励类型 | 积分区间 | 设计思路 |
|----------|----------|----------|
| 微奖励 | 10-30分 | 短期可达，保持动力 |
| 中等奖励 | 30-80分 | 一周到两周努力可达 |
| 大奖励 | 80-200分 | 一个月持续努力可达 |
| 特殊奖励 | 200-300分 | 阶段性目标，特殊场合 |

**收支平衡建议**：

- 每日获取积分上限建议：100分（防止过度激励）
- 每周获取积分建议：400-500分
- 完成度选择分布：建议简单20%、一般50%、完美30%（教育意义在于"做好"而非"完成"）

---

## 八、积分日历

### 8.1 功能说明

以日历形式展示指定月份的积分获取情况，点击某一天可查看当天的详细记录。

### 8.2 日历数据模型

```typescript
interface DailyPointsSummary {
  date: string;            // 日期 YYYY-MM-DD
  totalEarned: number;     // 当日获取积分
  totalSpent: number;      // 当日消耗积分
  taskCount: number;       // 完成任务次数
  redeemCount: number;     // 兑换奖励次数
  hasActivity: boolean;    // 是否有活动
  details?: DayDetails;    // 当日详情（懒加载）
}

interface DayDetails {
  tasks: Array<{
    taskName: string;
    icon: string;
    completionLevel: CompletionLevel;
    actualPoints: number;
    photoUrls: string[];
    completedAt: number;
  }>;
  rewards: Array<{
    rewardName: string;
    icon: string;
    pointsSpent: number;
    redeemedAt: number;
  }>;
}
```

### 8.3 日历的展示规则

- 有积分变动（获取或消耗）的日期显示圆点标记
- 仅消耗（兑换）的日期显示空心圆
- 同时获取和消耗的日期显示填充圆
- 没有活动的日期不显示标记
- 未来日期置灰显示
- 点击某一天加载当日详情（懒加载）

### 8.4 月度统计

每月日历底部展示本月统计：

- 本月获取积分总数
- 本月消耗积分总数
- 完成任务次数
- 兑换奖励次数
- 完成度分布（简单/一般/完美占比）

---

## 九、数据库设计

### 9.1 集合（表）结构

#### users（家长用户表）

```typescript
interface UserDoc {
  _id: string;            // 主键，openId
  _openid: string;        // 微信openId
  nickname: string;       // 昵称
  avatar: string;         // 头像URL
  unionId: string;        // 微信unionId
  phoneNumber: string;    // 手机号
  createdAt: number;
  updatedAt: number;
  lastActiveAt: number;
}
```

#### children（孩子档案表）

```typescript
interface ChildDoc {
  _id: string;            // 主键
  _openid: string;        // 所属家长openId
  parentId: string;       // 家长ID
  name: string;           // 孩子姓名
  avatar: string;         // 头像URL
  gender: "male" | "female" | "other";
  birthDate: number;      // 出生日期
  grade: Grade;           // 当前年级
  gradeLevel: number;     // 年级层级
  schoolStage: SchoolStage;
  gradeEnterYear: number; // 入年级年份
  totalPoints: number;    // 累计积分
  redeemedPoints: number; // 已兑换积分
  isActive: boolean;      // 是否启用
  createdAt: number;
  updatedAt: number;
}
```

#### tasks（任务表）

```typescript
interface TaskDoc {
  _id: string;
  name: string;
  category: TaskCategory;
  basePoints: number;
  description: string;
  icon: string;
  isPreset: boolean;
  isActive: boolean;
  maxDaily: number;
  requiresPhoto: boolean;
  scope: "global" | "parent";
  parentId: string;       // 自定义任务的创建者
  createdAt: number;
  updatedAt: number;
}
```

#### rewards（奖励表）

```typescript
interface RewardDoc {
  _id: string;
  name: string;
  category: RewardCategory;
  points: number;
  description: string;
  icon: string;
  isPreset: boolean;
  isActive: boolean;
  stock: number;
  limitPerChild: number;
  validFrom: number;
  validTo: number;
  scope: "global" | "parent";
  parentId: string;
  createdAt: number;
  updatedAt: number;
}
```

#### task_completions（任务完成记录表）

```typescript
interface TaskCompletionDoc {
  _id: string;
  taskId: string;
  taskName: string;
  taskCategory: TaskCategory;
  childId: string;
  parentId: string;
  basePoints: number;
  completionLevel: CompletionLevel;
  completionRatio: number;
  actualPoints: number;
  photoUrls: string[];
  remark: string;
  completedAt: number;
  createdAt: number;
}
```

#### reward_redemptions（奖励兑换记录表）

```typescript
interface RewardRedemptionDoc {
  _id: string;
  rewardId: string;
  rewardName: string;
  rewardIcon: string;
  childId: string;
  parentId: string;
  pointsSpent: number;
  remark: string;
  redeemedAt: number;
  createdAt: number;
}
```

#### points_transactions（积分流水表）

```typescript
interface PointsTransactionDoc {
  _id: string;
  childId: string;
  parentId: string;
  type: "earn" | "spend";
  amount: number;
  source: "task" | "reward";
  sourceId: string;
  sourceName: string;
  balanceBefore: number;
  balanceAfter: number;
  remark: string;
  createdAt: number;
}
```

### 9.2 数据库索引

为提升查询性能，建议在以下字段建立索引：

| 集合 | 索引字段 | 用途 |
|------|----------|------|
| users | _openid | 主键 |
| children | _openid | 查询家长的所有孩子 |
| tasks | category + isActive | 按分类筛选启用任务 |
| tasks | scope + isActive | 区分预置和自定义任务 |
| rewards | category + isActive | 按分类筛选启用奖励 |
| task_completions | childId + completedAt | 查询某孩子某月记录 |
| task_completions | taskId + childId + completedAt | 每日次数限制判断 |
| reward_redemptions | childId + redeemedAt | 查询某孩子兑换历史 |
| points_transactions | childId + createdAt | 积分日历查询 |

---

## 十、技术实现

### 10.1 技术栈

| 类别 | 技术 |
|------|------|
| 小程序框架 | 微信小程序原生 |
| 后端 | 微信云开发（云函数 + 云数据库 + 云存储） |
| 数据库 | 云数据库 NoSQL |
| 文件存储 | 云存储（OSS） |
| 状态管理 | Mobx 或原生 globalData |
| UI 组件 | Vant Weapp / TDesign |

### 10.2 项目结构

```
miniprogram/
├── cloudfunctions/              # 云函数
│   ├── login/                   # 微信登录
│   ├── child/                   # 孩子档案管理
│   ├── task/                    # 任务管理 + 完成
│   ├── reward/                  # 奖励管理 + 兑换
│   ├── ranking/                 # 排行榜
│   ├── calendar/                # 积分日历
│   └── upgradeGrade/            # 年级自动升级（定时触发）
├── miniprogram/
│   ├── pages/
│   │   ├── index/               # 首页
│   │   ├── task/                # 任务列表
│   │   ├── task-complete/       # 任务完成
│   │   ├── reward/              # 奖励列表
│   │   ├── reward-detail/       # 奖励详情
│   │   ├── profile/             # 我的
│   │   ├── child-list/          # 孩子列表
│   │   ├── child-edit/          # 编辑孩子
│   │   ├── task-manage/         # 任务管理
│   │   ├── reward-manage/       # 奖励管理
│   │   ├── calendar/            # 积分日历
│   │   ├── history/             # 历史记录
│   │   ├── onBoard/             # 引导注册
│   │   └── login/               # 登录
│   ├── components/
│   │   ├── task-card/
│   │   ├── reward-card/
│   │   ├── ranking-list/
│   │   ├── points-display/
│   │   ├── calendar-grid/
│   │   ├── completion-selector/  # 完成度选择器
│   │   └── child-switcher/      # 孩子切换器
│   ├── utils/
│   │   ├── auth.js
│   │   ├── points.js            # 积分计算工具
│   │   └── grade.js             # 年级工具
│   ├── services/
│   │   ├── api.js
│   │   └── storage.js
│   └── assets/
└── project.config.json
```

### 10.3 关键云函数实现

#### 任务完成接口

```typescript
// POST /task/complete
async function completeTask(params: {
  taskId: string;
  childId: string;
  completionLevel: CompletionLevel;
  photoUrls?: string[];
  remark?: string;
}) {
  const { taskId, childId, completionLevel, photoUrls = [], remark = "" } = params;

  // 1. 校验任务
  const task = await db.collection("tasks").doc(taskId).get();
  if (!task.data.isActive) throw new Error("任务已禁用");

  // 2. 校验孩子
  const child = await db.collection("children").doc(childId).get();

  // 3. 校验每日次数限制
  if (task.data.maxDaily > 0) {
    const today = getTodayStart();
    const todayCount = await db.collection("task_completions")
      .where({ taskId, childId, completedAt: db.command.gte(today) })
      .count();
    if (todayCount.total >= task.data.maxDaily) {
      throw new Error(`今日已完成上限(${task.data.maxDaily}次)`);
    }
  }

  // 4. 计算积分
  const ratio = COMPLETION_LEVELS[completionLevel].ratio;
  const actualPoints = Math.floor(task.data.basePoints * ratio);

  // 5. 创建完成记录
  const completionId = generateId();
  await db.collection("task_completions").add({
    _id: completionId,
    taskId, taskName: task.data.name, taskCategory: task.data.category,
    childId, parentId: ctx._openid,
    basePoints: task.data.basePoints,
    completionLevel, completionRatio: ratio,
    actualPoints, photoUrls, remark,
    completedAt: Date.now(), createdAt: Date.now()
  });

  // 6. 更新孩子积分
  const balanceBefore = child.data.totalPoints;
  await db.collection("children").doc(childId).update({
    data: { totalPoints: db.command.inc(actualPoints), updatedAt: Date.now() }
  });

  // 7. 创建积分流水
  await db.collection("points_transactions").add({
    childId, parentId: ctx._openid,
    type: "earn", amount: actualPoints,
    source: "task", sourceId: completionId, sourceName: task.data.name,
    balanceBefore, balanceAfter: balanceBefore + actualPoints,
    remark: COMPLETION_LEVELS[completionLevel].name,
    createdAt: Date.now()
  });

  return { completionId, actualPoints, ratio, newTotal: balanceBefore + actualPoints };
}
```

#### 兑换奖励接口

```typescript
// POST /reward/redeem
async function redeemReward(params: {
  rewardId: string;
  childId: string;
  remark?: string;
}) {
  const { rewardId, childId, remark = "" } = params;

  // 1. 校验奖励
  const reward = await db.collection("rewards").doc(rewardId).get();
  if (!reward.data.isActive) throw new Error("奖励已下架");

  // 2. 校验库存
  if (reward.data.stock > 0) {
    if (reward.data.stock <= 0) throw new Error("库存不足");
    await db.collection("rewards").doc(rewardId).update({
      data: { stock: db.command.inc(-1) }
    });
  }

  // 3. 校验积分
  const child = await db.collection("children").doc(childId).get();
  const availablePoints = child.data.totalPoints - child.data.redeemedPoints;
  if (availablePoints < reward.data.points) throw new Error("积分不足");

  // 4. 校验个人兑换上限
  if (reward.data.limitPerChild > 0) {
    const redeemedCount = await db.collection("reward_redemptions")
      .where({ rewardId, childId }).count();
    if (redeemedCount.total >= reward.data.limitPerChild) {
      throw new Error("已达个人兑换上限");
    }
  }

  // 5. 创建兑换记录
  const redemptionId = generateId();
  await db.collection("reward_redemptions").add({
    _id: redemptionId,
    rewardId, rewardName: reward.data.name, rewardIcon: reward.data.icon,
    childId, parentId: ctx._openid,
    pointsSpent: reward.data.points, remark,
    redeemedAt: Date.now(), createdAt: Date.now()
  });

  // 6. 扣减积分
  await db.collection("children").doc(childId).update({
    data: { redeemedPoints: db.command.inc(reward.data.points), updatedAt: Date.now() }
  });

  // 7. 创建积分流水
  await db.collection("points_transactions").add({
    childId, parentId: ctx._openid,
    type: "spend", amount: reward.data.points,
    source: "reward", sourceId: redemptionId, sourceName: reward.data.name,
    balanceBefore: child.data.totalPoints, balanceAfter: child.data.totalPoints,
    remark: "兑换奖励",
    createdAt: Date.now()
  });

  return { redemptionId, pointsSpent: reward.data.points, newAvailablePoints: availablePoints - reward.data.points };
}
```

#### 年级自动升级定时任务

```typescript
// 云函数 timer 触发器，每天凌晨检查一次
async function autoUpgradeGrades() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const isAfterUpgradeDate = now.getMonth() >= 8; // 9月1日之后

  if (!isAfterUpgradeDate) return;

  // 查询所有需要升级的孩子
  const children = await db.collection("children")
    .where({
      gradeEnterYear: db.command.lt(currentYear),
      grade: db.command.neq("middle_3")
    }).get();

  for (const child of children.data) {
    const nextGrade = GRADE_UPGRADE_MAP[child.grade];
    if (nextGrade) {
      await db.collection("children").doc(child._id).update({
        data: {
          grade: nextGrade,
          gradeLevel: GRADE_META[nextGrade].level,
          schoolStage: GRADE_META[nextGrade].stage,
          gradeEnterYear: currentYear,
          updatedAt: Date.now()
        }
      });
      console.log(`孩子 ${child.name} 已升级到 ${GRADE_META[nextGrade].name}`);
    }
  }
}
```

---

## 十一、迭代计划

### 11.1 第一期 MVP（核心闭环）

- [ ] 微信登录（家长）
- [ ] 创建/编辑孩子档案（含年级选择）
- [ ] 预置任务浏览
- [ ] 任务完成（三档完成度 + 上传图片）
- [ ] 任务完成记录
- [ ] 积分变动流水
- [ ] 预置奖励浏览
- [ ] 直接兑换奖励
- [ ] 兑换记录
- [ ] 基础排行榜
- [ ] 我的页面（基础信息）

### 11.2 第二期（管理 + 体验）

- [ ] 任务管理（自定义、编辑、禁用）
- [ ] 奖励管理（自定义、编辑、禁用）
- [ ] 积分日历
- [ ] 历史记录（任务+兑换）
- [ ] 孩子切换功能
- [ ] 积分获取动画
- [ ] 多孩子排行榜

### 11.3 第三期（自动化 + 增强）

- [ ] 年级自动升级（定时任务）
- [ ] 积分统计与趋势图
- [ ] 任务连续打卡
- [ ] 成就系统
- [ ] 数据导出

### 11.4 长期规划

- [ ] 家庭共享（爷爷奶奶也可加入）
- [ ] 孩子独立登录（仅查看）
- [ ] 消息推送（订阅消息）
- [ ] 积分借贷（先消费后偿还）
- [ ] 多平台支持（App、H5）

---

## 附录

### A. 关键决策一览

| 决策项 | 结论 | 理由 |
|--------|------|------|
| 主要用户 | 家长 | 简化操作流程，避免切换身份的复杂度 |
| 孩子角色 | 子资料（多档案） | 支持多孩家庭，孩子以档案形式存在 |
| 完成度 | 三档制 | 教育意义强、操作便捷、不易虚高 |
| 兑换审批 | 不需要 | 因为是家长操作，无需自我审批 |
| 审核机制 | 无 | 主要用户是家长，自行负责 |
| 年级升级时机 | 每年9月1日 | 符合中国学年的标准 |
| 年级范围 | 幼儿园到初三 | 覆盖3-15岁主要阶段 |

### B. 完成度折算逻辑

| 完成度 | 比例 | 折算公式 |
|--------|------|----------|
| 简单完成 | 50% | floor(基础积分 × 0.5) |
| 一般完成 | 75% | floor(基础积分 × 0.75) |
| 完美完成 | 100% | floor(基础积分 × 1.0) = 基础积分 |

### C. 年级自动升级规则

- **触发日期**：每年 9 月 1 日
- **判断逻辑**：当前年份 > 入年级年份
- **手动修改**：修改后 `gradeEnterYear` 重置为当前年份
- **覆盖范围**：初三毕业（`middle_3`）后不再升级
- **执行方式**：云函数 timer 触发器，每天凌晨检查

### D. 兑换记录规则

- 兑换后积分立即扣减，无需审批
- 兑换记录不可撤销（防止数据混乱）
- 管理员操作可"作废"兑换（退还积分），需额外权限

### E. 任务/奖励状态说明

| 状态 | 说明 |
|------|------|
| 启用 | 孩子可见、可完成/兑换 |
| 禁用 | 孩子不可见，已存在的记录不受影响 |

### F. 积分体系收支建议

- **任务基础积分**：2-10分（绝大多数任务）
- **每周获取**：建议 400-500 分
- **每日获取上限**：建议 100 分
- **完成度分布**：建议 简单20% / 一般50% / 完美30%
- **兑换频率**：建议每周 1-3 次
- **微奖励占比**：建议占兑换总量的 60% 以上

### G. 数据安全建议

- 所有用户数据通过 openId 关联，不暴露手机号等敏感信息
- 图片凭证存储在云存储，使用临时签名 URL 访问
- 数据库读写权限基于 openId 控制
- 定期数据备份

### H. 后续可能的功能扩展

- 孩子年龄段推荐不同难度任务
- 周报/月报自动生成
- 任务完成连续打卡统计
- 积分转赠给兄弟姐妹
- 亲子协作任务
- 学校任务（与老师联动）

---

## 文档信息

| 项目 | 内容 |
|------|------|
| 产品名称 | 宝贝积分 |
| 文档版本 | v1.1 |
| 文档类型 | 需求规格说明书（PRD） |
| 创建日期 | 2024年 |
| 最后更新 | 2024年 |
| 文档作者 | 宝贝积分团队 |
| 审阅状态 | ✅ 已审阅 |

**变更记录**：

- v1.0 - 初版需求文档（基于用户原始需求）
- v1.1 - 核心调整：家长为唯一用户、完成度三档制、直接兑换无需审批、无审核机制

---

*本文档为产品需求的完整规格说明，涵盖功能设计、数据模型、技术实现和迭代计划，作为后续设计、开发和测试的依据。*
