import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Builds only the Date & Time utility into `datetime-extension/app/` with
// relative asset paths so the output loads from a `chrome-extension://` or
// `moz-extension://` origin.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'datetime-extension/app',
    emptyOutDir: true,
    rollupOptions: {
      input: { index: 'datetime-extension.html' },
    },
  },
})
