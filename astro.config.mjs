import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  integrations: [icon()],
  vite: { plugins: [tailwindcss()] },
  markdown: { syntaxHighlight: false },
});
