# markdown-weixin 现代化改造设计文档

日期：2026-05-05

## 背景

markdown-weixin 是一个将 Markdown 转换为微信公众号内容的在线工具。当前技术栈老化（Webpack 2、jQuery 3.1），存在代码质量问题和 UX 缺失。本次改造目标是"适度现代化"：升级构建工具、移除 jQuery、清理代码、增强 UX，同时保留 showdown + prettify 核心解析链路。

## Phase 1：构建迁移（Webpack 2 → Vite）

### 改动

- 删除 `webpack.config.js`
- 新增 `vite.config.js`（极简配置：root、publicDir、build.outDir、autoprefixer）
- `package.json` 替换依赖：移除 webpack/css-loader/style-loader/less-loader/url-loader/jsx-loader/copy-webpack-plugin，新增 vite/autoprefixer
- `index.html` 从 `src/` 移到项目根目录，`<script>` 改为 `<script type="module" src="/src/main.js">`
- 静态资源移到 `public/` 目录：`themes/`、`pageThemes/`、`demo.md`、`favicon.ico`
- `src/imgs/` 保留原位，通过 import 或 `new URL()` 引入
- LESS 文件无需改动，Vite 原生支持

### 新目录结构

```
├── index.html
├── public/
│   ├── themes/
│   ├── pageThemes/
│   ├── demo.md
│   └── favicon.ico
├── src/
│   ├── main.js
│   ├── style.less（合并后的主样式入口）
│   ├── css/
│   │   ├── custom-ui.less
│   │   ├── normalize.less
│   │   ├── layout.less（原 style.less）
│   │   ├── basic-ui.less
│   │   ├── highlight.min.less
│   │   ├── prettify.less
│   │   └── wechat-fix.less
│   ├── imgs/
│   ├── showdown.js
│   ├── clipboard.min.js
│   ├── google-code-prettify/
│   ├── showdown-plugins/
│   └── theme/
├── vite.config.js
└── package.json
```

### 验证

- `npm run dev` 启动 HMR 开发服务器
- `npm run build` 生成 `dist/` 产物
- 编辑器输入 Markdown → 右侧实时预览正常
- 主题切换正常
- 复制功能正常

## Phase 2：jQuery → 原生 JS

### 改动

| 文件 | jQuery API | 替代 |
|------|-----------|------|
| main.js | `$.ajax` | `fetch` |
| main.js | `$().val()` | `.value` |
| main.js | `$().html()` | `.innerHTML` |
| main.js | `$().on()` | `addEventListener` |
| main.js | `$().each()` | `for...of` / `forEach` |
| main.js | `$().addClass/removeClass` | `classList.add/remove` |
| main.js | `$().prop()` | 原生属性 |
| code-theme.js | `$.map` | `Array.map` |
| code-theme.js | `$().html()` | `.innerHTML` |
| page-theme.js | 同上 | 同上 |

### 删除

- `src/js/jquery-3.1.1.js`
- `package.json` 中的 `jsx-loader`

### 验证

- 所有 DOM 操作正常（输入、预览、主题切换、复制）
- 同步滚动正常
- 无 console 报错

## Phase 3：CSS 清理

### 改动

1. `prettify.less`：删除第 74-146 行（与第 1-73 行完全重复）
2. `custom-ui.less`：删除空的 `.super {}` 规则
3. `layout.less`（原 style.less）：移除手动浏览器前缀（`-moz-`、`-webkit-`、`-o-`、`-ms-`），交给 autoprefixer
4. `vite.config.js`：配置 autoprefixer 插件

### 保持不变

- `normalize.less`（CSS reset，无问题）
- `basic-ui.less`（基础内容样式，无问题）
- `highlight.min.less`（highlight.js 基础主题，无问题）
- `wechat-fix.less`（WeChat 兼容性修复，无问题）

## Phase 4：UX 功能增强

### 4a. localStorage 自动保存

- 输入 debounce 500ms 后存入 `localStorage.markdown-content`
- 主题选择存入 `localStorage.code-theme` / `localStorage.page-theme`
- 页面加载时优先恢复 localStorage，其次加载 demo.md
- 提供"清空"按钮重置到 demo.md

### 4b. Markdown 工具栏

在 textarea 上方添加工具栏：

```
[ B ] [ I ] [ H1 ] [ H2 ] [ H3 ] [ Code ] [ Link ] [ Image ] [ Quote ] [ List ] [ Clear ]
```

- 点击在光标位置插入 Markdown 语法
- 选中文本时包裹
- 深色背景，与编辑器风格统一
- 纯 CSS + JS，不引入额外库

### 4c. 字数统计

编辑器右下角显示：

```
字数：1,234  |  行数：56
```

在 `updateOutput` 中同步更新。

### 4d. 移动端适配

- 主题选择器从 `display:none` 改为底部抽屉或折叠菜单
- 工具栏在小屏可横向滚动

## Phase 5：零散修复

| 修复 | 文件 | 说明 |
|------|------|------|
| `rel="shoticon"` → `rel="shortcut icon"` | index.html | typo |
| 百度统计改为可配置或移除 | index.html | 隐私/灵活性 |
| showdown 插件内联样式移除 | showdown-prettify-for-wechat.js | 改用 CSS class 控制字体大小 |

## 实施顺序

Phase 1 → 2 → 3 → 4 → 5，每阶段独立可验证，不相互阻塞。
