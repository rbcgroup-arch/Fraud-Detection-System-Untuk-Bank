export default function SummaryCard({ title, value, hint, tone = "default" }) {
  const toneClass =
    tone === "danger"
      ? "from-red-500/20 to-red-500/5"
      : tone === "warning"
        ? "from-amber-400/20 to-amber-400/5"
        : tone === "success"
          ? "from-emerald-400/20 to-emerald-400/5"
          : "from-sky-400/20 to-sky-400/5";

  return (
    <article className={`panel bg-gradient-to-br ${toneClass} p-5`}>
      <p className="text-sm text-slate-300">{title}</p>
      <div className="mt-3 text-3xl font-black tracking-tight text-white">
        {value}
      </div>
      <p className="mt-2 text-sm text-slate-400">{hint}</p>
    </article>
  );
}
