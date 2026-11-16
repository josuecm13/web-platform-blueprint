import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApi } from '../server/api.mjs';
import { openDatabase } from '../server/database.mjs';
import { block, sheet } from '../src/creator/model.ts';

test('SQLite persists linked layouts and seeds component references only once', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'blueprint-db-'));
  const file = join(directory, 'studio.sqlite');
  const first = sheet('Landing', 'landing');
  const next = sheet('Next', 'flow');
  first.next = next.id;
  next.origin = { id: first.id, relation: 'next', handoff: 'Continue from the landing layout.' };
  const project = { active: first.id, sheets: [first, next] };
  let db = openDatabase(file);
  try {
    const saved = db.save('Prototype', project);
    const catalog = db.components();
    const references = db.references();
    db.close();
    db = openDatabase(file);
    assert.deepEqual(db.layout(saved.id).project, project);
    assert.equal(db.layouts()[0].layoutCount, 2);
    assert.deepEqual(db.components(), catalog);
    assert.deepEqual(db.references(), references);
    assert.ok(references.every(ref => catalog.some(component => component.id === ref.componentId)));
  } finally {
    db.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('the API validates, creates, lists, and reads a workspace', async t => {
  const db = openDatabase(':memory:');
  const api = createApi(db);
  const server = createServer((req, res) => api(req, res, () => { res.writeHead(404).end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(() => { db.close(); resolve(); })));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = body => fetch(`${base}/api/layouts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  assert.equal((await post('{')).status, 400);
  assert.equal((await post(JSON.stringify({ name: 'Invalid', project: { active: 'bad', sheets: [] } }))).status, 422);
  assert.equal((await post(' '.repeat(1024 * 1024 + 1))).status, 413);
  const layout = sheet('Study', 'blank');
  layout.blocks.push(block('group'));
  layout.blocks[0].children.push(block('media'));
  const savedProject = { active: layout.id, sheets: [layout] };
  const saved = await post(JSON.stringify({ name: 'Study backup', project: savedProject }));
  assert.equal(saved.status, 201);
  const retrieved = await fetch(base + saved.headers.get('location'));
  assert.deepEqual((await retrieved.json()).project, savedProject);
  const list = await fetch(`${base}/api/layouts`);
  assert.equal((await list.json()).layouts.length, 1);
  assert.equal((await fetch(`${base}/api/components`, { method: 'POST' })).status, 405);
});
