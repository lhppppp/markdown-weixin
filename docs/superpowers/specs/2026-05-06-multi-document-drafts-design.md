# 多草稿抽屉 · 设计文档

**日期**：2026-05-06
**状态**：已定稿，待实现

## 问题

当前编辑器只支持单文档，正文写到 localStorage 的单个 key（`markdown-content`）。用户在写公众号文章时经常需要并行维护多个草稿（一篇正在写、一篇笔记、一篇备用），现在只能靠本地文件来回粘贴或者另开浏览器窗口，体验断裂。

## 目标

- 本地持久化多篇 markdown 草稿
- 能在它们之间快速切换
- 保持当前暖纸基调与单文档写作的专注感 —— 多文档能力是暗线，不打扰正在写作的人
- 不引入后端 / 账户 / 同步机制（YAGNI）

## 非目标（明确不做）

- 跨设备同步、账户登录
- 手动重命名标题（标题从正文 H1 提取）
- 导入 / 导出 .md 文件
- 快捷键（`Cmd+N` / `Cmd+P` 之类），之后再看
- 拖拽排序、固定置顶、按日期分组
- 多选删除、批量操作
- 搜索框（草稿数到 20+ 再考虑）
- 每篇草稿记录独立的光标 / 滚动位置

---

## 架构

单一数据源 `localStorage["markdown-docs"]`，单一真相，任何 UI 操作都先改它、再触发重渲染。

```
┌──────────────────────────────┐
│ markdown-docs (localStorage) │
│   version: 1                 │
│   currentId                  │
│   docs: [ {id, content,      │
│           createdAt,         │
│           updatedAt} ]       │
└──────────────┬───────────────┘
               │ 读 / 写
    ┌──────────┴──────────┐
    │                     │
┌───▼────┐        ┌───────▼───────┐
│ 抽屉 UI │        │ 编辑器 textarea│
│ 列表 + 新建│      │ 自动保存 (500ms)│
└────────┘        └───────────────┘
```

## 数据模型

```ts
type Doc = {
  id: string           // 'doc-' + Date.now() + '-' + 随机4位
  content: string      // markdown 正文
  createdAt: number    // 毫秒时间戳
  updatedAt: number
}

type Store = {
  version: 1           // 以后迁移用
  currentId: string    // 必存在于 docs[] 中
  docs: Doc[]          // 约定：按 updatedAt 降序，最近更新在前
}
```

**标题不持久化**，每次从 `content` 现算（见「标题提取规则」）。少一处状态，避免标题 ↔ 正文脱节。

## 旧数据迁移

首次加载时执行，一次性：

```
1. 读 localStorage["markdown-docs"] → 若存在，直接用
2. 否则读旧 key localStorage["markdown-content"]
   → 若存在且非空：
       创建 Store，把旧内容包为 docs[0]
       写入 markdown-docs
       删除 markdown-content
   → 否则（首次使用的新用户）：
       走原有的 loadDemo() 流程，然后把 demo 文本作为 docs[0]
```

迁移后旧 key 会被清掉，不会有遗留污染。

## 写入失败处理

localStorage 容量上限 ~5MB。当 `setItem` 抛 QuotaExceededError 时：

- 捕获异常，不让它 bubble 到 input 事件里阻塞输入
- snackbar 弹「保存失败，本地空间已满」（复用现有 snackbar，`::before` 改为 `⚠`）
- 不 retry、不自动清理。提示用户自己去删旧草稿

---

## 组件

### 1. 汉堡按钮（topheader 左侧，新增）

替换现在只在移动端显示的 `.mobile-menu-toggle`，桌面和移动统一用一个 `.drawer-toggle`。

```html
<button class="drawer-toggle" aria-label="打开草稿">
  <span></span><span></span><span></span>
</button>
```

- 桌面端 `38×38`，移动端 `32×32`（沿用 `.mobile-menu-toggle` 的位置 left:16, top:14）
- 三条线长度 16 / 12 / 18（中间最短，TOC 书目录感）
- 点击切 `.is-open` class → 三线变形为 `×`（三条线各自独立变形 + 旋转，不是简单中间消失两条交叉的套路）

### 2. 抽屉容器（新增）

