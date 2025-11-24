import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    base: './', // Ensures assets are relative so it can run in subfolders
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY)
    },
    build: {
      chunkSizeWarningLimit: 2000, // Suppress warnings for large PDF/PPTX libraries
      outDir: 'dist',
    }
  }
})