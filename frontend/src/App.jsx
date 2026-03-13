import { NavLink, Route, Routes } from "react-router-dom";

import AlertsPage from "./pages/AlertsPage";
import DashboardPage from "./pages/DashboardPage";
import SimulatePage from "./pages/SimulatePage";

const navigation = [
  { to: "/", label: "Dashboard" },
  { to: "/simulate", label: "Simulate" },
  { to: "/alerts", label: "Alert Review" },
];

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        [
          "rounded-full px-4 py-2 text-sm font-semibold transition",
          isActive
            ? "bg-white text-slate-950"
            : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-fraud-gradient text-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-[28px] border border-white/10 bg-panel/90 p-6 shadow-panel backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
                Hackathon MVP
              </p>
              <div className="space-y-2">
                <h1 className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-5xl">
                  Fraud Detection System untuk Bank
                </h1>
                <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                  Monitoring transaksi, anomaly detection, risk scoring, dan alert
                  review dengan alur backend yang stabil untuk frontend React.
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              {navigation.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/simulate" element={<SimulatePage />} />
            <Route path="/alerts" element={<AlertsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
