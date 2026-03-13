export default function ChartCard({
  eyebrow,
  title,
  subtitle,
  children,
  actions,
}) {
  return (
    <section className="panel p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="mt-2 text-xl font-bold text-white">{title}</h3>
          {subtitle ? (
            <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
