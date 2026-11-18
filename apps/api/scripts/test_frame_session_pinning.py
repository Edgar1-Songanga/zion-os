"""Unit tests for Frame's session-pinned PostgreSQL lock requirement."""
from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from pathlib import Path

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
SPEC = importlib.util.spec_from_file_location("frame_executor_session", SCRIPT)
assert SPEC and SPEC.loader
executor = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = executor
SPEC.loader.exec_module(executor)


class FrameSessionPinningTests(unittest.TestCase):
    def test_direct_and_session_ports_are_allowed_but_transaction_pooler_is_rejected(self):
        for port in (5432, 5433):
            with self.subTest(port=port):
                executor.validate_connection_mode(port)
        with self.assertRaisesRegex(executor.PlanValidationError, "transaction pooling is unsupported"):
            executor.validate_connection_mode(6543)

    def test_backend_change_fails_closed_and_rolls_back_transaction(self):
        class Result:
            def fetchone(self):
                return (9002,)

        class Connection:
            rolled_back = False
            def execute(self, _query):
                return Result()
            def rollback(self):
                self.rolled_back = True

        connection = Connection()
        with self.assertRaisesRegex(executor.PlanValidationError, "backend changed"):
            executor.assert_session_pinned(connection, 9001)
        self.assertTrue(connection.rolled_back)


if __name__ == "__main__":
    unittest.main()
