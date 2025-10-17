// backend/utils/fileScanner.js
// Purpose: Scan a folder recursively for .webm files and return metadata { path, filename, createdAt }.
// Usage: import { scanVideos } from './fileScanner.js'; await scanVideos(process.env.VIDEOS_PATH)

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Recursively scans the provided folder for .webm files and returns their absolute paths,
 * filenames, and creation dates derived from filesystem stats.
 *
 * Only files ending with .webm (case-insensitive) are included.
 *
 * @param {string} folderPath - Absolute path to the folder to scan.
 * @returns {Promise<Array<{ path: string, filename: string, createdAt: Date }>>}
 */
export async function scanVideos(folderPath) {
  if (!folderPath || typeof folderPath !== 'string') {
    throw new TypeError('scanVideos requires a valid folderPath string');
  }

  const results = [];

  async function walk(currentDir) {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch (err) {
      // If directory cannot be read, log and skip
      console.error(`Failed to read directory: ${currentDir}`, err?.message);
      return;
    }

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
          return;
        }
        if (!entry.isFile()) return;

        const isVideo = /\.webm$/i.test(entry.name);
        if (!isVideo) return;

        try {
          const stats = await fs.stat(fullPath);
          results.push({
            path: fullPath,
            filename: path.basename(entry.name),
            createdAt: stats.birthtime instanceof Date ? stats.birthtime : new Date(stats.birthtimeMs ?? stats.ctimeMs ?? Date.now()),
          });
        } catch (err) {
          console.error(`Failed to stat file: ${fullPath}`, err?.message);
        }
      })
    );
  }

  await walk(folderPath);

  // Sort by createdAt desc for convenience (newest first)
  results.sort((a, b) => b.createdAt - a.createdAt);
  return results;
}

export default { scanVideos };
