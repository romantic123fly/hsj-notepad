# UI 设计文档 — 幻世界临时文本记录工具（记事本 + Markdown 转 Word）

> 版本：v1.1
> 文档状态：已定稿（供前端开发直接落地）
> 作者：UI 设计（ui-designer）
> 日期：2026-11-18
> 关联：`docs/requirements.md`（PRD v1.0）

---

## 1. 设计目标与整体视觉风格

### 1.1 设计目标

1. **开箱即用、零学习成本**：用户双击 `index.html` 后一眼看懂「能干什么、怎么干」，核心操作（记录 / 保存 / 切换 / 转换 / 下载）路径短、反馈明确。
2. **轻量、清爽、现代**：视觉上减少装饰性元素，用留白、层次和克制的配色传递「工具感」而非「内容平台感」；信息密度适中，长时间输入不疲劳。
3. **桌面优先、窄屏可用**：以桌面宽屏为第一体验，同时保证平板/手机下两个模块可堆叠、可操作（PRD 4.4）。
4. **无障碍与可用性**：对比度达标、焦点可见、键盘可操作、破坏性操作有二次确认、关键操作有明确反馈（PRD 4.4）。
5. **零依赖、可离线**：不引入任何视觉/字体 CDN，全部使用系统字体栈与 CSS 原生能力，与「双击即用、无网络运行」的硬约束一致。

### 1.2 整体视觉风格关键词

- **克制的色彩**：以中性灰为基底，单一品牌色（靛蓝）承担「主操作 / 当前态 / 链接」的语义，成功 / 警告 / 危险用语义色点缀，避免大面积高饱和色块。
- **清晰的层级**：卡片 + 细边框 + 极浅阴影划分区域；标题、正文、辅助文字三级灰度区分。
- **圆角与间距**：小圆角（6–12px）营造亲和感；4px 基准间距系统保证节奏统一。
- **现代交互细节**：主按钮悬停/按下有细微反馈，焦点环明显，toast 轻提示非模态、不打断。
- **纸张隐喻**：Markdown 预览区以「白色 A4 纸张」呈现，模拟最终 Word 交付的观感，直观可信。

---

## 2. 整体布局（信息架构）

单页应用（SPA），页面结构自上而下为：**顶栏 → 主体**。默认进入「记事本」模块。

