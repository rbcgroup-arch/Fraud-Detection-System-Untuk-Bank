const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || "API request failed");
  }

  return response.json();
}

export const api = {
  getUsers() {
    return request("/users");
  },
  getDashboardSummary() {
    return request("/dashboard/summary");
  },
  getDashboardCharts() {
    return request("/dashboard/charts");
  },
  getAlerts(limit = 50) {
    return request(`/alerts?limit=${limit}`);
  },
  getTransactions(limit = 20) {
    return request(`/transactions?limit=${limit}`);
  },
  getRecentTransactions(limit = 12) {
    return request(`/transactions/recent?limit=${limit}`);
  },
  simulateTransaction(payload) {
    return request("/transactions/simulate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateAlertStatus(alertId, status) {
    return request(`/alerts/${alertId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },
  seedDemo() {
    return request("/demo/seed", { method: "POST" });
  },
  resetDemo() {
    return request("/demo/reset", { method: "POST" });
  },
};
