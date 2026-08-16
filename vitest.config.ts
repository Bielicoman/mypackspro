import { defineConfig } from 'vitest/config';

/**
 * Config própria do Vitest.
 *
 * O `vite.config.ts` aponta `root` para `src/panel` (é a raiz do painel), o que
 * faria o Vitest procurar testes lá dentro. Aqui a raiz volta a ser o projeto.
 */
export default defineConfig({
  test: {
    root: '.',
    include: ['tests/**/*.test.ts'],
  },
});
