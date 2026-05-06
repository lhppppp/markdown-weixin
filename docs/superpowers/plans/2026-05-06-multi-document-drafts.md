# Multi-Document Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a left-side drawer for managing multiple markdown drafts in localStorage, with H1-derived titles and a warm archival aesthetic.

**Architecture:** Single `localStorage["markdown-docs"]` object is the source of truth. All store operations (load / save / migrate / CRUD) live in a clearly-demarcated section at the top of `src/main.js`. UI reads from and writes to the store through a thin function interface. No new files (per spec).

**Tech Stack:** Vite 5 + ES Modules, LESS, no framework, no test runner.

**Testing approach:** The project has no test framework. Each task defines concrete manual verification steps in the browser plus `npm run build` as a smoke check. Do not add unit tests — spec explicitly defers that work ("加测试时先补基建再说").

**Spec:** `docs/superpowers/specs/2026-05-06-multi-document-drafts-design.md`

**Commit cadence:** One commit per task.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/main.js` | modify | Add store section (migrate/load/persist/crud/title/time), rewire autoSave, add drawer render + event handlers |
| `index.html` | modify | Replace `.mobile-menu-toggle` with `.drawer-toggle`, add `<aside class="docs-drawer">` and `<div class="drawer-backdrop">`, change clear button aria-label |
| `src/css/layout.less` | modify | Add drawer / list / item / new-button / toggle / backdrop styles; remove old `.mobile-menu-toggle` block; adjust responsive rules |

No new files are created. If the store logic in `main.js` exceeds ~150 lines during implementation, defer the decision to split — do not split preemptively.

---

## Task 1: Scaffolding — drawer shell, hamburger, and open/close wiring

Builds the empty drawer shell and a working hamburger button so you can see the drawer slide in and out. No data yet.

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/css/layout.less`

- [ ] **Step 1: Replace the hamburger button markup in `index.html`**

Find the existing `<button class="mobile-menu-toggle">` inside `<header class="topheader">` and replace it:

```html
<button class="drawer-toggle" aria-label="打开草稿">
  <span></span><span></span><span></span>
</button>
```

Keep it as the first child of `<header class="topheader">` (before `.brand`).

- [ ] **Step 2: Add drawer shell markup**

Immediately after the closing `</header>` tag (before `<div class="editor-toolbar">`), insert:

```html
<div class="drawer-backdrop" aria-hidden="true"></div>
<aside class="docs-drawer" aria-hidden="true">
  <header class="drawer-header">
    <span class="drawer-label">DRAFTS</span>
    <span class="drawer-count">0</span>
  </header>
  <ul class="doc-list"></ul>
  <button class="drawer-new" type="button">
    <span class="new-sign">+</span>
    <span class="new-label">新 建 草 稿</span>
  </button>
</aside>
```

- [ ] **Step 3: Remove the old `.mobile-menu-toggle` CSS block from `src/css/layout.less`**

Find the entire `.mobile-menu-toggle { … }` block inside the `@media screen and (max-width: 768px)` section and delete it. Also remove the `@media screen and (min-width: 769px) { .mobile-menu-toggle { display: none; } }` block at the start of the Responsive section — it's no longer needed because `.drawer-toggle` shows on desktop too.

- [ ] **Step 4: Add drawer CSS to `src/css/layout.less`**

Append the following section immediately before `// ============ Responsive ============`:

```less
// ============ Drawer Toggle (hamburger) ============
.drawer-toggle {
  width: 38px;
  height: 38px;
  padding: 9px 10px;
  border: 1px solid @line;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.45);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s @ease, border-color 0.2s @ease;

  span {
    display: block;
    height: 1.5px;
    background: @fg-mute;
    border-radius: 1px;
    transition: all 0.3s @ease;
    &:nth-child(1) { width: 16px; }
    &:nth-child(2) { width: 12px; }
    &:nth-child(3) { width: 18px; }
  }

  &:hover {
    border-color: @accent-soft;
    background: rgba(255, 255, 255, 0.9);
    span { background: @accent; }
  }

  &.is-open {
    span:nth-child(1) { width: 16px; transform: translateY(5.5px) rotate(45deg); }
    span:nth-child(2) { opacity: 0; transform: scaleX(0); }
    span:nth-child(3) { width: 16px; transform: translateY(-5.5px) rotate(-45deg); }
  }
}

// ============ Drawer ============
.docs-drawer {
  position: fixed;
  top: 68px;
  left: 0;
  bottom: 0;
  width: 280px;
  background:
    linear-gradient(90deg, rgba(242, 237, 227, 0.55), transparent 40%),
    @bg-paper;
  border-right: 1px solid @line;
  padding: 26px 0 100px 0;
  display: flex;
  flex-direction: column;
  transform: translateX(-100%);
  transition: transform 0.36s cubic-bezier(0.2, 0.7, 0.2, 1), box-shadow 0.36s @ease;
  z-index: 12;
  overflow-y: auto;
  overflow-x: hidden;

  &.is-open {
    transform: translateX(0);
    box-shadow: 6px 0 40px -18px rgba(44, 42, 39, 0.22);
  }
}

.drawer-header {
  padding: 0 28px 16px 28px;
  border-bottom: 1px solid @line-soft;
  margin: 0 28px 0 28px;
  padding: 0 0 16px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;

  .drawer-label {
    font-family: @font-mono;
    font-size: 10.5px;
    letter-spacing: 2.8px;
    color: @fg-whisper;
    text-transform: uppercase;
  }

  .drawer-count {
    font-family: @font-mono;
    font-size: 10.5px;
    color: @fg-mute;
    font-variant-numeric: tabular-nums;
  }
}

.doc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1 0 auto;
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(44, 42, 39, 0.42);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s @ease;
  z-index: 11;
  display: none;

  &.is-visible {
    opacity: 1;
    pointer-events: auto;
  }
}
```

