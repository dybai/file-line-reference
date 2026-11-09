# 文件行引用 · File Line Reference

DeepSeek Harness (DSH) 插件：在侧栏文件预览中选中若干行，把 `@路径:起-止` 行范围引用插入对话输入框；点击消息里的引用 chip 直接跳回文件的起始行。

- 划选拖拽或行选模式（点击选中、Shift 连选、Ctrl/Cmd 增减）→ 工具栏按钮或 **Ctrl+Shift+L** 插入引用到草稿；
- 引用前后自动补空格，不会与相邻文字粘连；
- 纯文本预览可开关行号（代码预览自带行号），屏上所见即所选；
- 全局快捷键默认 `Ctrl+Shift+L`（macOS `⌘⇧L`），可在 设置 → 快捷键 中改键（命令：文件行引用 → 添加选中行到对话）。
- 文件/目录拖拽：从右侧 **Files** 面板把文件或目录行拖到输入框，插入纯 `@路径` 引用（目录带尾 `/`，含空格自动加引号），与键盘 `@` 的结果一致；Files 面板标题栏的拖拽按钮可随时关闭，默认开启。

## 拖拽文件到对话

- 拖拽源是右侧 **Files** 面板的文件树行；拖到输入框内松手才生效，拖到别处不处理。
- 插入的是纯文本 `@相对路径`，走与“添加选中行”相同的插入通道，前后自动补空格。
- Files 面板标题栏（刷新、自动刷新旁）的按钮控制启用/禁用，状态记在 `localStorage`；关闭后不挂拖拽、不监听 drop。
- 与 [dsh-file-drag](https://github.com/JiayuREN1127/dsh-file-drag) 功能重叠：两者同时安装会争用同一批行，本插件检测到对方的拖拽载荷会主动让位，但建议二选一。

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
