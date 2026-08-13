import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Builds the same app into `extensions/developer-utilities/app/` with relative
// asset paths so the output loads from a `chrome-extension://` or
// `moz-extension://` origin.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'extensions/developer-utilities/app',
    emptyOutDir: true,
  },
})
