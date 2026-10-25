import sqlite3
from contextlib import contextmanager
from typing import Generator
from app.config import DATABASE_PATH

def init_db() -> None:
    """Initialize database tables and indexes if they do not exist."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS actuals (
            startTime TEXT PRIMARY KEY,
            settlementDate TEXT,
            settlementPeriod INTEGER,
            generation REAL,
            publishTime TEXT
        )
        ''')
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS forecasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            publishTime TEXT,
            startTime TEXT,
            generation REAL,
            UNIQUE(publishTime, startTime)
        )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_fcst_start ON forecasts(startTime)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_fcst_pub ON forecasts(publishTime)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_act_date ON actuals(settlementDate)')
        conn.commit()

@contextmanager
def get_db_connection() -> Generator[sqlite3.Connection, None, None]:
    """Provide a transactional SQLite database connection."""
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
