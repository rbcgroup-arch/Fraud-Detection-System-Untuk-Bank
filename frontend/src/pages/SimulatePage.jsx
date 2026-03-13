import { useEffect, useState } from "react";

import { api } from "../api/client";
import ReasonList from "../components/ReasonList";
import RiskBadge from "../components/RiskBadge";
import SummaryCard from "../components/SummaryCard";
import TransactionForm from "../components/TransactionForm";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";

export default function SimulatePage() {
  const [users, setUsers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .getUsers()
      .then((payload) => setUsers(payload.items))
      .catch((error) => setMessage(error.message));
  }, []);

  async function handleSubmit(payload) {
    setLoading(true);
    setMessage("");
    try {
      const response = await api.simulateTransaction(payload);
      setResult(response);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    setMessage("");
    try {
      await api.seedDemo();
      setMessage("Demo data seeded. Dashboard and alerts are ready.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <TransactionForm
        users={users}
        onSubmit={handleSubmit}
        onSeed={handleSeed}
        loading={loading}
      />

      <div className="space-y-6">
        {message ? (
          <div className="panel p-4 text-sm text-slate-200">{message}</div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Risk Score"
            value={result?.risk_score ?? "-"}
            hint="Gabungan ML score + rule score"
            tone={result?.alert_level === "high" ? "danger" : "warning"}
          />
          <SummaryCard
            title="Anomaly"
            value={result ? (result.is_anomaly ? "Yes" : "No") : "-"}
            hint="Output akhir anomaly detection"
            tone={result?.is_anomaly ? "danger" : "success"}
          />
          <SummaryCard
            title="Alert Level"
            value={result?.alert_level ?? "-"}
            hint={result?.reason_summary ?? "Belum ada hasil simulasi"}
            tone={result?.alert_level === "high" ? "danger" : "warning"}
          />
        </section>

        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
                Last Result
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Transaction Analysis
              </h2>
            </div>
            {result ? <RiskBadge value={result.alert_level} /> : null}
          </div>

          {result ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="panel-soft p-4 text-sm text-slate-200">
                <div className="text-slate-400">Amount</div>
                <div className="mt-1 text-lg font-bold text-white">
                  {formatCurrency(result.transaction.amount)}
                </div>
              </div>
              <div className="panel-soft p-4 text-sm text-slate-200">
                <div className="text-slate-400">Timestamp</div>
                <div className="mt-1 text-lg font-bold text-white">
                  {formatDate(result.transaction.timestamp)}
                </div>
              </div>
              <div className="panel-soft p-4 text-sm text-slate-200">
                <div className="text-slate-400">Destination</div>
                <div className="mt-1 text-lg font-bold text-white">
                  {result.transaction.destination_bank} /{" "}
                  {result.transaction.destination_account}
                </div>
              </div>
              <div className="panel-soft p-4 text-sm text-slate-200">
                <div className="text-slate-400">Device / City</div>
                <div className="mt-1 text-lg font-bold text-white">
                  {result.transaction.device_id} / {result.transaction.location_city}
                </div>
              </div>
            </div>
          ) : (
            <div className="panel-soft p-4 text-sm text-slate-400">
              Submit transaksi untuk melihat hasil risk scoring.
            </div>
          )}
        </section>

        <ReasonList
          reasons={result?.reason ?? []}
          title="Fraud Explanation"
        />
      </div>
    </div>
  );
}
