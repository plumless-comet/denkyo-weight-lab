
import { defineConfig } from 'vite'
import { cpSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineConfig({
  base: '/denkyo-weight-lab/',
  plugins: [
    {
      name: 'copy-images-to-dist',
      closeBundle() {
        const source = resolve(process.cwd(), 'images')
        const destination = resolve(process.cwd(), 'dist/images')

        if (existsSync(source)) {
          cpSync(source, destination, { recursive: true })
          console.log('images フォルダを dist/images にコピーしました')
        }
      }
    }
  ]
})
