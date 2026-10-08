import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

export class VideoMetadataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VideoMetadataError';
  }
}

export function readVideoDurationSeconds(filePath) {
  if (!ffmpegPath) {
    return Promise.reject(new VideoMetadataError('FFmpeg is unavailable on this server.'));
  }

  return new Promise((resolve, reject) => {
    const process = spawn(ffmpegPath, ['-hide_banner', '-i', filePath], { windowsHide: true });
    let stderr = '';
    let settled = false;
    const timeout = setTimeout(() => {
      process.kill();
      finish(new VideoMetadataError('Video metadata probing timed out.'));
    }, 15000);

    const finish = (error, duration) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve(duration);
    };

    process.stderr.setEncoding('utf8');
    process.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-32768);
    });
    process.once('error', () => {
      finish(new VideoMetadataError('Video metadata could not be read.'));
    });
    process.once('close', () => {
      const match = stderr.match(/Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);
      if (!match) {
        finish(new VideoMetadataError('Video duration metadata is unavailable or invalid.'));
        return;
      }
      const duration = (Number(match[1]) * 3600) + (Number(match[2]) * 60) + Number(match[3]);
      if (!Number.isFinite(duration) || duration <= 0) {
        finish(new VideoMetadataError('Video duration metadata is unavailable or invalid.'));
        return;
      }
      finish(null, duration);
    });
  });
}
