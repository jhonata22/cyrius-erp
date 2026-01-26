import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // <--- MUDAMOS AQUI (entre aspas)
    port: 5173,
    watch: {
      usePolling: true, // <--- AJUDA O WINDOWS A PERCEBER MUDANÇAS
    }
  }
})