- [ ] **Step 5: Wire open/close toggle in `src/main.js`**

Inside `bindEvents()`, find and delete these lines:

```js
var menuToggle = document.querySelector('.mobile-menu-toggle')
if (menuToggle) {
  menuToggle.addEventListener('click', function () {
    document.querySelector('.topheader').classList.toggle('menu-open')
  })
}
```

Add a new function above `bindEvents()`:

```js
function bindDrawer() {
  var toggle = document.querySelector('.drawer-toggle')
  var drawer = document.querySelector('.docs-drawer')
  var backdrop = document.querySelector('.drawer-backdrop')

  function setOpen(open) {
    toggle.classList.toggle('is-open', open)
    drawer.classList.toggle('is-open', open)
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true')
    backdrop.classList.toggle('is-visible', open)
  }

  toggle.addEventListener('click', function () {
    setOpen(!drawer.classList.contains('is-open'))
  })
  backdrop.addEventListener('click', function () { setOpen(false) })
}
```

Then in the two init branches at the bottom of the file, add `bindDrawer()` next to `bindToolbar()`:

```js
if (loadSavedContent()) {
  bindEvents()
  bindToolbar()
  bindDrawer()
  updateOutput()
  initCodeTheme()
  initPageTheme()
} else {
  loadDemo()
    .catch(function () {})
    .finally(function () {
      bindEvents()
      bindToolbar()
      bindDrawer()
      updateOutput()
      initCodeTheme()
      initPageTheme()
    })
}
```

- [ ] **Step 6: Build and manually verify**

Run: `npm run build`
Expected: build succeeds with no errors, the new `.docs-drawer` CSS appears in `dist/assets/*.css`.

Run: `npm run dev` and open the browser.
Expected:
- Hamburger button appears at far left of topheader
- Click it → three lines morph into an `×`, drawer slides in from the left
- Click it again → drawer slides out, back to three lines
- On mobile viewport (devtools, <768px), backdrop remains `display: none` for now (we fix mobile in Task 7)

- [ ] **Step 7: Commit**

```bash
git add index.html src/main.js src/css/layout.less
git commit -m "feat(ui): add drawer shell and hamburger toggle"
```

---

## Task 2: Doc store module (data layer, no UI wiring)

Implements all store functions as a self-contained block at the top of `main.js`. No UI changes; verified by console calls.

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add the store section to `src/main.js`**

Insert this block immediately after the `var STORAGE_KEY = 'markdown-content'` line (we will remove that constant in Task 3, keep it for now):

```js
// ============ Doc Store ============
var DOCS_KEY = 'markdown-docs'
var OLD_KEY = 'markdown-content'
var STORE_VERSION = 1

function newId() {
  return 'doc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
}

function newDoc(content) {
  var now = Date.now()
  return {
    id: newId(),
    content: content || '',
    createdAt: now,
    updatedAt: now
  }
}

function persist(store) {
  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(store))
    return true
  } catch (e) {
    return false
  }
}

function loadStore() {
  var raw = localStorage.getItem(DOCS_KEY)
  if (raw) {
    try {
      var parsed = JSON.parse(raw)
      if (parsed && parsed.version === STORE_VERSION && Array.isArray(parsed.docs) && parsed.docs.length > 0) {
        return parsed
      }
    } catch (e) {}
  }
  return null
}

function migrateOldKey() {
  var oldContent = localStorage.getItem(OLD_KEY)
  if (oldContent === null) return null
  var doc = newDoc(oldContent)
  var store = { version: STORE_VERSION, currentId: doc.id, docs: [doc] }
  if (persist(store)) {
    localStorage.removeItem(OLD_KEY)
  }
  return store
}

function getActive(store) {
  for (var i = 0; i < store.docs.length; i++) {
    if (store.docs[i].id === store.currentId) return store.docs[i]
  }
  return store.docs[0]
}

function touch(store, doc) {
  doc.updatedAt = Date.now()
  var idx = store.docs.indexOf(doc)
  if (idx > 0) {
    store.docs.splice(idx, 1)
    store.docs.unshift(doc)
  }
}

function extractTitle(content) {
  var h1 = content.match(/^#\s+(.+?)\s*$/m)
  if (h1) return h1[1].trim()
  var lines = content.split('\n')
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim()
    if (line) return line.slice(0, 20)
  }
  return '未命名'
}

function wordCount(content) {
  return content.replace(/\s/g, '').length
}

function formatTime(ts) {
  var d = new Date(ts)
  var now = new Date()
  var sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  var yest = new Date(now); yest.setDate(now.getDate() - 1)
  var isYest = d.getFullYear() === yest.getFullYear() && d.getMonth() === yest.getMonth() && d.getDate() === yest.getDate()
  function pad(n) { return n < 10 ? '0' + n : '' + n }
  var hhmm = pad(d.getHours()) + ':' + pad(d.getMinutes())
  if (sameDay) return '今日 ' + hhmm
  if (isYest) return '昨天 ' + hhmm
  if (d.getFullYear() === now.getFullYear()) return pad(d.getMonth() + 1) + '-' + pad(d.getDate())
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}
```

