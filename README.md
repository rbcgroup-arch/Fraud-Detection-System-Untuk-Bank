# Fraud Detection System untuk Bank

MVP hackathon untuk mendeteksi transaksi transfer yang tidak biasa berdasarkan pola user. Sistem ini menyimpan transaksi, membangun baseline perilaku user, menjalankan anomaly detection di backend, lalu mengirim hasil risk score dan alert ke dashboard.

## Gambaran Alur Sistem

1. User atau simulator mengirim transaksi ke `POST /api/transactions/simulate`
2. Backend mengambil histori transaksi user dari SQLite
3. Backend menghitung fitur perilaku user
4. `IsolationForest` menghitung anomaly score
5. Rule-based engine menambah skor risiko
6. Sistem menggabungkan `ml_score + rule_score`
7. Jika risk tinggi, sistem membuat alert
8. Dashboard menampilkan transaksi, alert, reason, dan status review

## Stack

- Backend: FastAPI
- Database: SQLite
- AI/ML: pandas, scikit-learn, numpy
- Frontend fallback: HTML, CSS, vanilla JavaScript
- Frontend utama berikutnya: React + Tailwind + Recharts

Frontend statis tetap dipertahankan sebagai fallback demo cepat. Selain itu sudah ada scaffold `frontend/` berbasis Vite + React + Tailwind untuk migrasi bertahap tanpa mengubah backend lagi.

## Mode Demo Tunggal

Target demo sekarang adalah satu server:

- FastAPI serve semua endpoint `/api/...`
- FastAPI juga serve hasil build React dari `frontend/dist`
- route seperti `/`, `/simulate`, dan `/alerts` langsung fallback ke SPA React

Jika `frontend/dist` belum ada, aplikasi tetap fallback ke dashboard statis lama di `static/index.html`.

## Struktur Project

```text
app/
  main.py       # API routes dan orchestration backend
  db.py         # SQLite schema, query helper, summary, alerts
  fraud.py      # feature engineering, rule score, IsolationForest
  schemas.py    # request schema
static/
  index.html    # dashboard MVP
  styles.css    # UI styling
  app.js        # API calls dan rendering dashboard
frontend/
  src/api       # API client untuk React
  src/components
  src/pages
  src/hooks
  src/utils
requirements.txt
```

## Scope MVP yang Sudah Dicakup

- simulasi transaksi manual
- auto simulation normal vs suspicious
- tabel `users`, `transactions`, `alerts`
- analisis histori transaksi per user
- fitur `amount_vs_avg_ratio`, `is_new_device`, `is_new_destination`, `is_unusual_hour`, `transaction_count_last_24h`
- anomaly detection dengan `IsolationForest`
- risk score 0-100
- explanation reason
- fraud alert panel
- alert review dengan status `open`, `review`, `blocked`, `resolved`

## Struktur Database

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

## Cara Kerja Risk Engine

### A. Rule-Based

Rule yang dipakai untuk demo:

- nominal jauh di atas rata-rata user
- nominal melewati pola maksimum historis
- transaksi di jam tidak biasa
- device baru
- rekening tujuan baru
- lonjakan frekuensi transaksi
- lokasi berbeda dari kota utama user

`rule_score` dibatasi maksimal `30`.

### B. ML Anomaly Detection

`IsolationForest` mempelajari pola transaksi normal dari histori user. Feature vector yang digunakan:

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

`ml_score` dibatasi di rentang `0-70`.

### Formula Final

```text
final_risk_score = min(100, ml_score + rule_score)
```

Kategori:

- `0-29` = `normal`
- `30-59` = `suspicious`
- `60-100` = `high`

## Endpoint Utama

Kontrak response backend sekarang dibekukan lewat schema Pydantic di `app/schemas.py`. Endpoint di bawah ini adalah kontrak utama yang dipakai frontend React:

