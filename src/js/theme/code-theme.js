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
