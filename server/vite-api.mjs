import { resolve } from 'node:path';
import { createApi } from './api.mjs';

function mount(server) {
  // Open SQLite on the first API request. Static-only builds and routes need no database file.
  let store;
  let api;
  let opening;
  server.middlewares.use(async (req, res, next) => {
    if (!/^\/api(?:[/?]|$)/.test(req.url ?? '')) return next();
    const host = req.headers.host ?? '';
    const allowed = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host) &&
      (!req.headers.origin || req.headers.origin === `http://${host}` || req.headers.origin === `https://${host}`);
    if (!allowed) {
      res.writeHead(403, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ error: 'The SQLite API is available on localhost.' }));
    }
    try {
      opening ??= import('./database.mjs').then(({ openDatabase }) => {
        const file = process.env.BLUEPRINT_DB_PATH || resolve(server.config.root, '.blueprint/blueprint.sqlite');
        store = openDatabase(file);
        api = createApi(store);
      }).catch(error => { opening = undefined; throw error; });
      await opening;
      return api(req, res, next);
    } catch (error) {
      console.error(error);
      res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ error: 'The SQLite database could not be opened.' }));
    }
  });
  server.httpServer?.once('close', () => store?.close());
}

export function blueprintApi() {
  return { name: 'blueprint-sqlite-api', configureServer: mount, configurePreviewServer: mount };
}
