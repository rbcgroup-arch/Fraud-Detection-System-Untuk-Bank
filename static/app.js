const formatter = new Intl.NumberFormat("id-ID");
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const state = {
  charts: null,
  liveInterval: null,
  summary: null,
  transactions: [],
  users: [],
};

const elements = {
  totalTransactions: document.getElementById("total-transactions"),
  suspiciousTransactions: document.getElementById("suspicious-transactions"),
  highRiskAlerts: document.getElementById("high-risk-alerts"),
  fraudRate: document.getElementById("fraud-rate"),
  transactionsBody: document.getElementById("transactions-body"),
  alertsList: document.getElementById("alerts-list"),
  riskBars: document.getElementById("risk-bars"),
  reasonsList: document.getElementById("reasons-list"),
  transactionForm: document.getElementById("transaction-form"),
  userSelect: document.getElementById("user-select"),
  seedDemoBtn: document.getElementById("seed-demo-btn"),
  normalTxBtn: document.getElementById("normal-tx-btn"),
  fraudTxBtn: document.getElementById("fraud-tx-btn"),
  liveToggleBtn: document.getElementById("live-toggle-btn"),
  toast: document.getElementById("toast"),
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || "Request failed");
  }

  return response.json();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, 2800);
}

function badge(level, extraClass = "") {
  const normalized =
    level === "normal" ? "low" : level === "suspicious" ? "medium" : level;
  return `<span class="badge ${normalized} ${extraClass}">${level}</span>`;
}

