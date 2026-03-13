# Fraud Detection System for Banking Transactions

A hackathon MVP that detects suspicious banking transactions using a hybrid approach combining rule-based heuristics and machine learning anomaly detection.

The system builds behavioral baselines per user, evaluates incoming transactions in near real-time, and surfaces risk alerts in a monitoring dashboard for investigation and review.

## Stack

- Backend: FastAPI
- Database: SQLite
- AI/ML: pandas, scikit-learn, numpy
- Frontend: React, Tailwind CSS, Recharts
- Fallback UI: HTML, CSS, vanilla JavaScript

## System Architecture

```text
React Dashboard / Simulator
            |
            v
       FastAPI Backend
            |
            v
   Fraud Detection Engine
            |
            v
       SQLite Database
```

System flow:

1. The React dashboard or simulator submits a transaction.
2. FastAPI retrieves recent user history from SQLite.
3. The fraud detection engine computes behavioral features and anomaly signals.
4. The backend combines ML score and rule score into a final risk score.
5. The system stores transactions and alerts, then returns the result to the dashboard.

## Features

- Manual transaction simulation
- Auto simulation for normal and suspicious scenarios
- Live demo transaction stream on the simulate page
- Behavioral baseline per user
- Anomaly detection with `IsolationForest`
- Rule-based fraud scoring
- Risk score `0-100`
- Explainable fraud reasons
- Alert queue with `open`, `review`, `blocked`, and `resolved` statuses
- Monitoring dashboard with charts and recent activity

## Single Server Demo Mode

The project runs in a single-server demo mode:

- FastAPI serves all `/api/...` endpoints
- FastAPI also serves the built React frontend from `frontend/dist`
- Routes such as `/`, `/simulate`, and `/alerts` resolve directly through the same server

If `frontend/dist` is not available, the project falls back to the static dashboard in `static/index.html`.

## Risk Engine

### Rule-Based Layer

The rule engine increases risk based on behavior shifts such as:

- amount significantly above user average
- amount above historical maximum
- unusual transaction hour
- new device
- new destination account
- sudden transaction velocity increase
- location mismatch with the user's primary city

`rule_score` is capped at `30`.

### ML Anomaly Detection

`IsolationForest` learns a user's normal transaction behavior from historical records. The feature vector includes:

- `amount`
- `hour_of_day`
- `day_of_week`
- `is_new_device`
- `is_new_destination`
- `is_unusual_hour`
- `amount_vs_avg_ratio`
- `transaction_count_last_24h`
- `avg_amount_user`
- `max_amount_user`
- `destination_frequency`

`ml_score` is capped at `0-70`.

### Final Risk Score

```text
final_risk_score = min(100, ml_score + rule_score)
```

Risk categories:

- `0-29` = `normal`
- `30-59` = `suspicious`
- `60-100` = `high`

## Database Schema

### `users`

- `id`
- `name`
- `account_number`
- `usual_device`
- `usual_city`
- `created_at`

### `transactions`

- `id`
- `user_id`
- `amount`
- `transaction_type`
- `destination_bank`
- `destination_account`
- `timestamp`
- `device_id`
- `ip_address`
- `location_city`
- `is_anomaly`
- `ml_score`
- `rule_score`
- `risk_score`
- `alert_level`
- `reason`
- `feature_snapshot`
- `created_at`

### `alerts`

- `id`
- `transaction_id`
- `alert_level`
- `status`
- `created_at`

## API Endpoints

The main backend contract is defined with Pydantic schemas in `app/schemas.py`.

- `POST /api/transactions/simulate`
- `GET /api/alerts`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/charts`
- `POST /api/alerts/{alert_id}/status`
- `GET /api/users`
- `GET /api/transactions`
- `GET /api/transactions/recent`
- `POST /api/demo/seed`
- `POST /api/demo/reset`
- `POST /api/demo/random?suspicious=true`

### `POST /api/transactions/simulate`

Example request:

```json
{
  "user_id": 1,
  "amount": 8500000,
  "transaction_type": "transfer",
  "destination_bank": "Bank B",
  "destination_account": "987654321",
  "device_id": "new-device-999",
  "ip_address": "192.168.1.10",
  "location_city": "Jakarta",
  "timestamp": "2026-03-13T02:30:00"
}
```

Example response:

```json
{
  "transaction_id": 31,
  "risk_score": 92,
  "is_anomaly": true,
  "alert_level": "high",
  "reason_summary": "Nominal 42.5x lebih besar dari rata-rata user.; Transaksi dilakukan di jam yang tidak biasa.; Device baru terdeteksi.",
  "reason": [
    "Nominal 42.5x lebih besar dari rata-rata user.",
    "Transaksi dilakukan di jam yang tidak biasa.",
    "Device baru terdeteksi."
  ]
}
```

## Demo Dataset Reset

Use the reset endpoint to restore a deterministic demo-ready dataset:

```bash
curl -X POST http://127.0.0.1:8000/api/demo/reset
```

The reset dataset includes:

- multiple `open` alerts
- one `review` alert
- one `blocked` alert
- one `resolved` alert
- at least one `high risk` alert

If you want a local backup snapshot for presentation:

```bash
cp data/fraud.db data/fraud-demo-snapshot.db
```

## Running the Project

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000`.

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The React frontend runs on `http://127.0.0.1:5173` and proxies API requests to FastAPI.

### Single Server Demo

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd frontend
npm install
npm run build
cd ..
uvicorn app.main:app --reload
```

After `frontend/dist` is created, FastAPI serves the React build directly from `http://127.0.0.1:8000`.

## Project Structure

```text
app/
  main.py
  db.py
  fraud.py
  schemas.py
frontend/
  src/
    api/
    components/
    hooks/
    pages/
    utils/
static/
  index.html
  styles.css
  app.js
requirements.txt
```

## Screenshots

Suggested repository screenshots:

- Dashboard monitoring overview
- Alert review page with baseline comparison
- Transaction simulation page with live demo controls

## Demo Workflow

1. Reset the demo dataset.
2. Observe normal transaction patterns on the dashboard.
3. Generate a suspicious transaction manually or through the live demo controls.
4. Review the generated risk score and fraud reasons.
5. Investigate the alert in the monitoring dashboard.
6. Mark the transaction as `Safe`, `Review`, or `Block`.

## Future Improvements

- Integrate real banking transaction streams
- Replace SQLite with PostgreSQL
- Add model retraining and feature drift monitoring
- Implement role-based access control
- Add richer explainability visualizations for anomaly detection
- Introduce WebSocket-based live updates instead of polling

## Verification Notes

- `python -m compileall app` passes
- `npm run build` passes
- the app supports a single-server deployment with FastAPI + React build

## License

MIT License. See [LICENSE](/home/areksaxyz/Fraud-Detection-System-Untuk-Bank/LICENSE).