- [ ] **Step 2: Build and verify no syntax errors**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manually verify store functions in browser console**

Run `npm run dev`, open the app, open devtools console, and run:

```js
// clear anything lingering
localStorage.clear()

// extractTitle
extractTitle('# hello world\n\ntext')  // → "hello world"
extractTitle('just text here')         // → "just text here"
extractTitle('')                       // → "未命名"

// formatTime — manually check three branches
formatTime(Date.now())                 // "今日 HH:mm"
formatTime(Date.now() - 86400000)      // "昨天 HH:mm"
formatTime(Date.now() - 86400000 * 7)  // "MM-DD"

// migration
localStorage.setItem('markdown-content', '# old content\nhello')
var migrated = migrateOldKey()
migrated.docs[0].content  // → "# old content\nhello"
localStorage.getItem('markdown-content')  // → null
```

Note: these functions are not exposed on window; for this manual check, paste them into the console directly (copy-paste from source) OR temporarily add `window.__store = { loadStore, migrateOldKey, extractTitle, formatTime, wordCount }` at the end of the store section, verify, then remove. Choose whichever is quicker.

Expected: each call returns the value in the comment.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat(store): add multi-doc store functions"
```

---

## Task 3: Replace single-doc load/save with store-backed flow

Rewires the boot sequence so the editor reads from and writes to the store. Old `STORAGE_KEY` path is removed. Migration runs on first boot.

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Remove the old single-doc constants and helpers**

Delete these lines from `src/main.js`:

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

Also delete the `localStorage.removeItem(STORAGE_KEY)` line inside `bindToolbar()`'s `clear` branch — we rewire clear/delete in a later task. For now just leave the `if (confirm…) { document.getElementById('input').value = ''; updateOutput() }` shell; we replace it in Task 5.

- [ ] **Step 2: Add store-backed replacements**

Add these functions at the top of `src/main.js` immediately after the `// ============ Doc Store ============` block (still inside the doc store section):

```js
var store = null
var saveTimer = null

function getStore() { return store }

function setStore(next) {
  store = next
  if (!persist(store)) {
    showSnackbar('保存失败，本地空间已满')
  }
}

function loadActiveDoc() {
  store = loadStore() || migrateOldKey()
  if (store) {
    document.getElementById('input').value = getActive(store).content
    return true
  }
  return false
}

function autoSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(function () {
    if (!store) return
    var doc = getActive(store)
    doc.content = document.getElementById('input').value
    touch(store, doc)
    if (!persist(store)) {
      showSnackbar('保存失败，本地空间已满')
    }
  }, 500)
}
```

- [ ] **Step 3: Update `showSnackbar` to accept optional custom text**

Find the existing `showSnackbar` function:

```js
function showSnackbar() {
  var snackbar = document.getElementById('snackbar')
  snackbar.classList.add('show')
  setTimeout(function () {
    snackbar.classList.remove('show')
  }, 3000)
}
```

Replace with:

```js
function showSnackbar(text) {
  var snackbar = document.getElementById('snackbar')
  if (text) snackbar.textContent = text
  snackbar.classList.add('show')
  setTimeout(function () {
    snackbar.classList.remove('show')
  }, 3000)
}
```

- [ ] **Step 4: Rewrite the `loadDemo().then` chain to create the initial doc**

Find the `loadDemo()` function:

```js
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
```

Replace the final `.then` so it also seeds the store:

```js
function loadDemo() {
  var demoPath = params.path || './demo.md'
  return fetch(demoPath + '?_t=' + Date.now())
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load ' + demoPath)
      return res.text()
    })
    .then(function (text) {
      var doc = newDoc(text)
      store = { version: STORE_VERSION, currentId: doc.id, docs: [doc] }
      persist(store)
      document.getElementById('input').value = text
    })
}
```

Also update the bottom init sequence to use `loadActiveDoc`:

```js
if (loadActiveDoc()) {
  bindEvents()
  bindToolbar()
  bindDrawer()
  updateOutput()
  initCodeTheme()
  initPageTheme()
} else {
  loadDemo()
    .catch(function () {
      // If demo fetch failed and there's still no store, create an empty doc
      if (!store) {
        var doc = newDoc('')
        store = { version: STORE_VERSION, currentId: doc.id, docs: [doc] }
        persist(store)
      }
    })
    .finally(function () {
      bindEvents()
      bindToolbar()
      bindDrawer()
      updateOutput()
      initCodeTheme()
      initPageTheme()
    })
}
```

