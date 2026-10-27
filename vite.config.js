import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({base:'./',build:{rollupOptions:{input:{home:resolve('index.html'),library:resolve('library/index.html'),workspace:resolve('workspace/index.html'),components:resolve('components/index.html'),playground:resolve('playground/index.html'),preferences:resolve('preferences/index.html')}}}});
