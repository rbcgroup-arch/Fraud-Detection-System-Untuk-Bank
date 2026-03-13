export function getAlertLevelTone(value) {
  if (value === "low") {
    return "low";
  }
  if (value === "medium") {
    return "medium";
  }
  if (value === "high") {
    return "high";
  }
  if (value === "suspicious") {
    return "suspicious";
  }
  return "normal";
}

export function getAlertStatusTone(value) {
  if (value === "blocked") {
    return "blocked";
  }
  if (value === "review") {
    return "review";
  }
  if (value === "resolved") {
    return "resolved";
  }
  return "open";
}

export function getRiskLevelFromScore(score) {
  if (Number(score) >= 60) {
    return "high";
  }
  if (Number(score) >= 30) {
    return "medium";
  }
  return "low";
}

export function getStatusLabel(status) {
  if (status === "resolved") {
    return "safe";
  }
  return status;
}
