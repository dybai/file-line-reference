# 文件行引用（@dybai/file-line-reference）部署手册

本手册覆盖：本地开发循环、以 **git + 自托管市场索引** 方式发布新版本、可选的 **npm 发布** 路径，以及常见坑。读完即可独立完成"编译 → 发布 → 升级"全流程。

## 1. 前提

- Node.js ≥ 20（`node --test` 与构建脚本运行环境）。
- DSH 已安装并能启动（`dsh web` 提供 http://127.0.0.1:3080）。
- git（推送用 SSH/HTTPS 凭据由你本机配置）。
- 可选（npm 模式）：npmjs.com 账号，且拥有 `@dybai` scope。

## 2. 目录结构

```
file-line-reference/
├── client.js            # 构建产物：src/flr-core.cjs + src/main.js 拼接（必须入库！）
├── cordis.patch.yml     # bundle patch：往 profile 插一行 file-line-reference
├── index.js             # Host 半端（空实现，行为全在 Client）
├── package.json         # dsh.bundle.patch / dsh.client 声明 + engines.dsh
├── icon.svg             # 插件图标
├── locale/*.json        # Host 侧包信息展示（插件管理器里的标题/描述）
├── src/flr-core.cjs     # 纯逻辑（UMD），node --test 直接测试
├── src/main.js          # 浏览器工厂主体（React.createElement 风格）
├── scripts/build.mjs    # 构建脚本：把 core 拼进 client.js（FLR_CORE 标记之间）
├── scripts/verify-loader.mjs  # Loader 契约模拟（只验证工厂期，不跑 apply）
├── test/flr-core.test.mjs     # 纯逻辑单测（node:test）
└── docs/
    ├── deploy.zh-CN.md            # 本手册
    └── market-index.example.json  # 市场索引模板（发布时复制到仓库根）
```

## 3. 本地开发循环

```powershell
node scripts/build.mjs        # 重新生成 client.js（改了 src/ 之后必须跑）
node --check client.js        # 语法检查
node scripts/verify-loader.mjs # 模拟 DSH ModuleLoader 契约（factory(require) → exports）
node --test                   # 纯逻辑单测（15 个）
```

然后在 DSH 里用 `install_bundle` 以**本地目录**安装（或已经装过时直接刷新页面，服务器按文件内容计算修订，无需重启 harness），浏览器 **Ctrl+F5** 验证。

经验法则：`node --check` 查不出 Loader 契约类错误（例如工厂里缺 CJS 样板），必须跑 `verify-loader.mjs`；插槽渲染崩溃看浏览器控制台的 `[file-line-reference]` 前缀日志。

## 4. 发布新版本（git 模式，无 npm 账号）

Git 安装 = 安装端直接从 GitHub 仓库按 **commit SHA** 拉取，**不执行任何构建脚本**，所以 `client.js` 必须已提交入库。流程：

1. **改版本号**：`package.json` 的 `version`（SemVer）。
2. **重新构建**：`node scripts/build.mjs`，然后跑完第 3 节全部检查。
3. **提交并推送**：

   ```powershell
   git add -A
   git commit -m "release: vX.Y.Z"
   git push
   ```

4. **取锁定 SHA**（小写 40 位十六进制）：

   ```powershell
   git rev-parse HEAD
   ```

5. **更新市场索引**：复制 `docs/market-index.example.json` 到**仓库根** `market-index.json`（首次发布才需要复制；之后直接编辑根上的文件），在 `plugins[].versions[]` 里**追加**一条新版本：
   - `version`：与 package.json 一致；
   - `publishTimestamp`：当前 Unix 秒（`[DateTimeOffset]::Now.ToUnixTimeSeconds()`）；
   - `source`：`{ "type": "git", "url": "https://github.com/dybai/file-line-reference", "commit": "<第 4 步的 SHA>" }`；
   - `engines.dsh`：与 package.json 一致。
6. **推送索引**：`git add market-index.json && git commit -m "market: vX.Y.Z" && git push`。

