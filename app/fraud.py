from __future__ import annotations

import hashlib
from datetime import timedelta
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from .schemas import TransactionCreate


def _destination_hash(destination_bank: str, destination_account: str) -> int:
    raw = f"{destination_bank}:{destination_account}".encode("utf-8")
    return int(hashlib.sha256(raw).hexdigest()[:8], 16) % 1000


def _normalize_timestamp(value: Any) -> pd.Timestamp:
    timestamp = pd.Timestamp(value)
    if timestamp.tzinfo is None:
        return timestamp.tz_localize("UTC")
    return timestamp.tz_convert("UTC")


def _fit_isolation_forest(history: list[dict[str, Any]]) -> tuple[IsolationForest | None, pd.DataFrame]:
    if len(history) < 8:
        return None, pd.DataFrame()

    frame = pd.DataFrame(history).copy()
    frame["timestamp"] = pd.to_datetime(
        frame["timestamp"],
        utc=True,
        format="mixed",
    )
    avg_amount = max(1.0, float(frame["amount"].astype(float).mean()))
    max_amount = max(1.0, float(frame["amount"].astype(float).max()))
    destination_counts = frame["destination_account"].astype(str).value_counts()

    frame["amount_vs_avg_ratio"] = frame["amount"].astype(float) / avg_amount
    frame["destination_frequency"] = frame["destination_account"].astype(str).map(destination_counts).fillna(0).astype(float)
    frame["is_new_device"] = frame["device_id"].astype(str).map(frame["device_id"].astype(str).value_counts()).eq(1).astype(int)
    frame["is_new_destination"] = frame["destination_account"].astype(str).map(destination_counts).eq(1).astype(int)
    frame["is_unusual_hour"] = frame["timestamp"].dt.hour.isin([0, 1, 2, 3, 4]).astype(int)
    frame["hour_of_day"] = frame["timestamp"].dt.hour.astype(float)
    frame["day_of_week"] = frame["timestamp"].dt.weekday.astype(float)
    frame["transaction_count_last_24h"] = frame["timestamp"].apply(
        lambda ts: int(((frame["timestamp"] >= ts - timedelta(hours=24)) & (frame["timestamp"] <= ts)).sum())
    )
    frame["avg_amount_user"] = avg_amount
    frame["max_amount_user"] = max_amount
    frame["destination_hash"] = frame.apply(
        lambda row: _destination_hash(row["destination_bank"], row["destination_account"]),
        axis=1,
    )

    feature_columns = [
        "amount",
        "hour_of_day",
        "day_of_week",
        "is_new_device",
        "is_new_destination",
        "is_unusual_hour",
        "amount_vs_avg_ratio",
        "transaction_count_last_24h",
        "avg_amount_user",
        "max_amount_user",
        "destination_frequency",
        "destination_hash",
    ]
    model = IsolationForest(
        contamination=min(0.18, max(0.08, 2 / (len(frame) + 2))),
        random_state=42,
    )
    model.fit(frame[feature_columns].astype(float).to_numpy())
    return model, frame


