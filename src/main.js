import './css/index.less'

import './js/showdown-plugins/showdown-prettify-for-wechat.js'
import './js/showdown-plugins/showdown-github-task-list.js'
import './js/showdown-plugins/showdown-footnote.js'

import './js/google-code-prettify/run_prettify.js'

import initCodeTheme from './js/theme/code-theme.js'
import initPageTheme from './js/theme/page-theme.js'

import showdown from './js/showdown.js'
import Clipboard from './js/clipboard.min.js'

var params = {}
var searchParams = new URLSearchParams(window.location.search)
searchParams.forEach(function (value, key) {
  params[key] = value
})

var converter = new showdown.Converter({
  extensions: ['prettify', 'tasklist', 'footnote'],
  tables: true
})

function showSnackbar(text, variant) {
  var snackbar = document.getElementById('snackbar')
  if (!showSnackbar._default) showSnackbar._default = snackbar.textContent
  snackbar.textContent = text || showSnackbar._default
  snackbar.classList.remove('is-warning')
  if (variant === 'warning') snackbar.classList.add('is-warning')
  snackbar.classList.add('show')
  clearTimeout(showSnackbar._timer)
  showSnackbar._timer = setTimeout(function () {
    snackbar.classList.remove('show')
  }, 3000)
}

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

var store = null
var saveTimer = null
var drawerSetOpen = function () {}   // placeholder until bindDrawer runs

function getStore() { return store }

function setStore(next) {
  store = next
  if (!persist(store)) {
    showSnackbar('保存失败，本地空间已满', 'warning')
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
      showSnackbar('保存失败，本地空间已满', 'warning')
    }
    renderDocList()
  }, 500)
}

function updateStats() {
  var input = document.getElementById('input')
  var text = input.value
  var charCount = text.length
  var lineCount = text ? text.split('\n').length : 0

  document.getElementById('charCount').textContent = '字数：' + charCount.toLocaleString()
  document.getElementById('lineCount').textContent = '行数：' + lineCount.toLocaleString()
}

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
      deleteCurrent()
      return
    }

    var config = TOOLBAR_ACTIONS[action]
    if (!config) return

    var input = document.getElementById('input')
    input.focus()
    var start = input.selectionStart
    var end = input.selectionEnd
    var text = input.value
    var selected = text.substring(start, end) || config.placeholder

    if (config.lineStart) {
      var lineStart = text.lastIndexOf('\n', start - 1) + 1
      input.setSelectionRange(lineStart, end)
      var insertion = config.before + selected + config.after
      document.execCommand('insertText', false, insertion)
      input.setSelectionRange(
        lineStart + config.before.length,
        lineStart + config.before.length + selected.length
      )
    } else {
      var insertion = config.before + selected + config.after
      document.execCommand('insertText', false, insertion)
      input.setSelectionRange(
        start + config.before.length,
        start + config.before.length + selected.length
      )
    }

    updateOutput()
    autoSave()
  })
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
  updateStats()
}

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
      if (!persist(store)) {
        showSnackbar('保存失败，本地空间已满', 'warning')
      }
      document.getElementById('input').value = text
    })
}

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

function switchDoc(id) {
  if (!store || id === store.currentId) return
  clearTimeout(saveTimer)
  var current = getActive(store)
  current.content = document.getElementById('input').value
  current.updatedAt = Date.now()
  store.currentId = id
  var target = getActive(store)
  document.getElementById('input').value = target.content
  document.getElementById('input').scrollTop = 0
  if (!persist(store)) showSnackbar('保存失败，本地空间已满', 'warning')
  updateOutput()
  renderDocList()
  drawerSetOpen(false)
}

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
  if (!persist(store)) showSnackbar('保存失败，本地空间已满', 'warning')
  updateOutput()
  renderDocList()
  drawerSetOpen(false)
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
    var nextIdx = idx > 0 ? idx - 1 : 0
    store.currentId = store.docs[nextIdx].id
  }

  if (wasCurrent) {
    document.getElementById('input').value = getActive(store).content
    document.getElementById('input').scrollTop = 0
  }
  if (!persist(store)) showSnackbar('保存失败，本地空间已满', 'warning')
  if (wasCurrent) updateOutput()
  renderDocList()
}

function deleteCurrent() {
  if (!store) return
  deleteDoc(store.currentId)
}

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
  drawerSetOpen = setOpen

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

function bindEvents() {
  var input = document.getElementById('input')

  input.addEventListener('input', function() {
    updateOutput()
    autoSave()
  })
  input.addEventListener('keydown', updateOutput)
  input.addEventListener('paste', function() {
    updateOutput()
    autoSave()
  })

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
    .catch(function () {
      // If demo fetch failed and there's still no store, create an empty doc
      if (!store) {
        var doc = newDoc('')
        store = { version: STORE_VERSION, currentId: doc.id, docs: [doc] }
        if (!persist(store)) {
          showSnackbar('保存失败，本地空间已满', 'warning')
        }
      }
    })
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
