// A small, framework-agnostic cache that prefers browser localStorage when available,
// with an in-memory Map fallback for server or non-browser contexts. Supports TTL.

type Milliseconds = number;

interface StoredEntry<T> {
  value: T;
  expiresAt?: number; // epoch ms
}

export interface Cache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs?: Milliseconds): void;
  delete(key: string): void;
  clear(): void;
}

function hasLocalStorage(): boolean {
  try {
    // deno-lint-ignore no-explicit-any
    const ls = (globalThis as any).localStorage as Storage | undefined;
    if (!ls) return false;
    const testKey = "__cache_test__";
    ls.setItem(testKey, "1");
    ls.removeItem(testKey);
    return true;
  } catch (_) {
    return false;
  }
}

function now(): number {
  return Date.now();
}

function toStoredEntry<T>(value: T, ttlMs?: Milliseconds): StoredEntry<T> {
  if (ttlMs && ttlMs > 0) {
    return { value, expiresAt: now() + ttlMs };
  }
  return { value };
}

function isExpired(entry: StoredEntry<unknown> | null): boolean {
  if (!entry) return true;
  if (typeof entry.expiresAt === "number") {
    return entry.expiresAt <= now();
  }
  return false;
}

export function createTieredCache(namespace: string): Cache {
  const prefix = `cache:${namespace}:`;
  if (hasLocalStorage()) {
    // Browser-like cache using localStorage
    // deno-lint-ignore no-explicit-any
    const ls = (globalThis as any).localStorage as Storage;
    return {
      get<T>(key: string): T | undefined {
        const k = prefix + key;
        const raw = ls.getItem(k);
        if (!raw) return undefined;
        try {
          const parsed = JSON.parse(raw) as StoredEntry<T>;
          if (isExpired(parsed)) {
            ls.removeItem(k);
            return undefined;
          }
          return parsed.value;
        } catch {
          ls.removeItem(k);
          return undefined;
        }
      },
      set<T>(key: string, value: T, ttlMs?: Milliseconds): void {
        const k = prefix + key;
        const entry = toStoredEntry(value, ttlMs);
        ls.setItem(k, JSON.stringify(entry));
      },
      delete(key: string): void {
        ls.removeItem(prefix + key);
      },
      clear(): void {
        // Remove only our namespace keys
        for (let i = ls.length - 1; i >= 0; i--) {
          const k = ls.key(i);
          if (k && k.startsWith(prefix)) ls.removeItem(k);
        }
      },
    };
  }

  // Fallback: in-memory Map
  const memory = new Map<string, StoredEntry<unknown>>();
  return {
    get<T>(key: string): T | undefined {
      const k = prefix + key;
      const entry = memory.get(k) as StoredEntry<T> | undefined || null;
      if (!entry || isExpired(entry)) {
        memory.delete(k);
        return undefined;
      }
      return entry.value;
    },
    set<T>(key: string, value: T, ttlMs?: Milliseconds): void {
      const k = prefix + key;
      memory.set(k, toStoredEntry(value, ttlMs));
    },
    delete(key: string): void {
      memory.delete(prefix + key);
    },
    clear(): void {
      for (const k of memory.keys()) {
        if (k.startsWith(prefix)) memory.delete(k);
      }
    },
  };
}
