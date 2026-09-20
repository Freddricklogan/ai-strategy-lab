import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.ts'],
      // The DOM layer is covered by the browser smoke test, not by unit tests.
      exclude: ['src/main.ts', 'src/ui.ts', 'src/shell/**', 'src/**/*.d.ts']
    }
  }
});
