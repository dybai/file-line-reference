# 文件行引用 · File Line Reference

DeepSeek Harness (DSH) 插件：在侧栏文件预览中选中若干行，把 `@路径:起-止` 行范围引用插入对话输入框；点击消息里的引用 chip 直接跳回文件的起始行；也可以把 Files 面板里的文件或目录拖进输入框，插入纯 `@路径` 引用，插入后输入框自动聚焦、光标落在引用之后。

- 划选拖拽或行选模式（点击选中、Shift 连选、Ctrl/Cmd 增减）→ 工具栏按钮或 **Ctrl+Shift+L** 插入引用到草稿；
- 引用前后自动补空格，不会与相邻文字粘连；
- 纯文本预览可开关行号（代码预览自带行号），屏上所见即所选；
- 全局快捷键默认 `Ctrl+Shift+L`（macOS `⌘⇧L`），可在 设置 → 快捷键 中改键（命令：文件行引用 → 添加选中行到对话）。
- 文件/目录拖拽：从右侧 **Files** 面板把文件或目录行拖到输入框，插入纯 `@路径` 引用（目录带尾 `/`，含空格自动加引号），文本形态与键盘 `@` 生成的引用一致；Files 面板标题栏的拖拽按钮可随时关闭，默认开启。

## 拖拽文件到对话

- 拖拽源是右侧 **Files** 面板的文件树行；拖到**来源会话自己的**输入框内松手才生效，子代理侧聊或另一会话的输入框、以及输入框以外的区域都不接收。插入成功后输入框自动获得焦点，光标落在引用之后，可直接继续输入。
- 插入的是纯文本 `@相对路径`（与键盘 `@` 选择后写进草稿的引用文本一致；输入框里是文本，不是引用 chip），走与“添加选中行”相同的插入通道，前后自动补空格；两条路径插入成功后都会自动聚焦输入框，光标落在引用之后。
- Files 面板标题栏（刷新、自动刷新旁）的按钮控制启用/禁用，状态记在 `localStorage`；关闭后卸载全部拖拽监听，不挂行也不监听 drop。
- 与 [dsh-file-drag](https://github.com/JiayuREN1127/dsh-file-drag) 功能重叠：两者同时安装会争用同一批行，本插件在其拖拽载荷存在时会主动让位，但建议二选一。
- 依赖 DSH 的实现细节：`[data-files-entry]` / `[data-files-path]` 行属性、`[data-sidebar-right-session]`（拖拽来源会话）、`[data-conversation-session]`（输入框所属会话）、`[contenteditable="true"]` 输入框。DSH 升级若改动这些契约，拖拽会静默失效（不插入、不破坏页面），不影响行引用主功能。

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
