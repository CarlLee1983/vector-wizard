export function validateSeedShape(seed) {
  if (seed == null || typeof seed !== "object" || Array.isArray(seed)) {
    return { valid: false, reason: "not_object" }
  }
  if (seed.metadata == null || typeof seed.metadata !== "object") {
    return { valid: false, reason: "missing_metadata" }
  }
  if (seed.goal == null || typeof seed.goal !== "object") {
    return { valid: false, reason: "missing_goal" }
  }
  if (!Array.isArray(seed.epics)) {
    return { valid: false, reason: "missing_epics" }
  }
  return { valid: true }
}