- [ ] **Step 5: Build and manually verify**

Run: `npm run build`
Expected: build succeeds.

Run `npm run dev` and test three paths:

**A. Fresh user (no localStorage):**
```js
// In devtools console:
localStorage.clear()
// Reload the page
```
Expected: demo content loads, `localStorage.getItem('markdown-docs')` returns a JSON object with `version: 1, currentId, docs: [{...}]`.

**B. Returning user (old key only):**
```js
localStorage.clear()
localStorage.setItem('markdown-content', '# 旧数据\n这是迁移前的内容')
// Reload the page
```
Expected: editor shows "# 旧数据...", `localStorage.getItem('markdown-content')` returns `null` (migrated and removed), `localStorage.getItem('markdown-docs')` contains the content.

**C. Returning user (new key already):**
After one of the above, just reload. Content persists and is NOT re-migrated.

**D. Auto-save:**
Type into the editor, wait 1 second, reload. Content is still there.

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat(store): wire editor to multi-doc store with migration"
```

---

## Task 4: Render drawer list + switch on click

Renders each doc as a `.doc-item` row, marks the current one active, switches content on click. No create / delete yet.

**Files:**
- Modify: `src/main.js`
- Modify: `src/css/layout.less`

- [ ] **Step 1: Add list item CSS to `src/css/layout.less`**

Append the following immediately after the `.doc-list` block (inside the `// ============ Drawer ============` section):

```less
.doc-item {
  position: relative;
  display: block;
  padding: 14px 28px 14px 36px;
  cursor: pointer;
  box-shadow: inset 0 -1px 0 @line-soft;
  transition: background 0.16s @ease;
  text-decoration: none;

  .doc-bookmark {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: @accent;
    transform: scaleY(0);
    transform-origin: top;
    transition: transform 0.3s @ease;
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 4px), 50% 100%, 0 calc(100% - 4px));
  }

  .doc-mark {
    position: absolute;
    left: 20px;
    top: 15px;
    font-family: @font-display;
    font-size: 13px;
    color: @accent;
    opacity: 0;
    transition: opacity 0.2s @ease;
  }

  .doc-title {
    margin: 0;
    font-family: @font-serif;
    font-size: 14.5px;
    font-weight: 400;
    color: @fg-mute;
    line-height: 1.35;
    letter-spacing: 0.1px;
    transition: color 0.16s @ease, transform 0.18s @ease;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .doc-meta {
    margin: 4px 0 0 0;
    font-family: @font-mono;
    font-size: 10.5px;
    color: @fg-whisper;
    letter-spacing: 0.4px;
    font-variant-numeric: tabular-nums;
    transition: color 0.16s @ease;
  }

  .doc-delete {
    position: absolute;
    right: 20px;
    top: 50%;
    width: 22px;
    height: 22px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: @fg-whisper;
    font-size: 12px;
    cursor: pointer;
    opacity: 0;
    transform: translate(6px, -50%);
    transition: opacity 0.18s @ease, transform 0.18s @ease, color 0.16s @ease, background 0.16s @ease;
  }

  &:hover {
    background: rgba(232, 226, 213, 0.35);
    .doc-title { color: @fg-ink; transform: translateX(2px); }
    .doc-delete { opacity: 1; transform: translate(0, -50%); }
  }

  .doc-delete:hover {
    color: @accent;
    background: fade(@accent, 8%);
  }

  &.is-active {
    .doc-bookmark { transform: scaleY(1); }
    .doc-mark    { opacity: 1; }
    .doc-title   { color: @fg-ink; font-weight: 500; }
    .doc-meta    { color: @fg-mute; }
  }
}
```

- [ ] **Step 2: Add `renderDocList()` to `src/main.js`**

Add this function near the top of the file, after the store section and before `showSnackbar`:

```js
function renderDocList() {
  if (!store) return
  var list = document.querySelector('.doc-list')
  var count = document.querySelector('.drawer-count')
  count.textContent = store.docs.length
  list.innerHTML = ''
  for (var i = 0; i < store.docs.length; i++) {
    var d = store.docs[i]
    var li = document.createElement('li')
    var item = document.createElement('a')
    item.className = 'doc-item' + (d.id === store.currentId ? ' is-active' : '')
    item.dataset.id = d.id
    item.innerHTML =
      '<span class="doc-bookmark" aria-hidden="true"></span>' +
      '<span class="doc-mark" aria-hidden="true">§</span>' +
      '<h3 class="doc-title"></h3>' +
      '<p class="doc-meta"></p>' +
      '<button class="doc-delete" type="button" aria-label="删除这篇">✕</button>'
    item.querySelector('.doc-title').textContent = extractTitle(d.content)
    item.querySelector('.doc-meta').textContent =
      formatTime(d.updatedAt) + ' · ' + wordCount(d.content).toLocaleString() + ' 字'
    li.appendChild(item)
    list.appendChild(li)
  }
}
```

- [ ] **Step 3: Add `switchDoc(id)` to `src/main.js`**

Add this function right below `renderDocList`:

