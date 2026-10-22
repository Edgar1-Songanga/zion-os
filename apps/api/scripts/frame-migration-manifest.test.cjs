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
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  assert.deepEqual(first.migrations.map((migration) => migration.name), expectedFiles);

  const timestampVersions = new Set();
  const legacyPrefixCounts = new Map();
  const versionLengths = new Set();
  for (const migration of first.migrations) {
    assert.match(migration.name, /^(\d{8}|\d{14})_.+\.sql$/);
    const expectedVersion = migration.name.slice(0, migration.name.indexOf('_'));
    assert.equal(migration.version, expectedVersion);
    assert.ok([8, 14].includes(migration.version.length));
    if (migration.version.length === 14) {
      assert.ok(!timestampVersions.has(migration.version), `duplicate timestamp version: ${migration.version}`);
      timestampVersions.add(migration.version);
    } else {
      legacyPrefixCounts.set(migration.version, (legacyPrefixCounts.get(migration.version) || 0) + 1);
    }
    versionLengths.add(migration.version.length);
    assert.match(migration.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isInteger(migration.bytes) && migration.bytes >= 0);

    const content = fs.readFileSync(path.join(migrationsDir, migration.name));
    assert.equal(migration.bytes, content.length);
    assert.equal(migration.sha256, crypto.createHash('sha256').update(content).digest('hex'));
  }

  assert.ok(versionLengths.has(8), 'legacy YYYYMMDD migration names must be supported');
  assert.ok(versionLengths.has(14), 'YYYYMMDDHHMMSS migration names must be supported');
  assert.ok([...legacyPrefixCounts.values()].some((count) => count > 1),
    'legacy migrations may share a date prefix and must not be rejected as duplicate timestamps');
});
