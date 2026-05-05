import './css/index.less'

import './js/showdown-plugins/showdown-prettify-for-wechat.js'
import './js/showdown-plugins/showdown-github-task-list.js'
import './js/showdown-plugins/showdown-footnote.js'

import './js/google-code-prettify/run_prettify.js'

import initCodeTheme from './js/theme/code-theme.js'
import initPageTheme from './js/theme/page-theme.js'

import showdown from './js/showdown.cjs'
import Clipboard from './js/clipboard.min.cjs'

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

    if (config.lineStart) {
      var lineStart = text.lastIndexOf('\n', start - 1) + 1
      var insertion = config.before + selected + config.after
      input.value = text.substring(0, lineStart) + insertion + text.substring(end)
      input.selectionStart = lineStart + config.before.length
      input.selectionEnd = lineStart + config.before.length + selected.length
    } else {
      var insertion = config.before + selected + config.after
      input.value = text.substring(0, start) + insertion + text.substring(end)
      input.selectionStart = start + config.before.length
      input.selectionEnd = start + config.before.length + selected.length
    }

    input.focus()
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
      document.getElementById('input').value = text
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

  var menuToggle = document.querySelector('.mobile-menu-toggle')
  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      document.querySelector('.topheader').classList.toggle('menu-open')
    })
  }
}

// Init
if (loadSavedContent()) {
  bindEvents()
  bindToolbar()
  updateOutput()
  initCodeTheme()
  initPageTheme()
} else {
  loadDemo()
    .catch(function () {})
    .finally(function () {
      bindEvents()
      bindToolbar()
      updateOutput()
      initCodeTheme()
      initPageTheme()
    })
}
