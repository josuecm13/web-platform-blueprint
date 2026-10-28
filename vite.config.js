import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  base: './',
  plugins: [{
    name: 'preserve-entry-render-blocking',
    apply: 'build',
    // Vite recreates bundled module tags and drops the source tag's blocking
    // attribute. Keep initialization ahead of the first paint in production too.
    transformIndexHtml: {
      order: 'post',
      handler: html => html.replace(/<script\b[^>]*>/g, tag =>
        /\btype="module"/.test(tag) && !/\bblocking=/.test(tag)
          ? tag.replace('<script', '<script blocking="render"')
          : tag),
    },
  }],
  build: { rollupOptions: { input: {
    home: resolve('index.html'),
    library: resolve('library/index.html'),
    workspace: resolve('workspace/index.html'),
    components: resolve('components/index.html'),
    playground: resolve('playground/index.html'),
    preferences: resolve('preferences/index.html'),
  } } },
});
