# CSGO风格班级点名系统 - 项目规则

本文件用于在 Trae IDE 中统一项目规范与约定，确保多人协作与后续维护的一致性。

## 一、技术栈
- 前端框架：React 18 + TypeScript
- 构建工具：Vite
- 状态管理：Zustand
- 动画库：Framer Motion
- 样式方案：Tailwind CSS（优先使用类名）、必要时在 src/index.css 中补充定制样式
- 音频管理：Howler.js
- 数据存储：Browser LocalStorage（持久化）

## 二、代码与文件命名规范
- 组件文件：PascalCase（例：MainScreen.tsx）
- 工具/库文件：camelCase（例：audioManager.ts）
- 样式文件：kebab-case（例：index.css）
- Props 接口命名：ComponentNameProps（例：SettingsModalProps）
- 所有组件与导出函数必须包含 JSDoc 注释，中文说明功能、参数与返回值
- 使用函数式组件与 React Hooks

## 三、状态管理（Zustand）
- 全局状态包含：
  - 学生名单（含头像、星标）
  - 设置项：不重复模式 / 动画速度 / 音量 / 班级名称
  - 抽取池（No-Repeat）与历史记录
- 状态更新必须通过 store 中的方法完成，不在组件中直接修改复杂数据结构
- 使用 persist 中间件 + localStorage 做持久化与版本迁移

## 四、样式与主题
- 优先使用 Tailwind CSS 原子类
- 自定义主题变量与全局样式集中在 src/index.css
- 主题色遵循 CSGO 风格：
  - 背景：#1A1A1A（近黑）
  - 面板：#2C2C2C（深灰）
  - 主交互色：#00A2FF / #FF9900
  - 稀有度：蓝 #4B69FF、紫 #8847FF、粉 #D32CE6、红 #EB4B4B、金 #FFD700
- 以 1920x1080 大屏为优先，兼容标准笔记本屏幕

## 五、动画（Framer Motion）
- 流程：解锁 → 轮盘滚动 → 减速 → 揭晓 → 结果
- 动画时长与曲线依据“速度设置”，保证 60 FPS
- 使用 ease-out 或 cubic-bezier 拟物缓动
- 轮盘滚动采用单段 ease-out 过渡（取消多段减速关键帧），目标卡片以匀减速方式停在中心指示器位置。
- 速度曲线采用 CSGO 风格的强减速 cubic-bezier(0.22, 1, 0.36, 1)（越接近终点减速越明显）。

## 六、音频（Howler.js）
- BGM 循环播放，默认音量较低
- SFX 按阶段触发（解锁/滚动/减速/揭晓/稀有度）
- 分别控制 BGM 与 SFX 音量

## 七、功能与数据
- 名单管理：
  - 纯文本导入/导出（每行一个姓名）
  - CSV 导入/导出（name, avatar_url）
  - 列表展示：序号、姓名、头像预览、删除、星标
- 不重复模式：抽中过的学生临时移出池，全部抽完后自动重置
- Star Student™：抽中时以高亮/特效呈现
- 未中奖名称渲染必须来自 roster 的真实姓名，不得使用 pool 的 id。

## 八、性能与兼容
- 首屏 < 3 秒、内存 < 100MB
- 浏览器：Chrome/Edge 90+
- 资源按需加载与压缩，Tailwind 按内容裁剪

## 九、安全
- 不存储敏感信息
- 本地数据若涉及敏感字段需加密
- 上传做类型/大小校验，防 XSS

## 十、测试与文档
- 覆盖核心功能与性能测试
- 兼容性测试覆盖目标浏览器
- README 含使用说明；更新日志遵循语义化版本

## 十一、提交规范
- 代码与注释使用中文
- 提交信息使用中文，清晰描述变更

## 十四、版本发布规范
- 版本号遵循语义化版本规范（主版本.次版本.修订版本）
- 每次发布前必须更新package.json版本号
- README.md中必须包含详细的更新日志
- 重大功能更新应升级主版本号（1.x.x → 2.0.0）
- 向后兼容的功能性更新升级次版本号（2.1.x → 2.2.0）
- 问题修复和性能优化升级修订版本号（2.2.0 → 2.2.1）
- 发布前需进行完整的测试验证

## 十二、实现约定与落地细则（新增）
- 所有组件与导出函数需添加中文 JSDoc：功能说明、参数、返回值，且函数级注释与类型定义必须到位。
- SettingsModal 必须通过 store 方法进行设置写回：setClassName、toggleNoRepeat、setSpeed、setVolumes。
- 轮盘动画采用单段 ease-out，目标项停在中心指示器；速度与时长由 settings.speed 驱动。
- 滚动序列非目标项稀有度：填充项在 UI 侧按 drawRarity 概率随机（blue 70%, purple 18%, pink 8%, red 3.5%, gold 0.5%）；目标项使用真实稀有度。
- 稀有度概率配置：统一在 src/config/rarityConfig.ts 中管理，所有概率相关代码都应使用该配置文件。
- 音频管理器需提供：unlock、playBgm、pauseBgm、fadeBgmTo、setVolume、setBgmVolume、click、tick、reveal 等方法占位与实现；音量变更与 settings 联动。
- 不重复模式：toggleNoRepeat(true) 时构建 pool；toggleNoRepeat(false) 时清空 pool；hydrate 后若 noRepeat=true 且 pool 为空则 resetPool。
- 资源目录：public/audio 放置 bgm 与 sfx；命名遵循小写连字符；SVG 用于矢量图标与占位。
- 名单加载入口统一在 SettingsModal：主页仅保留“重置抽取池”按钮；Settings 中提供“导入示例名单（MD.csv/MD.xlsx）”与“重新读取 MD.csv（跳过缓存）”。

## 十三、性能优化（轮盘动画）
- 渲染数量控制：基于容器宽度动态计算可见项，左侧 prepad + 右侧最小补齐，低性能模式 buffer=4，高性能 buffer=10。
- 低性能降级：根据 prefers-reduced-motion、DPR≥2 且宽≥1600、CPU 核心数≤4 启动 reducedEffects，关闭/降低渐变遮罩、阴影与重特效。
- 滴答节流：按“卡片步进变化”触发且增加最小间隔（低性能 24ms，正常 12ms），强度随剩余距离线性衰减。
- 计算去重：预计算 displayTargetIndex，避免在 map 渲染中读取布局与重复计算。
- 动画参数：单段 cubic-bezier(0.22, 1, 0.36, 1) 缓动，按 settings.speed 映射总时长与滴答频率。
- 样式变量：稀有度颜色通过 src/index.css 的 CSS 变量提供，禁止在组件内重复声明。
- 事件与状态：在 onAnimationComplete 中统一 setStopped 与对齐 finalX，避免浮点误差造成的重排。