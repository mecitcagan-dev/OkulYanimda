// frontend/src/api/playlistStorage.js
// Purpose: Manage playlists and watch later list in localStorage

const PLAYLISTS_KEY = 'user_playlists';
const WATCH_LATER_KEY = 'watch_later';

/**
 * Get all playlists
 * @returns {Array<{id: string, name: string, videos: Array}>}
 */
export function getPlaylists() {
  try {
    const data = localStorage.getItem(PLAYLISTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save playlists
 * @param {Array} playlists
 */
export function savePlaylists(playlists) {
  localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

/**
 * Create new playlist
 * @param {string} name
 * @returns {object} new playlist
 */
export function createPlaylist(name) {
  const playlists = getPlaylists();
  const newPlaylist = {
    id: Date.now().toString(),
    name,
    videos: [],
    createdAt: new Date().toISOString(),
  };
  playlists.push(newPlaylist);
  savePlaylists(playlists);
  return newPlaylist;
}

/**
 * Add video to playlist
 * @param {string} playlistId
 * @param {object} video
 */
export function addVideoToPlaylist(playlistId, video) {
  const playlists = getPlaylists();
  const playlist = playlists.find((p) => p.id === playlistId);
  if (playlist) {
    // Check if video already exists
    const exists = playlist.videos.some((v) => v['optimized-url'] === video['optimized-url']);
    if (!exists) {
      playlist.videos.push(video);
      savePlaylists(playlists);
    }
  }
}

/**
 * Remove video from playlist
 * @param {string} playlistId
 * @param {string} videoUrl
 */
export function removeVideoFromPlaylist(playlistId, videoUrl) {
  const playlists = getPlaylists();
  const playlist = playlists.find((p) => p.id === playlistId);
  if (playlist) {
    playlist.videos = playlist.videos.filter((v) => v['optimized-url'] !== videoUrl);
    savePlaylists(playlists);
  }
}

/**
 * Delete playlist
 * @param {string} playlistId
 */
export function deletePlaylist(playlistId) {
  const playlists = getPlaylists();
  const filtered = playlists.filter((p) => p.id !== playlistId);
  savePlaylists(filtered);
}

/**
 * Get watch later list
 * @returns {Array<object>}
 */
export function getWatchLater() {
  try {
    const data = localStorage.getItem(WATCH_LATER_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Add to watch later
 * @param {object} video
 */
export function addToWatchLater(video) {
  const list = getWatchLater();
  const exists = list.some((v) => v['optimized-url'] === video['optimized-url']);
  if (!exists) {
    list.push(video);
    localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(list));
  }
}

/**
 * Remove from watch later
 * @param {string} videoUrl
 */
export function removeFromWatchLater(videoUrl) {
  const list = getWatchLater();
  const filtered = list.filter((v) => v['optimized-url'] !== videoUrl);
  localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(filtered));
}

export default {
  getPlaylists,
  savePlaylists,
  createPlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  getWatchLater,
  addToWatchLater,
  removeFromWatchLater,
};