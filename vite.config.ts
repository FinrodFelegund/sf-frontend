import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path, { resolve } from "path"

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    },
  },
  plugins: [react()],
  build: {
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        sidepanel: resolve(__dirname, "index.html"),
        popup: resolve(__dirname, 'popup.html'),
      }
    },
    chunkSizeWarningLimit: 1000,
  }
})