```
┌──────────────────────────────────────────────────────────┐
│ 顶栏：应用标题（左）  +  两模块导航 Tab（中/左）  +  主题切换（右，可选）│
├──────────────────────────────────────────────────────────┤
│                                                          │
│  主体：根据当前 Tab 渲染对应视图                             │
│  · 记事本（目录 sidebar + 编辑器 两栏）                     │
│  · Markdown 转 Word（源码 + A4 纸张预览 两栏）              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- **顶栏**：左侧为应用标题（含小图标），右侧/中部为两个模块的 Tab 导航。顶栏粘性定位（`position: sticky; top: 0`），滚动时保持可见。
- **主体**：单一视图区，切换 Tab 时替换内容（视觉稿用 JS 切换 `display` 演示，开发同样用 JS 控制）。
- **Tab 状态**：当前 Tab 高亮（品牌色文字 + 底部指示条），悬停态有过渡。
- **模块一（记事本）**：左右两栏——左侧「切换目录」侧边栏（笔记列表），右侧编辑器。
- **模块二（Markdown 转 Word）**：左右两栏——左侧 Markdown 源码区，右侧 A4「纸张」预览区。

---

## 3. 配色方案

### 3.1 设计原则

- 主色只承担「可交互 / 当前态 / 强调」语义，正文以中性灰为主，避免视觉噪声。
- 亮色主题为默认；暗色主题作为可选增强（通过 `html[data-theme="dark"]` 切换，v1.0 可不实现，仅预留变量）。
- 所有颜色以 CSS 自定义属性（变量）暴露，开发直接引用，禁止在组件内硬编码色值。
- **纸张白**：A4 预览「纸张」始终为白底、墨色正文，不随主题切换（模拟打印稿），用独立变量固定。

### 3.2 亮色主题（默认）

```css
:root {
  /* 背景与表面 */
  --color-bg:            #f6f7f9;   /* 页面整体背景 */
  --color-surface:       #ffffff;   /* 卡片 / 面板表面 */
  --color-surface-alt:   #f1f3f5;   /* 次级表面（编辑区、代码背景等） */

  /* 主色（品牌色，靛蓝） */
  --color-primary:       #4a6cf7;
  --color-primary-hover: #3a5bd9;
  --color-primary-soft:  #eef1fe;   /* 主色浅底（选中/高亮） */

  /* 文本 */
  --color-text:          #1f2329;   /* 主文本 */
  --color-text-secondary:#5c6370;   /* 次级文本 */
  --color-text-muted:    #9aa1ab;   /* 弱化/占位文本 */

  /* 边框与阴影 */
  --color-border:        #e5e7eb;
  --color-border-strong: #d0d4db;
  --shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.05);
  --shadow-md: 0 4px 12px rgba(16, 24, 40, 0.08);

  /* 语义色 */
  --color-success:       #16a34a;
  --color-success-soft:  #e7f6ec;
  --color-warning:       #d97706;
  --color-warning-soft:  #fdf1df;
  --color-danger:        #dc2626;
  --color-danger-soft:   #fdeaea;

  /* 覆盖层 */
  --color-overlay: rgba(15, 23, 42, 0.45);

  /* 目录 / 侧边栏 */
  --sidebar-width: 260px;

  /* Word 纸张（A4 预览，不随主题变化） */
  --paper-width: 794px;      /* A4 @96dpi 宽度 */
  --paper-padding: 96px;     /* 纸张内边距（近似 Word 页边距） */
  --paper-min-height: 1123px;/* A4 @96dpi 高度 */
  --paper-bg: #ffffff;
  --paper-ink: #1f2329;      /* 纸张正文固定墨色 */
  --paper-shadow: 0 1px 3px rgba(0,0,0,.12), 0 6px 24px rgba(0,0,0,.12);
}
```

### 3.3 暗色主题（可选，预留）

```css
html[data-theme="dark"] {
  --color-bg:            #0f1115;
  --color-surface:       #171a20;
  --color-surface-alt:   #1f232b;

  --color-primary:       #6c8dff;
  --color-primary-hover: #8aa2ff;
  --color-primary-soft:  #232a45;

  --color-text:          #e8eaed;
  --color-text-secondary:#b6bcc6;
  --color-text-muted:    #7a818c;

  --color-border:        #2a2f38;
  --color-border-strong: #3a414c;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);

  --color-success:       #22c55e;
  --color-success-soft:  #14271c;
  --color-warning:       #f59e0b;
  --color-warning-soft:  #2b2010;
  --color-danger:        #f87171;
  --color-danger-soft:   #3a2326;

  --color-overlay: rgba(0, 0, 0, 0.6);
  /* 纸张相关变量（--paper-*）在暗色下保持不变：纸张始终白底墨字 */
}
```

---

## 4. 字体与排版

### 4.1 字体栈

```css
:root {
  /* 正文 / UI 字体（系统栈，含中文字体回退，零外部依赖） */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI",
               "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
               "Noto Sans CJK SC", "Helvetica Neue", Arial, sans-serif;

  /* 等宽字体（Markdown 源码、代码块、时间戳） */
  --font-mono: "SF Mono", "JetBrains Mono", "Fira Code", Consolas,
               "Liberation Mono", "Courier New", monospace;
}
```

### 4.2 字号层级

| 变量 | 字号 | 用途 |
| --- | --- | --- |
| `--fs-xs` | 12px | 辅助说明、时间戳、字符计数 |
| `--fs-sm` | 13px | 次级按钮、目录条目摘要、时间 |
| `--fs-base` | 14px | 正文、表单输入、目录条目标题 |
| `--fs-lg` | 16px | 模块标题、Tab 文字 |
| `--fs-xl` | 20px | 应用标题、编辑器标题 |
| `--fs-2xl` | 24px | 纸张预览 H1 |

```css
:root {
  --fs-xs:   12px;
  --fs-sm:   13px;
  --fs-base: 14px;
  --fs-lg:   16px;
  --fs-xl:   20px;
  --fs-2xl:  24px;
}
```

### 4.3 行高与间距

- **行高**：正文 `1.6`，标题 `1.3`，紧凑文字（时间戳/标签）`1.4`。
- **间距系统**：以 4px 为基准单位。

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;

  --radius-sm:  6px;
  --radius-md:  8px;
  --radius-lg:  12px;

  --line-base:  1.6;
  --line-title: 1.3;
}
```