```js
function switchDoc(id) {
  if (!store || id === store.currentId) return
  // Save current buffer into current doc (skip debounce — switch is an immediate checkpoint)
  clearTimeout(saveTimer)
  var current = getActive(store)
  current.content = document.getElementById('input').value
  current.updatedAt = Date.now()
  // Switch
  store.currentId = id
  var target = getActive(store)
  document.getElementById('input').value = target.content
  document.getElementById('input').setSelectionRange(0, 0)
  if (!persist(store)) showSnackbar('保存失败，本地空间已满')
  updateOutput()
  renderDocList()
  // Close drawer
  var toggle = document.querySelector('.drawer-toggle')
  var drawer = document.querySelector('.docs-drawer')
  var backdrop = document.querySelector('.drawer-backdrop')
  toggle.classList.remove('is-open')
  drawer.classList.remove('is-open')
  drawer.setAttribute('aria-hidden', 'true')
  backdrop.classList.remove('is-visible')
}
```

- [ ] **Step 4: Wire click handler inside `bindDrawer()`**

Update `bindDrawer()` to add delegated click handler on the list:

```js
function bindDrawer() {
  var toggle = document.querySelector('.drawer-toggle')
  var drawer = document.querySelector('.docs-drawer')
  var backdrop = document.querySelector('.drawer-backdrop')
  var list = document.querySelector('.doc-list')

  function setOpen(open) {
    toggle.classList.toggle('is-open', open)
    drawer.classList.toggle('is-open', open)
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true')
    backdrop.classList.toggle('is-visible', open)
  }

  toggle.addEventListener('click', function () {
    setOpen(!drawer.classList.contains('is-open'))
  })
  backdrop.addEventListener('click', function () { setOpen(false) })

  list.addEventListener('click', function (e) {
    var item = e.target.closest('.doc-item')
    if (!item) return
    if (e.target.closest('.doc-delete')) return   // Task 6 handles this
    e.preventDefault()
    switchDoc(item.dataset.id)
  })
}
```

- [ ] **Step 5: Call `renderDocList()` after boot and after autoSave**

In the bottom init sequence, add `renderDocList()` after `bindDrawer()` in both branches:

```js
if (loadActiveDoc()) {
  bindEvents()
  bindToolbar()
  bindDrawer()
  renderDocList()
  updateOutput()
  initCodeTheme()
  initPageTheme()
} else {
  loadDemo()
    .catch(function () { /* …unchanged… */ })
    .finally(function () {
      bindEvents()
      bindToolbar()
      bindDrawer()
      renderDocList()
      updateOutput()
      initCodeTheme()
      initPageTheme()
    })
}
```

Also update `autoSave` to re-render the list so the current doc's title / meta stay fresh:

```js
function autoSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(function () {
    if (!store) return
    var doc = getActive(store)
    doc.content = document.getElementById('input').value
    touch(store, doc)
    if (!persist(store)) {
      showSnackbar('保存失败，本地空间已满')
    }
    renderDocList()
  }, 500)
}
```

- [ ] **Step 6: Build and manually verify**

Run: `npm run build`
Expected: build succeeds.

Run `npm run dev`.
Seed multiple docs via console:

```js
var s = JSON.parse(localStorage.getItem('markdown-docs'))
s.docs.push({ id: 'doc-test-1', content: '# 笔记\n测试内容', createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000 })
s.docs.push({ id: 'doc-test-2', content: '未命名的内容', createdAt: Date.now() - 86400000 * 7, updatedAt: Date.now() - 86400000 * 7 })
localStorage.setItem('markdown-docs', JSON.stringify(s))
location.reload()
```

Expected:
- Open drawer → 3 items visible, current one has orange bookmark + `§` mark
- Click "笔记" row → drawer closes, editor content swaps to "# 笔记..."
- Type something in the editor → wait 1 second → open drawer again → the current item's title / meta reflect the new content

- [ ] **Step 7: Commit**

```bash
git add src/main.js src/css/layout.less
git commit -m "feat(ui): render draft list with switch-on-click"
```

---

## Task 5: New draft button + delete flows

Implements creating new drafts and deleting them via the toolbar ✕ and list hover ✕.

**Files:**
- Modify: `src/main.js`
- Modify: `src/css/layout.less`
- Modify: `index.html`

- [ ] **Step 1: Add `.drawer-new` CSS**

Append to `src/css/layout.less` inside the `// ============ Drawer ============` section:

```less
.drawer-new {
  position: sticky;
  bottom: 16px;
  margin: 24px 24px 0 24px;
  padding: 13px 16px;
  background: rgba(254, 252, 248, 0.78);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px dashed @line;
  border-radius: 8px;
  display: flex;
  gap: 10px;
  align-items: baseline;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s @ease, background 0.2s @ease, transform 0.18s @ease;

  .new-sign {
    font-family: @font-display;
    font-size: 18px;
    font-weight: 500;
    color: @accent;
    line-height: 1;
  }

  .new-label {
    font-family: @font-display;
    font-style: italic;
    font-size: 14px;
    color: @fg-mute;
    letter-spacing: 0.8px;
    transition: color 0.2s @ease;
  }

  &:hover {
    border-color: @accent-soft;
    transform: translateY(-1px);
    .new-label { color: @accent; }
  }

  &:active {
    transform: translateY(0);
  }
}
```

