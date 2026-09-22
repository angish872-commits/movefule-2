import type { PackagedFoodProvider } from "./provider.ts";
import { packagedFoodCandidateFromLookup, type PackagedFoodResolution } from "./packagedFoodService.ts";
import { packagedCacheTtlSeconds } from "./cachePolicy.ts";
import { normalizeBarcode } from "./barcode.ts";

export type PackagedFoodServiceOptions = { now?: () => number };

export class PackagedFoodService {
  private readonly provider: PackagedFoodProvider;
  private readonly now: () => number;
  private readonly cache = new Map<string, { result: Awaited<ReturnType<PackagedFoodProvider["lookup"]>>; expiresAt: number }>();
  private readonly inFlight = new Map<string, Promise<Awaited<ReturnType<PackagedFoodProvider["lookup"]>>>>();

  constructor(provider: PackagedFoodProvider, options: PackagedFoodServiceOptions = {}) {
    this.provider = provider;
    this.now = options.now ?? (() => Date.now());
  }

  async resolve(rawBarcode: string, reviewedGrams?: number): Promise<PackagedFoodResolution> {
    const lookup = await this.lookup(normalizeBarcode(rawBarcode));
    return packagedFoodCandidateFromLookup(lookup, reviewedGrams);
  }

  private async lookup(barcode: string): Promise<Awaited<ReturnType<PackagedFoodProvider["lookup"]>>> {
    const cached = this.cache.get(barcode);
    if (cached && cached.expiresAt > this.now()) return cached.result;
    if (cached) this.cache.delete(barcode);
    const running = this.inFlight.get(barcode);
    if (running) return running;
    const request = this.provider.lookup(barcode).then((result) => {
      const ttlMs = packagedCacheTtlSeconds(result.status) * 1_000;
      if (ttlMs > 0) {
        this.cache.set(barcode, { result, expiresAt: this.now() + ttlMs });
        if (this.cache.size > 256) this.cache.delete(this.cache.keys().next().value as string);
      }
      return result;
    }).finally(() => this.inFlight.delete(barcode));
    this.inFlight.set(barcode, request);
    return request;
  }
}
