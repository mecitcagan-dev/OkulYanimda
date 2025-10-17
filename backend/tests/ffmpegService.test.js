// backend/tests/ffmpegService.test.js
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock fluent-ffmpeg to avoid requiring real binary during CI
jest.unstable_mockModule('fluent-ffmpeg', () => {
  return {
    default: jest.fn(() => ({
      outputOptions: jest.fn().mockReturnThis(),
      format: jest.fn().mockReturnThis(),
      on: function (evt, handler) {
        if (evt === 'error') this._onError = handler;
        if (evt === 'end') this._onEnd = handler;
        return this;
      },
      save: jest.fn(function (out) {
        // Simulate writing a file
        try {
          fs.writeFileSync(out, 'webmdata');
          setImmediate(() => this._onEnd && this._onEnd());
        } catch (e) {
          setImmediate(() => this._onError && this._onError(e));
        }
        return this;
      }),
    })),
    setFfmpegPath: jest.fn(),
  };
});

const { convertToWebm } = await import('../services/ffmpegService.js');

function tmpFile(name) {
  return path.join(os.tmpdir(), name);
}

describe('convertToWebm', () => {
  it('converts and returns output path and size', async () => {
    const input = tmpFile('input.mp4');
    const output = tmpFile(`out-${Date.now()}.webm`);
    fs.writeFileSync(input, 'dummy');

    try {
      const res = await convertToWebm(input, output);
      expect(res.path).toBe(output);
      expect(res.size).toBeGreaterThan(0);
      expect(fs.existsSync(output)).toBe(true);
    } finally {
      try { fs.unlinkSync(input); } catch {}
      try { fs.unlinkSync(output); } catch {}
    }
  });

  it('rejects when missing parameters', async () => {
    await expect(convertToWebm()).rejects.toThrow();
  });
});