- [ ] **Step 2: Add `createDoc()` and `deleteDoc(id)` to `src/main.js`**

Add below `switchDoc`:

```js
function createDoc() {
  if (!store) return
  clearTimeout(saveTimer)
  var current = getActive(store)
  current.content = document.getElementById('input').value
  current.updatedAt = Date.now()

  var doc = newDoc('')
  store.docs.unshift(doc)
  store.currentId = doc.id
  document.getElementById('input').value = ''
  if (!persist(store)) showSnackbar('保存失败，本地空间已满')
  updateOutput()
  renderDocList()
  // Close drawer and focus editor for immediate writing
  var toggle = document.querySelector('.drawer-toggle')
  var drawer = document.querySelector('.docs-drawer')
  var backdrop = document.querySelector('.drawer-backdrop')
  toggle.classList.remove('is-open')
  drawer.classList.remove('is-open')
  drawer.setAttribute('aria-hidden', 'true')
  backdrop.classList.remove('is-visible')
  document.getElementById('input').focus()
}

function deleteDoc(id) {
  if (!store) return
  var idx = -1
  for (var i = 0; i < store.docs.length; i++) {
    if (store.docs[i].id === id) { idx = i; break }
  }
  if (idx === -1) return
  var victim = store.docs[idx]
  var title = extractTitle(victim.content)
  if (!confirm('删除《' + title + '》？此操作不可撤销。')) return

  store.docs.splice(idx, 1)
  var wasCurrent = id === store.currentId

  if (store.docs.length === 0) {
    var doc = newDoc('')
    store.docs.push(doc)
    store.currentId = doc.id
  } else if (wasCurrent) {
    // Prefer the item that was above (newer) the deleted one; if deleting the
    // first item, fall back to the new first item (which used to be second).
    var nextIdx = idx > 0 ? idx - 1 : 0
    store.currentId = store.docs[nextIdx].id
  }

  if (wasCurrent) {
    document.getElementById('input').value = getActive(store).content
    document.getElementById('input').setSelectionRange(0, 0)
  }
  if (!persist(store)) showSnackbar('保存失败，本地空间已满')
  updateOutput()
  renderDocList()
}

function deleteCurrent() {
  if (!store) return
  deleteDoc(store.currentId)
}
```

- [ ] **Step 3: Rewire toolbar ✕ in `bindToolbar()`**

Find the `clear` branch inside the toolbar click handler:

```js
if (action === 'clear') {
  if (confirm('确定要清空编辑器内容吗？')) {
    document.getElementById('input').value = ''
    updateOutput()
  }
  return
}
```

Replace with:

```js
if (action === 'clear') {
  deleteCurrent()
  return
}
```

- [ ] **Step 4: Update toolbar ✕ aria-label in `index.html`**

Find `<button data-action="clear" class="toolbar-clear" aria-label="清空内容">✕</button>` and change the aria-label:

```html
<button data-action="clear" class="toolbar-clear" aria-label="删除当前草稿">✕</button>
```

- [ ] **Step 5: Wire `+ 新建草稿` button and list-item ✕ inside `bindDrawer()`**

Update `bindDrawer()` to handle both:

```js
function bindDrawer() {
  var toggle = document.querySelector('.drawer-toggle')
  var drawer = document.querySelector('.docs-drawer')
  var backdrop = document.querySelector('.drawer-backdrop')
  var list = document.querySelector('.doc-list')
  var newBtn = document.querySelector('.drawer-new')

  function setOpen(open) {
    toggle.classList.toggle('is-open', open)
    drawer.classList.toggle('is-open', open)
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true')
    backdrop.classList.toggle('is-visible', open)
  }

  toggle.addEventListener('click', function () {
    setOpen(!drawer.classList.contains('is-open'))
  })
  backdrop.addEventListener('click', function () { setOpen(false) })
  newBtn.addEventListener('click', createDoc)

  list.addEventListener('click', function (e) {
    var item = e.target.closest('.doc-item')
    if (!item) return
    var del = e.target.closest('.doc-delete')
    if (del) {
      e.preventDefault()
      e.stopPropagation()
      deleteDoc(item.dataset.id)
      return
    }
    e.preventDefault()
    switchDoc(item.dataset.id)
  })
}
```

- [ ] **Step 6: Build and manually verify**

Run: `npm run build`
Expected: build succeeds.

Run `npm run dev` and test each path:

**A. Create a new draft:**
Open drawer → click `+ 新 建 草 稿` → expected: drawer closes, editor is empty and focused, drawer list now has "未命名" at top.

**B. Delete non-current via hover ✕:**
Seed 3 docs via console (see Task 4 Step 6). Open drawer → hover over a non-active item → ✕ fades in → click ✕ → confirm → item disappears, current stays.

**C. Delete current via toolbar ✕:**
Click toolbar ✕ → confirm prompt shows title of current doc → confirm → editor content swaps to the previous/adjacent doc.

