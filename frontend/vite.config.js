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
      
      // Optimize terser options for better compression
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug']},
        mangle: {
          safari10: true},
        format: {
          comments: false}} : {},
      
      rollupOptions: {
        output: {
          // Optimized chunking strategy
          manualChunks: {
            // React core
            'react-vendor': ['react', 'react-dom'],
            
            // UI libraries
            'ui-vendor': ['lucide-react'],
            
            ...(isProduction && {
            })},
          
          // Optimize chunk file names
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
            return `js/${facadeModuleId}-[hash].js`;
          },
          
          assetFileNames: (assetInfo) => {
            const extType = assetInfo.name.split('.')[1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return `images/[name]-[hash][extname]`;
            }
            if (/css/i.test(extType)) {
              return `css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          }}},

      // Optimize chunk size warnings
      chunkSizeWarningLimit: 800,
      
      // Enable CSS code splitting
      cssCodeSplit: true,
      
      // Optimize asset inlining
      assetsInlineLimit: 4096, // 4kb
    },

    css: {
      postcss: './postcss.config.js',
      // Enable CSS source maps only in development
      devSourcemap: isDevelopment},

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'lucide-react'
      ]
    },

    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __DEV__: JSON.stringify(isDevelopment),
      
      // Remove debug code in production
      ...(isProduction && {
        'process.env.NODE_ENV': JSON.stringify('production')})},

    // Performance optimizations
    esbuild: {
      // Remove console.log in production
      drop: isProduction ? ['console', 'debugger'] : []},

    // Preview configuration for local testing
    preview: {
      port: 4173,
      host: true}};
});