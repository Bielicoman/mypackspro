import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * O Vite injeta `<script type="module" crossorigin>` no HTML mesmo quando o
 * bundle é IIFE. Sob file:// — que é como o CEP carrega o painel — um script
 * de módulo é bloqueado por CORS e o painel abre em branco, sem erro visível.
 *
 * Como o bundle já é IIFE, um script clássico funciona e elimina o problema.
 */
function cepClassicScript(): Plugin {
  return {
    name: 'cep-classic-script',
    transformIndexHtml: {
      order: 'post',
      handler: (html) =>
        html
          // `type="module"` já implicava adiamento; ao removê-lo é preciso
          // repor `defer`, senão o script corre antes de #root existir e o
          // painel abre em branco.
          .replace(/\stype="module"/g, ' defer')
          .replace(/\scrossorigin/g, ''),
    },
  };
}

export default defineConfig({
  root: 'src/panel',
  base: './',
  plugins: [react(), cepClassicScript()],
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    // Exatamente o CEF que o Premiere 26.3.2 embarca (medido na Fase 0).
    target: 'chrome99',
    assetsInlineLimit: 0,
    minify: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        // IIFE evita a classe inteira de problemas de módulo sob file://.
        // O CSS é injetado em runtime pelo próprio bundle, sem arquivo extra.
        format: 'iife',
        entryFileNames: 'panel.js',
        assetFileNames: 'panel.[ext]',
      },
    },
  },
});
