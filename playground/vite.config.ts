import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss()
  ],
  resolve: {
    alias: {
      'react': path.resolve(__dirname, '../packages/react/src/index.ts'),
      'react/jsx-runtime': path.resolve(__dirname, '../packages/react/src/jsx.ts'),
      'react/jsx-dev-runtime': path.resolve(__dirname, '../packages/react/src/jsx.ts'),
      'react-dom/client': path.resolve(__dirname, '../packages/react-dom/src/client.ts'),
      'react-dom': path.resolve(__dirname, '../packages/react-dom/src/index.ts'),
      '@react-ts/shared': path.resolve(__dirname, '../packages/shared/src/index.ts'),
      '@react-ts/scheduler': path.resolve(__dirname, '../packages/scheduler/src/index.ts'),
      '@react-ts/react': path.resolve(__dirname, '../packages/react/src/index.ts'),
      '@react-ts/react-reconciler': path.resolve(__dirname, '../packages/react-reconciler/src/index.ts'),
      '@react-ts/react-dom': path.resolve(__dirname, '../packages/react-dom/src/index.ts')
    }
  },
  esbuild: {
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment'
  },
  server: {
    port: 5173,
    open: false
  }
});
