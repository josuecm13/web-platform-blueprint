import { isProject } from '../src/creator/model.ts';

const maxBytes = 1024 * 1024;
class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(JSON.stringify(data));
}

async function payload(req) {
  if (req.headers['content-type']?.split(';', 1)[0].trim() !== 'application/json') throw new RequestError(415, 'Send application/json.');
  if (Number(req.headers['content-length']) > maxBytes) throw new RequestError(413, 'Layout project exceeds 1 MiB.');
  const chunks = [];
  let size = 0;
  // Retain the connection long enough to respond even if chunked input exceeds the limit.
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > maxBytes) throw new RequestError(413, 'Layout project exceeds 1 MiB.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new RequestError(400, 'Invalid JSON.');
  }
}

export function createApi(store) {
  return async (req, res, next) => {
    const path = (req.url ?? '').split('?', 1)[0];
    if (path !== '/api' && !path.startsWith('/api/')) return next();
    try {
      const id = /^\/api\/layouts\/([a-f\d-]{36})$/.exec(path)?.[1];
      const collection = path === '/api/layouts';
      const catalog = path === '/api/components' ? store.components : path === '/api/references' ? store.references : undefined;
      if (!collection && !id && !catalog) return json(res, 404, { error: 'Endpoint not found.' });

      if (req.method === 'GET') {
        if (collection) return json(res, 200, { layouts: store.layouts() });
        if (catalog) return json(res, 200, { [path.split('/').at(-1)]: catalog() });
        const entry = store.layout(id);
        return entry ? json(res, 200, entry) : json(res, 404, { error: 'Saved project not found.' });
      }
      if (collection && req.method === 'POST') {
        const data = await payload(req);
        const name = typeof data?.name === 'string' ? data.name.trim() : '';
        if (!name || name.length > 90 || !isProject(data.project)) throw new RequestError(422, 'Provide a name and a valid Layout Studio project.');
        const entry = store.save(name, data.project);
        return json(res, 201, entry, { Location: `/api/layouts/${entry.id}` });
      }
      return json(res, 405, { error: 'Method not allowed.' }, { Allow: collection ? 'GET, POST' : 'GET' });
    } catch (error) {
      if (!(error instanceof RequestError)) console.error(error);
      json(res, error instanceof RequestError ? error.status : 500, { error: error instanceof RequestError ? error.message : 'The database request failed.' });
    }
  };
}
