# QuickSSH

> 跨平台 SSH 与 SFTP 客户端 · 单窗口一体化运维工作台

QuickSSH 致力于打造一个真正的一体化运维工作台，将 **SSH、SFTP、文件编辑、资源监控、命令管理** 等能力融合于一个窗口中，减少工具切换，让开发者与运维工程师能够更加专注于工作本身。

## ✨ 核心特性

### 🏠 统一 Workbench
将 SSH 远端会话与本地终端以 Tab 标签页统一管理。采用 **keep-mounted** 策略，切换标签时终端实例（xterm.js）常驻内存不销毁，保证操作状态与输出上下文不中断。

### 📁 深度整合的 SFTP 模块
可视化的远端文件管理器，支持本地文件拖拽上传、下载、批量操作及权限管理。集成 **Monaco Editor**，双击远端文本文件即可内联编辑，保存即刻后台同步。

### ⚡ 命令面板与自定义命令
快捷呼出全局命令面板（`Ctrl+K` / `Ctrl+Shift+P`）。记录历史执行命令，支持添加常用运维命令，一键快速执行。

### 📊 实时主机资源监控
无需远端安装任何代理程序，即开即用。以图表形式实时采样 Linux 服务器的 CPU 占比、内存占用、网速吞吐及磁盘 IO。

### 🎨 VSCode 风格主题包
内置多款高对比度主题（Dracula、Midnight Blue、暗色/亮色），跟随系统暗黑/明亮模式。

### 🔒 暂离保护
一键锁定应用界面，终端会话保持后台运行，二次确认解锁避免误触。

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 壳体环境 | Electron |
| 前端框架 | React 18 (Hooks) + TypeScript 5 |
| 构建链 | Vite + electron-vite |
| CSS 样式 | Tailwind CSS 3 |
| 图标库 | Font Awesome (React) |
| 终端引擎 | xterm.js (WebGL 加速 + Web 字体) |
| 代码编辑 | Monaco Editor |
| SSH 协议 | ssh2 (纯 Node.js 实现) |
| 本地终端 | node-pty |
| 状态管理 | Zustand |



## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 类型检查
npm run typecheck

# 构建
npm run build

# 打包
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+K` / `Cmd+K` | 呼出命令面板 |
| `Ctrl+Shift+P` | 全局命令面板 |
| `Ctrl+S` | 保存 Monaco 编辑器内容 |

## 🔐 安全说明

- 凭据密码与私钥使用 Electron `safeStorage`（基于系统密钥链）加密存储
- 渲染进程通过 `contextBridge` 隔离，无 Node.js 直接访问
- 明文凭据不保留在渲染层内存中



## 📄 License

MIT
