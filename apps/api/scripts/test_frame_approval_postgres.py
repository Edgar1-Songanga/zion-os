"""Disposable-PostgreSQL integration tests for Frame approval consumption."""
from __future__ import annotations

import importlib.util
import os
import sys
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb

SCRIPT = Path(__file__).with_name("frame-execute-locked.py")
SPEC = importlib.util.spec_from_file_location("frame_executor_integration", SCRIPT)
assert SPEC and SPEC.loader
executor = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = executor
SPEC.loader.exec_module(executor)


class FrameApprovalPostgresTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        database_url = os.environ.get("FRAME_TEST_DATABASE_URL", "")
        if not database_url:
            raise RuntimeError("FRAME_TEST_DATABASE_URL is required for disposable PostgreSQL tests.")
        cls.conn1 = psycopg.connect(database_url, autocommit=False)
        cls.conn2 = psycopg.connect(database_url, autocommit=False)
        cls.actor_id = uuid.uuid4()
        cls.approval_id = str(uuid.uuid4())
        cls.plan_hash = "a" * 64
        cls.commit_sha = "b" * 40
        cls.project_ref = "w" * 20
        cls.versions = ["20261118000101"]
        approval = {
            "approval_id": cls.approval_id,
            "plan_sha256": cls.plan_hash,
            "commit_sha": cls.commit_sha,
            "project_ref": cls.project_ref,
            "target": "production",
            "migration_count": len(cls.versions),
            "migration_versions": cls.versions,
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        }
        cls.conn1.execute(
            """
            INSERT INTO public.audit_logs
              (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
            VALUES (NULL, %s, 'frame.migration.plan_approved', 'frame_migration', NULL, %s)
            """,
            (cls.actor_id, Jsonb(approval)),
        )
        cls.conn1.commit()

    @classmethod
    def tearDownClass(cls) -> None:
        for conn in (cls.conn1, cls.conn2):
            try:
                conn.rollback()
                conn.close()
            except Exception:
                pass

    def setUp(self) -> None:
        self.conn1.rollback()
        self.conn2.rollback()

    def test_advisory_lock_rejects_concurrent_executor_and_consumption_rejects_replay(self):
        executor.validate_connection_mode(self.conn1.info.port)
        backend_pid = self.conn1.execute("SELECT pg_backend_pid()").fetchone()[0]
        self.conn1.commit()
        executor.assert_session_pinned(self.conn1, backend_pid)

        first_lock = self.conn1.execute(
            "SELECT pg_try_advisory_lock(%s, %s)",
            (executor.LOCK_CLASS_ID, executor.LOCK_OBJECT_ID),
        ).fetchone()[0]
        self.conn1.commit()
        executor.assert_session_pinned(self.conn1, backend_pid)
        self.assertTrue(first_lock)

        second_lock = self.conn2.execute(
            "SELECT pg_try_advisory_lock(%s, %s)",
            (executor.LOCK_CLASS_ID, executor.LOCK_OBJECT_ID),
        ).fetchone()[0]
        self.conn2.commit()
        self.assertFalse(second_lock, "a second executor must fail closed while the first holds the lock")

        metadata = {"execution_id": str(uuid.uuid4()), "approval_id": self.approval_id}
        actor = executor.consume_approval(
            self.conn1,
            approval_id=self.approval_id,
            expected_hash=self.plan_hash,
            expected_commit=self.commit_sha,
            expected_project_ref=self.project_ref,
            migration_versions=self.versions,
            execution_metadata=metadata,
        )
        self.assertEqual(str(actor), str(self.actor_id))
        executor.assert_session_pinned(self.conn1, backend_pid)

        self.conn1.execute(
            "SELECT pg_advisory_unlock(%s, %s)",
            (executor.LOCK_CLASS_ID, executor.LOCK_OBJECT_ID),
        )
        self.conn1.commit()

        second_lock_after_release = self.conn2.execute(
            "SELECT pg_try_advisory_lock(%s, %s)",
            (executor.LOCK_CLASS_ID, executor.LOCK_OBJECT_ID),
        ).fetchone()[0]
        self.conn2.commit()
        self.assertTrue(second_lock_after_release)
        second_backend_pid = self.conn2.execute("SELECT pg_backend_pid()").fetchone()[0]
        self.conn2.commit()
        executor.assert_session_pinned(self.conn2, second_backend_pid)
        with self.assertRaisesRegex(executor.PlanValidationError, "already been consumed"):
            executor.consume_approval(
                self.conn2,
                approval_id=self.approval_id,
                expected_hash=self.plan_hash,
                expected_commit=self.commit_sha,
                expected_project_ref=self.project_ref,
                migration_versions=self.versions,
                execution_metadata={"execution_id": str(uuid.uuid4())},
            )
        self.conn2.rollback()
        self.conn2.execute(
            "SELECT pg_advisory_unlock(%s, %s)",
            (executor.LOCK_CLASS_ID, executor.LOCK_OBJECT_ID),
        )
        self.conn2.commit()

        consumed_count = self.conn1.execute(
            """
            SELECT count(*)
              FROM public.audit_logs
             WHERE action = 'frame.migration.approval_consumed'
               AND metadata ->> 'approval_id' = %s
            """,
            (self.approval_id,),
        ).fetchone()[0]
        self.conn1.commit()
        self.assertEqual(consumed_count, 1, "the approval must have exactly one durable consumption event")


if __name__ == "__main__":
    unittest.main()