- `POST /api/transactions/simulate`
- `GET /api/alerts`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/charts`
- `POST /api/alerts/{alert_id}/status`
- `GET /api/users`
- `GET /api/transactions/recent`

### `POST /api/transactions/simulate`

Contoh request:

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

Contoh response:

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
  ],
  "transaction": {
    "id": 31,
    "user_id": 1,
    "user_name": "Ayu Pratama",
    "account_number": "120000001",
    "amount": 8500000,
    "transaction_type": "transfer",
    "destination_bank": "Bank B",
    "destination_account": "987654321",
    "timestamp": "2026-03-13T02:30:00",
    "device_id": "new-device-999",
    "ip_address": "192.168.1.10",
    "location_city": "Jakarta",
    "is_anomaly": true,
    "ml_score": 62,
    "rule_score": 30,
    "risk_score": 92,
    "alert_level": "high",
    "reason": [
      "Nominal 42.5x lebih besar dari rata-rata user.",
      "Transaksi dilakukan di jam yang tidak biasa.",
      "Device baru terdeteksi."
    ],
    "reason_summary": "Nominal 42.5x lebih besar dari rata-rata user.; Transaksi dilakukan di jam yang tidak biasa.; Device baru terdeteksi.",
    "feature_snapshot": {
      "amount": 8500000,
      "hour_of_day": 2,
      "day_of_week": 4,
      "is_new_device": 1,
      "is_new_destination": 1,
      "is_unusual_hour": 1,
      "amount_vs_avg_ratio": 42.5,
      "transaction_count_last_24h": 10,
      "avg_amount_user": 200000,
      "max_amount_user": 300000,
      "destination_frequency": 0
    },
    "created_at": "2026-03-13T02:30:01",
    "alert_id": 9,
    "alert_status": "open"
  }
}
```

### Endpoint lain

- `GET /api/users`
- `GET /api/transactions`
- `GET /api/transactions/recent`
- `GET /api/alerts`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/charts`
- `POST /api/alerts/{alert_id}/status`
- `POST /api/demo/seed`
- `POST /api/demo/reset`
- `POST /api/demo/random?suspicious=true`

### Reset demo data

Untuk menghindari data demo berubah-ubah saat testing, gunakan endpoint berikut untuk mengembalikan SQLite ke dataset presentasi yang tetap:

```bash
curl -X POST http://127.0.0.1:8000/api/demo/reset
```

Dataset reset ini berisi:

- beberapa alert `open`
- satu alert `review`
- satu alert `blocked`
- satu alert `resolved`
- minimal satu `high risk` alert

Kalau ingin snapshot file SQLite final untuk cadangan presentasi, jalankan reset lalu salin:

```bash
cp data/fraud.db data/fraud-demo-snapshot.db
```

## Cara Menjalankan

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Buka `http://127.0.0.1:8000`.

### Frontend React

```bash
cd frontend
npm install
npm run dev
```

Frontend React berjalan di `http://127.0.0.1:5173` dan otomatis proxy ke backend FastAPI.

### Demo Tunggal: FastAPI + React Build

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

Setelah `frontend/dist` terbentuk, buka `http://127.0.0.1:8000`. FastAPI akan langsung serve hasil build React dan semua request frontend tetap masuk ke endpoint `/api/...` pada server yang sama.

## Struktur Frontend React

```text
frontend/
  src/
    api/client.js
    components/
      SummaryCard.jsx
      AlertsTable.jsx
      RiskBadge.jsx
      TransactionForm.jsx
      ReasonList.jsx
      ChartCard.jsx
      RecentTransactionsTable.jsx
    pages/
      DashboardPage.jsx
      SimulatePage.jsx
      AlertsPage.jsx
    hooks/useDashboardData.js
    utils/
      formatCurrency.js
      formatDate.js
      risk.js
```

React pages yang sudah discaffold:

- `DashboardPage` untuk summary, charts, recent alerts, dan recent transactions
- `SimulatePage` untuk form simulasi dan hasil scoring
- `AlertsPage` untuk review queue, filter status, dan detail alert

## Flow Demo yang Paling Aman

1. Klik `Seed Demo`
2. Tunjukkan histori transaksi normal user
3. Klik `Generate Suspicious`
4. Tunjukkan `risk score`, `ml_score`, `rule_score`, dan `reason`
5. Review alert di tabel monitoring
6. Klik `Block` atau `Safe`
7. Aktifkan `Start Live Simulation`

## Pembagian Kerja Tim yang Aman

### Backend

- finalisasi endpoint
- perkuat feature engineering
- rapikan model scoring
- tambah export data dummy

### Frontend

- lanjutkan styling Tailwind dan polishing komponen React
- sambungkan state loading/error ke toast atau notification
- tambah modal detail alert kalau ingin presentasi lebih dramatis
- pertahankan dashboard statis sebagai backup demo

## Catatan Verifikasi

- `python -m compileall app` sudah lolos
- dependency runtime belum terpasang di environment ini, jadi `pip install -r requirements.txt` tetap perlu dijalankan sebelum demo
