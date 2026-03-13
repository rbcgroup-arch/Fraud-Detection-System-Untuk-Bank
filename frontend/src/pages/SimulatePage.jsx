import { useEffect, useMemo, useState } from "react";

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
  const [liveMode, setLiveMode] = useState("mixed");
  const [liveEvents, setLiveEvents] = useState([]);
  const [liveRunning, setLiveRunning] = useState(false);

  const liveStatusLabel = useMemo(() => {
    if (!liveRunning) {
      return "Stopped";
    }
    if (liveMode === "fraud") {
      return "Fraud Focus";
    }
    if (liveMode === "normal") {
      return "Normal Flow";
    }
    return "Mixed Stream";
  }, [liveMode, liveRunning]);

  useEffect(() => {
    api
      .getUsers()
      .then((payload) => setUsers(payload.items))
      .catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    if (!liveRunning) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      const suspicious =
        liveMode === "fraud"
          ? true
          : liveMode === "normal"
            ? false
            : Math.random() > 0.68;

      handleRandomTransaction(suspicious, true).catch((error) => {
        setMessage(error.message);
        setLiveRunning(false);
      });
    }, 4500);

    return () => window.clearInterval(timer);
  }, [liveMode, liveRunning]);

  async function handleSubmit(payload) {
    setLoading(true);
    setMessage("");
    try {
      const response = await api.simulateTransaction(payload);
      applySimulationResult(response, "manual");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function applySimulationResult(response, source) {
    setResult(response);
    setLiveEvents((current) => [
      {
        id: `${response.transaction_id}-${Date.now()}`,
        source,
        alert_level: response.alert_level,
        risk_score: response.risk_score,
        user_name: response.transaction.user_name,
        amount: response.transaction.amount,
        timestamp: response.transaction.timestamp,
        reason_summary: response.reason_summary,
      },
      ...current,
    ].slice(0, 8));
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

  async function handleRandomTransaction(suspicious, silent = false) {
    if (!silent) {
      setLoading(true);
      setMessage("");
    }
    try {
      const response = await api.generateRandomTransaction(suspicious);
      applySimulationResult(response, suspicious ? "fraud" : "normal");
      if (!silent) {
        setMessage(
          suspicious
            ? "Fraud scenario generated. Check alerts queue for the new event."
            : "Normal transaction generated."
        );
      }
    } catch (error) {
      setMessage(error.message);
      throw error;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  function toggleLiveDemo() {
    if (liveRunning) {
      setLiveRunning(false);
      setMessage("Live demo stopped.");
      return;
    }

    const modeLabel =
      liveMode === "fraud"
        ? "fraud-only"
        : liveMode === "normal"
          ? "normal-only"
          : "mixed";
    setMessage(`Live demo started in ${modeLabel} mode.`);
    setLiveRunning(true);
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

        <section className="panel p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
                Live Demo
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Auto Transaction Stream
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Jalankan simulasi transaksi live untuk membuat demo terasa real-time.
              </p>
            </div>
            <RiskBadge
              value={liveRunning ? "suspicious" : "normal"}
              label={liveStatusLabel}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-4">
              <label className="space-y-2 text-sm text-slate-300">
                <span>Stream Mode</span>
                <select
                  className="field"
                  value={liveMode}
                  onChange={(event) => setLiveMode(event.target.value)}
                  disabled={liveRunning}
                >
                  <option value="mixed">Mixed</option>
                  <option value="normal">Normal Only</option>
                  <option value="fraud">Fraud Only</option>
                </select>
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="button-secondary"
                  disabled={loading}
                  onClick={() => handleRandomTransaction(false)}
                >
                  Generate Normal
                </button>
                <button
                  type="button"
                  className="button-danger"
                  disabled={loading}
                  onClick={() => handleRandomTransaction(true)}
                >
                  Generate Fraud
                </button>
                <button
                  type="button"
                  className={liveRunning ? "button-danger" : "button-primary"}
                  disabled={loading}
                  onClick={toggleLiveDemo}
                >
                  {liveRunning ? "Stop Live Demo" : "Start Live Demo"}
                </button>
              </div>
            </div>

            <div className="panel-soft p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
                    Stream Events
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Event terbaru dari manual run dan live stream.
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  Interval 4.5s
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {liveEvents.length ? (
                  liveEvents.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-white">
                            {event.user_name}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            {formatDate(event.timestamp)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <RiskBadge value={event.alert_level} />
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                            {event.source}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-slate-300">
                        {formatCurrency(event.amount)} • risk score {event.risk_score}
                      </div>
                      <div className="mt-2 text-sm text-amber-100">
                        {event.reason_summary}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-4 text-sm text-slate-400">
                    Belum ada event live. Gunakan tombol Generate Fraud, Generate Normal, atau Start Live Demo.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

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
