from __future__ import annotations

import logging
from datetime import datetime, timedelta
from pathlib import Path
from random import choice, randint, uniform

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .db import (
    fetch_alerts,
    fetch_dashboard_charts,
    fetch_summary,
    fetch_transactions,
    fetch_user_history,
    fetch_users,
    get_user,
    has_transactions,
    init_db,
    insert_transaction,
    reset_demo_dataset,
    update_alert_status,
)
from .fraud import analyze_transaction
from .schemas import (
    AlertsListResponse,
    AlertStatusUpdate,
    AlertStatusUpdateResponse,
    DashboardChartsResponse,
    DashboardSummaryResponse,
    HealthResponse,
    SeedDemoResponse,
    SimulateTransactionResponse,
    TransactionCreate,
    TransactionsListResponse,
    UsersListResponse,
)

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Constants
ROOT_DIR = Path(__file__).resolve().parent.parent
LEGACY_STATIC_DIR = ROOT_DIR / "static"
FRONTEND_DIST_DIR = ROOT_DIR / "frontend" / "dist"
FRONTEND_ASSETS_DIR = FRONTEND_DIST_DIR / "assets"

# Default limits for paginated endpoints
DEFAULT_TRANSACTIONS_LIMIT = 100
DEFAULT_RECENT_TRANSACTIONS_LIMIT = 12
DEFAULT_ALERTS_LIMIT = 50
DEFAULT_DASHBOARD_ALERTS_LIMIT = 6
DEFAULT_USER_HISTORY_LIMIT = 100

# Demo data constants
DEMO_USER_IDS = [1, 2, 3]
DEMO_START_TIME = datetime(2026, 3, 13, 8, 5, 0)
DEMO_USER_TIME_OFFSET_MINUTES = 40
HISTORY_SEEDING_ITERATIONS = 10
HISTORY_SEEDING_INTERVAL_MINUTES = 55
HISTORY_SEEDING_BALANCE_MULTIPLIER = 14_500

app = FastAPI(
    title="Fraud Detection System",
    description="Hackathon-ready fraud detection dashboard for banking transactions.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=ROOT_DIR / "static"), name="static")
if FRONTEND_ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS_DIR), name="frontend-assets")


@app.on_event("startup")
def startup_event() -> None:
    """Initialize database on application startup with error handling."""
    try:
        logger.info("Initializing database...")
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}", exc_info=True)
        raise


def _frontend_index_file() -> Path | None:
    index_file = FRONTEND_DIST_DIR / "index.html"
    return index_file if index_file.exists() else None


def _default_ui_entry() -> Path:
    return _frontend_index_file() or (LEGACY_STATIC_DIR / "index.html")


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(_default_ui_entry())


def _reason_summary(reasons: list[str]) -> str:
    if not reasons:
        return "No explanation available."
    return "; ".join(reasons[:3])


def _serialize_transaction(transaction: dict[str, object]) -> dict[str, object]:
    payload = transaction.copy()
    payload["reason_summary"] = _reason_summary(payload.get("reason", []))
    return payload


def _serialize_alert(alert: dict[str, object]) -> dict[str, object]:
    payload = alert.copy()
    payload["reason_summary"] = _reason_summary(payload.get("reason", []))
    return payload


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return {"status": "ok"}


@app.get("/api/users", response_model=UsersListResponse)
def list_users() -> UsersListResponse:
    """Fetch list of all users."""
    try:
        logger.info("Fetching users list")
        users = fetch_users()
        logger.info(f"Successfully fetched {len(users)} users")
        return {"items": users}
    except Exception as e:
        logger.error(f"Failed to fetch users: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch users") from e


@app.get("/api/transactions", response_model=TransactionsListResponse)
def list_transactions(limit: int = DEFAULT_TRANSACTIONS_LIMIT) -> TransactionsListResponse:
    """Fetch list of transactions with optional limit."""
    try:
        logger.info(f"Fetching transactions with limit={limit}")
        transactions = fetch_transactions(limit=limit)
        serialized = [_serialize_transaction(item) for item in transactions]
        logger.info(f"Successfully fetched {len(serialized)} transactions")
        return {"items": serialized}
    except Exception as e:
        logger.error(f"Failed to fetch transactions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch transactions") from e


