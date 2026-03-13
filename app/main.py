from __future__ import annotations

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

ROOT_DIR = Path(__file__).resolve().parent.parent
LEGACY_STATIC_DIR = ROOT_DIR / "static"
FRONTEND_DIST_DIR = ROOT_DIR / "frontend" / "dist"
FRONTEND_ASSETS_DIR = FRONTEND_DIST_DIR / "assets"

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
    init_db()


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
    return {"items": fetch_users()}


@app.get("/api/transactions", response_model=TransactionsListResponse)
def list_transactions(limit: int = 100) -> TransactionsListResponse:
    return {"items": [_serialize_transaction(item) for item in fetch_transactions(limit=limit)]}


@app.get("/api/transactions/recent", response_model=TransactionsListResponse)
def list_recent_transactions(limit: int = 12) -> TransactionsListResponse:
    return {"items": [_serialize_transaction(item) for item in fetch_transactions(limit=limit)]}


@app.get("/api/alerts", response_model=AlertsListResponse)
def list_alerts(limit: int = 50) -> AlertsListResponse:
    return {"items": [_serialize_alert(item) for item in fetch_alerts(limit=limit)]}


@app.get("/api/dashboard/summary", response_model=DashboardSummaryResponse)
def dashboard_summary() -> DashboardSummaryResponse:
    summary = fetch_summary()
    summary["recent_alerts"] = [_serialize_alert(item) for item in fetch_alerts(limit=6)]
    return summary


@app.get("/api/dashboard/charts", response_model=DashboardChartsResponse)
def dashboard_charts() -> DashboardChartsResponse:
    return fetch_dashboard_charts()


@app.post("/api/transactions/simulate", response_model=SimulateTransactionResponse)
def simulate_transaction(transaction: TransactionCreate) -> SimulateTransactionResponse:
    try:
        user = get_user(transaction.user_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail="User not found") from error

    history = fetch_user_history(transaction.user_id, limit=100)
    analysis = analyze_transaction(transaction, user, history)
    saved = insert_transaction(
        {
            **transaction.model_dump(),
            "timestamp": transaction.timestamp.isoformat(),
            **analysis,
        }
    )
    serialized = _serialize_transaction(saved)
    return {
        "transaction_id": serialized["id"],
        "risk_score": serialized["risk_score"],
        "is_anomaly": serialized["is_anomaly"],
        "alert_level": serialized["alert_level"],
        "reason": serialized["reason"],
        "reason_summary": serialized["reason_summary"],
        "transaction": serialized,
    }


@app.post("/api/alerts/{alert_id}/status", response_model=AlertStatusUpdateResponse)
def change_alert_status(alert_id: int, payload: AlertStatusUpdate) -> AlertStatusUpdateResponse:
    try:
        updated = update_alert_status(alert_id, payload.status)
    except KeyError as error:
        raise HTTPException(status_code=404, detail="Alert not found") from error
    return {"alert": _serialize_alert(updated)}


def _seed_normal_history(user_id: int, base_time: datetime) -> None:
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
    for index in range(10):
        bank, destination = usual_destinations[index % len(usual_destinations)]
        timestamp = base_time + timedelta(minutes=55 * index)
        transaction = TransactionCreate(
            user_id=user_id,
            amount=round(deterministic_amounts[index] + (user_id - 1) * 14_500, 2),
            destination_bank=bank,
            destination_account=destination,
            device_id=user["usual_device"],
            ip_address=f"10.10.{user_id}.{10 + index}",
            location_city=user["usual_city"],
            timestamp=timestamp,
        )
        history = fetch_user_history(user_id, limit=100)
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
    user = get_user(transaction.user_id)
    history = fetch_user_history(transaction.user_id, limit=100)
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
    demo_start_time = datetime(2026, 3, 13, 8, 5, 0)
    for user_id in [1, 2, 3]:
        _seed_normal_history(user_id, demo_start_time + timedelta(minutes=user_id * 40))

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
    return {
        "message": "Frozen demo dataset restored.",
        "seeded_alert_id": primary_alert.get("alert_id"),
        "summary": dashboard_summary(),
    }


@app.post("/api/demo/seed", response_model=SeedDemoResponse)
def seed_demo_data() -> SeedDemoResponse:
    if has_transactions():
        return {
            "message": "Transactions already seeded.",
            "summary": dashboard_summary(),
        }
    return _populate_demo_dataset()


@app.post("/api/demo/reset", response_model=SeedDemoResponse)
def reset_demo_data() -> SeedDemoResponse:
    reset_demo_dataset()
    return _populate_demo_dataset()


@app.post("/api/demo/random", response_model=SimulateTransactionResponse)
def generate_random_transaction(suspicious: bool = False) -> SimulateTransactionResponse:
    user_id = choice([1, 2, 3])
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
    history = fetch_user_history(user_id, limit=100)
    analysis = analyze_transaction(transaction, user, history)
    saved = insert_transaction(
        {
            **transaction.model_dump(),
            "timestamp": transaction.timestamp.isoformat(),
            **analysis,
        }
    )
    serialized = _serialize_transaction(saved)
    return {
        "transaction_id": serialized["id"],
        "risk_score": serialized["risk_score"],
        "is_anomaly": serialized["is_anomaly"],
        "alert_level": serialized["alert_level"],
        "reason": serialized["reason"],
        "reason_summary": serialized["reason_summary"],
        "transaction": serialized,
    }


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
