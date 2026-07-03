// frontend/src/api/videoProgress.js
// Purpose: Track video watch progress in localStorage

const PROGRESS_KEY = 'video_progress';

/**
 * Get all video progress data
 * @returns {Object} - { videoUrl: { currentTime, duration, percentage, lastWatched } }
 */
export function getAllProgress() {
  try {
    const data = localStorage.getItem(PROGRESS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Get progress for a specific video
 * @param {string} videoUrl
 * @returns {Object|null}
 */
export function getProgress(videoUrl) {
  const all = getAllProgress();
  return all[videoUrl] || null;
}

/**
 * Save video progress
 * @param {string} videoUrl
 * @param {number} currentTime
 * @param {number} duration
 */
export function saveProgress(videoUrl, currentTime, duration) {
  if (!videoUrl || !duration || currentTime < 0) return;

  const all = getAllProgress();
  const percentage = (currentTime / duration) * 100;

  // Only save if watched more than 5% and less than 95%
  if (percentage > 5 && percentage < 95) {
    all[videoUrl] = {
      currentTime,
      duration,
      percentage,
      lastWatched: new Date().toISOString(),
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } else if (percentage >= 95) {
    // If video is almost finished, remove progress
    delete all[videoUrl];
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  }
}

/**
 * Clear progress for a video
 * @param {string} videoUrl
 */
export function clearProgress(videoUrl) {
  const all = getAllProgress();
  delete all[videoUrl];
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
}

export default {
  getAllProgress,
  getProgress,
  saveProgress,
  clearProgress,
};