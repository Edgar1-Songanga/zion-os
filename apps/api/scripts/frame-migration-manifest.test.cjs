'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const script = path.join(__dirname, 'frame-migration-manifest.cjs');
const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');

function runManifest() {
  return JSON.parse(execFileSync(process.execPath, [script], { encoding: 'utf8' }));
}

test('Frame migration manifest is read-only, deterministic, and complete', () => {
  const first = runManifest();
  const second = runManifest();

  assert.equal(first.mode, 'read-only');
  assert.ok(Number.isInteger(first.count) && first.count > 0);
  assert.equal(first.count, first.migrations.length);
  assert.deepEqual(first, second, 'repeated runs must produce identical manifests');

  const expectedFiles = fs.readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, 'en'));
  assert.deepEqual(first.migrations.map((migration) => migration.name), expectedFiles);

  const versions = new Set();
  for (const migration of first.migrations) {
    assert.match(migration.name, /^\d{14}_.+\.sql$/);
    assert.equal(migration.version, migration.name.slice(0, 14));
    assert.ok(!versions.has(migration.version), `duplicate version: ${migration.version}`);
    versions.add(migration.version);
    assert.match(migration.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isInteger(migration.bytes) && migration.bytes >= 0);

    const content = fs.readFileSync(path.join(migrationsDir, migration.name));
    assert.equal(migration.bytes, content.length);
    assert.equal(migration.sha256, crypto.createHash('sha256').update(content).digest('hex'));
  }
});
