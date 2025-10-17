// backend/controllers/videoController.js
// Purpose: Orchestrate scanning/upload/DB insert (no conversion) and expose handlers for Express routes.
// Usage: import { uploadHandler, listHandler } from './videoController.js'

import os from 'os';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { uploadFileToBucket, insertMetadata, getVideos, buildPublicUrl, findByPublicUrl } from '../services/supabaseService.js';
import { scanVideos } from '../utils/fileScanner.js';

dotenv.config();

const CONCURRENCY = Number(process.env.CONCURRENCY || 3);

function shortId() {
  return Math.random().toString(36).slice(2, 6);
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true }).catch(() => {});
}

async function computeFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', (e) => reject(e));
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Express handler: POST /api/videos/upload
 * Body: { filePath: string } or { files: string[] }
 * If no body is provided, will auto-scan process.env.VIDEOS_PATH and process all .webm files found.
 */
export async function uploadHandler(req, res) {
  try {
    let files = Array.isArray(req.body?.files)
      ? req.body.files
      : req.body?.filePath
      ? [req.body.filePath]
      : [];

    if (!files.length) {
      const scanRoot = process.env.VIDEOS_PATH;
      console.log('[upload] No files provided, scanning VIDEOS_PATH:', scanRoot);
      if (!scanRoot) {
        return res.status(400).json({ error: 'No files provided and VIDEOS_PATH not set' });
      }
      const scanned = await scanVideos(scanRoot);
      console.log('[upload] scanVideos found', scanned.length, 'file(s)');
      files = scanned.map((v) => v.path);
      if (!files.length) {
        console.log('[upload] No supported files found, returning empty uploaded list');
        return res.status(200).json({ uploaded: [] });
      }
    }

    console.log('[upload] Processing', files.length, 'file(s):', files);

    const tasks = files.map((filePath, index) => async () => {
      const src = path.resolve(filePath);
      console.log(`[upload][${index}] Begin file:`, src);
      let stat;
      try {
        stat = await fsp.stat(src);
      } catch {
        console.error(`[upload][${index}] Source file not found:`, src);
        throw new Error(`Source file not found: ${src}`);
      }

      const ext = path.extname(src).toLowerCase();
      if (ext !== '.webm') {
        throw new Error(`Only .webm supported: ${src}`);
      }

      // Content-addressed dedup: hash file bytes and use as remote name
      console.log(`[upload][${index}] Hashing file for dedup...`);
      const sha = await computeFileHash(src);
      const remoteName = `${sha}.webm`;
      const publicUrl = buildPublicUrl(remoteName);

      const existing = await findByPublicUrl(publicUrl);
      if (existing) {
        console.log(`[upload][${index}] Duplicate by hash; reusing stored object and inserting metadata only.`);
        const row = await insertMetadata({
          filename: path.basename(src),
          created_at: (stat.birthtime instanceof Date ? stat.birthtime : new Date()).toISOString(),
          optimized_url: publicUrl,
        });
        return {
          filename: row.filename,
          'created-at': row.created_at,
          'optimized-url': row.optimized_url,
        };
      }

      const createdAt = stat.birthtime instanceof Date ? stat.birthtime : new Date();

      console.log(`[upload][${index}] Uploading to bucket as`, remoteName);
      const optimizedUrl = await uploadFileToBucket(src, remoteName);
      console.log(`[upload][${index}] Uploaded public URL:`, optimizedUrl);

      console.log(`[upload][${index}] Inserting metadata`);
      const row = await insertMetadata({
        filename: path.basename(src),
        created_at: createdAt.toISOString(),
        optimized_url: optimizedUrl,
      });

      const payload = {
        filename: row.filename ?? path.basename(src),
        'created-at': (row.created_at ?? createdAt.toISOString()),
        'optimized-url': (row.optimized_url ?? optimizedUrl),
      };
      console.log(`[upload][${index}] Done ->`, payload);
      return payload;
    });

    const uploaded = await runWithConcurrency(tasks, CONCURRENCY);

    console.log(`Uploaded ${uploaded.length} video(s).`);
    return res.json({ uploaded });
  } catch (err) {
    console.error('Upload failed:', err?.message);
    return res.status(500).json({ error: `Upload failed: ${err?.message || 'unknown error'}` });
  }
}

/**
 * Express handler: GET /api/videos?date=YYYY-MM-DD
 */
export async function listHandler(req, res) {
  try {
    const date = req.query?.date;
    const rows = await getVideos({ date });
    // map to kebab-case keys
    const mapped = (rows || []).map((r) => ({
      filename: r.filename,
      'created-at': r.created_at,
      'optimized-url': r.optimized_url,
    }));
    return res.json(mapped);
  } catch (err) {
    console.error('List videos failed:', err?.message);
    return res.status(500).json({ error: `Failed to fetch videos: ${err?.message || 'unknown error'}` });
  }
}

/**
 * Runs an array of async-producing functions with a concurrency limit.
 * @param {Array<() => Promise<any>>} fns
 * @param {number} limit
 * @returns {Promise<any[]>}
 */
export async function runWithConcurrency(fns, limit) {
  const results = [];
  let idx = 0;
  const running = new Set();

  async function runNext() {
    if (idx >= fns.length) return;
    const currentIndex = idx++;
    const p = Promise.resolve()
      .then(() => fns[currentIndex]())
      .then((r) => {
        results[currentIndex] = r;
      })
      .finally(() => {
        running.delete(p);
      });
    running.add(p);
    if (running.size >= limit) {
      await Promise.race(running);
    }
    return runNext();
  }

  await runNext();
  await Promise.all(running);
  return results.filter((x) => x !== undefined);
}

export default { uploadHandler, listHandler };
