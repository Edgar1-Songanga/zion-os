"""Unit tests for Frame's fail-closed executor plan validation."""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
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
