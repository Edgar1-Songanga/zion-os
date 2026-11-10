'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { buildPlan } = require('./frame-production-plan.cjs');

const commitSha = 'a'.repeat(40);
const projectRef = 'w'.repeat(20);

test('Frame plan binds the complete deterministic manifest to commit and production target', () => {
  const first = buildPlan({ commitSha, projectRef });
  const second = buildPlan({ commitSha, projectRef });

  assert.deepEqual(first, second);
  assert.equal(first.schema_version, 1);
  assert.equal(first.target, 'production');
  assert.equal(first.commit_sha, commitSha);
  assert.equal(first.project_ref, projectRef);
  assert.ok(first.manifest.count > 0);
  assert.equal(first.manifest.count, first.manifest.migrations.length);
  assert.match(first.plan_sha256, /^[a-f0-9]{64}$/);
});

test('Frame plan hash changes when the commit or target changes', () => {
  const baseline = buildPlan({ commitSha, projectRef });
  const otherCommit = buildPlan({ commitSha: 'b'.repeat(40), projectRef });
  const otherTarget = buildPlan({ commitSha, projectRef: 'x'.repeat(20) });

  assert.notEqual(baseline.plan_sha256, otherCommit.plan_sha256);
  assert.notEqual(baseline.plan_sha256, otherTarget.plan_sha256);
});

test('Frame refuses abbreviated commits and malformed project refs', () => {
  assert.throws(() => buildPlan({ commitSha: 'abc123', projectRef }), /full 40-character/);
  assert.throws(() => buildPlan({ commitSha, projectRef: 'invalid' }), /project ref/);
});
