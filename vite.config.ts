import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Vue 全局注册了 @element-plus/icons-vue 的 Search 图标组件，声明原生 <search> 避免标签解析冲突
          isCustomElement: (tag) => tag === 'search'
        }
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5174,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8082',
        changeOrigin: true
      },
      '/ws': {
        target: 'http://127.0.0.1:8082',
        ws: true,
        changeOrigin: true
      }
    }
  },
  define: {
    global: 'window'
  }
})
