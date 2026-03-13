export default function ReasonList({ reasons = [], title = "Fraud Reasons" }) {
  return (
    <section className="panel p-5">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
          Explainability
        </p>
        <h3 className="mt-2 text-xl font-bold text-white">{title}</h3>
      </div>

      {reasons.length ? (
        <div className="space-y-3">
          {reasons.map((reason) => (
            <div
              key={reason}
              className="panel-soft px-4 py-3 text-sm text-slate-200"
            >
              {reason}
            </div>
          ))}
        </div>
      ) : (
        <div className="panel-soft px-4 py-4 text-sm text-slate-400">
          Belum ada alasan fraud untuk ditampilkan.
        </div>
      )}
    </section>
  );
}
