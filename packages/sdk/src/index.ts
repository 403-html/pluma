import type { Snapshot, SnapshotFlag } from '@pluma/types';

export type { Snapshot, SnapshotFlag };

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

    // Evaluates a flag key following the precedence chain:
    //   denyList → allowList → parent inheritance → base enabled state.
    //
    // NOTE: Deep parent chains are supported by design. Traversal is iterative
    // (no recursion) so stack depth stays O(1). A single Set tracks visited keys
    // to detect cycles; each key is added once, so memory is O(chain length).
    // Very long chains (e.g. 10+ parents) will perform proportionally more work
    // per isEnabled() call — keep flag hierarchies shallow when latency is critical.
    function isEnabled(flagKey: string): boolean {
      const visited = new Set<string>();
      let currentKey: string = flagKey;

      while (true) {
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

        // 2. Allow list: subject explicitly granted regardless of enabled state.
        //    If the subject is not in the list (or no subjectKey), fall through to
        //    parent inheritance and base enabled state.
        if (subjectKey !== undefined && flag.allowList.includes(subjectKey)) {
          return true;
        }

        // 3. Parent inheritance: walk up to the parent flag on the next iteration.
        if (flag.inheritParent && flag.parentKey !== null) {
          currentKey = flag.parentKey;
          continue;
        }

        // 4. Base enabled state.
        return flag.enabled;
      }
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

