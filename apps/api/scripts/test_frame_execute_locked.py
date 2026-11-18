"""Unit tests for Frame's fail-closed executor plan validation."""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
import types
import unittest
from pathlib import Path

# The validator must be testable without opening a database or installing a
# PostgreSQL driver. Stub only the import surface; no connection is attempted.
psycopg_stub = types.ModuleType("psycopg")
psycopg_types = types.ModuleType("psycopg.types")
psycopg_json = types.ModuleType("psycopg.types.json")
psycopg_json.Jsonb = lambda value: value
psycopg_types.json = psycopg_json
psycopg_stub.types = psycopg_types
sys.modules.setdefault("psycopg", psycopg_stub)
sys.modules.setdefault("psycopg.types", psycopg_types)
sys.modules.setdefault("psycopg.types.json", psycopg_json)

SCRIPT = Path(__file__).with_name("frame-execute-locked.py")
SPEC = importlib.util.spec_from_file_location("frame_executor", SCRIPT)
assert SPEC and SPEC.loader
executor = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = executor
SPEC.loader.exec_module(executor)


class FramePlanValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.migrations_dir = Path(self.temp.name)
        self.name = "20261118000101_test_frame_guard.sql"
        self.sql = b"select 1;\n"
        (self.migrations_dir / self.name).write_bytes(self.sql)
        self.commit = "a" * 40
        self.project_ref = "w" * 20
        self.plan = self.make_plan()
        self.expected_hash = self.plan["plan_sha256"]

    def tearDown(self) -> None:
        self.temp.cleanup()

    def make_plan(self):
        migration = {
            "version": "20261118000101",
            "name": self.name,
            "sha256": hashlib.sha256(self.sql).hexdigest(),
            "bytes": len(self.sql),
        }
        manifest = {"mode": "read-only", "count": 1, "migrations": [migration]}
        payload = {
            "schema_version": 1,
            "target": "production",
            "project_ref": self.project_ref,
            "commit_sha": self.commit,
            "manifest": manifest,
        }
        canonical = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        return {**payload, "plan_sha256": hashlib.sha256(canonical.encode()).hexdigest()}

    def validate(self, plan=None, **overrides):
        args = {
            "expected_hash": self.expected_hash,
            "expected_commit": self.commit,
            "expected_project_ref": self.project_ref,
            "migrations_dir": self.migrations_dir,
        }
        args.update(overrides)
        return executor.validate_plan(plan or self.plan, **args)

    def test_accepts_exact_plan_and_inventory(self):
        self.assertEqual(self.validate(), self.plan)

    def test_validates_the_complete_repository_migration_inventory(self):
        repo_root = SCRIPT.resolve().parents[3]
        env = os.environ.copy()
        env["GITHUB_SHA"] = "d" * 40
        env["ZION_SUPABASE_PROJECT_REF"] = "w" * 20
        completed = subprocess.run(
            ["node", str(SCRIPT.with_name("frame-production-plan.cjs"))],
            check=True,
            capture_output=True,
            text=True,
            env=env,
        )
        real_plan = json.loads(completed.stdout)
        self.assertEqual(
            executor.validate_plan(
                real_plan,
                expected_hash=real_plan["plan_sha256"],
                expected_commit=env["GITHUB_SHA"],
                expected_project_ref=env["ZION_SUPABASE_PROJECT_REF"],
                migrations_dir=repo_root / "supabase" / "migrations",
            ),
            real_plan,
        )

    def test_rejects_modified_plan_hash(self):
        with self.assertRaisesRegex(executor.PlanValidationError, "approved hash"):
            self.validate(expected_hash="b" * 64)

    def test_rejects_wrong_commit_and_target(self):
        with self.assertRaisesRegex(executor.PlanValidationError, "checked-out commit"):
            self.validate(expected_commit="c" * 40)
        wrong_target = dict(self.plan, target="staging")
        with self.assertRaisesRegex(executor.PlanValidationError, "schema or target"):
            self.validate(wrong_target)

    def test_rejects_sql_checksum_drift(self):
        (self.migrations_dir / self.name).write_bytes(b"select 2;\n")
        with self.assertRaisesRegex(executor.PlanValidationError, "checksum drift"):
            self.validate()

    def test_rejects_unlisted_sql_file(self):
        (self.migrations_dir / "20261118000102_unapproved.sql").write_text("select 3;")
        with self.assertRaisesRegex(executor.PlanValidationError, "differ from the approved inventory"):
            self.validate()


    def make_approval(self, **overrides):
        approval = {
            "approval_id": "11111111-1111-4111-8111-111111111111",
            "plan_sha256": self.expected_hash,
            "commit_sha": self.commit,
            "project_ref": self.project_ref,
            "target": "production",
            "migration_count": 1,
            "migration_versions": ["20261118000101"],
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        }
        approval.update(overrides)
        return approval

    def test_accepts_matching_authenticated_single_use_approval(self):
        self.assertIsNone(executor.validate_approval(
            self.make_approval(),
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            approval_id="11111111-1111-4111-8111-111111111111",
            expected_hash=self.expected_hash,
            expected_commit=self.commit,
            expected_project_ref=self.project_ref,
            migration_versions=["20261118000101"],
        ))

    def test_rejects_approval_without_authenticated_actor(self):
        with self.assertRaisesRegex(executor.PlanValidationError, "authenticated administrator"):
            executor.validate_approval(
                self.make_approval(), None,
                approval_id="11111111-1111-4111-8111-111111111111",
                expected_hash=self.expected_hash,
                expected_commit=self.commit,
                expected_project_ref=self.project_ref,
                migration_versions=["20261118000101"],
            )

    def test_rejects_expired_approval(self):
        expired = (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat()
        with self.assertRaisesRegex(executor.PlanValidationError, "expired"):
            executor.validate_approval(
                self.make_approval(expires_at=expired),
                "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                approval_id="11111111-1111-4111-8111-111111111111",
                expected_hash=self.expected_hash,
                expected_commit=self.commit,
                expected_project_ref=self.project_ref,
                migration_versions=["20261118000101"],
            )

    def test_rejects_replayed_or_mismatched_approval_identifier(self):
        with self.assertRaisesRegex(executor.PlanValidationError, "identifier"):
            executor.validate_approval(
                self.make_approval(),
                "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                approval_id="22222222-2222-4222-8222-222222222222",
                expected_hash=self.expected_hash,
                expected_commit=self.commit,
                expected_project_ref=self.project_ref,
                migration_versions=["20261118000101"],
            )

    def test_rejects_plan_commit_target_and_migration_inventory_drift(self):
        cases = [
            ({"plan_sha256": "b" * 64}, self.expected_hash, self.commit, self.project_ref, ["20261118000101"]),
            ({"commit_sha": "c" * 40}, self.expected_hash, self.commit, self.project_ref, ["20261118000101"]),
            ({"project_ref": "x" * 20}, self.expected_hash, self.commit, self.project_ref, ["20261118000101"]),
            ({"target": "staging"}, self.expected_hash, self.commit, self.project_ref, ["20261118000101"]),
            ({"migration_versions": ["20261118000102"]}, self.expected_hash, self.commit, self.project_ref, ["20261118000101"]),
        ]
        for changes, plan_hash, commit, project_ref, versions in cases:
            with self.subTest(changes=changes):
                with self.assertRaisesRegex(executor.PlanValidationError, "does not match"):
                    executor.validate_approval(
                        self.make_approval(**changes),
                        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                        approval_id="11111111-1111-4111-8111-111111111111",
                        expected_hash=plan_hash,
                        expected_commit=commit,
                        expected_project_ref=project_ref,
                        migration_versions=versions,
                    )


    def test_rejects_transaction_pooler_port(self):
        executor.validate_connection_mode(5432)
        with self.assertRaisesRegex(executor.PlanValidationError, "transaction pooling is unsupported"):
            executor.validate_connection_mode(6543)

    def test_rejects_backend_pid_changes_between_transactions(self):
        class FakeResult:
            def __init__(self, value):
                self.value = value

            def fetchone(self):
                return (self.value,)

        class FakeConnection:
            def __init__(self, pid):
                self.pid = pid
                self.rolled_back = False

            def execute(self, _query):
                return FakeResult(self.pid)

            def rollback(self):
                self.rolled_back = True

        stable = FakeConnection(1234)
        self.assertIsNone(executor.assert_session_pinned(stable, 1234))
        changed = FakeConnection(5678)
        with self.assertRaisesRegex(executor.PlanValidationError, "backend changed"):
            executor.assert_session_pinned(changed, 1234)
        self.assertTrue(changed.rolled_back)

    def test_rejects_path_traversal_and_unsorted_inventory(self):
        bad = self.make_plan()
        bad["manifest"]["migrations"][0]["name"] = "../unapproved.sql"
        payload = {key: bad[key] for key in ("schema_version", "target", "project_ref", "commit_sha", "manifest")}
        canonical = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        bad_hash = hashlib.sha256(canonical.encode()).hexdigest()
        bad["plan_sha256"] = bad_hash
        with self.assertRaisesRegex(executor.PlanValidationError, "filename is invalid"):
            self.validate(bad, expected_hash=bad_hash)


if __name__ == "__main__":
    unittest.main()
