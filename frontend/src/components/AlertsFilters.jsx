export default function AlertsFilters({
  filters,
  onChange,
  onRefresh,
  resultCount,
  totalCount,
}) {
  return (
    <div className="panel-soft rounded-[22px] p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
            Queue Controls
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {resultCount} of {totalCount} alerts match current filters.
          </p>
        </div>
        <button type="button" className="button-secondary" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_repeat(3,minmax(0,0.78fr))]">
        <label className="space-y-2 text-sm text-slate-300">
          <span>Search</span>
          <input
            className="field"
            placeholder="Search user, account, destination, reason"
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
          />
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>Status</span>
          <select
            className="field"
            value={filters.status}
            onChange={(event) => onChange("status", event.target.value)}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="review">Review</option>
            <option value="safe">Safe</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>Risk Level</span>
          <select
            className="field"
            value={filters.risk}
            onChange={(event) => onChange("risk", event.target.value)}
          >
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="space-y-2 text-sm text-slate-300">
          <span>Sort</span>
          <select
            className="field"
            value={filters.sort}
            onChange={(event) => onChange("sort", event.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="highest_risk">Highest Risk</option>
          </select>
        </label>
      </div>
    </div>
  );
}