### 4.4 排版约定

- 页面基准字号 `14px`，`body` 设置 `font-family: var(--font-sans); color: var(--color-text); background: var(--color-bg); line-height: var(--line-base);`。
- 标题用 `600` 字重，正文 `400`，强调文字 `500–600`；避免使用极细字重（小字号下中文字可读性差）。
- 纸张预览区使用 `--paper-ink` 固定墨色，正文 `16px` 级排版（近似 Word 正文观感）。

---

## 5. 通用组件

### 5.1 按钮

| 变体 | 场景 | 样式要点 |
| --- | --- | --- |
| 主按钮 | 保存、导出 Word、确认 | 品牌色底、白字，hover 加深，focus 焦点环 |
| 次级按钮 | 新建、取消、示例、清空、复制 | 白底 + 边框，hover 浅灰底 |
| 文本/幽灵按钮 | 轻量次级操作、图标按钮 | 无边框透明底，主色文字，hover 软底 |
| 危险按钮 | 删除（单条）、清空全部 | 危险色文字/边框，hover 危险软底 |

```css
.btn { /* 基础 */ display:inline-flex; align-items:center; gap:6px;
       padding:8px 16px; font-size:var(--fs-base); font-weight:500;
       border-radius:var(--radius-sm); border:1px solid transparent;
       cursor:pointer; transition:background .15s,color .15s,border-color .15s,transform .05s; }
.btn:active { transform: translateY(1px); }
.btn-primary { background:var(--color-primary); color:#fff; }
.btn-primary:hover { background:var(--color-primary-hover); }
.btn-secondary { background:var(--color-surface); color:var(--color-text);
                 border-color:var(--color-border); }
.btn-secondary:hover { background:var(--color-surface-alt); }
.btn-ghost { background:transparent; color:var(--color-primary); }
.btn-ghost:hover { background:var(--color-primary-soft); }
.btn-danger { background:var(--color-surface); color:var(--color-danger);
              border-color:var(--color-border); }
.btn-danger:hover { background:var(--color-danger-soft); }
.btn-sm { padding:5px 12px; font-size:var(--fs-sm); }
.btn-block { width:100%; justify-content:center; }
```

### 5.2 输入框 / 文本域

- 白底（暗色下深底）、`1px` 边框、`8px` 圆角、内边距 `8px 12px`。
- 聚焦态：边框变主色 + 主色焦点环（`box-shadow: 0 0 0 3px var(--color-primary-soft)`）。
- 占位文字用 `--color-text-muted`。

```css
.input, .textarea { width:100%; background:var(--color-surface);
  border:1px solid var(--color-border); border-radius:var(--radius-md);
  padding:8px 12px; font-size:var(--fs-base); color:var(--color-text);
  font-family:inherit; line-height:var(--line-base); }
.input:focus, .textarea:focus { outline:none; border-color:var(--color-primary);
  box-shadow:0 0 0 3px var(--color-primary-soft); }
```

### 5.3 Toast 轻提示

