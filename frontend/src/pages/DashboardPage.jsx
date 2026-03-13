import { useEffect, useState } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AlertsTable from "../components/AlertsTable";
import ChartCard from "../components/ChartCard";
import RecentTransactionsTable from "../components/RecentTransactionsTable";
import SummaryCard from "../components/SummaryCard";
import { api } from "../api/client";
import { useDashboardData } from "../hooks/useDashboardData";
import { formatCurrency } from "../utils/formatCurrency";

const pieColors = ["#34d399", "#fbbf24", "#f87171"];

export default function DashboardPage() {
  const { summary, charts, transactions, alerts, loading, error, refresh } =
    useDashboardData(10000);
  const [toast, setToast] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleResetDemo() {
    const confirmed = window.confirm(
      "Reset data demo ke snapshot final? Semua transaksi hasil testing akan diganti."
    );
    if (!confirmed) {
      return;
    }

    setIsResetting(true);
    try {
      await api.resetDemo();
      await refresh();
      setToast({
        type: "success",
        text: "Demo data restored to frozen snapshot.",
      });
    } catch (resetError) {
      setToast({
        type: "error",
        text: resetError.message,
      });
    } finally {
      setIsResetting(false);
    }
  }

  if (loading && !summary) {
    return <div className="panel p-6 text-slate-300">Loading dashboard...</div>;
  }

  if (error && !summary) {
    return <div className="panel p-6 text-red-300">{error}</div>;
  }

  const pieData = charts
    ? [
        { name: "Normal", value: charts.risk_distribution.normal },
        { name: "Suspicious", value: charts.risk_distribution.suspicious },
        { name: "High", value: charts.risk_distribution.high },
      ]
    : [];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Transactions"
          value={summary?.total_transactions ?? 0}
          hint={`Volume ${formatCurrency(summary?.total_volume ?? 0)}`}
        />
        <SummaryCard
          title="Suspicious Transactions"
          value={summary?.suspicious_transactions ?? 0}
          hint="Medium + high risk yang perlu perhatian"
          tone="warning"
        />
        <SummaryCard
          title="High Risk Alerts"
          value={summary?.high_risk_alerts ?? 0}
          hint={`Average risk ${summary?.average_risk ?? 0}`}
          tone="danger"
        />
        <SummaryCard
          title="Fraud Rate"
          value={`${summary?.fraud_rate ?? 0}%`}
          hint="Persentase alert terhadap total transaksi"
          tone="success"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ChartCard
          eyebrow="Live Monitor"
          title="Recent Alert Activity"
          subtitle="Queue alert terbaru untuk dibuka saat presentasi."
          actions={
            <div className="flex flex-wrap gap-2">
              <button type="button" className="button-secondary" onClick={refresh}>
                Refresh
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={handleResetDemo}
                disabled={isResetting}
              >
                {isResetting ? "Resetting..." : "Reset Demo"}
              </button>
            </div>
          }
        >
          <AlertsTable alerts={alerts} showActions={false} />
        </ChartCard>

        <ChartCard
          eyebrow="Distribution"
          title="Risk Distribution"
          subtitle="Perbandingan transaksi normal, suspicious, dan high risk."
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={96}
                  paddingAngle={4}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111a2b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "16px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartCard
          eyebrow="Trend"
          title="Transactions by Hour"
          subtitle="Sebaran aktivitas transaksi sepanjang hari."
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.transactions_per_hour ?? []}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111a2b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "16px",
                  }}
                />
                <Bar dataKey="total" fill="#60a5fa" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          eyebrow="Snapshot"
          title="Latest Transaction Feed"
          subtitle="Riwayat transaksi terbaru dengan ringkasan alasan fraud."
        >
          <RecentTransactionsTable transactions={transactions} />
        </ChartCard>
      </section>

      {toast ? (
        <div
          className={[
            "fixed bottom-4 right-4 z-[60] rounded-2xl border px-4 py-3 text-sm shadow-panel",
            toast.type === "error"
              ? "border-red-400/30 bg-red-500/15 text-red-200"
              : "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
          ].join(" ")}
        >
          {toast.text}
        </div>
      ) : null}
    </div>
  );
}
