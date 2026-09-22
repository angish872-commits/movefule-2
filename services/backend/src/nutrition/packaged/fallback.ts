export type PackagedFallbackAction = "MANUAL_ENTRY" | "TRUSTED_SEARCH" | "RETRY_PROVIDER";

export function packagedFallbackActions(reason: "NOT_FOUND" | "MALFORMED" | "PROVIDER_UNAVAILABLE" | "PROVIDER_RATE_LIMITED" | "PROVIDER_TIMEOUT"): readonly PackagedFallbackAction[] {
  return reason === "PROVIDER_UNAVAILABLE" || reason === "PROVIDER_RATE_LIMITED" || reason === "PROVIDER_TIMEOUT"
    ? ["RETRY_PROVIDER", "TRUSTED_SEARCH", "MANUAL_ENTRY"]
    : ["TRUSTED_SEARCH", "MANUAL_ENTRY"];
}
