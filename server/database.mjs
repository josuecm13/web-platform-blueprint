import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { homepage } from './catalog.mjs';

export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path, { timeout: 2500 });
  try {
    db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    db.exec('BEGIN IMMEDIATE');
    const { user_version: version } = db.prepare('PRAGMA user_version').get();
    if (version > 1) throw new Error('This database requires a newer version of Blueprint.');
    if (!version) {
      db.exec(`
        CREATE TABLE layouts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          saved_at TEXT NOT NULL,
          layout_count INTEGER NOT NULL,
          project TEXT NOT NULL CHECK (json_valid(project))
        ) STRICT;
        CREATE TABLE components (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          path TEXT NOT NULL,
          description TEXT NOT NULL,
          position INTEGER NOT NULL
        ) STRICT;
        CREATE TABLE component_references (
          component_id TEXT NOT NULL REFERENCES components(id),
          key TEXT NOT NULL,
          label TEXT NOT NULL,
          url TEXT NOT NULL,
          PRIMARY KEY (component_id, key)
        ) STRICT;
        CREATE INDEX layouts_newest ON layouts(saved_at DESC, id);
      `);
      const component = db.prepare('INSERT INTO components VALUES (?, ?, ?, ?, ?)');
      const reference = db.prepare('INSERT INTO component_references VALUES (?, ?, ?, ?)');
      homepage.forEach(([id, name, anchor, description, refs], index) => {
        component.run(id, name, `/#${anchor}`, description, index);
        for (const [key, label, url] of refs) reference.run(id, key, label, url);
      });
      db.exec('PRAGMA user_version = 1');
    }
    db.exec('COMMIT');
  } catch (error) {
    db.close();
    throw error;
  }

  const list = db.prepare('SELECT id, name, saved_at AS savedAt, layout_count AS layoutCount FROM layouts ORDER BY saved_at DESC, id LIMIT 100');
  const read = db.prepare('SELECT id, name, saved_at AS savedAt, project FROM layouts WHERE id = ?');
  const insert = db.prepare('INSERT INTO layouts VALUES (?, ?, ?, ?, ?)');
  const components = db.prepare('SELECT id, name, path, description FROM components ORDER BY position');
  const references = db.prepare('SELECT component_id AS componentId, key, label, url FROM component_references ORDER BY component_id, key');
  return {
    layouts: () => list.all(),
    layout(id) {
      const entry = read.get(id);
      return entry && { ...entry, project: JSON.parse(entry.project) };
    },
    save(name, project) {
      const entry = { id: randomUUID(), name, savedAt: new Date().toISOString(), layoutCount: project.sheets.length };
      insert.run(entry.id, entry.name, entry.savedAt, entry.layoutCount, JSON.stringify(project));
      return entry;
    },
    components: () => components.all(),
    references: () => references.all(),
    close: () => db.close(),
  };
}
