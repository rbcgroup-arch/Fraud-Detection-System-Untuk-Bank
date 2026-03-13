import { useCallback, useEffect, useState } from "react";

import { api } from "../api/client";

export function useDashboardData(autoRefreshMs = 10000) {
  const [data, setData] = useState({
    users: [],
    summary: null,
    charts: null,
    transactions: [],
    alerts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [
        usersPayload,
        summaryPayload,
        chartsPayload,
        transactionsPayload,
        alertsPayload,
      ] = await Promise.all([
        api.getUsers(),
        api.getDashboardSummary(),
        api.getDashboardCharts(),
        api.getRecentTransactions(),
        api.getAlerts(12),
      ]);

      setData({
        users: usersPayload.items,
        summary: summaryPayload,
        charts: chartsPayload,
        transactions: transactionsPayload.items,
        alerts: alertsPayload.items,
      });
    } catch (refreshError) {
      setError(refreshError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefreshMs) {
      return undefined;
    }
    const timer = window.setInterval(refresh, autoRefreshMs);
    return () => window.clearInterval(timer);
  }, [autoRefreshMs, refresh]);

  return {
    ...data,
    loading,
    error,
    refresh,
  };
}
