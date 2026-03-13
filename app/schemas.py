from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

AlertStatus = Literal["open", "review", "blocked", "resolved"]
AlertLevel = Literal["normal", "suspicious", "high"]


class TransactionCreate(BaseModel):
    user_id: int = Field(..., ge=1)
    amount: float = Field(..., gt=0)
    transaction_type: str = Field(default="transfer", max_length=32)
    destination_bank: str = Field(..., min_length=2, max_length=64)
    destination_account: str = Field(..., min_length=3, max_length=64)
    device_id: str = Field(..., min_length=3, max_length=64)
    ip_address: str = Field(..., min_length=7, max_length=64)
    location_city: str = Field(..., min_length=2, max_length=64)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AlertStatusUpdate(BaseModel):
    status: AlertStatus


class HealthResponse(BaseModel):
    status: str


class UserRead(BaseModel):
    id: int
    name: str
    account_number: str
    usual_device: str
    usual_city: str
    created_at: str


class UsersListResponse(BaseModel):
    items: list[UserRead]


class FeatureSnapshot(BaseModel):
    amount: float
    hour_of_day: int
    day_of_week: int
    is_new_device: int
    is_new_destination: int
    is_unusual_hour: int
    amount_vs_avg_ratio: float
    transaction_count_last_24h: int
    avg_amount_user: float
    max_amount_user: float
    destination_frequency: int


class TransactionRead(BaseModel):
    id: int
    user_id: int
    user_name: str
    account_number: str
    amount: float
    transaction_type: str
    destination_bank: str
    destination_account: str
    timestamp: str
    device_id: str
    ip_address: str
    location_city: str
    is_anomaly: bool
    ml_score: int
    rule_score: int
    risk_score: int
    alert_level: AlertLevel
    reason: list[str]
    reason_summary: str
    feature_snapshot: FeatureSnapshot
    created_at: str
    alert_id: int | None = None
    alert_status: AlertStatus | None = None


class TransactionsListResponse(BaseModel):
    items: list[TransactionRead]


class AlertRead(BaseModel):
    id: int
    transaction_id: int
    alert_level: AlertLevel
    status: AlertStatus
    created_at: str
    risk_score: int
    amount: float
    destination_bank: str
    destination_account: str
    timestamp: str
    reason: list[str]
    reason_summary: str
    user_name: str
    account_number: str


class AlertsListResponse(BaseModel):
    items: list[AlertRead]


class DashboardSummaryResponse(BaseModel):
    total_transactions: int
    suspicious_transactions: int
    high_risk_alerts: int
    fraud_rate: float
    average_risk: float
    total_volume: float
    recent_alerts: list[AlertRead]


class HourlyChartPoint(BaseModel):
    hour: str
    total: int


class LabeledTotal(BaseModel):
    label: str
    total: int


class RiskDistribution(BaseModel):
    normal: int
    suspicious: int
    high: int


class DashboardChartsResponse(BaseModel):
    transactions_per_hour: list[HourlyChartPoint]
    risk_distribution: RiskDistribution
    normal_vs_suspicious: list[LabeledTotal]


class SimulateTransactionResponse(BaseModel):
    transaction_id: int
    risk_score: int
    is_anomaly: bool
    alert_level: AlertLevel
    reason: list[str]
    reason_summary: str
    transaction: TransactionRead


class AlertStatusUpdateResponse(BaseModel):
    alert: AlertRead


class SeedDemoResponse(BaseModel):
    message: str
    seeded_alert_id: int | None = None
    summary: DashboardSummaryResponse
