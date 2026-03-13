from __future__ import annotations

import json
import sqlite3
from contextlib import closing
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
DB_PATH = DATA_DIR / "fraud.db"

DEFAULT_USERS = [
    {
        "id": 1,
        "name": "Ayu Pratama",
        "account_number": "120000001",
        "usual_device": "android-ayu-001",
        "usual_city": "Jakarta",
    },
    {
        "id": 2,
        "name": "Budi Santoso",
        "account_number": "120000002",
        "usual_device": "iphone-budi-002",
        "usual_city": "Bandung",
    },
    {
        "id": 3,
        "name": "Citra Wibowo",
        "account_number": "120000003",
        "usual_device": "android-citra-003",
        "usual_city": "Surabaya",
    },
]


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def _table_columns(connection: sqlite3.Connection, table_name: str) -> set[str]:
    rows = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {row["name"] for row in rows}


def _reset_incompatible_tables(connection: sqlite3.Connection) -> None:
    required = {
        "users": {"id", "name", "account_number", "usual_device", "usual_city", "created_at"},
        "transactions": {
            "id",
            "user_id",
            "amount",
            "transaction_type",
            "destination_bank",
            "destination_account",
            "timestamp",
            "device_id",
            "ip_address",
            "location_city",
            "is_anomaly",
            "ml_score",
            "rule_score",
            "risk_score",
            "alert_level",
            "reason",
            "feature_snapshot",
            "created_at",
        },
        "alerts": {"id", "transaction_id", "alert_level", "status", "created_at"},
    }
    for table_name, expected_columns in required.items():
        existing_columns = _table_columns(connection, table_name)
        if existing_columns and not expected_columns.issubset(existing_columns):
            connection.execute(f"DROP TABLE IF EXISTS {table_name}")


