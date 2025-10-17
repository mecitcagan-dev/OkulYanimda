// backend/tests/fileScanner.test.js
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { scanVideos } from '../utils/fileScanner.js';

/**
 * Creates a temporary directory populated with a mix of .mp4 and other files,
 * as well as nested directories. Returns the directory path and a cleanup fn.
 */
async function setupTempDir() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scanner-'));
  const nested = path.join(tmpDir, 'nested');
  await fs.mkdir(nested);

  const files = [
    'clip1.mp4',
    'clip2.MP4', // case-insensitive
    'image.jpg',
    'readme.txt',
  ];
  await Promise.all(
    files.map((f) => fs.writeFile(path.join(tmpDir, f), 'dummy'))
  );
  await fs.writeFile(path.join(nested, 'deep.mp4'), 'dummy');
  await fs.writeFile(path.join(nested, 'deep.mov'), 'dummy');

  return {
    tmpDir,
    async cleanup() {
      // recursive delete
      async function rmrf(target) {
        const stat = await fs.stat(target).catch(() => null);
        if (!stat) return;
        if (stat.isDirectory()) {
          const entries = await fs.readdir(target);
          await Promise.all(entries.map((e) => rmrf(path.join(target, e))));
          await fs.rmdir(target);
        } else {
          await fs.unlink(target);
        }
      }
      await rmrf(tmpDir);
    },
  };
}

describe('scanVideos', () => {
  it('finds only .mp4 files recursively and returns metadata', async () => {
    const { tmpDir, cleanup } = await setupTempDir();
    try {
      const results = await scanVideos(tmpDir);
      const names = results.map((r) => r.filename).sort();
      expect(names).toEqual(['clip1.mp4', 'clip2.MP4', 'deep.mp4'].sort());
      expect(results.every((r) => path.isAbsolute(r.path))).toBe(true);
      expect(results.every((r) => r.createdAt instanceof Date)).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it('throws when folderPath is invalid', async () => {
    await expect(() => scanVideos()).rejects.toThrow();
    await expect(scanVideos(123)).rejects.toThrow();
  });
});
