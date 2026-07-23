# 日程规划

一个基于 React、Vite 和 Tauri 的轻量本地日程与任务管理应用。

## Run Locally

**Prerequisites:** Node.js。构建桌面版还需要 Rust 工具链。


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## 产品官网与 Vercel

浏览器访问时会显示 ToT 产品官网，Tauri 桌面运行时仍显示日程应用。官网会从 GitHub 最新 Release 自动读取版本号，并把 Windows 10/11、Windows 7 Legacy 与 macOS 下载入口链接到对应安装包。

在 Vercel 中导入本 GitHub 仓库即可发布；仓库根目录的 `vercel.json` 已配置 Vite 构建命令和 `dist` 输出目录，无需额外环境变量。

## 桌面应用（Tauri）

- 开发运行：`npm run tauri:dev`
- 构建安装包：`npm run tauri:build`
- 构建 macOS DMG：`npm run tauri:build:dmg`

DMG 构建命令会在镜像根目录加入 `修复已损坏.command`。如果未签名版本被 macOS 提示“已损坏”，请先把应用拖入“应用程序”文件夹，再运行该脚本；脚本只移除该应用的 `com.apple.quarantine` 隔离属性，不会关闭系统 Gatekeeper。

## GitHub Release 与自动更新

`.github/workflows/release-desktop.yml` 会依次构建 macOS Apple Silicon（`aarch64-apple-darwin`）、Windows 10/11 x64（`x86_64-pc-windows-msvc`）和 Windows 7 Legacy x64（`x86_64-win7-windows-msvc`）版本。推送与 `package.json` 版本一致的标签即可发布，例如版本为 `0.2.0` 时执行：

```bash
git tag v0.2.0
git push origin v0.2.0
```

也可以从 GitHub Actions 页面手动运行。首次发布前，需要把本地 `.tauri/tot-schedule.key` 的完整内容保存为仓库 Actions Secret `TAURI_SIGNING_PRIVATE_KEY`。该私钥已被 `.gitignore` 排除；请安全备份，丢失后已安装的旧版本将无法验证后续更新。

发布流程会先创建草稿 Release，上传 DMG、两个 Windows NSIS 安装包及 updater 签名。macOS 与 Windows 10/11 共用标准更新清单 `latest.json`；Windows 7 Legacy 使用独立清单 `latest-win7.json`，不会误升级到仅支持 Windows 10/11 的程序。三个构建都成功后 Release 才会正式发布。桌面应用启动后会自动检查对应更新通道，也可以点击顶部的更新图标手动检查。

Windows 7 Legacy 安装包不内置约 144 MB 的 WebView2 Runtime。安装器检测到 WebView2 缺失或版本低于 `109.0.1518.140` 时，会从 Microsoft Update Catalog 按需下载最终支持 Windows 7 的 x64 运行库并校验 SHA-256；已安装兼容运行库时不会重复下载。Legacy 前端以 Chrome 109 为目标构建。Windows 7 已停止系统安全支持，因此 Legacy 版本仅用于兼容旧设备，日常使用仍建议升级到 Windows 10/11。

Windows 安装包目前未配置 Authenticode 代码签名，首次下载或安装时可能出现 Microsoft Defender SmartScreen 提示；这不影响使用 `TAURI_SIGNING_PRIVATE_KEY` 对应用更新包进行签名和校验。

桌面版会把任务、分类、笔记、心情和用户资料统一保存到系统应用数据目录下的 `planner-data.json`。首次启动时会自动迁移浏览器 `localStorage` 中的已有数据。
