# CSGO风格班级点名系统

一个基于React + TypeScript的现代化班级点名系统，采用CSGO游戏风格的UI设计和开箱动画效果，让传统的点名过程变得生动有趣。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.x-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)
![Vite](https://img.shields.io/badge/Vite-5.x-646cff.svg)

## ✨ 特色功能

### 🎮 CSGO风格界面
- 深色主题配色方案
- 游戏化的UI元素和交互效果
- 专业的瞄准镜图标设计
- 沉浸式的视觉体验

### 🎰 开箱动画系统
- 流畅的轮盘滚动动画
- 五级稀有度系统（蓝色→紫色→粉色→红色→金色）
- 可调节的动画速度
- 真实的减速停止效果

### 👥 学生管理系统
- 支持手动添加/删除学生
- 批量导入功能（纯文本/CSV格式）
- 学生头像显示支持
- 星标学生特殊标记
- 数据本地持久化存储

### ⚙️ 个性化设置
- 班级名称自定义
- 不重复点名模式
- 动画速度调节（1x-3x）
- 独立的BGM和音效音量控制

### 🔊 专业音效系统
- 背景音乐循环播放
- 多阶段音效触发
- 音量独立控制
- 基于Howler.js的高质量音频

## 🚀 快速开始

### 环境要求
- Node.js 16.x 或更高版本
- npm 或 yarn 包管理器
- 现代浏览器（Chrome 90+, Edge 90+）

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd csgo-roll-call
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
```

3. **启动开发服务器**
```bash
npm run dev
# 或
yarn dev
```

4. **访问应用**
打开浏览器访问 `http://localhost:5173`

### 生产构建

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 📁 项目结构

```
csgo-roll-call/
├── public/                 # 静态资源
│   ├── audio/             # 音频文件
│   │   ├── bgm.mp3       # 背景音乐
│   │   └── README.md     # 音频文件说明
│   ├── favicon.svg       # 网站图标
│   └── MD.csv           # 示例学生名单
├── src/
│   ├── components/       # React组件
│   │   ├── MainScreen.tsx          # 主界面组件
│   │   ├── CaseOpeningAnimation.tsx # 开箱动画组件
│   │   ├── ResultScreen.tsx        # 结果展示组件
│   │   └── SettingsModal.tsx       # 设置模态框
│   ├── lib/             # 工具库
│   │   └── audioManager.ts        # 音频管理器
│   ├── store/           # 状态管理
│   │   └── appStore.ts            # Zustand状态存储
│   ├── App.tsx          # 应用根组件
│   ├── main.tsx         # 应用入口
│   └── index.css        # 全局样式
├── .trae/
│   └── rules/
│       └── project_rules.md       # 项目开发规范
└── README.md           # 项目文档
```

## 🎯 使用指南

### 基础操作

1. **添加学生名单**
   - 点击设置按钮进入设置界面
   - 使用"添加学生"功能逐个添加
   - 或使用"批量添加"功能一次性导入多个学生

2. **开始点名**
   - 在主界面点击"开始点名"按钮
   - 观看精彩的开箱动画
   - 查看点名结果

3. **设置配置**
   - 班级名称：自定义显示的班级名称
   - 不重复模式：避免重复点到同一学生
   - 动画速度：调节开箱动画的播放速度
   - 音量控制：分别调节背景音乐和音效音量

### 高级功能

#### 学生名单管理
- **CSV导入**：支持包含姓名和头像URL的CSV文件
- **星标学生**：为重要学生添加星标，抽中时会有特殊效果
- **头像支持**：可为每个学生设置个人头像

#### 不重复点名
- 开启后，已点到的学生会暂时移出抽取池
- 当所有学生都被点到后，自动重置抽取池
- 可手动重置抽取池

#### 稀有度系统
- **蓝色（70%）**：普通学生
- **紫色（18%）**：较少见
- **粉色（8%）**：稀有
- **红色（3.5%）**：非常稀有
- **金色（0.5%）**：传说级稀有

## 🛠️ 技术栈

### 核心技术
- **React 18** - 现代化的前端框架
- **TypeScript** - 类型安全的JavaScript超集
- **Vite** - 快速的构建工具
- **Zustand** - 轻量级状态管理
- **Framer Motion** - 强大的动画库
- **Tailwind CSS** - 实用优先的CSS框架
- **Howler.js** - 专业的Web音频库

### 开发工具
- **ESLint** - 代码质量检查
- **PostCSS** - CSS后处理器
- **TypeScript** - 静态类型检查

## 🎨 设计规范

### 色彩方案
- **主背景**：#1A1A1A（深黑）
- **面板背景**：#2C2C2C（深灰）
- **主要交互色**：#00A2FF（蓝色）、#FF9900（橙色）
- **稀有度颜色**：
  - 蓝色：#4B69FF
  - 紫色：#8847FF
  - 粉色：#D32CE6
  - 红色：#EB4B4B
  - 金色：#FFD700

### 动画规范
- **缓动函数**：cubic-bezier(0.22, 1, 0.36, 1)
- **帧率目标**：60 FPS
- **动画时长**：根据速度设置动态调整

## 🔧 开发指南

### 代码规范
- 使用TypeScript进行类型安全开发
- 遵循React Hooks最佳实践
- 组件采用函数式编程风格
- 所有函数必须包含JSDoc注释

### 状态管理
- 使用Zustand进行全局状态管理
- 状态持久化到localStorage
- 通过store方法进行状态更新

### 样式开发
- 优先使用Tailwind CSS原子类
- 自定义样式集中在index.css
- 响应式设计适配不同屏幕尺寸

## 📝 更新日志

### v2.2.0 (2024-01-XX)
- ⚡ 性能优化：轮盘动画在低GPU性能设备上的流畅度提升
- 🎯 新增自动降级策略：根据设备性能自动调整渲染效果
- 🔧 优化滴答音效触发逻辑，减少CPU占用
- 📱 增强高分辨率屏幕兼容性
- 🐛 修复收藏馆页面样式问题

### v2.1.3 (2024-01-XX)
- ✨ 新增首页组件进入动画效果
- 🎨 优化用户界面交互体验
- 🔧 将"手动输入"功能升级为"手动修改"
- 📝 支持编辑当前名单内容
- 🚀 提升整体视觉流畅度

### v1.0.0 (2024-01-XX)
- ✨ 初始版本发布
- 🎮 CSGO风格UI设计
- 🎰 完整的开箱动画系统
- 👥 学生管理功能
- ⚙️ 个性化设置选项
- 🔊 专业音效系统

## 🤝 贡献指南

欢迎提交Issue和Pull Request来帮助改进项目！

1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- 感谢CSGO游戏为UI设计提供的灵感
- 感谢所有开源库的贡献者
- 感谢社区的反馈和建议

---

**如果这个项目对你有帮助，请给它一个⭐️！**
