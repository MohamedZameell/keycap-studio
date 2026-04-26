import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split heavy stable deps into their own chunks so a route change
        // doesn't re-download Three.js, R3F, drei, or Supabase.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('three/')) return 'three'
          if (id.includes('@react-three/')) return 'r3f'
          if (id.includes('@supabase/')) return 'supabase'
          return undefined
        },
      },
    },
  },
})
