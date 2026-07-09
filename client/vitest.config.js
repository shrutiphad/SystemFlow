import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://localhost:5173' },
    },
    setupFiles: './src/test/setup.js',
    globals: true,
    // These are integration tests against ONE shared live backend - running
    // the files in parallel makes three workers hit /register (bcrypt-bound)
    // simultaneously and the first test in each file flakes on the 1s findBy
    // timeout. Serial execution is correct for a shared-backend suite.
    fileParallelism: false,
  },
});
