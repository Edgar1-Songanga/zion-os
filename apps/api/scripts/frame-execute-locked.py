#!/usr/bin/env python3
"""Run the exact, verified Frame migration plan under a PostgreSQL advisory lock.

This executor is deliberately fail-closed. It independently validates the plan
hash, commit, production target, complete migration inventory and every SQL
file checksum before opening a database connection or running the CLI.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import psycopg
from psycopg.types.json import Jsonb

LOCK_CLASS_ID = 1_487_216_022
LOCK_OBJECT_ID = 2_026_111_010
ALLOWED_ACTIONS = {
    "consumed": "frame.migration.approval_consumed",
    "started": "frame.migration.execution_started",
    "succeeded": "frame.migration.execution_succeeded",
    "failed": "frame.migration.execution_failed",
    "blocked": "frame.migration.execution_blocked",
    "audit_failure": "frame.migration.audit_failure",
}
MIGRATION_NAME = re.compile(r"^(\d{8}|\d{14})_[A-Za-z0-9][A-Za-z0-9_-]*\.sql$")
SHA256 = re.compile(r"^[a-f0-9]{64}$")
COMMIT_SHA = re.compile(r"^[a-f0-9]{40}$")
PROJECT_REF = re.compile(r"^[a-z0-9]{20}$")


class PlanValidationError(ValueError):
    """Raised when the plan does not bind to the exact approved source."""


def validate_plan(
    plan: Any,
    *,
    expected_hash: str,
    expected_commit: str,
    expected_project_ref: str,
    migrations_dir: Path,
) -> dict[str, Any]:
    if not isinstance(plan, dict):
        raise PlanValidationError("Frame plan must be a JSON object.")
    if plan.get("schema_version") != 1 or plan.get("target") != "production":
        raise PlanValidationError("Frame plan schema or target is invalid.")
    if not COMMIT_SHA.fullmatch(expected_commit or ""):
        raise PlanValidationError("Expected full commit SHA is missing or invalid.")
    if not PROJECT_REF.fullmatch(expected_project_ref or ""):
        raise PlanValidationError("Expected Supabase project ref is missing or invalid.")
    if plan.get("commit_sha") != expected_commit:
        raise PlanValidationError("Frame plan commit does not match the checked-out commit.")
    if plan.get("project_ref") != expected_project_ref:
        raise PlanValidationError("Frame plan target does not match the configured production project.")
    if not SHA256.fullmatch(expected_hash or "") or plan.get("plan_sha256") != expected_hash:
        raise PlanValidationError("Frame plan hash does not match the approved hash.")

    manifest = plan.get("manifest")
    if not isinstance(manifest, dict) or manifest.get("mode") != "read-only":
        raise PlanValidationError("Frame migration manifest is invalid.")
    migrations = manifest.get("migrations")
    if not isinstance(migrations, list) or not migrations:
        raise PlanValidationError("Frame migration inventory is empty or invalid.")
    if manifest.get("count") != len(migrations):
        raise PlanValidationError("Frame migration inventory count does not match.")

    # Match Node's JSON.stringify(payload) byte-for-byte for the plan hash.
    payload = {
        "schema_version": plan["schema_version"],
        "target": plan["target"],
        "project_ref": plan["project_ref"],
        "commit_sha": plan["commit_sha"],
        "manifest": manifest,
    }
    canonical = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    computed_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    if computed_hash != expected_hash:
        raise PlanValidationError("Frame plan canonical hash verification failed.")

    expected_names: list[str] = []
    previous_name = ""
    for item in migrations:
        if not isinstance(item, dict):
            raise PlanValidationError("Frame migration entry is invalid.")
        name = item.get("name")
        version = item.get("version")
        digest = item.get("sha256")
        size = item.get("bytes")
        if not isinstance(name, str) or not MIGRATION_NAME.fullmatch(name):
            raise PlanValidationError("Frame migration filename is invalid.")
        if name <= previous_name:
            raise PlanValidationError("Frame migration inventory is not strictly sorted.")
        previous_name = name
        if version != name.split("_", 1)[0]:
            raise PlanValidationError("Frame migration version does not match its filename.")
        if not isinstance(digest, str) or not SHA256.fullmatch(digest):
            raise PlanValidationError("Frame migration checksum is invalid.")
        if not isinstance(size, int) or isinstance(size, bool) or size < 0:
            raise PlanValidationError("Frame migration byte count is invalid.")
        expected_names.append(name)

    if not migrations_dir.is_dir():
        raise PlanValidationError("Supabase migration directory is missing.")
    actual_names = sorted(path.name for path in migrations_dir.glob("*.sql"))
    if actual_names != expected_names:
        raise PlanValidationError("Repository migration files differ from the approved inventory.")

    for item in migrations:
        migration_path = migrations_dir / item["name"]
        content = migration_path.read_bytes()
        if len(content) != item["bytes"]:
            raise PlanValidationError(f"Frame migration size drift detected: {item['name']}")
        digest = hashlib.sha256(content).hexdigest()
        if digest != item["sha256"]:
            raise PlanValidationError(f"Frame migration checksum drift detected: {item['name']}")

    return plan



def validate_approval(
    approval: Any,
    actor_user_id: Any,
    *,
    approval_id: str,
    expected_hash: str,
    expected_commit: str,
    expected_project_ref: str,
    migration_versions: list[str],
    now: datetime | None = None,
) -> None:
    """Validate the immutable, actor-bound approval before consuming it."""
    if not actor_user_id or not isinstance(approval, dict):
        raise PlanValidationError("Frame approval has no authenticated administrator identity.")
    if approval.get("approval_id") != approval_id:
        raise PlanValidationError("Frame approval identifier does not match.")
    expires_at = approval.get("expires_at")
    try:
        expiry = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        raise PlanValidationError("Frame approval expiry is invalid.")
    current_time = now or datetime.now(timezone.utc)
    if expiry.tzinfo is None or expiry <= current_time:
        raise PlanValidationError("Frame approval has expired.")

    expected = {
        "plan_sha256": expected_hash,
        "commit_sha": expected_commit,
        "project_ref": expected_project_ref,
        "target": "production",
        "migration_count": len(migration_versions),
        "migration_versions": migration_versions,
    }
    if any(approval.get(key) != value for key, value in expected.items()):
        raise PlanValidationError("Frame approval does not match the exact plan, commit, target, or migration list.")




def validate_connection_mode(port: Any) -> None:
    """Reject Supabase transaction-pooler connections for session advisory locks."""
    try:
        normalized_port = int(port)
    except (TypeError, ValueError):
        raise PlanValidationError("Frame cannot verify the PostgreSQL connection mode.")
    if normalized_port == 6543:
        raise PlanValidationError(
            "Frame requires a direct or session-pinned PostgreSQL connection; transaction pooling is unsupported."
        )


def assert_session_pinned(conn: Any, expected_backend_pid: int) -> None:
    """Fail closed if a new transaction is served by a different PostgreSQL backend."""
    row = conn.execute("SELECT pg_backend_pid()").fetchone()
    if not row or row[0] != expected_backend_pid:
        conn.rollback()
        raise PlanValidationError(
            "Frame PostgreSQL backend changed between transactions; session advisory-lock guarantees are unavailable."
        )



def consume_approval(
    conn: Any,
    *,
    approval_id: str,
    expected_hash: str,
    expected_commit: str,
    expected_project_ref: str,
    migration_versions: list[str],
    execution_metadata: dict[str, Any],
) -> Any:
    """Validate and consume an approval while the caller holds the Frame advisory lock.

    Consumption is committed before returning. The same approval therefore
    cannot authorize a second run, including after a partial CLI failure.
    """
    approvals = conn.execute(
        """
        SELECT actor_user_id, metadata
          FROM public.audit_logs
         WHERE action = 'frame.migration.plan_approved'
           AND metadata ->> 'approval_id' = %s
         FOR UPDATE
        """,
        (approval_id,),
    ).fetchall()
    if len(approvals) != 1:
        raise PlanValidationError("Frame approval is missing or ambiguous.")
    actor_user_id, approval = approvals[0]
    validate_approval(
        approval,
        actor_user_id,
        approval_id=approval_id,
        expected_hash=expected_hash,
        expected_commit=expected_commit,
        expected_project_ref=expected_project_ref,
        migration_versions=migration_versions,
    )

    already_consumed = conn.execute(
        """
        SELECT 1
          FROM public.audit_logs
         WHERE action = %s
           AND metadata ->> 'approval_id' = %s
         LIMIT 1
        """,
        (ALLOWED_ACTIONS["consumed"], approval_id),
    ).fetchone()
    if already_consumed:
        raise PlanValidationError("Frame approval has already been consumed.")

    event_metadata = {**execution_metadata, "approved_by_user_id": str(actor_user_id)}
    conn.execute(
        """
        INSERT INTO public.audit_logs
          (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
        VALUES (NULL, %s, %s, 'frame_migration', NULL, %s)
        """,
        (actor_user_id, ALLOWED_ACTIONS["consumed"], Jsonb(event_metadata)),
    )
    conn.commit()
    return actor_user_id


def main() -> int:
    if len(sys.argv) < 3 or sys.argv[1] != "--":
        print("Usage: frame-execute-locked.py -- <migration command> [args...]", file=sys.stderr)
        return 64

    database_url = os.environ.get("ZION_SUPABASE_DB_URL", "")
    plan_path = os.environ.get("FRAME_PLAN_FILE", "")
    expected_hash = os.environ.get("EXPECTED_PLAN_SHA256", "")
    expected_commit = os.environ.get("GITHUB_SHA", "")
    expected_project_ref = os.environ.get("ZION_SUPABASE_PROJECT_REF", "")
    approval_id = os.environ.get("FRAME_APPROVAL_ID", "")
    if not database_url or not plan_path:
        print("Frame requires ZION_SUPABASE_DB_URL and FRAME_PLAN_FILE.", file=sys.stderr)
        return 78
    try:
        parsed_approval_id = uuid.UUID(approval_id)
        if str(parsed_approval_id) != approval_id:
            raise ValueError("non-canonical UUID")
    except (ValueError, AttributeError):
        print("Frame requires a valid one-use administrator approval ID.", file=sys.stderr)
        return 78

    try:
        plan = json.loads(Path(plan_path).read_text(encoding="utf-8"))
        repo_root = Path(__file__).resolve().parents[3]
        validate_plan(
            plan,
            expected_hash=expected_hash,
            expected_commit=expected_commit,
            expected_project_ref=expected_project_ref,
            migrations_dir=repo_root / "supabase" / "migrations",
        )
    except (OSError, json.JSONDecodeError, PlanValidationError) as error:
        print(f"Frame plan validation failed ({type(error).__name__}): {error}", file=sys.stderr)
        return 78

    execution_id = str(uuid.uuid4())
    metadata = {
        "plan_sha256": expected_hash,
        "migration_count": len(plan["manifest"]["migrations"]),
        "migration_versions": [m["version"] for m in plan["manifest"]["migrations"]],
        "execution_id": execution_id,
        "reason": "github_actions_frame_executor",
        "commit_sha": expected_commit,
        "project_ref": expected_project_ref,
        "github_actor": os.environ.get("GITHUB_ACTOR", "unknown")[:100],
        "github_run_id": os.environ.get("GITHUB_RUN_ID", "unknown")[:100],
        "approval_id": approval_id,
    }

    conn = None
    actor_user_id = None
    backend_pid = None
    locked = False
    return_code = 1
    command_started = False
    command_finished = False
    try:
        conn = psycopg.connect(database_url, autocommit=False, connect_timeout=15)
        validate_connection_mode(conn.info.port)
        backend_pid = conn.execute("SELECT pg_backend_pid()").fetchone()[0]
        conn.commit()
        assert_session_pinned(conn, backend_pid)
        row = conn.execute(
            "SELECT pg_try_advisory_lock(%s, %s)",
            (LOCK_CLASS_ID, LOCK_OBJECT_ID),
        ).fetchone()
        locked = bool(row and row[0])
        conn.commit()
        if not locked:
            print("Frame database advisory lock is already held; refusing concurrent execution.", file=sys.stderr)
            return 75

        # The approval is an append-only audit row written through the ZION API
        # using a signed Supabase session and verified global-admin claims.
        # Consume it while holding the advisory lock, before running the CLI.
        assert_session_pinned(conn, backend_pid)
        actual_versions = [item["version"] for item in plan["manifest"]["migrations"]]
        actor_user_id = consume_approval(
            conn,
            approval_id=approval_id,
            expected_hash=expected_hash,
            expected_commit=expected_commit,
            expected_project_ref=expected_project_ref,
            migration_versions=actual_versions,
            execution_metadata=metadata,
        )

        assert_session_pinned(conn, backend_pid)
        conn.execute(
            """
            INSERT INTO public.audit_logs
              (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
            VALUES (NULL, %s, %s, 'frame_migration', NULL, %s)
            """,
            (actor_user_id, ALLOWED_ACTIONS["started"], Jsonb(metadata)),
        )
        conn.commit()

        assert_session_pinned(conn, backend_pid)
        command_started = True
        completed = subprocess.run(sys.argv[2:], check=False)
        command_finished = True
        return_code = completed.returncode
        assert_session_pinned(conn, backend_pid)
        if return_code == 0:
            action = ALLOWED_ACTIONS["succeeded"]
        else:
            metadata["failure_code"] = "supabase_cli_nonzero_exit"
            metadata["reason"] = f"migration_command_exit_{return_code}"
            action = ALLOWED_ACTIONS["failed"]
        conn.execute(
            """
            INSERT INTO public.audit_logs
              (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
            VALUES (NULL, %s, %s, 'frame_migration', NULL, %s)
            """,
            (actor_user_id, action, Jsonb(metadata)),
        )
        conn.commit()
        return return_code
    except Exception as error:  # never print connection strings or SQL parameters
        print(f"Frame execution failed ({type(error).__name__}).", file=sys.stderr)
        if conn is not None and locked and actor_user_id is not None:
            try:
                conn.rollback()
                assert_session_pinned(conn, backend_pid)
                metadata["failure_code"] = "frame_executor_exception"
                metadata["reason"] = type(error).__name__
                if command_finished and return_code == 0:
                    failure_action = ALLOWED_ACTIONS["audit_failure"]
                elif command_started:
                    failure_action = ALLOWED_ACTIONS["failed"]
                else:
                    failure_action = ALLOWED_ACTIONS["blocked"]
                conn.execute(
                    """
                    INSERT INTO public.audit_logs
                      (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
                    VALUES (NULL, %s, %s, 'frame_migration', NULL, %s)
                    """,
                    (actor_user_id, failure_action, Jsonb(metadata)),
                )
                conn.commit()
            except Exception:
                print("Frame could not persist the failure audit event.", file=sys.stderr)
        return 1
    finally:
        if conn is not None:
            if locked:
                try:
                    assert_session_pinned(conn, backend_pid)
                    conn.execute(
                        "SELECT pg_advisory_unlock(%s, %s)",
                        (LOCK_CLASS_ID, LOCK_OBJECT_ID),
                    )
                    conn.commit()
                except Exception:
                    print("Frame advisory lock release could not be confirmed; the session will close.", file=sys.stderr)
            conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