def analyze_transaction(
    transaction: TransactionCreate,
    user: dict[str, Any],
    history: list[dict[str, Any]],
) -> dict[str, Any]:
    history_frame = pd.DataFrame(history) if history else pd.DataFrame()
    transaction_timestamp = _normalize_timestamp(transaction.timestamp)
    avg_amount = float(history_frame["amount"].astype(float).mean()) if not history_frame.empty else max(transaction.amount, 150_000.0)
    max_amount = float(history_frame["amount"].astype(float).max()) if not history_frame.empty else transaction.amount
    known_devices = set(history_frame["device_id"].astype(str)) if not history_frame.empty else {user["usual_device"]}
    known_destinations = set(history_frame["destination_account"].astype(str)) if not history_frame.empty else set()
    destination_frequency = (
        int((history_frame["destination_account"].astype(str) == transaction.destination_account).sum())
        if not history_frame.empty
        else 0
    )

    amount_vs_avg_ratio = round(transaction.amount / max(avg_amount, 1.0), 2)
    is_new_device = int(transaction.device_id not in known_devices)
    is_new_destination = int(transaction.destination_account not in known_destinations)
    is_unusual_hour = int(transaction_timestamp.hour in {0, 1, 2, 3, 4})

    if not history_frame.empty:
        timestamps = pd.to_datetime(
            history_frame["timestamp"],
            utc=True,
            format="mixed",
        )
        recent_24h = int((timestamps >= transaction_timestamp - timedelta(hours=24)).sum())
        recent_10m = int((timestamps >= transaction_timestamp - timedelta(minutes=10)).sum())
        typical_hours = timestamps.dt.hour.tolist()
    else:
        recent_24h = 0
        recent_10m = 0
        typical_hours = list(range(8, 21))

    nearest_hour_gap = min(abs(transaction_timestamp.hour - hour) for hour in typical_hours) if typical_hours else 0

    reasons: list[str] = []
    rule_score = 0

    if amount_vs_avg_ratio >= 5:
        rule_score += 12
        reasons.append(f"Nominal {amount_vs_avg_ratio}x lebih besar dari rata-rata user.")
    elif amount_vs_avg_ratio >= 3:
        rule_score += 7
        reasons.append(f"Nominal {amount_vs_avg_ratio}x di atas rata-rata user.")

    if transaction.amount >= max(max_amount * 1.8, avg_amount * 6):
        rule_score += 6
        reasons.append("Nominal transaksi melewati pola maksimum historis user.")

    if is_unusual_hour or nearest_hour_gap >= 5:
        rule_score += 5
        reasons.append("Transaksi dilakukan di jam yang tidak biasa.")

    if is_new_device:
        rule_score += 4
        reasons.append("Device baru terdeteksi.")

    if is_new_destination:
        rule_score += 4
        reasons.append("Rekening tujuan belum pernah digunakan.")

    if recent_10m >= 3:
        rule_score += 5
        reasons.append("Frekuensi transaksi meningkat tajam dalam 10 menit terakhir.")

    if transaction.location_city.lower() != str(user["usual_city"]).lower():
        rule_score += 3
        reasons.append("Lokasi transaksi berbeda dari kota utama user.")

    rule_score = min(30, rule_score)

    features = {
        "amount": round(transaction.amount, 2),
        "hour_of_day": transaction_timestamp.hour,
        "day_of_week": transaction_timestamp.weekday(),
        "is_new_device": is_new_device,
        "is_new_destination": is_new_destination,
        "is_unusual_hour": is_unusual_hour,
        "amount_vs_avg_ratio": amount_vs_avg_ratio,
        "transaction_count_last_24h": recent_24h,
        "avg_amount_user": round(avg_amount, 2),
        "max_amount_user": round(max_amount, 2),
        "destination_frequency": destination_frequency,
    }

    model, model_frame = _fit_isolation_forest(history)
    ml_score = 0
    is_anomaly = False
    if model is not None:
        new_vector = np.array(
            [[
                features["amount"],
                features["hour_of_day"],
                features["day_of_week"],
                features["is_new_device"],
                features["is_new_destination"],
                features["is_unusual_hour"],
                features["amount_vs_avg_ratio"],
                features["transaction_count_last_24h"],
                features["avg_amount_user"],
                features["max_amount_user"],
                features["destination_frequency"],
                _destination_hash(transaction.destination_bank, transaction.destination_account),
            ]],
            dtype=float,
        )
        prediction = int(model.predict(new_vector)[0])
        raw_score = float(model.decision_function(new_vector)[0])
        ml_score = int(round(max(0.0, min(1.0, 0.5 - raw_score)) * 70))
        is_anomaly = prediction == -1
        if is_anomaly:
            reasons.append("Model anomaly detection menandai transaksi sebagai outlier.")
    else:
        heuristic = 0.0
        heuristic += min(1.0, (amount_vs_avg_ratio - 1) / 8) * 0.55
        heuristic += is_new_device * 0.15
        heuristic += is_new_destination * 0.15
        heuristic += is_unusual_hour * 0.15
        ml_score = int(round(min(1.0, heuristic) * 70))
        is_anomaly = ml_score >= 45
        if is_anomaly:
            reasons.append("Baseline anomaly score tinggi walau histori user masih terbatas.")

    final_risk_score = min(100, ml_score + rule_score)
    alert_level = "high" if final_risk_score >= 60 else "suspicious" if final_risk_score >= 30 else "normal"

    if not reasons:
        reasons.append("Pola transaksi masih konsisten dengan histori user.")

    # Keep one short set of reasons for UI readability.
    deduped_reasons = list(dict.fromkeys(reasons))[:5]

    return {
        "is_anomaly": is_anomaly or alert_level == "high",
        "ml_score": ml_score,
        "rule_score": rule_score,
        "risk_score": final_risk_score,
        "alert_level": alert_level,
        "reason": deduped_reasons,
        "feature_snapshot": features,
        "model_rows_used": int(len(model_frame)) if not model_frame.empty else 0,
    }
