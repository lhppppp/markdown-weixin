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