- 非模态，右下角（移动端顶部）出现，约 3 秒自动消失。
- 成功：`--color-success` 左边框/图标 + 白底；错误：`--color-danger`。
- 使用 `aria-live="polite"` 通知屏幕阅读器。

### 5.4 确认弹窗（Modal）

- 半透明遮罩 `--color-overlay`，居中卡片。
- 危险操作（删除单条/清空全部）标题用危险色强调；「清空全部」采用强确认（输入 `DELETE` 或勾选确认）。
- 弹窗出现时焦点移入，关闭后焦点还原，支持 `Esc` 关闭。

### 5.5 空状态

- 居中放置一个线性图标 + 一句主文案 + 一句引导文案 +（可选）一个主按钮。
- 示例（目录空状态）：「暂无笔记」/「点击上方“新建”创建第一条」。
- 编辑器侧的空状态：无选中笔记时显示「选择或新建一篇笔记」。

---

## 6. 两个模块的组件与交互细节

### 6.1 模块一：记事本（Notes）

**布局**：左右两栏。左侧「切换目录」侧边栏（笔记列表），右侧编辑器。桌面下侧边栏固定宽 `--sidebar-width: 260px`，编辑器自适应剩余宽度。

```
┌─────────────────────────────┬────────────────────────────────────┐
│ 切换目录            [＋ 新建] │ 编辑器工具栏               [保存]   │
├─────────────────────────────┼────────────────────────────────────┤
│ ┌─────────────────────────┐ │  标题（占位：无标题）               │
│ │ ● 会议纪要           ✕  │ │ ────────────────────────────────  │
│ │   2026-11-18 13:40      │ │                                    │
│ │ ○ 无标题             ✕  │ │  正文 textarea（自适应高度，可滚动）  │
│ │ ○ 周报草稿           ✕  │ │  ·                                 │
│ │ ○ …                    │ │  ·                                 │
│ │ （空状态时显示空提示）     │ │                                    │
│ ├─────────────────────────┤ ├────────────────────────────────────┤
│ │ [清空全部]（危险）        │ │  状态栏：已保存 · 时间 · N 字        │
│ └─────────────────────────┘ └────────────────────────────────────┘
```

**左侧「切换目录」侧边栏：**

| 组件 | 细节 |
| --- | --- |
| 头部 | 「切换目录」标题 + 右上「＋ 新建」次级按钮。 |
| 笔记条目 | 每条仅两行：标题（无标题则显示「无标题」muted 色，单行省略）+ 时间（约 11px 等宽淡色小字，位于标题下一行）；无正文摘要。点击条目切换到对应笔记并加载到编辑器。 |
| 紧凑间距 | 目录项缩小内边距（约 `6px 10px`），轻量列表项、无可见边框；hover 浅背景（`--color-surface-alt`）。 |
| 当前笔记高亮 | 选中条目用 `--color-primary-soft` 浅主色背景 + 左侧 3px 主色圆角色条标记（可选加粗标题），区别于未选中项；去厚重边框，仅轻量列表项。 |
| 单条删除 | ✕ 图标按钮默认隐藏，hover 到该目录项时才显示（`aria-label="删除"`）；点击弹出二次确认「确定删除这条笔记吗？」。 |
| 清空全部 | 侧边栏底部危险按钮，强确认（输入 `DELETE` 或勾选确认），清空后显示空状态。 |
| 空状态 | 无笔记时侧边栏显示空状态提示「暂无笔记」。 |

**右侧编辑器：**

| 组件 | 细节 |
| --- | --- |
| 工具栏 | 右对齐「保存」主按钮（左侧可放「☰ 目录」抽屉开关，仅移动端显示）。 |
| 标题输入 | 单行 `<input>`，字号 `--fs-xl`（20px）、字重 600，占位「无标题」，允许为空。 |
| 正文文本域 | `<textarea>`，占满剩余高度、可滚动，`font-size: var(--fs-base)`；下方可显示字符计数。 |
| 保存反馈 | 保存成功后 toast「已保存」，状态栏实时更新「已保存 · 时间 · N 字」；失败（容量满/过长）toast 错误提示。 |
| 新建确认 | 有未保存内容时切走/新建需弹确认「当前内容尚未保存，确定放弃吗？」（防误触）。 |
| 自动保存（可选） | 编辑暂停 3s 后自动保存草稿，状态栏显示「草稿已自动保存」。 |

