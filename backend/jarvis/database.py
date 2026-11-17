
import sqlite3
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone

DATABASE_DIR = Path(__file__).resolve().parent.parent / "data"
DATABASE_PATH = DATABASE_DIR / "jarvis.db"


def get_connection():
    DATABASE_DIR.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row

    return connection


def init_db():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL DEFAULT 'New conversation',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(conversation_id)
                    REFERENCES conversations(id)
                    ON DELETE CASCADE
            )
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS
            idx_messages_conversation
            ON messages(conversation_id, id)
        """)

        connection.commit()


def create_conversation():
    conversation_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO conversations
            (id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (conversation_id, "New conversation", now, now),
        )

    return conversation_id


def conversation_exists(conversation_id: str) -> bool:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id FROM conversations WHERE id = ?",
            (conversation_id,),
        ).fetchone()

    return row is not None


def add_message(
    conversation_id: str,
    role: str,
    content: str,
):
    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO messages
            (conversation_id, role, content, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (conversation_id, role, content, now),
        )

        connection.execute(
            """
            UPDATE conversations
            SET updated_at = ?
            WHERE id = ?
            """,
            (now, conversation_id),
        )

        if role == "user":
            count = connection.execute(
                """
                SELECT COUNT(*) AS total
                FROM messages
                WHERE conversation_id = ?
                """,
                (conversation_id,),
            ).fetchone()["total"]

            if count == 1:
                title = content[:60]

                connection.execute(
                    """
                    UPDATE conversations
                    SET title = ?
                    WHERE id = ?
                    """,
                    (title, conversation_id),
                )


def get_messages(conversation_id: str):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT role, content, created_at
            FROM messages
            WHERE conversation_id = ?
            ORDER BY id ASC
            """,
            (conversation_id,),
        ).fetchall()

    return [dict(row) for row in rows]


def get_latest_conversation():
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, title, created_at, updated_at
            FROM conversations
            ORDER BY updated_at DESC
            LIMIT 1
            """
        ).fetchone()

    if row is None:
        conversation_id = create_conversation()

        with get_connection() as connection:
            row = connection.execute(
                """
                SELECT id, title, created_at, updated_at
                FROM conversations
                WHERE id = ?
                """,
                (conversation_id,),
            ).fetchone()

    return dict(row)


def list_conversations():
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, title, created_at, updated_at
            FROM conversations
            ORDER BY updated_at DESC
            """
        ).fetchall()

    return [dict(row) for row in rows]
