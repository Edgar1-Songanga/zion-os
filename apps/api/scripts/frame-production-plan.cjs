#!/usr/bin/env node
'use strict';

// Build a deterministic, target-bound Frame plan. This script is read-only:
// it inventories migration bytes and never connects to Supabase or executes SQL.
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const manifestScript = path.join(__dirname, 'frame-migration-manifest.cjs');

function buildPlan({ commitSha, projectRef }) {
  if (!/^[a-f0-9]{40}$/.test(commitSha || '')) {
    throw new Error('GITHUB_SHA must be a full 40-character commit SHA.');
  }
  if (!/^[a-z0-9]{20}$/.test(projectRef || '')) {
    throw new Error('ZION_SUPABASE_PROJECT_REF must be a 20-character project ref.');
  }

  const manifest = JSON.parse(execFileSync(process.execPath, [manifestScript], { encoding: 'utf8' }));
  const payload = {
    schema_version: 1,
    target: 'production',
    project_ref: projectRef,
    commit_sha: commitSha,
    manifest,
  };
  const canonical = JSON.stringify(payload);
  const planSha256 = crypto.createHash('sha256').update(canonical).digest('hex');
  return { ...payload, plan_sha256: planSha256 };
}

function main() {
  const plan = buildPlan({
    commitSha: process.env.GITHUB_SHA,
    projectRef: process.env.ZION_SUPABASE_PROJECT_REF,
  });
  process.stdout.write(process.argv.includes('--hash-only')
    ? `${plan.plan_sha256}\n`
    : `${JSON.stringify(plan, null, 2)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`Frame production plan failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { buildPlan };