> 交互语义：目录中「点击条目 = 切换并加载到编辑器」，保存更新当前笔记；新建产生新条目并成为当前笔记；删除/清空移除条目。目录即笔记总览，取代独立的「历史记录」页。

### 6.2 模块二：Markdown → Word 转换（Convert）

**布局**：桌面为左右两栏，**源码区与预览区同宽（约 A4 宽度 794px）**；顶部工具栏。窄屏上下堆叠。

```
┌────────────────────────────────────────────────────────────────┐
│ [工具栏] [示例] [清空] [预览] [复制]              [导出 Word（主按钮）]  │
├───────────────────────────────┬────────────────────────────────┤
│  Markdown 源码（textarea）      │  预览（灰底 + 居中白色 A4 纸张） │
│  等宽字体 · 可滚动 · 同宽 794px  │  ┌──────────────────────────┐ │
│                              │  │  白色纸张 · 96px 内边距      │ │
│                              │  │  正文内容（H1/列表/表格等）   │ │
│                              │  │                          │ │
│                              │  │  （细阴影 · min-height 1123px）│ │
│                              │  └──────────────────────────┘ │
├───────────────────────────────┴────────────────────────────────┤
│  文件名预览：文档_20261118_134038.doc（可选）                   │
└────────────────────────────────────────────────────────────────┘
```

| 组件 | 细节 |
| --- | --- |
| 源码编辑区 | 左侧 `<textarea>`，`--font-mono` 等宽字体，行高 `1.6`，占满高度可滚动，宽度与纸张同宽（`--paper-width: 794px`）。 |
| 预览区（纸张） | 右侧面板灰底（`--color-bg`/`--color-surface-alt`），居中一张白色 A4「纸张」：宽 `794px`、最小高 `1123px`、内边距 `96px`、白底 `--paper-bg`、墨色正文 `--paper-ink`、细阴影 `--paper-shadow`。纸张样式不随主题切换（始终白底墨字）。 |
| 纸张排版 | 标题、加粗、列表、表格、代码块、链接、图片样式完整呈现（与导出内容一致）。 |
| 工具栏 | 「示例」（加载示例 Markdown）、「清空」（清空输入+预览）、「预览」（手动触发渲染，若实时则预览随输入防抖更新）、「复制」（次级按钮，紧邻「预览」）、「导出 Word」（主按钮）。 |
| 复制 | 点击复制预览区渲染后的内容（富文本 + 纯文本，粘贴到 Word 保留标题/表格等格式，粘贴到记事本得纯文本）；预览为空时 toast「没有可复制的内容」。 |
| 导出反馈 | 点击导出后 toast「已开始下载」；失败（Blob 异常）toast 错误。文件名默认 `文档_YYYYMMDD_HHmmss.doc`。 |
| 预览模式 | 采用 `marked` 渲染 HTML 在线预览（不引入 `docx-preview`）。实时预览需防抖。 |

---

## 7. 响应式设计

### 7.1 断点

| 断点 | 范围 | 布局 |
| --- | --- | --- |
| 桌面 | `≥ 1024px` | 两 Tab 顶栏横排；记事本侧边栏 + 编辑器两栏；Markdown 源码 + 纸张预览两栏（各约 794px） |
| 平板 | `768px – 1023px` | 顶栏横排；Markdown 源码/纸张预览**上下堆叠**；记事本仍两栏（侧边栏可略窄） |
| 移动端 | `< 768px` | 记事本侧边栏**折叠为抽屉**（点击「☰ 目录」滑出）；Markdown 上下堆叠；所有模块单列 |

### 7.2 移动端要点