```html
<aside class="docs-drawer" aria-hidden="true">
  <header class="drawer-header">
    <span class="drawer-label">DRAFTS</span>
    <span class="drawer-count">3</span>
  </header>
  <ul class="doc-list">
    <li><a class="doc-item is-active" data-id="...">...</a></li>
    ...
  </ul>
  <button class="drawer-new">
    <span class="new-sign">+</span>
    <span class="new-label">新 建 草 稿</span>
  </button>
</aside>
```

- `width: 280px`，`position: fixed; top: 68px; left: 0; bottom: 0`
- 装订侧阴影：`linear-gradient(90deg, rgba(242,237,227,0.55), transparent 40%)` 叠在 `@bg-paper` 上
- `border-right: 1px solid @line`，开启时再加 `box-shadow: 6px 0 40px -18px rgba(44,42,39,0.22)`
- `transform: translateX(-100%)` 默认，`.is-open` 时 `translateX(0)`，过渡 `360ms cubic-bezier(0.2, 0.7, 0.2, 1)`
- 打开时 `aria-hidden="false"`

### 3. 列表项（新增）

每项：

```html
<a class="doc-item [is-active]" data-id="...">
  <span class="doc-bookmark" aria-hidden></span>
  <span class="doc-mark">§</span>
  <h3 class="doc-title">微信图文排版实录</h3>
  <p class="doc-meta">今日 14:22 · 1,240 字</p>
  <button class="doc-delete" aria-label="删除这篇">✕</button>
</a>
```

- `padding: 14px 28px 14px 36px`
- 下分隔：`box-shadow: inset 0 -1px 0 @line-soft`（hairline 单线）
- 标题：Source Serif 4 · 14.5px · `@fg-mute`（活动时 `@fg-ink` + `font-weight: 500`）
- 元信息：JetBrains Mono · 10.5px · `@fg-whisper`（活动时 `@fg-mute`）· `tabular-nums`
- hover：背景 `rgba(232, 226, 213, 0.35)`，标题 `translateX(2px)`，右端 `.doc-delete` 从 `opacity:0 → 1` + 从右滑入
- 活动态书签：左侧 `3px` 宽 `@accent` 垂直条，从顶到底，顶部 clip 出 `4px` 尖尾；入场 `scaleY(0.2 → 1)` 300ms
- 活动态 `.doc-mark`：`§` 字符，Fraunces 13px，`@accent`，绝对定位 left:20 top:15（呼应 topheader 的 `.brand-mark`）

### 4. 新建按钮（底部 sticky，新增）

```html
<button class="drawer-new">...</button>
```

- `position: sticky; bottom: 16px`（在 `.docs-drawer` 的 flex 底部）
- `border: 1px dashed @line`（手写边注感）
- hover 时 `border-style` 保持虚线但 `border-color: @accent-soft`，`.new-label` 变 `@accent`，`transform: translateY(-1px)`
- `+` 用 Fraunces `@accent`；文字 Fraunces italic `@fg-mute`，`letter-spacing: 0.8px`

### 5. 移动端遮罩（新增）

```html
<div class="drawer-backdrop" aria-hidden="true"></div>
```

仅 `<768px` 显示；`rgba(44, 42, 39, 0.42)` + `backdrop-filter: blur(2px)`；点击关闭抽屉。

### 6. 工具栏 ✕ 语义变更（改动现有元素）

`index.html` 中 `<button data-action="clear">` 的 `aria-label` 从「清空内容」改为「删除当前草稿」；`main.js` 的 `clear` 分支改为调用 `deleteCurrentDoc()`。

---

## 交互

### 自动保存
现有 500ms debounce 不变。保存时：
```
currentDoc.content = input.value
currentDoc.updatedAt = Date.now()
// 把 currentDoc 从 docs[] 中移到开头，保持 updatedAt 降序的约定
persist(store)
```
列表渲染直接按 `docs[]` 的顺序输出，不再单独排序。

### 标题提取（每次 `updateOutput` 顺带调用）
```
1. 正文匹配 /^#\s+(.+?)\s*$/m 的第一个 → 用它
2. 没 H1 → 取第一行非空文本前 20 字
3. 全空 → 「未命名」
```

### 时间格式化
```
今日  → "今日 HH:mm"
昨日  → "昨天 HH:mm"
今年内 → "MM-DD"
更早  → "YYYY-MM-DD"
```
`今日 / 昨天` 判定基于本地时区的日期。

