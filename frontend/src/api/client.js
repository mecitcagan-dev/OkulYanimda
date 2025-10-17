// frontend/src/api/client.js
// Purpose: Frontend API client to fetch videos from backend with optional date filter.

const API_BASE = '/api';

/**
 * Fetches videos array from backend, optionally filtered by date (YYYY-MM-DD).
 * @param {string} [date]
 * @returns {Promise<Array<{id?:number, filename:string, 'created-at':string, 'optimized-url':string}>>}
 */
export async function fetchVideos(date) {
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  const url = `${API_BASE}/videos${q}`;
  try {
    console.log('[fetchVideos] GET', url);
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) {
      console.error('[fetchVideos] HTTP', res.status, text);
      throw new Error(`GET ${url} -> ${res.status}: ${text}`);
    }
    try {
      const json = JSON.parse(text);
      console.log('[fetchVideos] OK items:', Array.isArray(json) ? json.length : 'n/a');
      return json;
    } catch (e) {
      console.error('[fetchVideos] JSON parse error:', e);
      throw new Error('Response parse error');
    }
  } catch (e) {
    console.error('[fetchVideos] error:', e);
    throw e;
  }
}

/**
 * Triggers backend auto-scan upload (process VIDEOS_PATH .mp4 files).
 * Returns the JSON response or throws with detailed message.
 */
export async function uploadScan() {
  const url = `${API_BASE}/videos/upload`;
  console.log('[uploadScan] POST', url, '{ }');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('[uploadScan] HTTP', res.status, text);
    throw new Error(`POST ${url} -> ${res.status}: ${text}`);
  }
  try {
    const json = JSON.parse(text);
    console.log('[uploadScan] OK', json);
    return json;
  } catch (e) {
    console.error('[uploadScan] parse error', e, text);
    throw new Error('Upload response parse error');
  }
}

/**
 * Build video src URL (already public URLs from backend rows).
 * @param {string} optimizedUrl
 */
export function buildVideoSrc(optimizedUrl) {
  return optimizedUrl;
}

export default { fetchVideos, buildVideoSrc, uploadScan };
