#!/usr/bin/env python3
"""Run the Frame migration command under a PostgreSQL advisory lock and audit it.

The lock is held on a dedicated PostgreSQL session while the Supabase CLI uses
its own connection. Only Frame workflows are permitted to hold this lock.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb

LOCK_CLASS_ID = 1_487_216_022
LOCK_OBJECT_ID = 2_026_111_010
ALLOWED_ACTIONS = {
    "started": "frame.migration.execution_started",
    "succeeded": "frame.migration.execution_succeeded",
    "failed": "frame.migration.execution_failed",
}


def main() -> int:
    if len(sys.argv) < 3 or sys.argv[1] != "--":
        print("Usage: frame-execute-locked.py -- <migration command> [args...]", file=sys.stderr)
        return 64

    database_url = os.environ.get("ZION_SUPABASE_DB_URL", "")
    plan_path = os.environ.get("FRAME_PLAN_FILE", "")
    if not database_url or not plan_path:
        print("Frame requires ZION_SUPABASE_DB_URL and FRAME_PLAN_FILE.", file=sys.stderr)
        return 78

    try:
        plan = json.loads(Path(plan_path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        print("Frame plan file is missing or invalid.", file=sys.stderr)
        return 78

    plan_hash = plan.get("plan_sha256")
    commit_sha = plan.get("commit_sha")
    project_ref = plan.get("project_ref")
    migrations = plan.get("manifest", {}).get("migrations", [])
    if (
        not isinstance(plan_hash, str)
        or len(plan_hash) != 64
        or not isinstance(commit_sha, str)
        or len(commit_sha) != 40
        or not isinstance(project_ref, str)
        or not isinstance(migrations, list)
    ):
        print("Frame plan metadata failed validation.", file=sys.stderr)
        return 78

    execution_id = str(uuid.uuid4())
    metadata = {
        "plan_sha256": plan_hash,
        "migration_count": len(migrations),
        "migration_versions": [m.get("version") for m in migrations if isinstance(m, dict)],
        "execution_id": execution_id,
        "reason": "github_actions_frame_executor",
    }
    metadata.update({
        "commit_sha": commit_sha,
        "project_ref": project_ref,
        "github_actor": os.environ.get("GITHUB_ACTOR", "unknown")[:100],
        "github_run_id": os.environ.get("GITHUB_RUN_ID", "unknown")[:100],
    })

    conn = None
    locked = False
    outcome = "failed"
    return_code = 1
    try:
        conn = psycopg.connect(database_url, autocommit=True, connect_timeout=15)
        row = conn.execute(
            "SELECT pg_try_advisory_lock(%s, %s)",
            (LOCK_CLASS_ID, LOCK_OBJECT_ID),
        ).fetchone()
        locked = bool(row and row[0])
        if not locked:
            print("Frame database advisory lock is already held; refusing concurrent execution.", file=sys.stderr)
            return 75

        conn.execute(
            """
            INSERT INTO public.audit_logs
              (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
            VALUES (NULL, NULL, %s, 'frame_migration', NULL, %s)
            """,
            (ALLOWED_ACTIONS["started"], Jsonb(metadata)),
        )

        completed = subprocess.run(sys.argv[2:], check=False)
        return_code = completed.returncode
        if return_code == 0:
            outcome = "succeeded"
            conn.execute(
                """
                INSERT INTO public.audit_logs
                  (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
                VALUES (NULL, NULL, %s, 'frame_migration', NULL, %s)
                """,
                (ALLOWED_ACTIONS["succeeded"], Jsonb(metadata)),
            )
        else:
            metadata["failure_code"] = "supabase_cli_nonzero_exit"
            metadata["reason"] = f"migration_command_exit_{return_code}"
            conn.execute(
                """
                INSERT INTO public.audit_logs
                  (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
                VALUES (NULL, NULL, %s, 'frame_migration', NULL, %s)
                """,
                (ALLOWED_ACTIONS["failed"], Jsonb(metadata)),
            )
        return return_code
    except Exception as error:  # never print connection strings or SQL parameters
        print(f"Frame execution failed ({type(error).__name__}).", file=sys.stderr)
        if conn is not None and locked:
            try:
                metadata["failure_code"] = "frame_executor_exception"
                metadata["reason"] = type(error).__name__
                conn.execute(
                    """
                    INSERT INTO public.audit_logs
                      (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
                    VALUES (NULL, NULL, %s, 'frame_migration', NULL, %s)
                    """,
                    (ALLOWED_ACTIONS["failed"], Jsonb(metadata)),
                )
            except Exception:
                print("Frame could not persist the failure audit event.", file=sys.stderr)
        return 1
    finally:
        if conn is not None:
            if locked:
                try:
                    conn.execute(
                        "SELECT pg_advisory_unlock(%s, %s)",
                        (LOCK_CLASS_ID, LOCK_OBJECT_ID),
                    )
                except Exception:
                    print("Frame advisory lock release could not be confirmed; the session will close.", file=sys.stderr)
            conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