@app.get("/api/transactions/recent", response_model=TransactionsListResponse)
def list_recent_transactions(limit: int = DEFAULT_RECENT_TRANSACTIONS_LIMIT) -> TransactionsListResponse:
    """Fetch recent transactions with optional limit."""
    try:
        logger.info(f"Fetching recent transactions with limit={limit}")
        transactions = fetch_transactions(limit=limit)
        serialized = [_serialize_transaction(item) for item in transactions]
        logger.info(f"Successfully fetched {len(serialized)} recent transactions")
        return {"items": serialized}
    except Exception as e:
        logger.error(f"Failed to fetch recent transactions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch recent transactions") from e


@app.get("/api/alerts", response_model=AlertsListResponse)
def list_alerts(limit: int = DEFAULT_ALERTS_LIMIT) -> AlertsListResponse:
    """Fetch list of alerts with optional limit."""
    try:
        logger.info(f"Fetching alerts with limit={limit}")
        alerts = fetch_alerts(limit=limit)
        serialized = [_serialize_alert(item) for item in alerts]
        logger.info(f"Successfully fetched {len(serialized)} alerts")
        return {"items": serialized}
    except Exception as e:
        logger.error(f"Failed to fetch alerts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch alerts") from e


@app.get("/api/dashboard/summary", response_model=DashboardSummaryResponse)
def dashboard_summary() -> DashboardSummaryResponse:
    """Fetch dashboard summary with recent alerts."""
    try:
        logger.info("Fetching dashboard summary")
        summary = fetch_summary()
        alerts = fetch_alerts(limit=DEFAULT_DASHBOARD_ALERTS_LIMIT)
        summary["recent_alerts"] = [_serialize_alert(item) for item in alerts]
        logger.info("Successfully fetched dashboard summary")
        return summary
    except Exception as e:
        logger.error(f"Failed to fetch dashboard summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard summary") from e


@app.get("/api/dashboard/charts", response_model=DashboardChartsResponse)
def dashboard_charts() -> DashboardChartsResponse:
    """Fetch dashboard chart data."""
    try:
        logger.info("Fetching dashboard charts")
        charts = fetch_dashboard_charts()
        logger.info("Successfully fetched dashboard charts")
        return charts
    except Exception as e:
        logger.error(f"Failed to fetch dashboard charts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard charts") from e


@app.post("/api/transactions/simulate", response_model=SimulateTransactionResponse)
def simulate_transaction(transaction: TransactionCreate) -> SimulateTransactionResponse:
    """Simulate transaction and run fraud analysis."""
    try:
        logger.info(f"Simulating transaction for user_id={transaction.user_id}")
        user = get_user(transaction.user_id)
        logger.info(f"User found: {user.get('name', 'Unknown')}")
    except KeyError as error:
        logger.warning(f"User not found: user_id={transaction.user_id}")
        raise HTTPException(status_code=404, detail="User not found") from error
    except Exception as e:
        logger.error(f"Failed to fetch user: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch user data") from e

    try:
        history = fetch_user_history(transaction.user_id, limit=DEFAULT_USER_HISTORY_LIMIT)
        analysis = analyze_transaction(transaction, user, history)
        saved = insert_transaction(
            {
                **transaction.model_dump(),
                "timestamp": transaction.timestamp.isoformat(),
                **analysis,
            }
        )
        serialized = _serialize_transaction(saved)
        logger.info(f"Transaction simulated successfully - risk_score={serialized['risk_score']}, alert_level={serialized['alert_level']}")
        return {
            "transaction_id": serialized["id"],
            "risk_score": serialized["risk_score"],
            "is_anomaly": serialized["is_anomaly"],
            "alert_level": serialized["alert_level"],
            "reason": serialized["reason"],
            "reason_summary": serialized["reason_summary"],
            "transaction": serialized,
        }
    except Exception as e:
        logger.error(f"Failed to simulate transaction: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to simulate transaction") from e


@app.post("/api/alerts/{alert_id}/status", response_model=AlertStatusUpdateResponse)
def change_alert_status(alert_id: int, payload: AlertStatusUpdate) -> AlertStatusUpdateResponse:
    """Update alert status (open, review, resolved, blocked)."""
    try:
        logger.info(f"Updating alert status - alert_id={alert_id}, new_status={payload.status}")
        updated = update_alert_status(alert_id, payload.status)
        serialized = _serialize_alert(updated)
        logger.info(f"Alert status updated successfully for alert_id={alert_id}")
        return {"alert": serialized}
    except KeyError as error:
        logger.warning(f"Alert not found: alert_id={alert_id}")
        raise HTTPException(status_code=404, detail="Alert not found") from error
    except Exception as e:
        logger.error(f"Failed to update alert status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update alert status") from e


