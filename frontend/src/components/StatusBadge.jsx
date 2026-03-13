import RiskBadge from "./RiskBadge";
import { getStatusLabel } from "../utils/risk";

export default function StatusBadge({ value, className = "" }) {
  return (
    <RiskBadge
      value={value}
      label={getStatusLabel(value)}
      kind="status"
      className={className}
    />
  );
}
