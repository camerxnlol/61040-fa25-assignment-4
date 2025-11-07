import { createTieredCache } from "@utils/cache.ts";

type Milliseconds = number;

// Namespace the cache so it won't collide with other app keys
const cache = createTieredCache("musicMeta");

export interface MetadataKeyParts {
	provider?: string; // e.g., "spotify", "apple", "musicbrainz"
	id: string; // provider-specific id
}

export function buildMetadataKey(parts: MetadataKeyParts): string {
	const provider = parts.provider?.trim() || "generic";
	const id = parts.id.trim();
	return `${provider}:${id}`;
}

/**
 * Returns cached metadata if available and fresh; otherwise calls `fetcher`,
 * stores the result with TTL, and returns it.
 */
export async function getCachedMetadata<T>(
	key: string,
	fetcher: () => Promise<T>,
	ttlMs: Milliseconds = 24 * 60 * 60 * 1000, // default: 24h
): Promise<T> {
	const hit = cache.get<T>(key);
	if (hit !== undefined) return hit;
	const value = await fetcher();
	cache.set<T>(key, value, ttlMs);
	return value;
}

export function invalidateMetadata(key: string): void {
	cache.delete(key);
}

export function clearAllMetadataCache(): void {
	cache.clear();
}


