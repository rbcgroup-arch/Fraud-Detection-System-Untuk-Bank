import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";
import { getRiskLevelFromScore } from "../utils/risk";
import RiskBadge from "./RiskBadge";
import StatusBadge from "./StatusBadge";

function DetailBlock({ label, value }) {
  return (
    <div className="panel-soft p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-sm text-white">{value}</div>
    </div>
  );
}

export default function AlertDetailModal({
  alert,
  transaction,
  baseline,
  open,
  onClose,
  onStatusChange,
  actionLoading = false,
}) {
  if (!open || !alert) {
    return null;
  }

  const riskLevel = getRiskLevelFromScore(alert.risk_score);
  const currentHour = transaction?.timestamp
    ? new Date(transaction.timestamp).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="panel max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6">
        <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
              Alert Detail
            </p>
            <h3 className="mt-2 text-3xl font-black tracking-tight text-white">
              Alert #{alert.id}
            </h3>
            <p className="mt-2 text-sm text-slate-400">{formatDate(alert.timestamp)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RiskBadge value={riskLevel} label={`${riskLevel} risk`} />
            <StatusBadge value={alert.status} />
            <button type="button" className="button-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DetailBlock label="User" value={`${alert.user_name} • ${alert.account_number}`} />
          <DetailBlock label="Amount" value={formatCurrency(alert.amount)} />
          <DetailBlock
            label="Destination"
            value={`${alert.destination_bank} / ${alert.destination_account}`}
          />
          <DetailBlock label="Location City" value={transaction?.location_city || "-"} />
          <DetailBlock label="Device ID" value={transaction?.device_id || "-"} />
          <DetailBlock label="IP Address" value={transaction?.ip_address || "-"} />
          <DetailBlock label="Risk Score" value={`${alert.risk_score} / 100`} />
          <DetailBlock label="Status" value={alert.status === "resolved" ? "safe" : alert.status} />
          <DetailBlock label="Transaction ID" value={`#${alert.transaction_id}`} />
        </div>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className="panel-soft p-5">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
                User Behavior Baseline
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <DetailBlock
                  label="Avg Amount User"
                  value={`${formatCurrency(baseline?.avgAmountUser || 0)} vs ${formatCurrency(alert.amount)}`}
                />
                <DetailBlock
                  label="Normal Transaction Hour"
                  value={`${baseline?.normalHourRange || "-"} vs ${currentHour}`}
                />
                <DetailBlock
                  label="Known Devices"
                  value={`${baseline?.knownDevicesCount ?? 0} historical device(s)`}
                />
                <DetailBlock
                  label="Known Destinations"
                  value={`${baseline?.knownDestinationsCount ?? 0} historical destination(s)`}
                />
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <p>{baseline?.amountComparison || "Belum ada baseline amount."}</p>
                <p>{baseline?.hourComparison || "Belum ada baseline hour."}</p>
                <p>{baseline?.deviceComparison || "Belum ada baseline device."}</p>
                <p>{baseline?.destinationComparison || "Belum ada baseline destination."}</p>
              </div>
            </div>

            <div className="panel-soft p-5">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
                Reason Summary
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                {alert.reason_summary}
              </p>
            </div>

            <div className="panel-soft p-5">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
                Review Actions
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="button-secondary"
                  disabled={actionLoading}
                  onClick={() => onStatusChange(alert.id, "review")}
                >
                  Mark Review
                </button>
                <button
                  type="button"
                  className="button-primary"
                  disabled={actionLoading}
                  onClick={() => onStatusChange(alert.id, "resolved")}
                >
                  Mark Safe
                </button>
                <button
                  type="button"
                  className="button-danger"
                  disabled={actionLoading}
                  onClick={() => onStatusChange(alert.id, "blocked")}
                >
                  Block
                </button>
              </div>
            </div>
          </div>

          <div className="panel-soft p-5">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
              Detailed Reasons
            </p>
            <div className="mt-4 space-y-3">
              {alert.reason.map((reason) => (
                <div
                  key={reason}
                  className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-200"
                >
                  {reason}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
