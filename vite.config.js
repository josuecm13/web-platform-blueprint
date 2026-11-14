import { defineConfig } from 'vite';
import { dirname, relative, resolve, sep } from 'node:path';
import { specimenLink } from './src/specimen-registry.ts';

const root = resolve('.');
export default defineConfig({
  base: './',
  plugins: [{
    name: 'resolve-specimen-links',
    transformIndexHtml: {
      order: 'pre',
      handler(html, { filename }) {
        const relativeRoot = relative(dirname(filename), root).split(sep).join('/');
        const siteRoot = relativeRoot ? `${relativeRoot}/` : './';
        return html.replace(/<a data-specimen-link="([\w-]+)">/g, (_, id) =>
          `<a href="${specimenLink(id, siteRoot)}">`);
      },
    },
  }, {
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
    create: resolve('create/index.html'),
  } } },
});
