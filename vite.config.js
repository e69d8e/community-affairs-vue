import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
export default defineConfig({
    plugins: [vue()],
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
});
