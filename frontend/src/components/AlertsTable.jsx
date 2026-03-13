import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";
import { getRiskLevelFromScore } from "../utils/risk";
import RiskBadge from "./RiskBadge";
import StatusBadge from "./StatusBadge";

export default function AlertsTable({
  alerts = [],
  onStatusChange,
  onSelectAlert,
  selectedAlertId,
  showActions = true,
  emptyMessage = "No alerts found.",
}) {
  if (!alerts.length) {
    return (
      <div className="panel-soft px-4 py-6 text-sm text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-3 pr-4 font-semibold">User</th>
            <th className="pb-3 pr-4 font-semibold">Transaction</th>
            <th className="pb-3 pr-4 font-semibold">Risk</th>
            <th className="pb-3 pr-4 font-semibold">Status</th>
            <th className="pb-3 pr-4 font-semibold">Reason</th>
            {showActions ? <th className="pb-3 font-semibold">Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => {
            const handleSelect = () => onSelectAlert?.(alert);
            const interactiveCellClass = onSelectAlert ? "cursor-pointer" : "";
            return (
            <tr
              key={alert.id}
              className={[
                "align-top text-sm text-slate-200 transition",
                onSelectAlert ? "cursor-pointer hover:bg-white/5" : "",
                selectedAlertId === alert.id ? "bg-white/5" : "",
              ].join(" ")}
              onClick={handleSelect}
              onKeyDown={(event) => {
                if (!onSelectAlert) {
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleSelect();
                }
              }}
              tabIndex={onSelectAlert ? 0 : undefined}
              role={onSelectAlert ? "button" : undefined}
            >
              <td
                className={`border-t border-white/10 py-4 pr-4 ${interactiveCellClass}`}
                onClick={handleSelect}
              >
                <div className="font-semibold text-white">{alert.user_name}</div>
                <div className="text-xs text-slate-400">{alert.account_number}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatDate(alert.timestamp)}
                </div>
              </td>
              <td
                className={`border-t border-white/10 py-4 pr-4 ${interactiveCellClass}`}
                onClick={handleSelect}
              >
                <div className="font-semibold text-white">
                  {formatCurrency(alert.amount)}
                </div>
                <div className="text-xs text-slate-400">
                  {alert.destination_bank} • {alert.destination_account}
                </div>
              </td>
              <td
                className={`border-t border-white/10 py-4 pr-4 ${interactiveCellClass}`}
                onClick={handleSelect}
              >
                <RiskBadge
                  value={getRiskLevelFromScore(alert.risk_score)}
                  label={`${getRiskLevelFromScore(alert.risk_score)} risk`}
                />
                <div className="mt-2 text-xs text-slate-400">
                  score {alert.risk_score}
                </div>
              </td>
              <td
                className={`border-t border-white/10 py-4 pr-4 ${interactiveCellClass}`}
                onClick={handleSelect}
              >
                <StatusBadge value={alert.status} />
              </td>
              <td
                className={`border-t border-white/10 py-4 pr-4 text-xs text-slate-300 ${interactiveCellClass}`}
                onClick={handleSelect}
              >
                <div
                  className="max-w-[22rem] overflow-hidden rounded-2xl border border-amber-300/15 bg-amber-400/10 px-3 py-2 text-ellipsis whitespace-nowrap text-amber-50"
                  title={alert.reason_summary}
                >
                  {alert.reason_summary}
                </div>
              </td>
              {showActions ? (
                <td className="border-t border-white/10 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="button-secondary px-3 py-2 text-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        onStatusChange(alert.id, "review");
                      }}
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      className="button-secondary px-3 py-2 text-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        onStatusChange(alert.id, "resolved");
                      }}
                    >
                      Safe
                    </button>
                    <button
                      type="button"
                      className="button-danger px-3 py-2 text-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        onStatusChange(alert.id, "blocked");
                      }}
                    >
                      Block
                    </button>
                  </div>
                </td>
              ) : null}
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  );
}
