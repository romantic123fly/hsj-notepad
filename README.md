# 幻世界临时文本记录工具（记事本 + Markdown 转 Word）

一个**纯前端、无后端、零构建**的网页端幻世界临时文本记录工具。双击 `index.html` 即可在浏览器中运行（`file://` 协议下完整可用），数据默认保存在本机浏览器的 `localStorage`；也可选开启**云同步**，把笔记存到你自己的 GitHub 仓库，换设备/换浏览器都能读回。

**在线版**：<https://romantic123fly.github.io/hsj-notepad/>

## 如何运行

直接双击项目根目录的 `index.html`（或在浏览器中打开该文件）即可使用，**无需联网、无需安装、无需服务器**。也可以直接访问上面的在线版。

## 功能

1. **记事本**（左侧目录 + 右侧编辑器）：
   - 左侧目录列出全部已保存笔记（倒序：标题 / 无标题 / 时间 / 摘要），当前笔记高亮；点击某项即在右侧编辑器打开并直接编辑；每项带删除按钮（二次确认）；顶部「＋ 新建」、底部「清空全部」（输入 `DELETE` 强确认）、已用存储估算；无笔记时显示空状态引导新建。
   - 右侧编辑器：标题 + 正文 + 保存 + 状态栏（已保存 · 时间 · 字数）；新建 → 空白，保存 → 新增；打开某笔记后保存 → 更新该笔记；自动保存（编辑暂停 3 秒）与 `Ctrl+S` 保存、`Ctrl+N` 新建快捷键；放弃未保存内容有二次确认。
2. **Markdown → Word**：源码编辑（约 A4 宽度）+ 实时预览（防抖 300ms，白色 A4 纸张样式）+ 示例加载 + 清空 + **一键复制预览区内容**（富文本 + 纯文本双通道，粘贴到 Word 保留格式、粘贴到记事本得纯文本）+ 一键导出 Word（`.doc`）；导出文件名为 `{首行标题或文档}_YYYYMMDD_HHmmss.doc`。
3. **云同步（可选）**：点右上角「云同步」，填入你自己的 GitHub token 即可把笔记（连同删除记录）同步到仓库的 `data/notes.json`；换设备时同样填一次 token 就能读回。默认自动同步（保存后约 1.5 秒推送、启动时拉取），也可手动点「立即同步」。token 只存在本机浏览器，不会提交到仓库。

## 云同步怎么配

1. 打开 <https://github.com/settings/tokens> → **Tokens (classic)** → **Generate new token (classic)**，只勾 `repo` 权限（或改用 fine-grained token，给该仓库 **Contents: Read and write**）。
2. 在应用里点「云同步」，粘贴 token，仓库填 `romantic123fly/hsj-notepad`（或你自己的 fork），保存配置。
3. 点「立即同步」验证；之后保存笔记会自动推送。数据文件为仓库里的 `data/notes.json`（合并策略：按 `updatedAt` 新者胜，删除用墓碑防复活）。

## 技术实现

- **纯原生 HTML / CSS / JS**：无 React/Vue、无构建工具（无 webpack/vite）、无 ES Module（`file://` 下 ES Module 会因 CORS 失败，故采用普通 `<script>` + IIFE + 全局命名空间 `window.NotesApp`）。
- **持久化**：`localStorage`，带 5MB 容量保护与异常兜底。
  - 存储键（PRD 第 3 章，统一 `notes.app.*` 前缀）：
    - `notes.app.notes`：JSON 数组（Note[]）
    - `notes.app.currentNoteId`：当前编辑中的笔记 ID（空字符串表示新建态）
    - `notes.app.settings`：应用设置（当前仅存 `theme`）
  - Note 字段：`id` / `title` / `content` / `createdAt` / `updatedAt`
  - 单条限制：标题 ≤ 200 字符、正文 ≤ 200,000 字符（超出提示「内容过长」）
  - 写入前估算 `JSON.stringify(data).length`，接近上限或 `QuotaExceededError` 时提示「存储空间不足」，不静默失败；解析失败按空数组兜底并提示「本地数据异常」。
- **Markdown 解析**：`marked` v15.0.12，已**本地化**到 `lib/marked.min.js`（UMD，离线可用），在 `index.html` 中通过 `<script src="lib/marked.min.js">` 引用。
- **导出 Word**：采用 PRD 方案 A —— `marked` 渲染 MD→HTML，再封装为 Word 可打开的 MHTML 风格文档（含 `xmlns:o/w` 命名空间 + `<meta charset>` + `<body>`），用 `Blob`（`type: application/msword`，内容前加 UTF-8 BOM `\ufeff`）触发下载，扩展名 `.doc`（Word/WPS 可直接打开并保留标题、加粗、列表、表格、代码块等格式）。
- **A4 预览**：预览区为白色 A4 纸张（约 794px 宽、96px 内边距、细阴影），在灰底上居中；源码 textarea 同宽度；桌面两栏并排（整体容器 `max-width: 1700px`），`<1024px` 上下堆叠。

## 文件结构

```
3b894b31/
├── index.html            # 入口页面（双击打开）
├── styles.css            # 全局样式（设计变量、目录/编辑器、A4 纸张、响应式、暗色主题）
├── lib/
│   └── marked.min.js     # MD→HTML 解析库（本地化，离线）
├── js/
│   ├── app.js            # 入口：初始化、Tab 路由、主题切换、快捷键
│   ├── storage.js        # localStorage 封装：读写、容量检查、异常兜底
│   ├── notes.js          # 记事本模块逻辑（新建/编辑/保存/打开/自动保存）
│   ├── history.js      # 记事本左侧「切换目录」：列表/打开/删除/清空
│   ├── converter.js      # Markdown→HTML→Word 转换与下载
│   ├── cloud.js          # 云同步：GitHub Contents API 拉取/合并/推送
│   └── ui.js             # 通用 UI：toast、确认弹窗、时间格式化、HTML 转义
├── dist/
│   └── hsj-notepad-standalone.html  # 单文件版（样式/脚本全部内联，可直接分发）
├── docs/
│   ├── requirements.md   # PRD v1.0
│   └── ui-design.md      # UI 设计文档
└── design/
    └── mockup.html       # 视觉稿
```

## 浏览器兼容

现代主流浏览器（Chrome、Edge、Firefox、Safari）最近两个大版本。依赖能力均为原生支持：`localStorage`、`Blob`、`URL.createObjectURL`、`<a download>`，无需 polyfill。

## 注意事项

- 数据仅保存在本机浏览器的 `localStorage` 中，**清除浏览器站点数据会导致笔记丢失**。
- 浏览器隐私/无痕模式下 `localStorage` 可能受限，请以常规模式使用。
- `marked` 已本地化，全程离线可用，不产生任何网络请求。

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。

## 在线访问与发布

- GitHub 仓库：<https://github.com/romantic123fly/hsj-notepad>
- 在线版（GitHub Pages）：<https://romantic123fly.github.io/hsj-notepad/>
- 单文件版（可下载分发）：`dist/hsj-notepad-standalone.html`

推送到自己的仓库：

```bash
git remote add origin https://github.com/romantic123fly/hsj-notepad.git
git push -u origin main
```

推送后在仓库 **Settings → Pages** 选择 `main` 分支根目录即可获得在线版；笔记云同步的数据会写在仓库的 `data/notes.json`。