def _seed_normal_history(user_id: int, base_time: datetime) -> None:
    """Seed normal transaction history for a user to establish baseline behavior."""
    user = get_user(user_id)
    usual_destinations = [
        ("BCA", "982001111"),
        ("BNI", "982001112"),
        ("Mandiri", "982001113"),
    ]
    deterministic_amounts = [
        78_500,
        92_000,
        108_500,
        126_000,
        143_500,
        118_000,
        151_000,
        133_500,
        169_000,
        187_500,
    ]
    for index in range(HISTORY_SEEDING_ITERATIONS):
        bank, destination = usual_destinations[index % len(usual_destinations)]
        timestamp = base_time + timedelta(minutes=HISTORY_SEEDING_INTERVAL_MINUTES * index)
        transaction = TransactionCreate(
            user_id=user_id,
            amount=round(deterministic_amounts[index] + (user_id - 1) * HISTORY_SEEDING_BALANCE_MULTIPLIER, 2),
            destination_bank=bank,
            destination_account=destination,
            device_id=user["usual_device"],
            ip_address=f"10.10.{user_id}.{10 + index}",
            location_city=user["usual_city"],
            timestamp=timestamp,
        )
        history = fetch_user_history(user_id, limit=DEFAULT_USER_HISTORY_LIMIT)
        analysis = analyze_transaction(transaction, user, history)
        analysis.update(
            {
                "is_anomaly": False,
                "ml_score": 8,
                "rule_score": 0,
                "risk_score": 8,
                "alert_level": "normal",
                "reason": ["Pola transaksi masih konsisten dengan histori user."],
            }
        )
        insert_transaction(
            {
                **transaction.model_dump(),
                "timestamp": transaction.timestamp.isoformat(),
                **analysis,
            }
        )


def _insert_demo_transaction(
    transaction: TransactionCreate,
    status: str | None = None,
) -> dict[str, object]:
    """Insert a demo transaction and optionally update its alert status."""
    user = get_user(transaction.user_id)
    history = fetch_user_history(transaction.user_id, limit=DEFAULT_USER_HISTORY_LIMIT)
    analysis = analyze_transaction(transaction, user, history)
    saved = insert_transaction(
        {
            **transaction.model_dump(),
            "timestamp": transaction.timestamp.isoformat(),
            **analysis,
        }
    )
    if status and saved.get("alert_id"):
        alert = update_alert_status(saved["alert_id"], status)
        saved["alert_status"] = alert["status"]
    return saved


def _populate_demo_dataset() -> SeedDemoResponse:
    """Populate the system with demo transactions and alerts for testing."""
    logger.info("Populating demo dataset...")
    demo_start_time = DEMO_START_TIME
    for user_id in DEMO_USER_IDS:
        _seed_normal_history(user_id, demo_start_time + timedelta(minutes=user_id * DEMO_USER_TIME_OFFSET_MINUTES))

    seeded_alerts: list[dict[str, object]] = []

    seeded_alerts.append(
        _insert_demo_transaction(
            TransactionCreate(
                user_id=1,
                amount=612_000,
                destination_bank="Bank B",
                destination_account="981230001",
                device_id="android-ayu-001",
                ip_address="10.20.1.44",
                location_city="Jakarta",
                timestamp=datetime(2026, 3, 13, 14, 40, 0),
            ),
            status="review",
        )
    )
    seeded_alerts.append(
        _insert_demo_transaction(
            TransactionCreate(
                user_id=2,
                amount=8_500_000,
                destination_bank="Shadow Bank",
                destination_account="978905974",
                device_id="new-device-570",
                ip_address="172.16.208.252",
                location_city="Jakarta",
                timestamp=datetime(2026, 3, 13, 2, 25, 0),
            ),
            status="open",
        )
    )
    seeded_alerts.append(
        _insert_demo_transaction(
            TransactionCreate(
                user_id=3,
                amount=935_000,
                destination_bank="NeoBankX",
                destination_account="954955695",
                device_id="android-citra-003",
                ip_address="10.30.3.52",
                location_city="Jakarta",
                timestamp=datetime(2026, 3, 13, 21, 10, 0),
            ),
            status="open",
        )
    )
    seeded_alerts.append(
        _insert_demo_transaction(
            TransactionCreate(
                user_id=1,
                amount=430_000,
                destination_bank="BCA",
                destination_account="981230002",
                device_id="android-ayu-001",
                ip_address="10.20.1.51",
                location_city="Jakarta",
                timestamp=datetime(2026, 3, 13, 18, 15, 0),
            ),
            status="blocked",
        )
    )
    seeded_alerts.append(
        _insert_demo_transaction(
            TransactionCreate(
                user_id=2,
                amount=640_000,
                destination_bank="Mandiri",
                destination_account="982001119",
                device_id="iphone-budi-002",
                ip_address="10.20.2.32",
                location_city="Bandung",
                timestamp=datetime(2026, 3, 13, 11, 55, 0),
            ),
            status="resolved",
        )
    )

    primary_alert = next(
        (
            item
            for item in seeded_alerts
            if item.get("alert_level") == "high" and item.get("alert_id") is not None
        ),
        seeded_alerts[0],
    )
    logger.info(f"Demo dataset populated with {len(seeded_alerts)} alerts")
    return {
        "message": "Frozen demo dataset restored.",
        "seeded_alert_id": primary_alert.get("alert_id"),
        "summary": dashboard_summary(),
    }


