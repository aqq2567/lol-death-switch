# LoL Death Switch — 阵亡自动跳转

> 英雄联盟阵亡后自动打开抖音/B站，抓紧每一秒摸鱼时间 🎮→📱

## 功能

- **实时监控** — 通过 LoL 本地 API 检测游戏状态，判断玩家是否阵亡
- **自动跳转** — 检测到阵亡后自动打开浏览器跳转到抖音/B站
- **智能防抖** — 同一次阵亡不会重复触发，复活后自动重置
- **灵活配置** — 可选择跳转目标（抖音/B站/两者）、轮询间隔、阵亡延迟

## 截图

（运行后截图放这里）

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron 30 |
| 前端 | React 18 + Vite 5 |
| UI | MUI 5 + Tailwind CSS 3 |
| 打包 | electron-builder |

## 快速开始

### 环境要求

- Node.js >= 18
- 英雄联盟客户端（运行时需开启游戏）

### 安装

```bash
git clone https://github.com/你的用户名/lol-death-switch.git
cd lol-death-switch
npm install
```

### 开发模式

```bash
# 仅启动前端（浏览器预览 UI）
npm run dev

# 启动 Electron + Vite 热更新
npm run electron:dev
```

### 打包构建

```bash
npm run electron:build
```

构建产物在 `dist-electron/` 目录下，生成 `.exe` NSIS 安装包（Windows）。

## 工作原理

```
LoL 客户端 ──→ 本地 API (127.0.0.1:2999)
                    │
                    ↓ 每 N 秒轮询
              lol-monitor.js
               ├── 检测 currentHealth ≤ 0
               ├── 检测 isDead 字段
               └── 防抖 (wasDead 状态追踪)
                    │
                    ↓ 新阵亡事件
              main.js
               └── shell.openExternal() 打开浏览器
                    │
                    ↓
              抖音 / B站
```

## 配置项

| 配置 | 说明 | 默认值 | 范围 |
|---|---|---|---|
| 跳转目标 | 阵亡后打开哪个网站 | 抖音 | 抖音/B站/两者 |
| 轮询间隔 | 多久检测一次游戏状态 | 3 秒 | 1-10 秒 |
| 阵亡延迟 | 阵亡后等多久才跳转 | 2 秒 | 0-15 秒 |

## 项目结构

```
lol-death-switch/
├── electron/              # Electron 主进程
│   ├── main.js            # 窗口管理 + IPC 通信
│   ├── preload.js         # 安全桥接层 (contextBridge)
│   └── lol-monitor.js     # LoL API 监控 + 阵亡检测
├── src/                   # React 渲染进程
│   ├── App.jsx            # 主应用组件
│   ├── main.jsx           # React 入口
│   ├── theme.js           # LoL 主题 MUI 配置
│   ├── index.css          # 全局样式 + 动画
│   └── components/
│       ├── StatusPanel.jsx    # 状态面板 + 开关按钮
│       ├── DeathCounter.jsx   # 阵亡计数大字显示
│       └── ConfigPanel.jsx    # 配置面板
├── assets/                # 图标等静态资源
├── index.html             # HTML 入口
├── vite.config.js         # Vite 配置
└── tailwind.config.js     # Tailwind 配置
```

## 注意事项

- 需要**英雄联盟客户端正在运行**时才能检测到游戏状态
- LoL 本地 API 使用自签名证书，应用已配置 `rejectUnauthorized: false`
- 仅支持 Windows 平台（electron-builder 配置为 NSIS 目标）

## License

MIT