- **记事本目录抽屉**：`< 768px` 时侧边栏变为左侧抽屉（`position: fixed`，`translateX(-100%)` → 展开 `0`），配半透明遮罩；「☰ 目录」按钮常驻编辑器工具栏。
- 记事本/转换：取消卡片左右留白，占满宽度（`padding: 0 var(--space-4)`）。
- Markdown 模块：源码编辑区与纸张预览区**上下排布**（源码在上、预览在下）。
- Toast：移动端改为顶部居中，避免遮挡底部操作。
- 触摸目标：按钮/图标点击区域 `≥ 44px × 44px`。
- 顶栏：应用标题可省略副标题，Tab 两项保持短文字即可。

---

## 8. 无障碍与可用性

### 8.1 对比度（WCAG 2.1 AA）

- 正文文本对背景对比度 `≥ 4.5:1`；大字文本（≥ 18px 或 14px 加粗）`≥ 3:1`。
- 关键值已按此校准：亮色 `--color-text #1f2329` on `#ffffff` ≈ 13.5:1；`--color-primary #4a6cf7` on 白底作文字时 ≈ 4.6:1；`--color-text-muted #9aa1ab` 仅用于装饰/占位，不承载关键信息。
- 纸张预览固定 `--paper-ink #1f2329` on `--paper-bg #ffffff`，对比度 ≈ 13.5:1，暗色主题下同样达标。

### 8.2 焦点

- 所有可交互元素（按钮、输入、Tab、目录条目、删除图标）有可见焦点环（`outline` 或 `box-shadow`），不要移除默认焦点样式。
- 弹窗/抽屉打开后焦点移入首个可交互元素；关闭后焦点还原到触发按钮。

### 8.3 键盘操作

- Tab 顺序符合视觉顺序：顶栏 Tab → 目录条目 → 编辑器 → 弹窗。
- 快捷键（可选增强）：`Ctrl+S` 保存、`Ctrl+N` 新建（需拦截浏览器默认行为）；快捷键应有界面提示。
- 弹窗/抽屉支持 `Esc` 关闭；Tab 切换按钮可用方向键切换（`role="tablist"` / `role="tab"` + `aria-selected`）；目录条目可用方向键在列表内移动焦点。

### 8.4 语义与 ARIA

- 表单控件均含 `<label>` 或 `aria-label`。
- 两个模块 Tab 使用 `role="tablist"`/`role="tab"`/`aria-controls`/`aria-selected`。
- 目录列表使用 `role="listbox"`/`role="option"` 或 `nav` + 列表语义，选中项用 `aria-selected="true"`。
- 删除/新建等图标按钮提供 `aria-label` 文本。
- Toast 使用 `aria-live="polite"`；成功/错误态用 `role="status"` / `role="alert"`。

### 8.5 可用性细节

- 破坏性操作（删除单条、清空全部、放弃未保存）均有二次确认；「清空全部」为强确认。
- 关键操作（保存、切换、导出、删除）均有明确成功/失败反馈。
- 数据仅存本机：可在页脚或侧边栏底部加一句「数据仅保存在本机浏览器」提示。

---

## 9. 视觉稿说明

静态视觉稿见 `design/mockup.html`（纯 HTML+CSS，含少量 JS 仅用于 Tab 切换、亮暗主题与目录抽屉演示，无业务逻辑），演示两个模块的外观（记事本目录侧边栏 + 编辑器、Markdown A4 纸张预览）。其 CSS 变量与本文件第 3、4 节保持一致，开发可直接复用。

### 文件结构对照（供开发落地）

```
3b894b31/
├── index.html            ← 入口（由开发基于本设计与 mockup 实现）
├── assets/lib/marked.min.js
├── css/style.css         ← 全局样式（含本文 CSS 变量与响应式）
├── js/{app,storage,notes,converter,ui}.js
├── docs/{requirements.md, ui-design.md}
└── design/mockup.html    ← 本文对应视觉稿
```