@app.post("/api/demo/seed", response_model=SeedDemoResponse)
def seed_demo_data() -> SeedDemoResponse:
    """Seed demo data if not already present."""
    try:
        logger.info("Seed demo data requested")
        if has_transactions():
            logger.info("Demo data already seeded, skipping")
            return {
                "message": "Transactions already seeded.",
                "summary": dashboard_summary(),
            }
        return _populate_demo_dataset()
    except Exception as e:
        logger.error(f"Failed to seed demo data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to seed demo data") from e


@app.post("/api/demo/reset", response_model=SeedDemoResponse)
def reset_demo_data() -> SeedDemoResponse:
    """Reset and repopulate demo data."""
    try:
        logger.info("Reset demo data requested")
        reset_demo_dataset()
        logger.info("Demo dataset reset")
        return _populate_demo_dataset()
    except Exception as e:
        logger.error(f"Failed to reset demo data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to reset demo data") from e


@app.post("/api/demo/random", response_model=SimulateTransactionResponse)
def generate_random_transaction(suspicious: bool = False) -> SimulateTransactionResponse:
    """Generate a random transaction for testing (debug endpoint)."""
    try:
        logger.info(f"Generating random transaction - suspicious={suspicious}")
        user_id = choice(DEMO_USER_IDS)
        user = get_user(user_id)
        timestamp = datetime.utcnow()
        if suspicious and randint(0, 1):
            timestamp = timestamp.replace(hour=2, minute=randint(0, 59), second=0, microsecond=0)

        transaction = TransactionCreate(
            user_id=user_id,
            amount=round(uniform(5_000_000, 15_000_000), 2) if suspicious else round(uniform(50_000, 300_000), 2),
            destination_bank=choice(["Bank B", "NeoBankX", "Shadow Bank"]) if suspicious else choice(["BCA", "BNI", "BRI", "Mandiri"]),
            destination_account=str(randint(100000000, 999999999)),
            device_id=f"new-device-{randint(100, 999)}" if suspicious else user["usual_device"],
            ip_address=f"172.16.{randint(1, 254)}.{randint(1, 254)}",
            location_city=choice(["Singapore", "Kuala Lumpur", "Jakarta"]) if suspicious else user["usual_city"],
            timestamp=timestamp,
        )
        history = fetch_user_history(user_id, limit=DEFAULT_USER_HISTORY_LIMIT)
        analysis = analyze_transaction(transaction, user, history)
        saved = insert_transaction(
            {
                **transaction.model_dump(),
                "timestamp": transaction.timestamp.isoformat(),
                **analysis,
            }
        )
        serialized = _serialize_transaction(saved)
        logger.info(f"Random transaction generated - risk_score={serialized['risk_score']}, alert_level={serialized['alert_level']}")
        return {
            "transaction_id": serialized["id"],
            "risk_score": serialized["risk_score"],
            "is_anomaly": serialized["is_anomaly"],
            "alert_level": serialized["alert_level"],
            "reason": serialized["reason"],
            "reason_summary": serialized["reason_summary"],
            "transaction": serialized,
        }
    except Exception as e:
        logger.error(f"Failed to generate random transaction: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate random transaction") from e


@app.get("/{full_path:path}", include_in_schema=False)
def serve_single_page_app(full_path: str) -> FileResponse:
    if full_path.startswith(("api/", "docs", "openapi.json", "redoc", "static/")):
        raise HTTPException(status_code=404, detail="Not found")

    frontend_index = _frontend_index_file()
    if frontend_index is not None:
        candidate = FRONTEND_DIST_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(frontend_index)

    return FileResponse(LEGACY_STATIC_DIR / "index.html")
