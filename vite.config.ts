import { defineConfig } from 'vite';

// The Pages URL is https://freddricklogan.github.io/ai-strategy-lab/ — the base must match.
export default defineConfig({
  base: '/ai-strategy-lab/',
  build: {
    target: 'es2022',
    sourcemap: false,
    // One entry chunk; no vendor split needed at this size. modulePreload is bundled, not inline.
    modulePreload: { polyfill: true }
  }
});
