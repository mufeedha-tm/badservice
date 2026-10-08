import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { ApiError } from '../utils/ApiError.js';

export const MAX_VIDEO_BYTES = 15 * 1024 * 1024;
export const MAX_ORIGINAL_VIDEO_BYTES = 1024 * 1024 * 1024;

const AUDIO_BITRATE_KBPS = 96;

export async function compressVideoForLimit(file, durationSeconds = 30) {
  if (file.size <= MAX_VIDEO_BYTES && durationSeconds <= 30) return file;

  if (!ffmpegPath) {
    throw new ApiError(500, 'Video compression is unavailable on this server.', 'VIDEO_COMPRESSION_UNAVAILABLE');
  }

  const outputPath = path.join(
    path.dirname(file.path),
    `${path.basename(file.path, path.extname(file.path))}-${randomBytes(6).toString('hex')}-compressed.mp4`
  );

  const effectiveDuration = Math.min(30, Math.max(1, durationSeconds || 30));

  try {
    for (const crf of [24, 27, 30, 33, 36, 39]) {
      await encodeVideo(file.path, outputPath, ['-crf', String(crf)]);
      if ((await stat(outputPath)).size <= MAX_VIDEO_BYTES) {
        return replaceWithCompressedFile(file, outputPath);
      }
    }

    const targetTotalBitrateKbps = Math.max(
      8,
      Math.floor((MAX_VIDEO_BYTES * 8 * 0.82) / effectiveDuration / 1000)
    );
    let compressed = false;
    for (const [maxWidth, maxHeight] of [[1280, 720], [960, 540], [640, 360], [426, 240]]) {
      let bitrateKbps = targetTotalBitrateKbps;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const audioBitrateKbps = bitrateKbps >= 64
          ? Math.min(AUDIO_BITRATE_KBPS, Math.floor(bitrateKbps * 0.15))
          : 0;
        const videoBitrateKbps = Math.max(8, bitrateKbps - audioBitrateKbps);
        const bitrateArgs = [
          '-b:v', `${videoBitrateKbps}k`,
          '-maxrate', `${videoBitrateKbps}k`,
          '-bufsize', `${videoBitrateKbps * 2}k`,
        ];
        if (audioBitrateKbps) bitrateArgs.push('-b:a', `${audioBitrateKbps}k`);
        await encodeVideo(file.path, outputPath, bitrateArgs, maxWidth, maxHeight, audioBitrateKbps > 0);
        if ((await stat(outputPath)).size <= MAX_VIDEO_BYTES) {
          compressed = true;
          break;
        }
        bitrateKbps = Math.max(8, Math.floor(bitrateKbps * 0.75));
      }
      if (compressed) break;
    }

    if (!compressed) {
      throw new ApiError(
        422,
        'This video could not be compressed to 15 MB. Please choose another video file.',
        'VIDEO_COMPRESSION_LIMIT'
      );
    }

    return replaceWithCompressedFile(file, outputPath);
  } catch (error) {
    await unlink(outputPath).catch(() => {});
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      422,
      'The video could not be compressed. Please upload a playable MP4, MOV, or WEBM video.',
      'VIDEO_COMPRESSION_FAILED'
    );
  }
}

function encodeVideo(inputPath, outputPath, qualityArgs, maxWidth = 1280, maxHeight = 720, includeAudio = true) {
  const args = [
    '-hide_banner',
    '-loglevel', 'error',
    '-y',
    '-i', inputPath,
    '-t', '30',
    '-map', '0:v:0',
    ...(includeAudio ? ['-map', '0:a?'] : []),
    '-vf', `scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,
    '-c:v', 'libx264',
    '-preset', 'medium',
    ...qualityArgs,
    ...(includeAudio ? ['-c:a', 'aac'] : ['-an']),
    '-movflags', '+faststart',
    '-threads', '2',
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    const process = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = '';
    process.stderr.setEncoding('utf8');
    process.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-4000);
    });
    process.once('error', reject);
    process.once('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `FFmpeg exited with code ${code}.`));
      }
    });
  });
}

async function replaceWithCompressedFile(file, outputPath) {
  const filename = path.basename(outputPath);
  const compressedSize = (await stat(outputPath)).size;
  await unlink(file.path);
  file.path = outputPath;
  file.filename = filename;
  file.originalname = `${path.parse(file.originalname).name}.mp4`;
  file.mimetype = 'video/mp4';
  file.size = compressedSize;
  return file;
}
