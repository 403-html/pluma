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

    function isEnabled(flagKey: string, visited: Set<string> = new Set()): boolean {
      if (visited.has(flagKey)) {
        // Cycle detected — fall back to raw enabled state to avoid infinite loop.
        const flag = flagMap.get(flagKey);
        return flag?.enabled ?? false;
      }

      const flag = flagMap.get(flagKey);
      if (!flag) {
        return false;
      }

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

      // 3. Parent inheritance: delegate to parent flag.
      if (flag.inheritParent && flag.parentKey !== null) {
        const next = new Set(visited);
        next.add(flagKey);
        return isEnabled(flag.parentKey, next);
      }

      // 4. Base enabled state.
      return flag.enabled;
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

