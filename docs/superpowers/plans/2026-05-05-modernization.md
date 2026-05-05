# markdown-weixin Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize markdown-weixin from Webpack 2 + jQuery to Vite + vanilla JS, clean up CSS, and add UX features (auto-save, toolbar, word count).

**Architecture:** Replace Webpack 2 with Vite for dev/build. Remove jQuery dependency (~267KB), replacing all DOM operations with native browser APIs. Keep showdown + google-code-prettify as the Markdown/syntax engine. Add localStorage auto-save, a Markdown toolbar, and word count display.

**Tech Stack:** Vite, vanilla JS (ES modules), LESS, showdown.js, google-code-prettify, clipboard.js

---

## Phase 1: Build Migration (Webpack 2 → Vite)

### Task 1.1: Create public directory and move static assets

**Files:**
- Create: `public/themes/` (directory)
- Create: `public/pageThemes/` (directory)
- Move: `src/css/themes/*.css` → `public/themes/`
- Move: `src/css/pageThemes/*.css` → `public/pageThemes/`
- Move: `src/demo.md` → `public/demo.md`
- Move: `src/favicon.ico` → `public/favicon.ico`

- [ ] **Step 1: Create public directory structure**

```bash
cd /Users/ouno1054/prj/md-wechat/markdown-weixin
mkdir -p public/themes public/pageThemes
```

