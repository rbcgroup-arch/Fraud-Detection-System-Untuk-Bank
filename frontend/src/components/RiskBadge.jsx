import { getAlertLevelTone, getAlertStatusTone } from "../utils/risk";

export default function RiskBadge({
  value,
  kind = "level",
  label,
  className = "",
}) {
  const tone = kind === "status" ? getAlertStatusTone(value) : getAlertLevelTone(value);
  const palette = {
    low: "bg-sky-400/15 text-sky-300",
    medium: "bg-amber-400/15 text-amber-300",
    normal: "bg-emerald-400/15 text-emerald-300",
    suspicious: "bg-amber-400/15 text-amber-300",
    high: "bg-red-400/15 text-red-300",
    open: "bg-sky-400/15 text-sky-300",
    review: "bg-amber-400/15 text-amber-300",
    blocked: "bg-red-500/20 text-red-300",
    resolved: "bg-emerald-400/15 text-emerald-300",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
        palette[tone],
        className,
      ].join(" ")}
    >
      {label || value}
    </span>
  );
}
