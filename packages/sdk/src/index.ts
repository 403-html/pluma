import type { Snapshot, SnapshotFlag } from '@pluma/types';
import { MAX_PARENT_DEPTH } from '@pluma/types';

export type { Snapshot, SnapshotFlag };

/** Maximum byte length accepted by fnv1a32 to bound the loop at a known constant. */
const FNV_MAX_INPUT_LENGTH = 1024;

/**
 * FNV-1a 32-bit hash — pure JS, no Node.js built-ins required.
 * Produces a deterministic unsigned 32-bit integer for any input string.
 * Throws if the input exceeds FNV_MAX_INPUT_LENGTH characters.
 */
function fnv1a32(s: string): number {
  if (s.length > FNV_MAX_INPUT_LENGTH) {
    throw new Error(`fnv1a32: input exceeds maximum length of ${FNV_MAX_INPUT_LENGTH}`);
  }
  let hash = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

export type PlumaSnapshotCacheOptions = {
  baseUrl: string;
  token: string;
  ttlMs?: number;
};

export type EvaluatorOptions = {
  subjectKey?: string;
};

export type Evaluator = {
  isEnabled(flagKey: string): boolean;
};

const DEFAULT_TTL_MS = 30_000;

/**
 * PlumaSnapshotCache fetches and caches a feature flag snapshot from a Pluma
 * API server. It performs lazy TTL-based refresh (no background polling).
 *
 * Usage:
 *   const cache = PlumaSnapshotCache.create({ baseUrl, token, ttlMs });
 *   const evaluator = await cache.evaluator();
 *   const enabled = evaluator.isEnabled('my-flag');
 */
export class PlumaSnapshotCache {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly ttlMs: number;
  private snapshot: Snapshot | null = null;
  private fetchedAt: number | null = null;

  private constructor(options: PlumaSnapshotCacheOptions) {
    if (!options.baseUrl) {
      throw new Error('baseUrl is required');
    }
    if (!options.token) {
      throw new Error('token is required');
    }
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.token;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  }

  /**
   * Creates a new PlumaSnapshotCache instance.
   */
  static create(options: PlumaSnapshotCacheOptions): PlumaSnapshotCache {
    return new PlumaSnapshotCache(options);
  }

  /**
   * Returns an Evaluator for the current snapshot.
   * Fetches or refreshes the snapshot if the TTL has expired.
   */
  async evaluator(options: EvaluatorOptions = {}): Promise<Evaluator> {
    await this.refreshIfStale();

    const snap = this.snapshot;
    const flagMap = new Map<string, SnapshotFlag>(
      (snap?.flags ?? []).map((f) => [f.key, f]),
    );
    const subjectKey = options.subjectKey;

    // Maximum parent-chain depth per evaluation. Shared with the API's creation
    // guard via MAX_PARENT_DEPTH from @pluma/types so both sides use the same limit.

    // Evaluates a flag key following the precedence chain:
    //   denyList → allowList (additive grant) → rolloutPercentage → parent inheritance → base enabled state.
    //
    // NOTE: Deep parent chains are supported by design. Traversal is iterative
    // (no recursion) so stack depth stays O(1). A single Set tracks visited keys
    // to detect cycles; each key is added once, so memory is O(chain length).
    // Very long chains will perform proportionally more work per isEnabled() call
    // — keep flag hierarchies shallow when latency is critical.
    function isEnabled(flagKey: string): boolean {
      const visited = new Set<string>();
      let currentKey: string = flagKey;

      for (let depth = 0; depth <= MAX_PARENT_DEPTH; depth += 1) {
        if (visited.has(currentKey)) {
          // Cycle detected — fall back to raw enabled state to avoid infinite loop.
          const cycledFlag = flagMap.get(currentKey);
          return cycledFlag?.enabled ?? false;
        }

        const flag = flagMap.get(currentKey);
        if (!flag) {
          return false;
        }

        visited.add(currentKey);

        // 1. Deny list: subject explicitly blocked regardless of enabled state.
        if (subjectKey !== undefined && flag.denyList.includes(subjectKey)) {
          return false;
        }

        // 2. Allow list: subject explicitly granted access regardless of enabled state.
        if (subjectKey !== undefined && flag.allowList.includes(subjectKey)) {
          return true;
        }

        // 3. Rollout percentage: deterministic per-subject assignment.
        //    Only fires when a subjectKey is provided AND rolloutPercentage > 0.
        //    Uses FNV-1a hash of "subjectKey:currentKey" so each flag in a chain
        //    is evaluated independently. rolloutPercentage === 0 means no rollout
        //    is configured — fall through to parent/enabled state.
        if (subjectKey !== undefined && flag.rolloutPercentage > 0) {
          // Assert the value is within the valid range before computing the bucket.
          // Invalid data from a malformed snapshot is caught early rather than silently producing wrong results.
          if (flag.rolloutPercentage < 0 || flag.rolloutPercentage > 100) {
            throw new Error(`rolloutPercentage out of range [0, 100]: ${flag.rolloutPercentage}`);
          }
          const bucket = fnv1a32(`${subjectKey}:${currentKey}`) % 100;
          return bucket < flag.rolloutPercentage;
        }

        // 4. Parent inheritance: walk up to the parent flag on the next iteration.
        if (flag.inheritParent && flag.parentKey !== null) {
          currentKey = flag.parentKey;
          continue;
        }

        // 5. Base enabled state.
        return flag.enabled;
      }

      // MAX_PARENT_DEPTH exceeded — fall back to the last reachable flag's enabled state.
      const fallbackFlag = flagMap.get(currentKey);
      return fallbackFlag?.enabled ?? false;
    }

    return {
      isEnabled(flagKey: string): boolean {
        return isEnabled(flagKey);
      },
    };
  }

  private isStale(): boolean {
    if (this.fetchedAt === null || this.snapshot === null) {
      return true;
    }
    return Date.now() - this.fetchedAt >= this.ttlMs;
  }

  private async refreshIfStale(): Promise<void> {
    if (!this.isStale()) {
      return;
    }

    const etag = this.snapshot !== null ? String(this.snapshot.version) : undefined;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
    };
    if (etag !== undefined) {
      headers['If-None-Match'] = etag;
    }

    const response = await fetch(`${this.baseUrl}/sdk/v1/snapshot`, { headers });

    if (response.status === 304) {
      // Snapshot unchanged; update fetchedAt to reset TTL.
      this.fetchedAt = Date.now();
      return;
    }

    if (!response.ok) {
      throw new Error(`Pluma snapshot fetch failed: ${response.status}`);
    }

    const data = (await response.json()) as Snapshot;

    if (!data || typeof data.version !== 'number' || !Array.isArray(data.flags)) {
      throw new Error('Pluma snapshot response is malformed');
    }

    this.snapshot = data;
    this.fetchedAt = Date.now();
  }
}

