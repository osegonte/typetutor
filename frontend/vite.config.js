import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';

  return {
    plugins: [
      react({
        // Enable React Fast Refresh
        fastRefresh: isDevelopment,
        // Optimize JSX in production
        jsxRuntime: 'automatic'
      })
    ],

    // Path resolution
    resolve: {
      alias: {
        '@': resolve(process.cwd(), 'src'),
        '@components': resolve(process.cwd(), 'src/components'),
        '@hooks': resolve(process.cwd(), 'src/hooks'),
        '@utils': resolve(process.cwd(), 'src/utils'),
        '@context': resolve(process.cwd(), 'src/context'),
        '@services': resolve(process.cwd(), 'src/services')
      }
    },

    // Development server configuration
    server: {
      port: 5173,
      host: true,
      cors: true,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:5001',
          changeOrigin: true,
          secure: false
        }
      }
    },

    // Build optimizations
    build: {
      target: 'es2020',
      outDir: 'dist',
      sourcemap: isDevelopment,
      minify: isProduction ? 'terser' : false,
      
      // Rollup options for code splitting
      rollupOptions: {
        output: {
          // Manual chunks for better caching
          manualChunks: {
            // React ecosystem
            'react-vendor': ['react', 'react-dom'],
            
            // UI libraries
            'ui-vendor': ['lucide-react'],
            
            // Utilities
            'utils-vendor': ['lodash', 'date-fns']
          }
        }
      },

      // Chunk size warnings
      chunkSizeWarningLimit: 1000
    },

    // CSS preprocessing
    css: {
      postcss: './postcss.config.js'
    },

    // Dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'lucide-react',
        'lodash',
        'date-fns'
      ]
    },

    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __DEV__: JSON.stringify(isDevelopment)
    }
  };
});
