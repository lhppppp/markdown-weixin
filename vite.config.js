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
