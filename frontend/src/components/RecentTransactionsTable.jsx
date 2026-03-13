import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";
import RiskBadge from "./RiskBadge";

export default function RecentTransactionsTable({ transactions = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-3 pr-4 font-semibold">User</th>
            <th className="pb-3 pr-4 font-semibold">Destination</th>
            <th className="pb-3 pr-4 font-semibold">Amount</th>
            <th className="pb-3 pr-4 font-semibold">Risk</th>
            <th className="pb-3 font-semibold">Reason</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((item) => (
            <tr key={item.id} className="align-top text-sm text-slate-200">
              <td className="border-t border-white/10 py-4 pr-4">
                <div className="font-semibold text-white">{item.user_name}</div>
                <div className="text-xs text-slate-400">{formatDate(item.timestamp)}</div>
              </td>
              <td className="border-t border-white/10 py-4 pr-4">
                <div className="font-semibold text-white">{item.destination_bank}</div>
                <div className="text-xs text-slate-400">
                  {item.destination_account}
                </div>
              </td>
              <td className="border-t border-white/10 py-4 pr-4">
                {formatCurrency(item.amount)}
              </td>
              <td className="border-t border-white/10 py-4 pr-4">
                <RiskBadge value={item.alert_level} />
                <div className="mt-2 text-xs text-slate-400">
                  risk {item.risk_score}
                </div>
              </td>
              <td className="border-t border-white/10 py-4 text-xs text-slate-300">
                <div
                  className="max-w-[18rem] overflow-hidden text-ellipsis whitespace-nowrap"
                  title={item.reason_summary}
                >
                  {item.reason_summary}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
