# 宝贝积分小程序

用积分激励孩子成长的微信小程序。

## 功能特性

- 任务管理：创建任务，设置积分，完成后获得积分
- 完成度选择：简单(50%)、一般(75%)、完美(100%)
- 奖励兑换：用积分兑换各种奖励
- 积分排行：查看孩子的积分排名
- 积分日历：查看每日积分收支明细
- 多孩子管理：支持管理多个孩子档案
- 年级系统：12个年级，每年9月1日自动升级

## 云端资源

- 环境ID: cloud1-2gavd8kj8a1ce021
- 云函数: bp_initData, bp_login, bp_child, bp_task, bp_reward, bp_ranking, bp_calendar
- 数据集: bp_users, bp_children, bp_tasks, bp_rewards, bp_task_completions, bp_reward_redemptions, bp_points_transactions

## 部署步骤

### 1. 配置 AppID
编辑 miniprogram/project.config.json，将 appid 改为你小程序的 AppID。

### 2. 打开项目
1. 下载并安装微信开发者工具
2. 打开微信开发者工具
3. 选择 "导入项目"
4. 选择 miniprogram 目录
5. 填入 AppID

### 3. 配置云开发环境
在微信开发者工具中点击右上角 "云开发"，开通云开发服务。

### 4. 编译运行
点击 "编译" 然后 "预览"

## 注意事项

1. 首次使用需要先创建孩子档案
2. 微信小程序需要在微信开发者工具中打开
3. 请确保云开发环境已开通
4. 建议使用真机调试测试完整功能
