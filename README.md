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
- 构建 macOS DMG：`npm run tauri:build:dmg`

DMG 构建命令会在镜像根目录加入 `修复已损坏.command`。如果未签名版本被 macOS 提示“已损坏”，请先把应用拖入“应用程序”文件夹，再运行该脚本；脚本只移除该应用的 `com.apple.quarantine` 隔离属性，不会关闭系统 Gatekeeper。

## GitHub Release 与自动更新

`.github/workflows/release-macos-arm64.yml` 只构建 Apple Silicon（`aarch64-apple-darwin`）版本。推送与 `package.json` 版本一致的标签即可发布，例如版本为 `0.2.0` 时执行：

```bash
git tag v0.2.0
git push origin v0.2.0
```

也可以从 GitHub Actions 页面手动运行。首次发布前，需要把本地 `.tauri/tot-schedule.key` 的完整内容保存为仓库 Actions Secret `TAURI_SIGNING_PRIVATE_KEY`。该私钥已被 `.gitignore` 排除；请安全备份，丢失后已安装的旧版本将无法验证后续更新。

发布流程会上传 DMG、macOS updater 压缩包、签名文件和 `latest.json`。桌面应用启动后会自动检查 GitHub 最新 Release，也可以点击顶部的更新图标手动检查。

桌面版会把任务、分类、笔记、心情和用户资料统一保存到系统应用数据目录下的 `planner-data.json`。首次启动时会自动迁移浏览器 `localStorage` 中的已有数据。