**D. Delete last draft:**
Delete all but one doc, then delete the last one → confirm → a new blank "未命名" doc is created automatically.

**E. Cancel confirmation:**
Click ✕ → hit Cancel → nothing changes.

- [ ] **Step 7: Commit**

```bash
git add src/main.js src/css/layout.less index.html
git commit -m "feat(ui): new-draft button and delete flows (toolbar + hover)"
```

---

## Task 6: Staggered entrance animation when drawer opens

Adds the animation choreography described in the spec. Uses existing `@keyframes rise`. Pure CSS.

**Files:**
- Modify: `src/css/layout.less`

- [ ] **Step 1: Add stagger animations scoped to `.docs-drawer.is-open`**

Append inside the `// ============ Drawer ============` section (after `.drawer-new`):

```less
.docs-drawer.is-open {
  .drawer-header {
    animation: rise 0.35s @ease 0.12s both;
  }
  .doc-item {
    animation: rise 0.5s @ease both;
    &:nth-child(1) { animation-delay: 0.16s; }
    &:nth-child(2) { animation-delay: 0.205s; }
    &:nth-child(3) { animation-delay: 0.25s; }
    &:nth-child(4) { animation-delay: 0.295s; }
    &:nth-child(5) { animation-delay: 0.34s; }
    &:nth-child(6) { animation-delay: 0.385s; }
    &:nth-child(7) { animation-delay: 0.43s; }
    &:nth-child(8) { animation-delay: 0.475s; }
  }
  .drawer-new {
    animation: rise 0.4s @ease 0.32s both;
  }
}
```

Note: the `.doc-item` selector targets the `<a>` directly, but in the DOM each `<a>` is wrapped in `<li>`. The `:nth-child` on `.doc-item` won't index items inside `<li>` correctly. Fix the selector:

```less
.docs-drawer.is-open {
  .drawer-header {
    animation: rise 0.35s @ease 0.12s both;
  }
  .doc-list li {
    animation: rise 0.5s @ease both;
    &:nth-child(1) { animation-delay: 0.16s; }
    &:nth-child(2) { animation-delay: 0.205s; }
    &:nth-child(3) { animation-delay: 0.25s; }
    &:nth-child(4) { animation-delay: 0.295s; }
    &:nth-child(5) { animation-delay: 0.34s; }
    &:nth-child(6) { animation-delay: 0.385s; }
    &:nth-child(7) { animation-delay: 0.43s; }
    &:nth-child(8) { animation-delay: 0.475s; }
  }
  .drawer-new {
    animation: rise 0.4s @ease 0.32s both;
  }
}
```

- [ ] **Step 2: Build and manually verify**

Run: `npm run build`
Expected: build succeeds.

Run `npm run dev`. Seed several docs via console as in Task 4. Open and close the drawer multiple times.

Expected:
- Drawer slides in, then header fades+rises, then list items appear one-by-one with a 45ms stagger, then the new button appears
- Each re-open triggers the animation again (because `.is-open` class re-applies)

- [ ] **Step 3: Commit**

```bash
git add src/css/layout.less
git commit -m "feat(ui): add staggered entrance animation on drawer open"
```

---

## Task 7: Mobile responsive adjustments

Makes the drawer behave sensibly below 768px: narrower width, visible backdrop, smaller hamburger.

**Files:**
- Modify: `src/css/layout.less`

- [ ] **Step 1: Update the `@media (max-width: 768px)` block**

Find the existing `@media screen and (max-width: 768px)` block. Inside it, add these rules (alongside whatever else lives there):

```less
@media screen and (max-width: 768px) {
  // …existing rules for .topheader, .editor-toolbar, #input, etc…

  .drawer-toggle {
    width: 32px;
    height: 32px;
    padding: 7px 8px;
    gap: 3px;
    span:nth-child(1) { width: 14px; }
    span:nth-child(2) { width: 10px; }
    span:nth-child(3) { width: 16px; }
  }

  .docs-drawer {
    width: 82vw;
    max-width: 320px;
    top: 56px;
    padding: 20px 0 90px 0;
  }

  .drawer-backdrop {
    display: block;
    top: 56px;
  }

  .drawer-header {
    padding: 0 0 14px 0;
    margin: 0 22px;
  }

  .doc-item {
    padding: 12px 24px 12px 32px;
    .doc-mark { left: 16px; top: 13px; }
  }

  .drawer-new {
    margin: 20px 20px 0 20px;
    padding: 12px 14px;
  }
}
```

Note the `.drawer-backdrop` defaulted to `display: none` in Task 1 so it would never appear on desktop; this media query flips it back on for mobile.

- [ ] **Step 2: Build and manually verify**

Run: `npm run build`
Expected: build succeeds.

Run `npm run dev`. In devtools, toggle device toolbar to iPhone or set viewport width to 375px.

Expected:
- Hamburger is small (32×32) and in the top-left of the topheader
- Tap hamburger → drawer slides in from left, ~82% viewport wide, dark semi-transparent backdrop covers everything else
- Tap backdrop → drawer closes
- Tap a list item → drawer closes, content swaps
- Resize back to desktop → backdrop is hidden again (CSS-only, no flicker)

