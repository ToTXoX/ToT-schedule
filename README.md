# 日程规划

一个基于 React、Vite 和 Tauri 的轻量本地日程与任务管理应用。

## Run Locally

**Prerequisites:** Node.js。构建桌面版还需要 Rust 工具链。


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## 桌面应用（Tauri）

- 开发运行：`npm run tauri:dev`
- 构建安装包：`npm run tauri:build`

桌面版会把任务、分类、笔记、心情和用户资料统一保存到系统应用数据目录下的 `planner-data.json`。首次启动时会自动迁移浏览器 `localStorage` 中的已有数据。