def init_db() -> None:
    with closing(get_connection()) as connection:
        _reset_incompatible_tables(connection)
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                account_number TEXT NOT NULL UNIQUE,
                usual_device TEXT NOT NULL,
                usual_city TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                transaction_type TEXT NOT NULL,
                destination_bank TEXT NOT NULL,
                destination_account TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                device_id TEXT NOT NULL,
                ip_address TEXT NOT NULL,
                location_city TEXT NOT NULL,
                is_anomaly INTEGER NOT NULL DEFAULT 0,
                ml_score INTEGER NOT NULL DEFAULT 0,
                rule_score INTEGER NOT NULL DEFAULT 0,
                risk_score INTEGER NOT NULL DEFAULT 0,
                alert_level TEXT NOT NULL DEFAULT 'normal',
                reason TEXT NOT NULL DEFAULT '[]',
                feature_snapshot TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id INTEGER NOT NULL UNIQUE,
                alert_level TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'open',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(transaction_id) REFERENCES transactions(id)
            )
            """
        )
        connection.executemany(
            """
            INSERT OR IGNORE INTO users (id, name, account_number, usual_device, usual_city)
            VALUES (:id, :name, :account_number, :usual_device, :usual_city)
            """,
            DEFAULT_USERS,
        )
        connection.commit()


def _parse_json(raw: str, fallback: Any) -> Any:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return fallback


def transaction_row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    payload = dict(row)
    payload["reason"] = _parse_json(payload["reason"], [])
    payload["feature_snapshot"] = _parse_json(payload["feature_snapshot"], {})
    payload["is_anomaly"] = bool(payload["is_anomaly"])
    return payload


def alert_row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    payload = dict(row)
    payload["reason"] = _parse_json(payload["reason"], [])
    return payload


def fetch_users() -> list[dict[str, Any]]:
    with closing(get_connection()) as connection:
        rows = connection.execute(
            """
            SELECT id, name, account_number, usual_device, usual_city, created_at
            FROM users
            ORDER BY id ASC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def get_user(user_id: int) -> dict[str, Any]:
    with closing(get_connection()) as connection:
        row = connection.execute(
            """
            SELECT id, name, account_number, usual_device, usual_city, created_at
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()
    if row is None:
        raise KeyError(user_id)
    return dict(row)


def insert_transaction(transaction: dict[str, Any]) -> dict[str, Any]:
    payload = transaction.copy()
    payload["reason"] = json.dumps(payload["reason"])
    payload["feature_snapshot"] = json.dumps(payload["feature_snapshot"])
    payload["is_anomaly"] = int(payload["is_anomaly"])

    columns = [
        "user_id",
        "amount",
        "transaction_type",
        "destination_bank",
        "destination_account",
        "timestamp",
        "device_id",
        "ip_address",
        "location_city",
        "is_anomaly",
        "ml_score",
        "rule_score",
        "risk_score",
        "alert_level",
        "reason",
        "feature_snapshot",
    ]

    with closing(get_connection()) as connection:
        cursor = connection.execute(
            f"""
            INSERT INTO transactions ({", ".join(columns)})
            VALUES ({", ".join("?" for _ in columns)})
            """,
            [payload[column] for column in columns],
        )
        transaction_id = cursor.lastrowid
        if payload["alert_level"] in {"suspicious", "high"}:
            connection.execute(
                """
                INSERT OR REPLACE INTO alerts (transaction_id, alert_level, status, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (
                    transaction_id,
                    payload["alert_level"],
                    "open",
                    datetime.utcnow().isoformat(),
                ),
            )
        connection.commit()

    return get_transaction(transaction_id)


def get_transaction(transaction_id: int) -> dict[str, Any]:
    with closing(get_connection()) as connection:
        row = connection.execute(
            """
            SELECT
                t.*,
                u.name AS user_name,
                u.account_number,
                a.id AS alert_id,
                a.status AS alert_status
            FROM transactions t
            JOIN users u ON u.id = t.user_id
            LEFT JOIN alerts a ON a.transaction_id = t.id
            WHERE t.id = ?
            """,
            (transaction_id,),
        ).fetchone()
    if row is None:
        raise KeyError(transaction_id)
    return transaction_row_to_dict(row)


def fetch_transactions(limit: int = 100) -> list[dict[str, Any]]:
    with closing(get_connection()) as connection:
        rows = connection.execute(
            """
            SELECT
                t.*,
                u.name AS user_name,
                u.account_number,
                a.id AS alert_id,
                a.status AS alert_status
            FROM transactions t
            JOIN users u ON u.id = t.user_id
            LEFT JOIN alerts a ON a.transaction_id = t.id
            ORDER BY datetime(t.timestamp) DESC, t.id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [transaction_row_to_dict(row) for row in rows]


def fetch_user_history(user_id: int, limit: int = 100) -> list[dict[str, Any]]:
    with closing(get_connection()) as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM transactions
            WHERE user_id = ?
            ORDER BY datetime(timestamp) ASC, id ASC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
    return [transaction_row_to_dict(row) for row in rows]


def fetch_alerts(limit: int = 50) -> list[dict[str, Any]]:
    with closing(get_connection()) as connection:
        rows = connection.execute(
            """
            SELECT
                a.id,
                a.transaction_id,
                a.alert_level,
                a.status,
                a.created_at,
                t.risk_score,
                t.amount,
                t.destination_bank,
                t.destination_account,
                t.timestamp,
                t.reason,
                u.name AS user_name,
                u.account_number
            FROM alerts a
            JOIN transactions t ON t.id = a.transaction_id
            JOIN users u ON u.id = t.user_id
            ORDER BY datetime(a.created_at) DESC, a.id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [alert_row_to_dict(row) for row in rows]


def get_alert(alert_id: int) -> dict[str, Any]:
    with closing(get_connection()) as connection:
        row = connection.execute(
            """
            SELECT
                a.id,
                a.transaction_id,
                a.alert_level,
                a.status,
                a.created_at,
                t.risk_score,
                t.amount,
                t.destination_bank,
                t.destination_account,
                t.timestamp,
                t.reason,
                u.name AS user_name,
                u.account_number
            FROM alerts a
            JOIN transactions t ON t.id = a.transaction_id
            JOIN users u ON u.id = t.user_id
            WHERE a.id = ?
            """,
            (alert_id,),
        ).fetchone()
    if row is None:
        raise KeyError(alert_id)
    return alert_row_to_dict(row)


def update_alert_status(alert_id: int, status: str) -> dict[str, Any]:
    with closing(get_connection()) as connection:
        connection.execute(
            """
            UPDATE alerts
            SET status = ?
            WHERE id = ?
            """,
            (status, alert_id),
        )
        connection.commit()
    return get_alert(alert_id)


def has_transactions() -> bool:
    with closing(get_connection()) as connection:
        row = connection.execute(
            "SELECT COUNT(*) AS total FROM transactions"
        ).fetchone()
    return bool(row["total"])


def reset_demo_dataset() -> None:
    with closing(get_connection()) as connection:
        connection.execute("DELETE FROM alerts")
        connection.execute("DELETE FROM transactions")
        connection.execute(
            "DELETE FROM sqlite_sequence WHERE name IN ('transactions', 'alerts')"
        )
        connection.commit()


def fetch_summary() -> dict[str, Any]:
    with closing(get_connection()) as connection:
        metrics = connection.execute(
            """
            SELECT
                COUNT(*) AS total_transactions,
                SUM(CASE WHEN alert_level = 'suspicious' THEN 1 ELSE 0 END) AS suspicious_transactions,
                SUM(CASE WHEN alert_level = 'high' THEN 1 ELSE 0 END) AS high_risk_alerts,
                COALESCE(AVG(risk_score), 0) AS average_risk,
                COALESCE(SUM(amount), 0) AS total_volume
            FROM transactions
            """
        ).fetchone()

    total_transactions = metrics["total_transactions"] or 0
    suspicious_transactions = metrics["suspicious_transactions"] or 0
    high_risk_alerts = metrics["high_risk_alerts"] or 0
    fraud_rate = (
        round(((suspicious_transactions + high_risk_alerts) / total_transactions) * 100, 2)
        if total_transactions
        else 0
    )
    return {
        "total_transactions": total_transactions,
        "suspicious_transactions": suspicious_transactions + high_risk_alerts,
        "high_risk_alerts": high_risk_alerts,
        "fraud_rate": fraud_rate,
        "average_risk": round(metrics["average_risk"] or 0, 2),
        "total_volume": round(metrics["total_volume"] or 0, 2),
    }


def fetch_dashboard_charts() -> dict[str, Any]:
    with closing(get_connection()) as connection:
        hourly_rows = connection.execute(
            """
            SELECT
                strftime('%H', timestamp) AS hour,
                COUNT(*) AS total
            FROM transactions
            GROUP BY hour
            ORDER BY hour
            """
        ).fetchall()
        distribution_rows = connection.execute(
            """
            SELECT alert_level, COUNT(*) AS total
            FROM transactions
            GROUP BY alert_level
            """
        ).fetchall()

    hour_map = {row["hour"]: row["total"] for row in hourly_rows if row["hour"] is not None}
    transactions_per_hour = [
        {"hour": f"{hour:02d}:00", "total": hour_map.get(f"{hour:02d}", 0)}
        for hour in range(24)
    ]
    distribution = {row["alert_level"]: row["total"] for row in distribution_rows}
    return {
        "transactions_per_hour": transactions_per_hour,
        "risk_distribution": {
            "normal": distribution.get("normal", 0),
            "suspicious": distribution.get("suspicious", 0),
            "high": distribution.get("high", 0),
        },
        "normal_vs_suspicious": [
            {"label": "normal", "total": distribution.get("normal", 0)},
            {
                "label": "suspicious",
                "total": distribution.get("suspicious", 0) + distribution.get("high", 0),
            },
        ],
    }
