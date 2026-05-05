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
