import react from 'c:/Users/Admin/Documents/antigravity/hopeful-hawking/web/node_modules/@vitejs/plugin-react/dist/index.js'
import { defineConfig } from 'c:/Users/Admin/Documents/antigravity/hopeful-hawking/web/node_modules/vite/dist/node/index.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCAL_NODE_MODULES = 'c:/Users/Admin/Documents/antigravity/hopeful-hawking/web/node_modules'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^react$/, replacement: path.resolve(LOCAL_NODE_MODULES, 'react') },
      { find: /^react\/(.*)/, replacement: path.resolve(LOCAL_NODE_MODULES, 'react') + '/$1' },
      { find: /^react-dom$/, replacement: path.resolve(LOCAL_NODE_MODULES, 'react-dom') },
      { find: /^react-dom\/(.*)/, replacement: path.resolve(LOCAL_NODE_MODULES, 'react-dom') + '/$1' },
      { find: /^three$/, replacement: path.resolve(LOCAL_NODE_MODULES, 'three') },
      { find: /^three\/(.*)/, replacement: path.resolve(LOCAL_NODE_MODULES, 'three') + '/$1' },
      { find: /^zustand$/, replacement: path.resolve(LOCAL_NODE_MODULES, 'zustand') },
      { find: /^zustand\/(.*)/, replacement: path.resolve(LOCAL_NODE_MODULES, 'zustand') + '/$1' },
      { find: /^lucide-react$/, replacement: path.resolve(LOCAL_NODE_MODULES, 'lucide-react') },
      { find: /^lucide-react\/(.*)/, replacement: path.resolve(LOCAL_NODE_MODULES, 'lucide-react') + '/$1' },
      { find: /^@mlightcad\/three-viewcube$/, replacement: path.resolve(LOCAL_NODE_MODULES, '@mlightcad/three-viewcube') },
      { find: /^@mlightcad\/three-viewcube\/(.*)/, replacement: path.resolve(LOCAL_NODE_MODULES, '@mlightcad/three-viewcube') + '/$1' },
    ],
  },
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: ['**/node_modules/**', '**/node_modules_corrupt/**'],
    },
    fs: {
      allow: [
        'H:/My Drive/NMKBim/web',
        'c:/Users/Admin/Documents/antigravity/hopeful-hawking/web',
      ],
    },
  },
})
