import sqlite3
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "database" / "skillsprint_ai.db"
SCHEMA_PATH = BASE_DIR / "database" / "schema.sql"

def get_db():
    """Returns a thread-safe sqlite3 connection in autocommit mode with Row factory."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0, isolation_level=None, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes SQLite schema and enables WAL mode."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0, isolation_level=None)
    conn.execute("PRAGMA journal_mode = WAL")
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.close()
    print(f"[Database] Initialized tables successfully with WAL mode at: {DB_PATH}")

def dict_from_row(row):
    """Converts a sqlite3.Row to a standard python dict."""
    if row is None:
        return None
    return dict(row)

def dicts_from_rows(rows):
    """Converts a list of sqlite3.Row objects to python dicts."""
    return [dict(r) for r in rows]