- [ ] **Step 2: Move theme CSS files to public/**

```bash
cp src/css/themes/*.css public/themes/
cp src/css/pageThemes/*.css public/pageThemes/
cp src/demo.md public/
cp src/favicon.ico public/
```

- [ ] **Step 3: Verify files copied correctly**

```bash
ls public/themes/ | wc -l    # Should show 32 files (31 themes + claude.css)
ls public/pageThemes/ | wc -l  # Should show 6 files
ls public/demo.md public/favicon.ico
```

- [ ] **Step 4: Commit**

```bash
git add public/
git commit -m "chore: create public/ directory with static assets for Vite migration"
```

---

### Task 1.2: Move index.html to root and convert to ES module entry

**Files:**
- Move: `src/index.html` → `index.html` (project root)
- Modify: `index.html` (change script tag to ES module)

- [ ] **Step 1: Copy index.html to root**

```bash
cp src/index.html index.html
```

- [ ] **Step 2: Update script tag in index.html**

Replace the `<script>` tag that loads the bundled JS with an ES module entry. The current line is:

```html
<script src="./js/index.js?v=1.2.1"></script>
```

Replace with:

```html
<script type="module" src="/src/main.js"></script>
```

Note: Vite dev server serves from project root, so `/src/main.js` is correct. The `main.js` file will be created in Task 1.4.

- [ ] **Step 3: Fix the favicon typo**

In `index.html` line 5, change:

```html
<link rel="shoticon" href="./favicon.ico" type="image/x-icon">
```

to:

```html
<link rel="shortcut icon" href="/favicon.ico" type="image/x-icon">
```

- [ ] **Step 4: Remove baidu analytics script**

Remove lines 16-22 (the `_hmt` baidu analytics block). If analytics are needed later, they can be added back via a Vite plugin or env config.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "chore: move index.html to root for Vite, fix favicon typo, remove baidu analytics"
```

---

### Task 1.3: Create vite.config.js and update package.json

**Files:**
- Create: `vite.config.js`
- Modify: `package.json`

- [ ] **Step 1: Create vite.config.js**

```js
import { defineConfig } from 'vite'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  publicDir: 'public',
  build: {
    outDir: 'dist'
  },
  css: {
    postcss: {
      plugins: [autoprefixer()]
    }
  }
})
```

- [ ] **Step 2: Update package.json**

Replace the entire `package.json` with:

```json
{
  "name": "markdown-weixin",
  "version": "2.0.0",
  "description": "An online markdown converter specially for Wechat Public formatting.",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/cnych/markdown-weixin.git"
  },
  "keywords": ["wechat", "markdown", "format"],
  "author": "阳明<icnych@gmail.com>",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/cnych/markdown-weixin/issues"
  },
  "homepage": "https://github.com/cnych/markdown-weixin",
  "devDependencies": {
    "autoprefixer": "^10.4.0",
    "less": "^4.0.0",
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 3: Install new dependencies**

```bash
cd /Users/ouno1054/prj/md-wechat/markdown-weixin
rm -rf node_modules package-lock.json
npm install
```

- [ ] **Step 4: Commit**

```bash
git add vite.config.js package.json package-lock.json
git commit -m "chore: replace Webpack 2 with Vite, update dependencies"
```

---

### Task 1.4: Create src/main.js (ES module entry point)

**Files:**
- Create: `src/main.js`

- [ ] **Step 1: Create src/main.js**

This is the ES module entry point that replaces the CommonJS `src/js/index.js`. It imports the same modules but uses ES module syntax. We keep jQuery for now (will be removed in Phase 2).

```js
import './css/index.less'

import './js/showdown-plugins/showdown-prettify-for-wechat.js'
import './js/showdown-plugins/showdown-github-task-list.js'
import './js/showdown-plugins/showdown-footnote.js'

import './js/google-code-prettify/run_prettify.js'

import CodeTheme from './js/theme/code-theme.js'
import PageTheme from './js/theme/page-theme.js'

var $ = require('./js/jquery-3.1.1.js')
var showdown = require('./js/showdown.js')
var Clipboard = require('./js/clipboard.min.js')

var kv = location.href.split('?')[1]
kv = (kv && kv.split('&')) || []
var params = {}
$.each(kv, function (index, item) {
  var m = (item || '').split('=')
  if (m && m[0] && m[1]) {
    params[m[0]] = m[1]
  }
})

var converter = new showdown.Converter({
  extensions: ['prettify', 'tasklist', 'footnote'],
  tables: true
})

function showSnackbar() {
  var $snackbar = $('#snackbar')
  $snackbar.addClass('show')
  setTimeout(() => {
    $snackbar.removeClass('show')
  }, 3000)
}

var OnlineMarkdown = {
  currentState: 'edit',
  init: function () {
    var self = this
    self
      .load()
      .then(function () {
        self.start()
      })
      .fail(function () {
        self.start()
      })
  },
  start: function () {
    this.bindEvt()
    this.updateOutput()
    new CodeTheme()
    new PageTheme()
  },
  load: function () {
    return $.ajax({
      type: 'GET',
      url: params.path || './demo.md',
      dateType: 'text',
      data: {
        _t: new Date() * 1
      },
      timeout: 2000
    }).then(function (data) {
      $('#input').val(data)
    })
  },
  bindEvt: function () {
    $('#input').on('input keydown paste', this.updateOutput)

    var clipboard = new Clipboard('.copy-button')
    clipboard.on('success', function () {
      showSnackbar()
    })
    clipboard.on('error', function (e) {
      console.log(e)
    })

    var hasInputScroll = false
    var hasOutputScroll = false
    $('#input').on('scroll', (event) => {
      if (hasInputScroll) {
        hasInputScroll = false
      } else {
        var $output = $('#outputCtt')
        var outputScrollHeight =
          (event.currentTarget.scrollTop / event.currentTarget.scrollHeight) *
          $output.prop('scrollHeight')
        hasOutputScroll = true
        $output.scrollTop(outputScrollHeight)
      }
    })
    $('#outputCtt').on('scroll', (event) => {
      if (hasOutputScroll) {
        hasOutputScroll = false
      } else {
        var $input = $('#input')
        var inputScrollHeight =
          (event.currentTarget.scrollTop / event.currentTarget.scrollHeight) *
          $input.prop('scrollHeight')
        hasInputScroll = true
        $input.scrollTop(inputScrollHeight)
      }
    })
  },

  updateOutput: function () {
    var val = converter.makeHtml($('#input').val())
    $('#output .wrapper').html(val)
    PR.prettyPrint()
    $('#outputCtt li').each(function () {
      var content = $(this).html()
      if (content.indexOf('<p>') === 0) {
        content = content.substr(3, content.length - 7)
      }
      $(this).html('<span><span>' + content + '</span></span>')
    })
  }
}

OnlineMarkdown.init()
```

Note: This still uses jQuery via `require()`. This is intentional — we need the build to work first, then we remove jQuery in Phase 2.

- [ ] **Step 2: Verify dev server starts**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser. Verify:
- Page loads with the two-panel layout
- Markdown editor is on the left
- Preview renders on the right
- Theme dropdowns populate
- Code highlighting works
- Copy button works

Press Ctrl+C to stop the dev server.

- [ ] **Step 3: Verify build works**

```bash
npm run build
ls dist/
```

Verify `dist/` contains `index.html`, `js/`, `themes/`, `pageThemes/`, `demo.md`, `favicon.ico`.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "chore: add ES module entry point for Vite"
```

---

### Task 1.5: Remove old Webpack artifacts

**Files:**
- Delete: `webpack.config.js`
- Delete: `src/js/index.js` (replaced by `src/main.js`)

- [ ] **Step 1: Remove old files**

```bash
rm webpack.config.js src/js/index.js
```

- [ ] **Step 2: Remove old dist/ and rebuild**

```bash
rm -rf dist
npm run build
```

- [ ] **Step 3: Verify build output**

```bash
ls dist/index.html dist/themes/claude.css dist/pageThemes/claude.css dist/demo.md
```

All files should exist.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Webpack config and old entry point"
```

---

## Phase 2: jQuery → Vanilla JS

### Task 2.1: Rewrite code-theme.js without jQuery

**Files:**
- Modify: `src/js/theme/code-theme.js`

- [ ] **Step 1: Replace code-theme.js content**

```js
var themes = [
  'atelier-cave-dark',
  'atelier-cave-light',
  'atelier-dune-dark',
  'atelier-dune-light',
  'atelier-estuary-dark',
  'atelier-estuary-light',
  'atelier-forest-dark',
  'atelier-forest-light',
  'atelier-heath-dark',
  'atelier-heath-light',
  'atelier-lakeside-dark',
  'atelier-lakeside-light',
  'atelier-plateau-dark',
  'atelier-plateau-light',
  'atelier-savanna-dark',
  'atelier-savanna-light',
  'atelier-seaside-dark',
  'atelier-seaside-light',
  'atelier-sulphurpool-dark',
  'atelier-sulphurpool-light',
  'claude',
  'github',
  'hemisu-dark',
  'hemisu-light',
  'tomorrow-night-blue',
  'tomorrow-night-bright',
  'tomorrow-night-eighties',
  'tomorrow-night',
  'tomorrow',
  'tranquil-heart',
  'vibrant-ink'
]

var currentTheme = localStorage.getItem('code-theme') || 'claude'

function initCodeTheme() {
  var select = document.querySelector('.code-theme')
  if (!select) return

  select.innerHTML = themes
    .map(function (item) {
      var selected = currentTheme === item ? ' selected' : ''
      return '<option value="' + item + '"' + selected + '>' + item + '</option>'
    })
    .join('')

  select.addEventListener('change', function () {
    var val = select.value
    document.getElementById('codeThemeId').href = './themes/' + val + '.css'
    localStorage.setItem('code-theme', val)
  })

  // Trigger initial change
  select.dispatchEvent(new Event('change'))
}

export default initCodeTheme
```

- [ ] **Step 2: Commit**

```bash
git add src/js/theme/code-theme.js
git commit -m "refactor: rewrite code-theme.js with vanilla JS, add localStorage persistence"
```

---

### Task 2.2: Rewrite page-theme.js without jQuery

**Files:**
- Modify: `src/js/theme/page-theme.js`

- [ ] **Step 1: Replace page-theme.js content**

```js
var themes = [
  { theme: 'claude', text: 'Claude 风格' },
  { theme: 'default-screen', text: '适合代码' },
  { theme: 'narrow-screen', text: '窄屏模式' },
  { theme: 'wide-screen', text: '宽屏模式' }
]

var currentTheme = localStorage.getItem('page-theme') || 'claude'

function initPageTheme() {
  var select = document.querySelector('.page-theme')
  if (!select) return

  select.innerHTML = themes
    .map(function (item) {
      var selected = currentTheme === item.theme ? ' selected' : ''
      return (
        '<option value="' +
        item.theme +
        '"' +
        selected +
        '>' +
        item.text +
        '</option>'
      )
    })
    .join('')

  select.addEventListener('change', function () {
    var val = select.value
    document.getElementById('pageThemeId').href = './pageThemes/' + val + '.css'
    localStorage.setItem('page-theme', val)
  })

  // Trigger initial change
  select.dispatchEvent(new Event('change'))
}

export default initPageTheme
```

- [ ] **Step 2: Commit**

```bash
git add src/js/theme/page-theme.js
git commit -m "refactor: rewrite page-theme.js with vanilla JS, add localStorage persistence"
```

---

### Task 2.3: Rewrite main.js without jQuery

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Replace src/main.js with vanilla JS version**

```js
import './css/index.less'

import './js/showdown-plugins/showdown-prettify-for-wechat.js'
import './js/showdown-plugins/showdown-github-task-list.js'
import './js/showdown-plugins/showdown-footnote.js'

import './js/google-code-prettify/run_prettify.js'

import initCodeTheme from './js/theme/code-theme.js'
import initPageTheme from './js/theme/page-theme.js'

var showdown = require('./js/showdown.js')
var Clipboard = require('./js/clipboard.min.js')

var params = {}
var searchParams = new URLSearchParams(window.location.search)
searchParams.forEach(function (value, key) {
  params[key] = value
})

var converter = new showdown.Converter({
  extensions: ['prettify', 'tasklist', 'footnote'],
  tables: true
})

function showSnackbar() {
  var snackbar = document.getElementById('snackbar')
  snackbar.classList.add('show')
  setTimeout(function () {
    snackbar.classList.remove('show')
  }, 3000)
}

function updateOutput() {
  var input = document.getElementById('input')
  var outputWrapper = document.querySelector('#output .wrapper')
  var val = converter.makeHtml(input.value)
  outputWrapper.innerHTML = val
  PR.prettyPrint()

  var items = document.querySelectorAll('#outputCtt li')
  for (var i = 0; i < items.length; i++) {
    var content = items[i].innerHTML
    if (content.indexOf('<p>') === 0) {
      content = content.substr(3, content.length - 7)
    }
    items[i].innerHTML = '<span><span>' + content + '</span></span>'
  }
}

function loadDemo() {
  var demoPath = params.path || './demo.md'
  return fetch(demoPath + '?_t=' + Date.now())
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load ' + demoPath)
      return res.text()
    })
    .then(function (text) {
      document.getElementById('input').value = text
    })
}

function bindEvents() {
  var input = document.getElementById('input')

  input.addEventListener('input', updateOutput)
  input.addEventListener('keydown', updateOutput)
  input.addEventListener('paste', updateOutput)

  var clipboard = new Clipboard('.copy-button')
  clipboard.on('success', function () {
    showSnackbar()
  })
  clipboard.on('error', function (e) {
    console.log(e)
  })

  // Sync scroll
  var hasInputScroll = false
  var hasOutputScroll = false

  input.addEventListener('scroll', function () {
    if (hasInputScroll) {
      hasInputScroll = false
    } else {
      var outputCtt = document.getElementById('outputCtt')
      var ratio = input.scrollTop / input.scrollHeight
      hasOutputScroll = true
      outputCtt.scrollTop = ratio * outputCtt.scrollHeight
    }
  })

  document.getElementById('outputCtt').addEventListener('scroll', function () {
    var outputCtt = this
    if (hasOutputScroll) {
      hasOutputScroll = false
    } else {
      var ratio = outputCtt.scrollTop / outputCtt.scrollHeight
      hasInputScroll = true
      input.scrollTop = ratio * input.scrollHeight
    }
  })
}

// Init
loadDemo()
  .catch(function () {
    // If demo.md fails to load, continue anyway
  })
  .finally(function () {
    bindEvents()
    updateOutput()
    initCodeTheme()
    initPageTheme()
  })
```

- [ ] **Step 2: Verify in dev server**

```bash
npm run dev
```

Open `http://localhost:5173`. Verify:
- Page loads, demo.md appears in editor
- Typing updates preview in real-time
- Theme dropdowns work (both code and page themes)
- Copy button works with snackbar notification
- Sync scroll works between editor and preview
- No console errors

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "refactor: rewrite main.js with vanilla JS, remove jQuery dependency"
```

---

### Task 2.4: Remove jQuery and old dependencies

**Files:**
- Delete: `src/js/jquery-3.1.1.js`

- [ ] **Step 1: Remove jQuery file**

```bash
rm src/js/jquery-3.1.1.js
```

- [ ] **Step 2: Verify no remaining jQuery references**

```bash
grep -r "jquery\|require.*jquery\|\$(" src/ --include="*.js" | grep -v node_modules
```

Should return no results (except possibly in showdown.js internals which don't use jQuery).

- [ ] **Step 3: Verify dev server still works**

```bash
npm run dev
```

Check all functionality in browser.

- [ ] **Step 4: Build and verify**

```bash
npm run build
ls -la dist/js/index-*.js  # Should exist, much smaller without jQuery
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove jQuery dependency (~267KB)"
```

---

## Phase 3: CSS Cleanup

### Task 3.1: Remove duplicate CSS in prettify.less

**Files:**
- Modify: `src/css/prettify.less`

- [ ] **Step 1: Remove duplicate lines**

In `src/css/prettify.less`, lines 74-146 are an exact duplicate of lines 1-73. Delete lines 74-146. Also delete lines 147-158 which duplicate lines 148-159 (the `pre.prettyprint` rules are also duplicated).

The file should end after the `li.L1, li.L3, li.L5, li.L7, li.L9` rule block (currently around line 222). Keep lines 1-73 and lines 148-223 (the unique rules after the duplicates).

Actually, let me be precise. The file structure is:
- Lines 1-73: `@media screen` and `@media print` rules (first copy)
- Lines 74-146: EXACT DUPLICATE of lines 1-73
- Lines 148-158: `pre.prettyprint` rules (first copy)
- Lines 154-158: EXACT DUPLICATE of lines 148-152
- Lines 160-223: `pre.prettyprint.linenums`, `ol.linenums`, `.code-in-text`, `li.L*` rules

Remove lines 74-158 (the duplicates). Keep lines 1-73 and 160-223.

- [ ] **Step 2: Verify LESS compiles**

```bash
npm run build
```

No CSS errors expected.

- [ ] **Step 3: Commit**

```bash
git add src/css/prettify.less
git commit -m "fix: remove duplicate CSS blocks in prettify.less"
```

---

### Task 3.2: Clean up custom-ui.less

**Files:**
- Modify: `src/css/custom-ui.less`

- [ ] **Step 1: Remove empty .super rule**

In `src/css/custom-ui.less`, lines 54-56 contain:

```less
.super {

}
```

Delete these 3 lines.

- [ ] **Step 2: Commit**

```bash
git add src/css/custom-ui.less
git commit -m "fix: remove empty .super {} rule from custom-ui.less"
```

---

### Task 3.3: Remove vendor prefixes from style.less

**Files:**
- Modify: `src/css/style.less`

- [ ] **Step 1: Clean up vendor prefixes in .topheader**

In `src/css/style.less`, the `.topheader` block (lines 55-70) has manual vendor prefixes for `linear-gradient`. Replace with just the standard property:

Replace lines 61-68:

```less
  background: #499bea;
  background: -moz-linear-gradient(left,#e5e5be 0,#003973 100%);
  background: -webkit-gradient(linear,left,right,color-sleft(0%,#e5e5be),color-sleft(100%,#003973));
  background: -webkit-linear-gradient(left,#e5e5be 0,#003973 100%);
  background: -o-linear-gradient(left,#e5e5be 0,#003973 100%);
  background: -ms-linear-gradient(left,#e5e5be 0,#003973 100%);
  background: linear-gradient(to left,#e5e5be 0,#003973 100%);
  filter: progid:DXImageTransform.Microsoft.gradient(startColorstr= '#e5e5be', endColorstr='#003973', GradientType=1);
```

With:

```less
  background: #499bea;
  background: linear-gradient(to left, #e5e5be 0, #003973 100%);
```

Autoprefixer will add the vendor prefixes automatically during build.

- [ ] **Step 2: Commit**

```bash
git add src/css/style.less
git commit -m "chore: remove manual vendor prefixes from style.less, rely on autoprefixer"
```

---

### Task 3.4: Rename style.less to layout.less

**Files:**
- Rename: `src/css/style.less` → `src/css/layout.less`
- Modify: `src/css/index.less`

- [ ] **Step 1: Rename the file**

```bash
mv src/css/style.less src/css/layout.less
```

- [ ] **Step 2: Update import in index.less**

In `src/css/index.less`, change:

```less
@import "./style.less";
```

to:

```less
@import "./layout.less";
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: rename style.less to layout.less for clarity"
```

---

## Phase 4: UX Enhancements

### Task 4.1: Add localStorage auto-save for editor content

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add auto-save logic to main.js**

Add these functions after the `showSnackbar` function in `src/main.js`:

```js
var STORAGE_KEY = 'markdown-content'
var saveTimer = null

function autoSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(function () {
    var input = document.getElementById('input')
    localStorage.setItem(STORAGE_KEY, input.value)
  }, 500)
}

function loadSavedContent() {
  var saved = localStorage.getItem(STORAGE_KEY)
  if (saved !== null) {
    document.getElementById('input').value = saved
    return true
  }
  return false
}
```

- [ ] **Step 2: Wire auto-save into event binding**

In the `bindEvents` function, add `autoSave` to the input listeners:

```js
  input.addEventListener('input', function() {
    updateOutput()
    autoSave()
  })
  input.addEventListener('keydown', updateOutput)
  input.addEventListener('paste', function() {
    updateOutput()
    autoSave()
  })
```

- [ ] **Step 3: Update init to check localStorage first**

Replace the init block at the bottom of `main.js`:

```js
// Init
if (loadSavedContent()) {
  bindEvents()
  updateOutput()
  initCodeTheme()
  initPageTheme()
} else {
  loadDemo()
    .catch(function () {})
    .finally(function () {
      bindEvents()
      updateOutput()
      initCodeTheme()
      initPageTheme()
    })
}
```

- [ ] **Step 4: Verify**

```bash
npm run dev
```

- Type some text in the editor
- Refresh the page
- The typed text should persist (not replaced by demo.md)
- Clear localStorage manually in devtools, refresh → demo.md loads

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat: add localStorage auto-save for editor content"
```

---

### Task 4.2: Add Markdown toolbar to index.html

**Files:**
- Modify: `index.html`
- Modify: `src/css/layout.less`
- Modify: `src/main.js`

- [ ] **Step 1: Add toolbar HTML to index.html**

Replace:

```html
<textarea id="input" spellcheck="false"></textarea>
```

With:

```html
<div class="editor-toolbar">
  <button data-action="bold" title="加粗 (Ctrl+B)"><b>B</b></button>
  <button data-action="italic" title="斜体 (Ctrl+I)"><i>I</i></button>
  <span class="toolbar-divider"></span>
  <button data-action="h1" title="一级标题">H1</button>
  <button data-action="h2" title="二级标题">H2</button>
  <button data-action="h3" title="三级标题">H3</button>
  <span class="toolbar-divider"></span>
  <button data-action="code" title="行内代码">&lt;/&gt;</button>
  <button data-action="codeblock" title="代码块">{ }</button>
  <button data-action="link" title="链接">Link</button>
  <button data-action="image" title="图片">Img</button>
  <span class="toolbar-divider"></span>
  <button data-action="quote" title="引用">"</button>
  <button data-action="ul" title="无序列表">UL</button>
  <button data-action="ol" title="有序列表">OL</button>
  <span class="toolbar-divider"></span>
  <button data-action="clear" title="清空内容" class="toolbar-clear">Clear</button>
</div>
<textarea id="input" spellcheck="false"></textarea>
```

- [ ] **Step 2: Add toolbar styles to layout.less**

Add at the end of `src/css/layout.less`:

```less
// ======== Editor Toolbar ========
.editor-toolbar {
  position: absolute;
  top: 64px;
  left: 0;
  width: 50%;
  height: 36px;
  background: #2a2a2a;
  display: flex;
  align-items: center;
  padding: 0 8px;
  z-index: 3;
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;

  button {
    background: none;
    border: 1px solid #555;
    color: #ccc;
    padding: 4px 10px;
    margin: 0 2px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    font-family: inherit;
    line-height: 1;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: #555;
      color: #fff;
    }
  }

  .toolbar-divider {
    width: 1px;
    height: 20px;
    background: #555;
    margin: 0 6px;
  }

  .toolbar-clear {
    margin-left: auto;
    border-color: #844;
    color: #e88;

    &:hover {
      background: #844;
      color: #fff;
    }
  }
}
```

- [ ] **Step 3: Update textarea and #input positioning**

In `src/css/layout.less`, update the `#input` rule to account for the toolbar height:

Change:

```less
#input {
  width: 50%;
  position: absolute;
  top: 64px;
  left: 0px;
}
```

To:

```less
#input {
  width: 50%;
  position: absolute;
  top: 100px; // 64px header + 36px toolbar
  left: 0px;
}
```

Also update the `textarea` rule's `top` from `64px` to `100px`.

- [ ] **Step 4: Add toolbar JS logic to main.js**

Add this function after the `loadSavedContent` function:

```js
var TOOLBAR_ACTIONS = {
  bold: { before: '**', after: '**', placeholder: '加粗文本' },
  italic: { before: '*', after: '*', placeholder: '斜体文本' },
  h1: { before: '# ', after: '', placeholder: '一级标题', lineStart: true },
  h2: { before: '## ', after: '', placeholder: '二级标题', lineStart: true },
  h3: { before: '### ', after: '', placeholder: '三级标题', lineStart: true },
  code: { before: '`', after: '`', placeholder: 'code' },
  codeblock: { before: '```\n', after: '\n```', placeholder: '代码' },
  link: { before: '[', after: '](url)', placeholder: '链接文本' },
  image: { before: '![', after: '](url)', placeholder: '图片描述' },
  quote: { before: '> ', after: '', placeholder: '引用内容', lineStart: true },
  ul: { before: '- ', after: '', placeholder: '列表项', lineStart: true },
  ol: { before: '1. ', after: '', placeholder: '列表项', lineStart: true }
}

function bindToolbar() {
  var toolbar = document.querySelector('.editor-toolbar')
  if (!toolbar) return

  toolbar.addEventListener('click', function (e) {
    var btn = e.target.closest('button')
    if (!btn) return

    var action = btn.dataset.action
    if (action === 'clear') {
      if (confirm('确定要清空编辑器内容吗？')) {
        document.getElementById('input').value = ''
        localStorage.removeItem(STORAGE_KEY)
        updateOutput()
      }
      return
    }

    var config = TOOLBAR_ACTIONS[action]
    if (!config) return

    var input = document.getElementById('input')
    var start = input.selectionStart
    var end = input.selectionEnd
    var text = input.value
    var selected = text.substring(start, end) || config.placeholder

    var insertion
    if (config.lineStart) {
      // Insert at line start
      var lineStart = text.lastIndexOf('\n', start - 1) + 1
      insertion = config.before + selected + config.after
      input.value = text.substring(0, lineStart) + insertion + text.substring(end)
      input.selectionStart = lineStart + config.before.length
      input.selectionEnd = lineStart + config.before.length + selected.length
    } else {
      insertion = config.before + selected + config.after
      input.value = text.substring(0, start) + insertion + text.substring(end)
      input.selectionStart = start + config.before.length
      input.selectionEnd = start + config.before.length + selected.length
    }

    input.focus()
    updateOutput()
    autoSave()
  })
}
```

- [ ] **Step 5: Call bindToolbar in init**

In the init block, add `bindToolbar()` after `bindEvents()`.

- [ ] **Step 6: Verify**

```bash
npm run dev
```

- Toolbar appears above the editor
- Clicking "B" inserts `**加粗文本**` and selects it
- Clicking "H1" inserts `# 一级标题` at line start
- "Clear" button prompts confirmation, then clears editor
- Toolbar scrolls horizontally on small screens

- [ ] **Step 7: Commit**

```bash
git add index.html src/css/layout.less src/main.js
git commit -m "feat: add Markdown toolbar with formatting shortcuts"
```

---

### Task 4.3: Add word count display

**Files:**
- Modify: `index.html`
- Modify: `src/css/layout.less`
- Modify: `src/main.js`

- [ ] **Step 1: Add word count HTML to index.html**

After the `<textarea>` closing tag, add:

```html
<div class="editor-stats">
  <span id="charCount">字数：0</span>
  <span class="stats-divider">|</span>
  <span id="lineCount">行数：0</span>
</div>
```

- [ ] **Step 2: Add word count styles to layout.less**

Add after the toolbar styles:

```less
// ======== Editor Stats ========
.editor-stats {
  position: absolute;
  bottom: 8px;
  left: 8px;
  z-index: 3;
  color: #888;
  font-size: 12px;
  pointer-events: none;

  .stats-divider {
    margin: 0 6px;
    color: #555;
  }
}
```

- [ ] **Step 3: Add updateStats function to main.js**

```js
function updateStats() {
  var input = document.getElementById('input')
  var text = input.value
  var charCount = text.length
  var lineCount = text ? text.split('\n').length : 0

  document.getElementById('charCount').textContent = '字数：' + charCount.toLocaleString()
  document.getElementById('lineCount').textContent = '行数：' + lineCount.toLocaleString()
}
```

- [ ] **Step 4: Call updateStats in updateOutput**

Add `updateStats()` at the end of the `updateOutput` function.

- [ ] **Step 5: Verify**

```bash
npm run dev
```

- Bottom-left of editor shows character and line counts
- Counts update in real-time as you type
- Numbers are formatted with locale separators

- [ ] **Step 6: Commit**

```bash
git add index.html src/css/layout.less src/main.js
git commit -m "feat: add word count and line count display"
```

---

### Task 4.4: Improve mobile responsiveness

**Files:**
- Modify: `src/css/layout.less`
- Modify: `index.html`

- [ ] **Step 1: Add mobile menu toggle to index.html**

Add a hamburger button inside `.topheader`:

```html
<button class="mobile-menu-toggle" aria-label="Toggle menu">☰</button>
```

Place it right after the opening `<div class="topheader">` tag.

- [ ] **Step 2: Add mobile styles to layout.less**

Replace the existing `@media screen and (max-width:641px)` block with:

```less
@media screen and (max-width: 768px) {
  .topheader {
    height: auto;
    min-height: 48px;
    padding: 8px 12px;

    h1 {
      font-size: 18px;
      line-height: 32px;
    }

    .mobile-menu-toggle {
      display: block;
      position: absolute;
      right: 12px;
      top: 8px;
      background: none;
      border: none;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      z-index: 20;
    }

    ul {
      display: none;
      position: absolute;
      top: 48px;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.9);
      flex-direction: column;
      padding: 8px 12px;
      z-index: 15;

      li {
        float: none;
        margin: 4px 0;
      }
    }

    &.menu-open ul {
      display: flex;
    }
  }

  #input,
  .editor-toolbar {
    width: 100%;
    left: 0;
  }

  #input {
    top: 84px; // 48px header + 36px toolbar
  }

  #output {
    display: none; // Hide preview on mobile, show only editor
  }

  .copy-button {
    right: 12px;
    bottom: 12px;
    width: 40px;
    height: 40px;
    font-size: 12px;
  }
}

@media screen and (min-width: 769px) {
  .mobile-menu-toggle {
    display: none;
  }
}
```

- [ ] **Step 3: Add mobile menu toggle JS to main.js**

In the `bindEvents` function, add:

```js
  var menuToggle = document.querySelector('.mobile-menu-toggle')
  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      document.querySelector('.topheader').classList.toggle('menu-open')
    })
  }
```

- [ ] **Step 4: Verify**

```bash
npm run dev
```

- Resize browser to < 768px width
- Header collapses, hamburger menu appears
- Clicking hamburger shows theme selectors
- Editor fills full width, preview is hidden
- Toolbar scrolls horizontally

- [ ] **Step 5: Commit**

```bash
git add index.html src/css/layout.less src/main.js
git commit -m "feat: improve mobile responsiveness with hamburger menu"
```

---

## Phase 5: Misc Fixes

### Task 5.1: Clean up showdown plugin inline styles

**Files:**
- Modify: `src/js/showdown-plugins/showdown-prettify-for-wechat.js`
- Modify: `src/css/prettify.less`

- [ ] **Step 1: Remove inline styles from showdown plugin**

Replace the content of `src/js/showdown-plugins/showdown-prettify-for-wechat.js`:

```js
var showdown = require('../showdown')

showdown.extension('prettify', function () {
  return [
    {
      type: 'output',
      filter: function (source) {
        return source.replace(
          /(<pre[^>]*>)?[\n\s]?<code([^>]*)>/gi,
          function (match, pre, codeClass) {
            if (pre) {
              return (
                '<pre class="prettyprint linenums"><code' + codeClass + '>'
              )
            } else {
              return ' <code class="prettyprint code-in-text">'
            }
          }
        )
      }
    }
  ]
})
```

- [ ] **Step 2: Ensure prettify.less handles font sizes**

The existing `prettify.less` already has font-size rules in the `ol.linenums li code span` block (font-size: 13px) and `.code-in-text span` block (font-size: 14px). These cover the cases previously handled by inline styles. No changes needed to the CSS.

- [ ] **Step 3: Verify**

```bash
npm run dev
```

- Code blocks should still display with proper font sizes
- Inline code should still display properly
- Line numbers should still work

- [ ] **Step 4: Commit**

```bash
git add src/js/showdown-plugins/showdown-prettify-for-wechat.js
git commit -m "fix: remove hardcoded inline styles from showdown prettify plugin"
```

---

### Task 5.2: Final cleanup and build verification

**Files:**
- Modify: `.gitignore` (create if not exists)

- [ ] **Step 1: Create/update .gitignore**

```
node_modules/
dist/
.DS_Store
*.log
```

- [ ] **Step 2: Remove old dist/ directory from git tracking (if tracked)**

```bash
git rm -r --cached dist/ 2>/dev/null || true
```

- [ ] **Step 3: Final build verification**

```bash
rm -rf dist node_modules package-lock.json
npm install
npm run build
```

Verify:
- `dist/index.html` exists
- `dist/themes/` has all theme CSS files
- `dist/pageThemes/` has all page theme CSS files
- `dist/demo.md` exists
- `dist/assets/` has bundled JS (should be much smaller without jQuery)

- [ ] **Step 4: Verify dev server**

```bash
npm run dev
```

Full verification checklist:
- [ ] Page loads with Claude theme as default
- [ ] Editor has toolbar with all buttons
- [ ] Word count displays at bottom-left
- [ ] Typing updates preview in real-time
- [ ] Content auto-saves to localStorage
- [ ] Theme dropdowns work (both code and page)
- [ ] Copy button works with snackbar
- [ ] Sync scroll works
- [ ] No console errors
- [ ] Mobile view: hamburger menu works, editor fills width

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore, final cleanup"
```

- [ ] **Step 6: Push**

```bash
git push
```