### 切换草稿
```
保存当前 → currentId = 目标 id
       → input.value = 目标 content
       → 光标回到开头 input.setSelectionRange(0, 0)
       → 关抽屉
       → updateOutput() 刷新预览和字数
```
不保留每篇的滚动 / 光标位置（YAGNI）。

### 新建草稿
```
保存当前 → 创建空 doc 添加到 docs 顶部 → currentId = 新 id
       → input.value = "" → input.focus()
       → 抽屉保持打开（用户可能想对比）或关闭？
       → 决策：关闭，让用户进入写作状态
       → updateOutput()
```

### 删除草稿（工具栏 ✕ 或列表项悬浮 ✕）
```
confirm("删除《xxx》？此操作不可撤销。") → 用户取消就 return
从 docs 数组移除 → 若被删的是当前：
  切到被删项的上一篇（若被删是第一篇，切到下一篇）
  若 docs 已空 → 自动新建一篇空白草稿并切过去
持久化 → 重新渲染列表 → 若在抽屉里删的，抽屉保持开
```

### 打开 / 关闭抽屉
汉堡按钮点击 toggle `.is-open` class 在 `<aside>` 和 `<button>` 上；移动端同步 toggle 遮罩的 `.is-visible`。

---

## 动效编排

抽屉打开的 400ms：

| 时间 | 动作 |
|---|---|
| 0ms | 汉堡三线变 × (300ms) |
| 0ms | 抽屉 translateX (360ms @ease) |
| 120ms | 顶部 DRAFTS 标签 rise (350ms) |
| 160ms + 45ms·i | 列表项依次 stagger rise，前 8 项 |
| 340ms | 活动书签 scaleY (300ms) |

复用现有 `@keyframes rise`，不新定义。

---

## 文件改动清单

| 文件 | 性质 | 说明 |
|---|---|---|
| `index.html` | 改 | 新增 `<aside class="docs-drawer">` + `<div class="drawer-backdrop">` + 用新的 `.drawer-toggle` 结构替换 `.mobile-menu-toggle` |
| `src/main.js` | 改 | 新增 store 模块（或内联于本文件顶部）：load/persist/migrate；改写 `loadSavedContent` → `loadActiveDoc`；改 `autoSave` 写入当前 doc；改 clear 按钮回调为 deleteCurrentDoc；新增 `renderDocList` + bindDrawer 事件 |
| `src/css/layout.less` | 改 | 新增 `.docs-drawer` / `.doc-item` / `.drawer-new` / `.drawer-toggle` / `.drawer-backdrop` 段；微调 `.mobile-menu-toggle` → 合并到 `.drawer-toggle` |

不新增文件（保持项目轻量）。如果 `main.js` 里的 store 逻辑膨胀超过 120 行，再拆 `src/js/doc-store.js`。

---

## 测试策略

手动路径（每次改动都要跑一遍）：

1. **首次访问旧数据**：手动在控制台设置 `localStorage.setItem('markdown-content', '# 旧数据\n...')`，刷新，确认老内容作为 docs[0] 出现，旧 key 被清掉
2. **首次访问新用户**：清空 localStorage，刷新，确认 demo.md 加载为 docs[0]
3. **新建 → 切换 → 切回**：确认内容互不污染
4. **删除中间一篇**：确认当前项保持不变
5. **删除当前项**：确认切到相邻草稿
6. **删除最后一篇**：确认自动新建空白草稿
7. **移动端（<768px）**：抽屉全屏、遮罩点击关闭、工具栏横向滚动不被抽屉打扰
8. **撤销链**：在草稿里改内容 → Cmd+Z 能撤回（验证不被新增代码破坏）
9. **自动保存**：改内容 → 等 1 秒 → 刷新 → 内容还在
10. **容量满**：在控制台塞一堆大字符串直到写入失败，确认 snackbar 正确提示、输入不卡

现有页面不写自动化测试框架；加测试时先补基建再说。

---

## 风险 / 未决

- **localStorage 被浏览器清理**：无缓解，只能靠用户知晓这是本地工具。未来如果要保障数据，走 OPFS 或 IndexedDB（但那是另一个设计）。
- **标题撞车**：两篇都叫「未命名」的时候，用户靠时间戳区分。可接受。
- **H1 提取的性能**：每次 input 都跑一次正则，对 10 万字以内无感；更大再说。
