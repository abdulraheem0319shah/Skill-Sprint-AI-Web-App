import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / 'skillsprint_ai.db'

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'")
if cur.fetchone() is None:
    print('documents table not found. Nothing to migrate.')
    conn.close()
    raise SystemExit(0)

# Read the current table structure to preserve all columns safely.
columns = cur.execute("PRAGMA table_info(documents)").fetchall()
if not columns:
    print('No columns found in documents table. Nothing to migrate.')
    conn.close()
    raise SystemExit(0)

col_names = [c[1] for c in columns]
# Keep all existing columns in order and preserve data.
select_cols = ', '.join(col_names)
insert_cols = ', '.join(col_names)

# Rebuild the table without the restrictive CHECK on category.
cur.execute('BEGIN IMMEDIATE')
cur.execute('ALTER TABLE documents RENAME TO documents_old')
cur.execute('''
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_code TEXT UNIQUE NOT NULL,
    file_name TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'obsolete', 'draft', 'quarantined')),
    file_type TEXT NOT NULL DEFAULT 'txt',
    file_size INTEGER DEFAULT 0,
    content TEXT,
    uploaded_by INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    effective_date TEXT,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
)
''')
cur.execute(f'INSERT INTO documents ({insert_cols}) SELECT {select_cols} FROM documents_old')
cur.execute('DROP TABLE documents_old')
cur.execute('COMMIT')

print('Migration successful: documents category constraint removed and data preserved.')
conn.close()
