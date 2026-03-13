import { useEffect, useState } from "react";

function toLocalDatetimeValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function TransactionForm({ users = [], onSubmit, onSeed, loading }) {
  const initialUser = users[0];
  const [form, setForm] = useState(() => ({
    user_id: initialUser?.id ?? 1,
    amount: 500000,
    transaction_type: "transfer",
    destination_bank: "BCA",
    destination_account: "982001111",
    device_id: initialUser?.usual_device ?? "android-ayu-001",
    ip_address: "10.10.1.10",
    location_city: initialUser?.usual_city ?? "Jakarta",
    timestamp: toLocalDatetimeValue(),
  }));

  useEffect(() => {
    if (!users.length) {
      return;
    }

    const selectedUser =
      users.find((user) => user.id === Number(form.user_id)) ?? users[0];
    setForm((current) => ({
      ...current,
      user_id: selectedUser.id,
      device_id: current.device_id || selectedUser.usual_device,
      location_city: current.location_city || selectedUser.usual_city,
    }));
  }, [users]);

  function handleChange(event) {
    const { name, value } = event.target;
    if (name === "user_id") {
      const selected = users.find((user) => user.id === Number(value));
      setForm((current) => ({
        ...current,
        user_id: Number(value),
        device_id: selected?.usual_device ?? current.device_id,
        location_city: selected?.usual_city ?? current.location_city,
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      user_id: Number(form.user_id),
      amount: Number(form.amount),
      timestamp: new Date(form.timestamp).toISOString(),
    });
  }

  return (
    <section className="panel p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
            Manual Simulation
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Simulate Transaction
          </h2>
        </div>
        <button type="button" className="button-secondary" onClick={onSeed}>
          Seed Demo Data
        </button>
      </div>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="space-y-2 text-sm text-slate-300">
          <span>User</span>
          <select
            className="field"
            name="user_id"
            value={form.user_id}
            onChange={handleChange}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} - {user.account_number}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>Amount</span>
          <input
            className="field"
            type="number"
            min="1000"
            step="1000"
            name="amount"
            value={form.amount}
            onChange={handleChange}
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>Destination Bank</span>
          <input
            className="field"
            name="destination_bank"
            value={form.destination_bank}
            onChange={handleChange}
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>Destination Account</span>
          <input
            className="field"
            name="destination_account"
            value={form.destination_account}
            onChange={handleChange}
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>Device ID</span>
          <input
            className="field"
            name="device_id"
            value={form.device_id}
            onChange={handleChange}
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>IP Address</span>
          <input
            className="field"
            name="ip_address"
            value={form.ip_address}
            onChange={handleChange}
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>Location City</span>
          <input
            className="field"
            name="location_city"
            value={form.location_city}
            onChange={handleChange}
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>Timestamp</span>
          <input
            className="field"
            type="datetime-local"
            name="timestamp"
            value={form.timestamp}
            onChange={handleChange}
          />
        </label>

        <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            className="button-primary"
            disabled={loading || !users.length}
          >
            {loading ? "Analyzing..." : "Analyze Transaction"}
          </button>
        </div>
      </form>
    </section>
  );
}
