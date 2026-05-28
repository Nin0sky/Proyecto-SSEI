from pathlib import Path
import sqlite3


DB_PATH = Path("data") / "ssei.db"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS requirements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                priority TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS use_cases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS requirement_use_case_traces (
                requirement_id INTEGER NOT NULL,
                use_case_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (requirement_id, use_case_id),
                FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE,
                FOREIGN KEY (use_case_id) REFERENCES use_cases(id) ON DELETE CASCADE
            )
            """
        )
        connection.commit()
