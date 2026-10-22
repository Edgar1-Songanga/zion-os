#!/usr/bin/env node
'use strict';

// Read-only inventory for Frame planning. This script NEVER connects to a
// database and NEVER executes SQL. It emits deterministic checksums so a plan
// can later be approved against exact version-controlled migration contents.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');

function main() {
  if (!fs.existsSync(migrationsDir) || !fs.statSync(migrationsDir).isDirectory()) {
    throw new Error(`Migration directory not found: ${migrationsDir}`);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  if (files.length === 0) throw new Error('No SQL migrations found.');

  const seenTimestampVersions = new Set();
  const manifest = files.map((name) => {
    // Preserve the repository's two established naming forms: YYYYMMDD_name
    // and YYYYMMDDHHMMSS_name. The date alone is not unique for legacy files.
    const match = name.match(/^(\d{8}|\d{14})_(.+)\.sql$/);
    if (!match) throw new Error(`Invalid migration filename: ${name}`);
    const [, version] = match;
    // Only 14-digit versions are intended to be unique timestamps. Multiple
    // legacy migrations may legitimately share the same YYYYMMDD prefix.
    if (version.length === 14) {
      if (seenTimestampVersions.has(version)) {
        throw new Error(`Duplicate migration version: ${version}`);
      }
      seenTimestampVersions.add(version);
    }

    const content = fs.readFileSync(path.join(migrationsDir, name));
    return {
      version,
      name,
      sha256: crypto.createHash('sha256').update(content).digest('hex'),
      bytes: content.length,
    };
  });

  process.stdout.write(`${JSON.stringify({ mode: 'read-only', count: manifest.length, migrations: manifest }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`Frame migration manifest failed: ${error.message}\n`);
  process.exitCode = 1;
}
