import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';

  return {
    plugins: [
      react({
        fastRefresh: isDevelopment,
        jsxRuntime: 'automatic'
      })
    ],

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

    server: {
      port: 5173,
      host: true,
      cors: true
    },

    build: {
      target: 'es2020',
      outDir: 'dist',
      sourcemap: false,
      minify: isProduction ? 'terser' : false,
      
      rollupOptions: {
        output: {
          manualChunks: {
            // Only include chunks that actually have content
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['lucide-react'],
            // Remove utils-vendor since lodash might not be used enough to warrant a separate chunk
          }
        }
      },

      chunkSizeWarningLimit: 1000
    },

    css: {
      postcss: './postcss.config.js'
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'lucide-react',
        'lodash'
      ]
    },

    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __DEV__: JSON.stringify(isDevelopment)
    }
  };
});