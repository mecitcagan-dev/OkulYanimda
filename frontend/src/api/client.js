// frontend/src/api/client.js
// Dev'de Vite proxy (/api → localhost:3000), prod'da aynı origin
const API_BASE = '/api';

class CacheManager {
	constructor() {
		this.memoryCache = new Map();
		this.timestamps = new Map();
		this.TTL = 5 * 60 * 1000;
		this.pendingRequests = new Map();
	}

	set(key, value) {
		this.memoryCache.set(key, value);
		this.timestamps.set(key, Date.now());
		try {
			localStorage.setItem(
				`cache_${key}`,
				JSON.stringify({ data: value, timestamp: Date.now() }),
			);
		} catch (e) {
			console.warn('Cache storage failed:', e);
		}
	}

	get(key) {
		const timestamp = this.timestamps.get(key);
		if (timestamp && Date.now() - timestamp < this.TTL) {
			return this.memoryCache.get(key);
		}
		try {
			const stored = localStorage.getItem(`cache_${key}`);
			if (stored) {
				const { data, timestamp: storedTime } = JSON.parse(stored);
				if (Date.now() - storedTime < this.TTL) {
					this.memoryCache.set(key, data);
					this.timestamps.set(key, storedTime);
					return data;
				}
			}
		} catch (e) {}
		this.memoryCache.delete(key);
		this.timestamps.delete(key);
		return null;
	}

	clear() {
		this.memoryCache.clear();
		this.timestamps.clear();
		try {
			Object.keys(localStorage).forEach((k) => {
				if (k.startsWith('cache_')) localStorage.removeItem(k);
			});
		} catch (e) {}
	}

	async dedupe(key, fetcher) {
		if (this.pendingRequests.has(key)) return this.pendingRequests.get(key);
		const promise = fetcher().finally(() => this.pendingRequests.delete(key));
		this.pendingRequests.set(key, promise);
		return promise;
	}
}

const cache = new CacheManager();

export async function fetchVideos(date, forceRefresh = false) {
	const cacheKey = `videos_${date || 'all'}`;

	if (!forceRefresh) {
		const cached = cache.get(cacheKey);
		if (cached) return cached;
	}

	return cache.dedupe(cacheKey, async () => {
		const q = date ? `?date=${encodeURIComponent(date)}` : '';
		const url = `${API_BASE}/videos${q}`;

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 15000);

		try {
			const res = await fetch(url, {
				method: 'GET',
				signal: controller.signal,
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
			});
			clearTimeout(timeoutId);

			if (!res.ok) {
				const text = await res.text();
				throw new Error(`GET ${url} -> ${res.status}: ${text}`);
			}

			const json = await res.json();
			cache.set(cacheKey, json);
			return json;
		} catch (e) {
			clearTimeout(timeoutId);
			if (e.name === 'AbortError')
				throw new Error('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
			if (
				e.message.includes('Failed to fetch') ||
				e.message.includes('NetworkError')
			) {
				throw new Error('Bağlantı hatası. İnternet bağlantınızı kontrol edin.');
			}
			throw e;
		}
	});
}

export async function uploadScan() {
	const url = `${API_BASE}/videos/upload`;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 60000);

	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body: JSON.stringify({}),
			signal: controller.signal,
		});
		clearTimeout(timeoutId);
		const text = await res.text();
		if (!res.ok) throw new Error(`POST ${url} -> ${res.status}: ${text}`);
		const json = JSON.parse(text);
		cache.clear();
		return json;
	} catch (e) {
		clearTimeout(timeoutId);
		if (e.name === 'AbortError')
			throw new Error('Yükleme zaman aşımına uğradı');
		if (
			e.message.includes('Failed to fetch') ||
			e.message.includes('NetworkError')
		) {
			throw new Error('Bağlantı hatası. İnternet bağlantınızı kontrol edin.');
		}
		throw e;
	}
}

export function buildVideoSrc(optimizedUrl) {
	return optimizedUrl;
}
export function clearCache() {
	cache.clear();
}
export async function prefetchVideos(date) {
	try {
		await fetchVideos(date, false);
	} catch (e) {}
}

export default {
	fetchVideos,
	buildVideoSrc,
	uploadScan,
	clearCache,
	prefetchVideos,
};
