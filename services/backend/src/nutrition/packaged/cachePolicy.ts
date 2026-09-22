export const PACKAGED_SOURCE_CACHE_POLICY = {
  version: 1,
  foundTtlSeconds: 86_400,
  notFoundTtlSeconds: 3_600,
  malformedTtlSeconds: 300,
  unavailableTtlSeconds: 0,
} as const;

export type PackagedCacheState = "FOUND" | "NOT_FOUND" | "MALFORMED" | "UNAVAILABLE";

export function packagedCacheTtlSeconds(state: PackagedCacheState): number {
  switch (state) {
    case "FOUND": return PACKAGED_SOURCE_CACHE_POLICY.foundTtlSeconds;
    case "NOT_FOUND": return PACKAGED_SOURCE_CACHE_POLICY.notFoundTtlSeconds;
    case "MALFORMED": return PACKAGED_SOURCE_CACHE_POLICY.malformedTtlSeconds;
    case "UNAVAILABLE": return PACKAGED_SOURCE_CACHE_POLICY.unavailableTtlSeconds;
  }
}
