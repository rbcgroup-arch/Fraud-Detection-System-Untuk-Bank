import { useEffect, useMemo, useState } from "react";

import { api } from "../api/client";
import AlertDetailModal from "../components/AlertDetailModal";
import AlertsFilters from "../components/AlertsFilters";
import AlertsTable from "../components/AlertsTable";
import ReasonList from "../components/ReasonList";
import RiskBadge from "../components/RiskBadge";
import StatusBadge from "../components/StatusBadge";
import { formatCurrency } from "../utils/formatCurrency";
import { getRiskLevelFromScore } from "../utils/risk";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    risk: "all",
    sort: "newest",
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  function pushToast(type, text) {
    setToast({ type, text });
  }

  async function loadAlerts() {
    setLoading(true);
    try {
      const [alertsPayload, transactionsPayload] = await Promise.all([
        api.getAlerts(50),
        api.getTransactions(200),
      ]);
      setAlerts(alertsPayload.items);
      setTransactions(transactionsPayload.items);
      setSelectedAlert((current) => {
        const items = alertsPayload.items;
        const matched = current
          ? items.find((item) => item.id === current.id)
          : null;
        if (matched) {
          return matched;
        }
        return isModalOpen ? current : items[0] ?? null;
      });
    } catch (error) {
      pushToast("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      return undefined;
    }

    const timer = window.setInterval(loadAlerts, 12000);
    return () => window.clearInterval(timer);
  }, [isModalOpen]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleStatusChange(alertId, status) {
    setActionLoadingId(alertId);
    try {
      const payload = await api.updateAlertStatus(alertId, status);
      const updatedAlert = payload.alert;
      setAlerts((current) =>
        current.map((item) => (item.id === updatedAlert.id ? updatedAlert : item))
      );
      setSelectedAlert((current) =>
        current?.id === updatedAlert.id ? updatedAlert : current
      );
      pushToast(
        "success",
        `Alert marked as ${status === "resolved" ? "safe" : status}.`
      );
    } catch (error) {
      pushToast("error", error.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  const visibleAlerts = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();

    const filtered = alerts.filter((alert) => {
      const statusMatches =
        filters.status === "all" ||
        (filters.status === "safe" ? alert.status === "resolved" : alert.status === filters.status);

      const riskLevel = getRiskLevelFromScore(alert.risk_score);
      const riskMatches = filters.risk === "all" || riskLevel === filters.risk;

      const haystack = [
        alert.user_name,
        alert.account_number,
        alert.destination_account,
        alert.destination_bank,
        alert.reason_summary,
      ]
        .join(" ")
        .toLowerCase();
      const searchMatches =
        !normalizedSearch || haystack.includes(normalizedSearch);

      return statusMatches && riskMatches && searchMatches;
    });

    const sorted = [...filtered].sort((left, right) => {
      if (filters.sort === "highest_risk") {
        return right.risk_score - left.risk_score;
      }
      return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
    });

    return sorted;
  }, [alerts, filters]);

  const rightPanelAlert =
    selectedAlert &&
    visibleAlerts.find((item) => item.id === selectedAlert.id)
      ? selectedAlert
      : visibleAlerts[0] ?? null;

  const selectedTransaction = useMemo(() => {
    if (!selectedAlert) {
      return null;
    }
    return (
      transactions.find((item) => item.id === selectedAlert.transaction_id) ?? null
    );
  }, [selectedAlert, transactions]);

  const selectedBaseline = useMemo(() => {
    if (!selectedAlert || !selectedTransaction) {
      return null;
    }

    const userTransactions = transactions.filter(
      (item) =>
        item.user_id === selectedTransaction.user_id &&
        item.id !== selectedTransaction.id
    );
    const amounts = userTransactions.map((item) => Number(item.amount));
    const avgAmountUser = amounts.length
      ? amounts.reduce((sum, value) => sum + value, 0) / amounts.length
      : Number(selectedTransaction.amount);
    const hours = userTransactions.map((item) => new Date(item.timestamp).getHours());
    const minHour = hours.length ? Math.min(...hours) : new Date(selectedTransaction.timestamp).getHours();
    const maxHour = hours.length ? Math.max(...hours) : new Date(selectedTransaction.timestamp).getHours();
    const knownDevicesCount = new Set(
      userTransactions.map((item) => item.device_id).filter(Boolean)
    ).size;
    const knownDestinationsCount = new Set(
      userTransactions.map((item) => item.destination_account).filter(Boolean)
    ).size;
    const ratio =
      avgAmountUser > 0 ? Number(selectedTransaction.amount) / avgAmountUser : 1;
    const featureSnapshot = selectedTransaction.feature_snapshot || {};

    return {
      avgAmountUser,
      normalHourRange: `${String(minHour).padStart(2, "0")}:00-${String(maxHour).padStart(2, "0")}:59`,
      knownDevicesCount,
      knownDestinationsCount,
      amountComparison: `Rata-rata user ${formatCurrency(avgAmountUser)}, transaksi ini ${formatCurrency(selectedTransaction.amount)} (${ratio.toFixed(2)}x).`,
      hourComparison: `Jam normal user ${String(minHour).padStart(2, "0")}:00-${String(maxHour).padStart(2, "0")}:59, transaksi ini ${new Date(selectedTransaction.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}.`,
      deviceComparison:
        featureSnapshot.is_new_device
          ? "Device ini belum pernah digunakan sebelumnya."
          : "Device ini masih termasuk device yang pernah dipakai user.",
      destinationComparison:
        featureSnapshot.is_new_destination
          ? "Rekening tujuan ini baru untuk user ini."
          : "Rekening tujuan ini pernah dipakai sebelumnya.",
    };
  }, [selectedAlert, selectedTransaction, transactions]);

  useEffect(() => {
    if (!visibleAlerts.length) {
      return;
    }
    if (!selectedAlert) {
      setSelectedAlert(visibleAlerts[0]);
    }
  }, [visibleAlerts, selectedAlert]);

  function handleFilterChange(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openAlertModal(alert) {
    setSelectedAlert(alert);
    setIsModalOpen(true);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="panel p-5">
        <div className="mb-5 flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
              Alert Review
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Fraud Alert Queue
            </h2>
          </div>

          <AlertsFilters
            filters={filters}
            onChange={handleFilterChange}
            onRefresh={loadAlerts}
            resultCount={visibleAlerts.length}
            totalCount={alerts.length}
          />
        </div>

        {loading ? (
          <div className="panel-soft p-4 text-sm text-slate-300">
            Loading alerts...
          </div>
        ) : (
          <AlertsTable
            alerts={visibleAlerts}
            onStatusChange={handleStatusChange}
            onSelectAlert={openAlertModal}
            selectedAlertId={selectedAlert?.id}
            emptyMessage="No alerts match current filters."
          />
        )}
      </section>

      <div className="space-y-6">
        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
                Detail
              </p>
              <h3 className="mt-2 text-xl font-bold text-white">
                Selected Alert
              </h3>
            </div>
            {rightPanelAlert ? (
              <div className="flex flex-wrap gap-2">
                <RiskBadge
                  value={getRiskLevelFromScore(rightPanelAlert.risk_score)}
                  label={`${getRiskLevelFromScore(rightPanelAlert.risk_score)} risk`}
                />
                <StatusBadge value={rightPanelAlert.status} />
              </div>
            ) : null}
          </div>

          {rightPanelAlert ? (
            <div className="space-y-4 text-sm text-slate-200">
              <div className="panel-soft p-4">
                <div className="font-semibold text-white">
                  {rightPanelAlert.user_name}
                </div>
                <div className="mt-1 text-slate-400">
                  {rightPanelAlert.account_number}
                </div>
              </div>
              <div className="panel-soft p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-200/80">
                  Reason Summary
                </div>
                <div className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-400/10 px-4 py-3 text-sm leading-7 text-amber-50">
                  {rightPanelAlert.reason_summary}
                </div>
              </div>
              <div className="panel-soft p-4">
                <div className="text-slate-400">Destination</div>
                <div className="mt-1 text-white">
                  {rightPanelAlert.destination_bank} /{" "}
                  {rightPanelAlert.destination_account}
                </div>
              </div>
              <button
                type="button"
                className="button-secondary w-full"
                onClick={() => openAlertModal(rightPanelAlert)}
              >
                Open Detail Modal
              </button>
            </div>
          ) : (
            <div className="panel-soft p-4 text-sm text-slate-400">
              Pilih alert untuk melihat detail.
            </div>
          )}
        </section>

        <ReasonList
          reasons={rightPanelAlert?.reason ?? []}
          title="Selected Alert Reasons"
        />
      </div>

      <AlertDetailModal
        alert={selectedAlert}
        transaction={selectedTransaction}
        baseline={selectedBaseline}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusChange={handleStatusChange}
        actionLoading={actionLoadingId === selectedAlert?.id}
      />

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
