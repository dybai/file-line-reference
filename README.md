# 文件行引用 · File Line Reference

DeepSeek Harness (DSH) 插件：在侧栏文件预览中选中若干行，把 `@路径:起-止` 行范围引用插入对话输入框；点击消息里的引用 chip 直接跳回文件的起始行。

- 划选拖拽或行选模式（点击选中、Shift 连选、Ctrl/Cmd 增减）→ 工具栏按钮或 **Ctrl+Shift+L** 插入引用到草稿；
- 引用前后自动补空格，不会与相邻文字粘连；
- 纯文本预览可开关行号（代码预览自带行号），屏上所见即所选；
- 全局快捷键默认 `Ctrl+Shift+L`（macOS `⌘⇧L`），可在 设置 → 快捷键 中改键（命令：文件行引用 → 添加选中行到对话）。

## 安装

见 [docs/deploy.zh-CN.md](docs/deploy.zh-CN.md) 第 5 节：启用实验性插件市场后添加本仓库的索引 URL，或直接按 spec 安装。

## 开发与发布

```powershell
node scripts/build.mjs         # src/ 变更后重新生成 client.js
node --test                    # 纯逻辑单测
node scripts/verify-loader.mjs # DSH ModuleLoader 契约模拟
```

编译、发布（git/npm 两种模式）与常见坑的完整手册：[docs/deploy.zh-CN.md](docs/deploy.zh-CN.md)。

## License

[MIT](LICENSE)
