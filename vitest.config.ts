import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@react-ts/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@react-ts/scheduler': path.resolve(__dirname, 'packages/scheduler/src/index.ts'),
      '@react-ts/react': path.resolve(__dirname, 'packages/react/src/index.ts'),
      '@react-ts/react-reconciler': path.resolve(__dirname, 'packages/react-reconciler/src/index.ts'),
      '@react-ts/react-dom': path.resolve(__dirname, 'packages/react-dom/src/index.ts'),
      'react': path.resolve(__dirname, 'packages/react/src/index.ts'),
      'react-dom': path.resolve(__dirname, 'packages/react-dom/src/index.ts')
    }
  }
});
