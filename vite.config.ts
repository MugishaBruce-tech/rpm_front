import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // Increase limit to 5MB
      },
      manifest: {
        name: 'Brarudi RPM Tracker',
        short_name: 'RPM Tracker',
        description: 'Tracker for RPM and Inventory',
        theme_color: '#168c17',
        icons: [
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    }),
    visualizer({
      open: true,
      filename: 'bundle-stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Visualization & Document tools
            if (id.includes('highcharts')) return 'vendor-highcharts'
            if (id.includes('echarts')) return 'vendor-echarts'
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-recharts'
            if (id.includes('exceljs')) return 'vendor-exceljs'
            
            // UI Frameworks & Components
            if (id.includes('@mui')) return 'vendor-mui'
            if (id.includes('@radix-ui')) return 'vendor-radix'
            if (id.includes('lucide-react')) return 'vendor-lucide'
            if (id.includes('framer-motion')) return 'vendor-framer'
            
            // Utilities
            if (id.includes('lodash')) return 'vendor-lodash'
            if (id.includes('date-fns')) return 'vendor-date-fns'

            // Catch-all removal: Let Vite handle the rest of node_modules 
            // to avoid circular dependency issues between libraries.
            if (id.includes('/node_modules/react/') || 
                id.includes('/node_modules/react-dom/') || 
                id.includes('/node_modules/react-router/')) {
              return 'vendor-react-core'
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
