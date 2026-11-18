#!/usr/bin/env node
'use strict';

// Guard the no-secret local-plan path and the production execution boundary.
// This is a static contract test: it never dispatches a workflow or contacts Supabase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflowPath = path.resolve(__dirname, '../../../.github/workflows/frame-production-migrations.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const planJob = workflow.split('  plan:\n')[1]?.split('\n  execute:\n')[0] || '';
const executeJob = workflow.split('  execute:\n')[1]?.split('\n  reject-non-main:\n')[0] || '';

test('push to main runs a read-only Frame plan for relevant changes', () => {
  assert.match(workflow, /push:\n\s+branches:\n\s+- main/);
  assert.match(workflow, /paths:\n\s+- 'supabase\/migrations\/\*\*'/);
  assert.match(workflow, /- 'apps\/api\/scripts\/frame-migration-manifest\.cjs'/);
  assert.match(workflow, /- '\.github\/workflows\/frame-production-migrations\.yml'/);
  assert.match(planJob, /FRAME_MODE: \$\{\{ inputs\.mode \|\| 'plan' \}\}/);
});

test('missing credentials skip only remote checks and preserve local plan generation', () => {
  assert.match(planJob, /if \[\[ -z "\$SUPABASE_ACCESS_TOKEN" \|\| -z "\$SUPABASE_DB_PASSWORD" \]\]; then/);
  assert.match(planJob, /if \[\[ "\$GITHUB_EVENT_NAME" == "push" \|\| "\$FRAME_MODE" == "plan" \]\]; then[\s\S]*?exit 0/);
  assert.match(planJob, /- name: Generate immutable plan[\s\S]*?node apps\/api\/scripts\/frame-production-plan\.cjs/);
  assert.match(planJob, /- name: Capture remote migration ledger[\s\S]*?if: env\.SUPABASE_ACCESS_TOKEN != '' && env\.SUPABASE_DB_PASSWORD != ''/);
  assert.match(planJob, /- name: Dry-run complete migration queue[\s\S]*?if: env\.SUPABASE_ACCESS_TOKEN != '' && env\.SUPABASE_DB_PASSWORD != ''/);
});

test('production execution is manual, main-only, environment-gated and approval-bound', () => {
  assert.match(executeJob, /if: github\.ref == 'refs\/heads\/main' && inputs\.mode == 'execute'/);
  assert.match(executeJob, /needs: plan/);
  assert.match(executeJob, /environment: zion-production-migrations/);
  assert.match(executeJob, /FRAME_APPROVAL_ID: \$\{\{ inputs\.approval_id \}\}/);
  assert.match(executeJob, /EXPECTED_PLAN_SHA256: \$\{\{ inputs\.expected_plan_sha256 \}\}/);
  assert.match(executeJob, /test -n "\$ZION_SUPABASE_DB_URL"/);
  assert.match(executeJob, /python apps\/api\/scripts\/frame-execute-locked\.py -- supabase db push --linked --include-all --yes/);
  assert.doesNotMatch(executeJob, /supabase db push --linked --include-all --yes\n/);
});

console.log('Frame production workflow contract verified.');