索引 URL 固定为 `https://raw.githubusercontent.com/dybai/file-line-reference/main/market-index.json`——它永远指向 main 分支最新提交，所以"追加版本条目再 push"就完成了发布。

## 5. 用户侧安装（首次）

1. DSH 设置 → 插件 → 安装官方可选 bundle **`@deepseek-ai/dsh-experimental-plugin-market-bundle`**（实验性插件市场，提供 Discover 标签页）。
2. 在市场设置里**添加索引源**：填第 4 节的 raw URL。
3. Discover 里找到"文件行引用"→ 安装 → 刷新页面。
4. 不想装市场组件的话，也可以直接 `install_bundle`：git 模式给 spec `git+https://github.com/dybai/file-line-reference.git#<SHA>`；npm 模式给 `@dybai/file-line-reference@X.Y.Z`。

## 6. 可选：npm 发布路径

npm 模式的安装物是 tarball，更轻，但需要账号与发布权：

1. `npm login`（确保 `@dybai` scope 归你所有；公共 scope 免费）。
2. `npm publish --access public` —— **scoped 包默认 restricted，漏掉 `--access public` 别人就装不了**。
3. 市场索引里该版本的 `source` 写 `{ "type": "npm" }`（省略 `registry` = 安装方默认 registry）。
4. 发版顺序：版本号 → build → 测试 → publish → 索引追加版本 → push 索引。
5. GitHub Release 可附 `npm pack` 产物存档（市场不直接消费它，仅作备份）。

## 7. market-index.json 字段速查

| 字段 | 说明 |
| --- | --- |
| `format` | 固定 `1`；格式不符会被市场拒绝 |
| `title` / `description` | 字符串或 `{ "en": 必填, "zh-cn": ... }`（小写语言 id，en 是兜底） |
| `metadata.categories/labels/sortKeys` | 声明市场里出现的分类/标签/排序键及其标题；插件只能引用已声明的 id |
| `plugins[].name` | npm 包名形状，索引内唯一 |
| `plugins[].metadata.keywords` | 搜索命中字段之一（约定来自 package keywords） |
| `plugins[].versions[].source` | `git`：`url`（无凭据 https）+ `commit`（小写 40 hex）+ 可选 `path`；`npm`：可选 `registry` |
| `plugins[].versions[].engines.dsh` | SemVer 范围；与运行版本不符会显示不兼容（可申请豁免） |
| 安装目标 | 索引不写 install 字段——市场端自动从 `source` 推导（npm → `name@version`；git → `git+url#commit`） |

## 8. 常见坑

- **git 安装不跑构建脚本**：忘了提交新构建的 `client.js`，用户装到的就是旧代码。发版检查单第一条。
- **`files` 字段只在打包（`npm pack` / npm 发布）时生效**；本地目录与 git 安装按仓库原样取。npm 发布前用 `npm pack --dry-run` 核对包内容。
- **SHA 必须是小写 40 位十六进制**，且必须是远端已存在的提交——本地未 push 的 SHA 会让安装端 404。
- **索引 URL 必须 http(s)、无凭据、无 fragment**；`raw.githubusercontent.com` 的 main 链接即可。
- **`engines.dsh` 不匹配**：安装界面会标不兼容；确要强装需在插件管理里做版本豁免（有崩溃风险）。
- **升级判定**：市场按"包名 + 版本比较"给出 `update-available`，所以每次发版务必递增 `package.json` 的 `version`。
- 已发送消息里的行引用以规则 id `file-lines` 持久化——**永远不要改这个 id**，否则历史消息的 chip 不再渲染。

## 9. 当前版本历史

| 版本 | 内容 |
| --- | --- |
| 1.0.0 | 首个公开版本：划选/行选 → `@路径:起-止` 插入草稿（Ctrl+Shift+L 或工具栏按钮）、纯文本预览行号开关、引用 chip 点击跳转起始行 |
