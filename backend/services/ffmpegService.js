// backend/services/ffmpegService.js
// Purpose: Wrap fluent-ffmpeg to convert input videos to web-optimized .webm with safe cleanup on errors.
// Usage: import { convertToWebm } from './ffmpegService.js'; await convertToWebm('/in.mp4', '/out.webm')

import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Bind static binary if available
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * Converts a video file to WebM format with sane defaults for web playback.
 * Ensures temporary output file is removed if conversion fails.
 *
 * Tuning goals:
 * - Favor fast, stream-friendly output for long videos
 * - VP9 with CRF-based rate control and realtime-ish encoding
 * - Optional downscale to reduce size/bandwidth
 *
 * Env overrides (optional):
 * - VIDEO_CRF (default 32)
 * - VIDEO_CPU_USED (default 4) higher = faster encode, lower quality
 * - VIDEO_MAX_WIDTH (e.g., 1280)
 * - VIDEO_MAX_HEIGHT (e.g., 720)
 * - VIDEO_FPS (default 30)
 * - VIDEO_AUDIO_KBPS (default 96)
 *
 * @param {string} inputPath - Absolute path to source video file.
 * @param {string} outputPath - Absolute path where the .webm file will be written.
 * @param {object} [options]
 * @param {string} [options.videoBitrate='0'] - Use CRF if 0; else sets target bitrate (e.g., '1500k').
 * @param {number} [options.crf=Number(process.env.VIDEO_CRF)||32] - Constant Rate Factor; lower is higher quality.
 * @param {number} [options.audioBitrate=Number(process.env.VIDEO_AUDIO_KBPS)||96] - Audio bitrate kbps.
 * @param {number} [options.fps=Number(process.env.VIDEO_FPS)||30] - Target frames per second.
 * @param {number} [options.cpuUsed=Number(process.env.VIDEO_CPU_USED)||4] - VP9 speed/quality tradeoff (0-5 typical).
 * @param {number} [options.maxWidth=Number(process.env.VIDEO_MAX_WIDTH)||0] - Optional downscale max width.
 * @param {number} [options.maxHeight=Number(process.env.VIDEO_MAX_HEIGHT)||0] - Optional downscale max height.
 * @returns {Promise<{ path: string, size: number }>} - Output file path and size in bytes.
 */
export function convertToWebm(inputPath, outputPath, options = {}) {
  const {
    videoBitrate = '0',
    crf = Number(process.env.VIDEO_CRF) || 32,
    audioBitrate = Number(process.env.VIDEO_AUDIO_KBPS) || 96,
    fps = Number(process.env.VIDEO_FPS) || 30,
    cpuUsed = Number(process.env.VIDEO_CPU_USED) || 4,
    maxWidth = Number(process.env.VIDEO_MAX_WIDTH) || 0,
    maxHeight = Number(process.env.VIDEO_MAX_HEIGHT) || 0,
  } = options;

  if (!inputPath || !outputPath) {
    return Promise.reject(new Error('convertToWebm requires inputPath and outputPath'));
  }

  // Build video filter for optional downscale
  const vfParts = [];
  if (maxWidth > 0 || maxHeight > 0) {
    // Maintain aspect. Only constrain provided dimension(s).
    // scale=-2 to keep width multiple of 2 when height constrained (and vice versa)
    if (maxWidth > 0 && maxHeight > 0) {
      vfParts.push(`scale='min(iw,${maxWidth})':'min(ih,${maxHeight})':force_original_aspect_ratio=decrease`);
    } else if (maxWidth > 0) {
      vfParts.push(`scale='min(iw,${maxWidth})':-2`);
    } else if (maxHeight > 0) {
      vfParts.push(`scale=-2:'min(ih,${maxHeight})'`);
    }
  }
  const vfOption = vfParts.length ? ['-vf', vfParts.join(',')] : [];

  return new Promise((resolve, reject) => {
    let finished = false;

    const onFailure = async (err) => {
      if (finished) return; // ensure single resolution
      finished = true;
      // Try to cleanup partial output
      try {
        if (outputPath && fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch (cleanupErr) {
        // ignore cleanup errors
      }
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    try {
      const outputArgs = [
        '-c:v libvpx-vp9',
        videoBitrate !== '0' ? `-b:v ${videoBitrate}` : `-crf ${String(crf)}`,
        `-r ${fps}`,
        '-pix_fmt yuv420p',
        '-row-mt 1',
        `-cpu-used ${cpuUsed}`, // speed up encoding for long videos
        '-deadline realtime',   // prefer realtime-ish encoding over max quality
        '-threads 0',
        '-g 240',               // keyframe interval ~8s @30fps
        '-tile-columns 2',      // better parallelism for VP9
        '-lag-in-frames 25',
        '-c:a libopus',
        `-b:a ${audioBitrate}k`,
      ];

      const command = ffmpeg(inputPath)
        .outputOptions([...outputArgs, ...vfOption])
        .format('webm')
        .on('error', onFailure)
        .on('end', () => {
          if (finished) return;
          finished = true;
          try {
            const stats = fs.statSync(outputPath);
            resolve({ path: outputPath, size: stats.size });
          } catch (err) {
            onFailure(err);
          }
        })
        .save(outputPath);

      // Ensure output directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Start the process (fluent-ffmpeg starts on .save)
      return command;
    } catch (err) {
      onFailure(err);
    }
  });
}

export default { convertToWebm };