function nowLocalValue() {
  const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function populateUsers(users) {
  const previousValue = elements.userSelect.value;
  elements.userSelect.innerHTML = users
    .map(
      (user) =>
        `<option value="${user.id}" data-device="${user.usual_device}" data-city="${user.usual_city}">${user.name} • ${user.account_number}</option>`
    )
    .join("");
  if (previousValue && users.some((user) => String(user.id) === previousValue)) {
    elements.userSelect.value = previousValue;
  }
  syncUserDefaults();
}

function syncUserDefaults() {
  const selectedOption = elements.userSelect.selectedOptions[0];
  if (!selectedOption) {
    return;
  }

  const deviceInput = elements.transactionForm.elements.device_id;
  const cityInput = elements.transactionForm.elements.location_city;
  if (!deviceInput.dataset.userEdited) {
    deviceInput.value = selectedOption.dataset.device || "";
  }
  if (!cityInput.dataset.userEdited) {
    cityInput.value = selectedOption.dataset.city || "";
  }
}

function renderSummary(summary) {
  elements.totalTransactions.textContent = formatter.format(
    summary.total_transactions || 0
  );
  elements.suspiciousTransactions.textContent = formatter.format(
    summary.suspicious_transactions || 0
  );
  elements.highRiskAlerts.textContent = formatter.format(
    summary.high_risk_alerts || 0
  );
  elements.fraudRate.textContent = `${summary.fraud_rate || 0}%`;

  const alerts = summary.recent_alerts || [];
  elements.alertsList.innerHTML = alerts.length
    ? alerts
        .map(
          (item) => `
            <article class="alert-item">
              <header>
                <strong>${item.user_name}</strong>
                ${badge(item.alert_level)}
              </header>
              <div class="alert-meta">${currencyFormatter.format(item.amount)} to ${item.destination_bank}</div>
              <div class="subtext">score ${item.risk_score} • ${item.reason.slice(0, 2).join(" ")}</div>
            </article>
          `
        )
        .join("")
    : `<div class="alert-item"><strong>No alerts yet.</strong><div class="subtext">Seed demo data atau kirim skenario fraud untuk melihat alert.</div></div>`;
}

function renderCharts(charts) {
  const distribution = charts.risk_distribution || {};
  const levels = [
    ["normal", distribution.normal || 0],
    ["suspicious", distribution.suspicious || 0],
    ["high", distribution.high || 0],
  ];
  const total = Math.max(
    1,
    levels.reduce((acc, [, value]) => acc + value, 0)
  );

  elements.riskBars.innerHTML = levels
    .map(([level, value]) => {
      const width = Math.max(6, Math.round((value / total) * 100));
      return `
        <div class="bar">
          <div class="section-heading">
            <strong>${level.toUpperCase()}</strong>
            <span class="subtext">${value} transactions</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${width}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderReasons(transactions) {
  const reasonCounter = new Map();
  transactions.forEach((item) => {
    (item.reason || []).forEach((reason) => {
      reasonCounter.set(reason, (reasonCounter.get(reason) || 0) + 1);
    });
  });

  const topReasons = [...reasonCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  elements.reasonsList.innerHTML = topReasons.length
    ? topReasons
        .map(
          ([reason, total]) => `
            <article class="reason-item">
              <header>
                <strong>${total}x</strong>
                <span class="subtext">triggered</span>
              </header>
              <div>${reason}</div>
            </article>
          `
        )
        .join("")
    : `<div class="reason-item">Belum ada alasan fraud yang tercatat.</div>`;
}

function transactionActionButtons(item) {
  if (!item.alert_id) {
    return `<span class="subtext">No action</span>`;
  }

  return `
    <div class="table-action">
      <button class="button" data-action="review" data-id="${item.alert_id}">Review</button>
      <button class="button" data-action="resolved" data-id="${item.alert_id}">Safe</button>
      <button class="button button-danger" data-action="blocked" data-id="${item.alert_id}">Block</button>
    </div>
  `;
}

function renderTransactions(transactions) {
  elements.transactionsBody.innerHTML = transactions
    .map(
      (item) => `
        <tr>
          <td>#${item.id}</td>
          <td>
            <strong>${item.user_name}</strong>
            <small>${item.account_number}<br />${new Date(item.timestamp).toLocaleString("id-ID")}</small>
          </td>
          <td>
            <strong>${item.destination_bank}</strong>
            <small>${item.destination_account}<br />${item.device_id} • ${item.location_city}</small>
          </td>
          <td>${currencyFormatter.format(item.amount)}</td>
          <td>
            ${badge(item.alert_level)}
            <small>risk ${item.risk_score} • ml ${item.ml_score} + rule ${item.rule_score}</small>
          </td>
          <td>
            ${item.alert_id ? badge(item.alert_status || "open", "status") : badge("normal", "status")}
          </td>
          <td><small>${(item.reason || []).join(" ")}</small></td>
          <td>${transactionActionButtons(item)}</td>
        </tr>
      `
    )
    .join("");
}

async function refreshDashboard() {
  const [usersPayload, summaryPayload, chartsPayload, transactionsPayload] =
    await Promise.all([
      api("/api/users"),
      api("/api/dashboard/summary"),
      api("/api/dashboard/charts"),
      api("/api/transactions?limit=20"),
    ]);

  state.users = usersPayload.items;
  state.summary = summaryPayload;
  state.charts = chartsPayload;
  state.transactions = transactionsPayload.items;

  populateUsers(state.users);
  renderSummary(summaryPayload);
  renderCharts(chartsPayload);
  renderTransactions(state.transactions);
  renderReasons(state.transactions);
}

function randomFormPayload(suspicious = false) {
  const user = state.users[Math.floor(Math.random() * state.users.length)] || {
    id: 1,
    usual_device: "android-ayu-001",
    usual_city: "Jakarta",
  };
  const timestamp = new Date();
  if (suspicious) {
    timestamp.setHours(2, Math.floor(Math.random() * 30), 0, 0);
  }

  return {
    user_id: user.id,
    destination_bank: suspicious
      ? ["Bank B", "NeoBankX", "Shadow Bank"][
          Math.floor(Math.random() * 3)
        ]
      : ["BCA", "BRI", "BNI", "Mandiri"][Math.floor(Math.random() * 4)],
    destination_account: `${Math.floor(100000000 + Math.random() * 900000000)}`,
    amount: suspicious
      ? 5000000 + Math.floor(Math.random() * 8000000)
      : 50000 + Math.floor(Math.random() * 250000),
    device_id: suspicious
      ? `new-device-${Math.floor(100 + Math.random() * 900)}`
      : user.usual_device,
    ip_address: suspicious
      ? `172.16.${Math.floor(Math.random() * 100)}.${Math.floor(
          Math.random() * 200
        )}`
      : `10.10.${user.id}.${Math.floor(10 + Math.random() * 20)}`,
    location_city: suspicious
      ? ["Jakarta", "Singapore", "Kuala Lumpur"][
          Math.floor(Math.random() * 3)
        ]
      : user.usual_city,
    timestamp: timestamp.toISOString(),
  };
}

async function submitTransaction(payload) {
  const result = await api("/api/transactions/simulate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  showToast(
    `Analyzed. ${result.alert_level.toUpperCase()} risk with score ${result.risk_score}.`
  );
  await refreshDashboard();
}

elements.userSelect.addEventListener("change", () => {
  elements.transactionForm.elements.device_id.dataset.userEdited = "";
  elements.transactionForm.elements.location_city.dataset.userEdited = "";
  syncUserDefaults();
});

["device_id", "location_city"].forEach((field) => {
  elements.transactionForm.elements[field].addEventListener("input", () => {
    elements.transactionForm.elements[field].dataset.userEdited = "true";
  });
});

elements.transactionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());
  payload.user_id = Number(payload.user_id);
  payload.amount = Number(payload.amount);
  payload.timestamp = new Date(payload.timestamp).toISOString();

  try {
    await submitTransaction(payload);
  } catch (error) {
    showToast(error.message);
  }
});

elements.seedDemoBtn.addEventListener("click", async () => {
  try {
    await api("/api/demo/seed", { method: "POST" });
    showToast("Demo data created.");
    await refreshDashboard();
  } catch (error) {
    showToast(error.message);
  }
});

elements.normalTxBtn.addEventListener("click", async () => {
  try {
    await submitTransaction(randomFormPayload(false));
  } catch (error) {
    showToast(error.message);
  }
});

elements.fraudTxBtn.addEventListener("click", async () => {
  try {
    await submitTransaction(randomFormPayload(true));
  } catch (error) {
    showToast(error.message);
  }
});

elements.liveToggleBtn.addEventListener("click", () => {
  if (state.liveInterval) {
    window.clearInterval(state.liveInterval);
    state.liveInterval = null;
    elements.liveToggleBtn.textContent = "Start Live Simulation";
    showToast("Live simulation stopped.");
    return;
  }

  state.liveInterval = window.setInterval(async () => {
    try {
      await submitTransaction(randomFormPayload(Math.random() > 0.72));
    } catch (error) {
      showToast(error.message);
    }
  }, 5000);

  elements.liveToggleBtn.textContent = "Stop Live Simulation";
  showToast("Live simulation started.");
});

elements.transactionsBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  try {
    await api(`/api/alerts/${button.dataset.id}/status`, {
      method: "POST",
      body: JSON.stringify({ status: button.dataset.action }),
    });
    showToast(`Alert moved to ${button.dataset.action}.`);
    await refreshDashboard();
  } catch (error) {
    showToast(error.message);
  }
});

elements.transactionForm.elements.timestamp.value = nowLocalValue();
refreshDashboard().catch((error) => showToast(error.message));
