// backend/tests/videoController.test.js
import request from 'supertest';
import app from '../server.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

jest.unstable_mockModule('../services/ffmpegService.js', () => ({
  convertToWebm: jest.fn(async (input, output) => {
    fs.writeFileSync(output, 'webmdata');
    return { path: output, size: 8 };
  }),
}));

jest.unstable_mockModule('../services/supabaseService.js', () => ({
  uploadFileToBucket: jest.fn(async (_local, remoteName) => `https://example.supabase.co/storage/v1/object/public/videos/${encodeURIComponent(remoteName)}`),
  insertMetadata: jest.fn(async ({ filename, created_at, optimized_url }) => ({ id: 1, filename, created_at, optimized_url })),
  getVideos: jest.fn(async ({ date }) => (date ? [{ id: 2, filename: 'd.mp4', created_at: `${date}T12:00:00.000Z`, optimized_url: 'http://x' }] : [{ id: 1 }])),
}));

const { default: appReloaded } = await import('../server.js');

function tmpMp4() {
  const p = path.join(os.tmpdir(), `t-${Date.now()}.mp4`);
  fs.writeFileSync(p, 'dummy');
  return p;
}

describe('videoController routes', () => {
  it('POST /api/videos/upload converts, uploads, inserts metadata', async () => {
    const filePath = tmpMp4();
    const res = await request(appReloaded).post('/api/videos/upload').send({ filePath });
    expect(res.status).toBe(200);
    expect(res.body.uploaded && res.body.uploaded.length).toBe(1);
    expect(res.body.uploaded[0].optimized_url).toMatch(/storage\/v1\/object\/public\/videos/);
    try { fs.unlinkSync(filePath); } catch {}
  });

  it('GET /api/videos returns rows and supports date filter', async () => {
    const res = await request(appReloaded).get('/api/videos?date=2025-10-16');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
