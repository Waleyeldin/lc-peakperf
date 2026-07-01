import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // react-grid-layout (legacy build) and react-draggable read `process.env`,
  // which doesn't exist in the browser. Pre-bundling them lets esbuild inline
  // the value; the define is a belt-and-suspenders fallback for any bare ref.
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
  },
  optimizeDeps: {
    include: ['react-grid-layout/legacy', 'react-draggable', 'react-resizable'],
  },
}))