- [ ] **Step 3: Commit**

```bash
git add src/css/layout.less
git commit -m "feat(ui): mobile responsive adjustments for drawer"
```

---

## Task 8: Snackbar — warning variant for quota-exceeded

The snackbar currently always shows a green `✓`. When storage is full we want a `⚠` with warning color. Nothing blocks input — save simply drops and the user is told.

**Files:**
- Modify: `src/main.js`
- Modify: `src/css/layout.less`

- [ ] **Step 1: Update `showSnackbar` to accept a variant**

Find the `showSnackbar(text)` function in `src/main.js` (updated in Task 3) and replace with:

```js
function showSnackbar(text, variant) {
  var snackbar = document.getElementById('snackbar')
  if (text) snackbar.textContent = text
  snackbar.classList.remove('is-warning')
  if (variant === 'warning') snackbar.classList.add('is-warning')
  snackbar.classList.add('show')
  setTimeout(function () {
    snackbar.classList.remove('show')
  }, 3000)
}
```

Then update every `showSnackbar('保存失败，本地空间已满')` call in `main.js` (there are several: in `setStore` if it still exists, in `autoSave`, `switchDoc`, `createDoc`, `deleteDoc`) to pass the variant:

```js
showSnackbar('保存失败，本地空间已满', 'warning')
```

- [ ] **Step 2: Add warning snackbar CSS in `src/css/layout.less`**

Find the `#snackbar` block and append the warning variant inside it (nested rule):

```less
#snackbar {
  // …existing rules unchanged…

  &.is-warning {
    &::before {
      content: "⚠";
      color: @accent;
    }
  }
}
```

- [ ] **Step 3: Manually verify**

Run `npm run dev`. In devtools console, force a quota failure:

```js
// Replace setItem temporarily
var origSet = localStorage.setItem.bind(localStorage)
localStorage.setItem = function (k, v) {
  if (k === 'markdown-docs') throw new DOMException('QuotaExceededError')
  return origSet(k, v)
}
// Now type something in the editor and wait for autoSave
```

Expected: after 500ms, snackbar appears at the bottom with `⚠ 保存失败，本地空间已满`, fades out after ~3s. Editor keeps accepting input.

Restore with `localStorage.setItem = origSet`.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/main.js src/css/layout.less
git commit -m "feat(ui): warning snackbar variant for storage quota errors"
```

---

## Task 9: Full manual acceptance run

Final pass through every scenario from the spec's test strategy.

- [ ] **Step 1: Clean slate — new user**

```js
localStorage.clear()
location.reload()
```

Expected: demo.md loads, drawer shows 1 entry (the demo).

- [ ] **Step 2: Migrate from old key**

```js
localStorage.clear()
localStorage.setItem('markdown-content', '# 旧数据\n这是迁移前的内容')
location.reload()
```

Expected: editor shows 旧数据, drawer has 1 entry with that title, `localStorage.getItem('markdown-content')` returns `null`.

- [ ] **Step 3: New + switch + switch back**

Create doc A, type "A 的内容", create doc B, type "B 的内容", open drawer, click A. Expected: editor shows "A 的内容". Click B → shows "B 的内容". No cross-contamination.

- [ ] **Step 4: Delete middle draft**

With 3 drafts, hover over a non-current middle one, click its ✕, confirm. Expected: current unchanged, list now shows 2.

- [ ] **Step 5: Delete current draft**

Click toolbar ✕, confirm. Expected: editor swaps to adjacent draft.

- [ ] **Step 6: Delete last draft**

Delete all drafts. Expected: after the last delete, a fresh blank "未命名" draft exists.

- [ ] **Step 7: Mobile layout**

Devtools → 375px width. Repeat Steps 3 and 4.

Expected: everything works with backdrop visible and drawer narrow.

- [ ] **Step 8: Undo chain not broken**

Select text in editor, click a toolbar button (e.g. H1), immediately press Cmd+Z. Expected: undo reverts the toolbar insertion.

- [ ] **Step 9: Autosave survives reload**

Type in editor, wait 1s, reload. Expected: content persists.

- [ ] **Step 10: Commit nothing — this is the acceptance gate**

If any of the above fails, go back to the relevant task. If everything passes, the feature is done.

---

## Self-Review Notes

After drafting, I checked:

- **Spec coverage:** every section in the spec maps to at least one task. Data model → T2. Migration → T3. Drawer shell → T1. List items → T4. New button → T5. Delete flows → T5. Animations → T6. Mobile → T7. Quota handling → T8. Manual acceptance → T9.
- **Placeholder check:** no TODOs, no "similar to above", every step has complete code.
- **Type consistency:** store-shape field names (`version` / `currentId` / `docs` / `content` / `updatedAt` / `createdAt`) are consistent across T2, T3, T4, T5. Function names `switchDoc` / `createDoc` / `deleteDoc` / `deleteCurrent` used consistently.
- **Fixed during review:** initial T6 selector targeted `.doc-item:nth-child` but items are wrapped in `<li>` — corrected to `.doc-list li:nth-child`.
