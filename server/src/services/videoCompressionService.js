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
    return file;
  }

  const outputPath = path.join(
    path.dirname(file.path),
    `${path.basename(file.path, path.extname(file.path))}-${randomBytes(6).toString('hex')}-compressed.mp4`
  );

  try {
    // Fast single-pass compression with ultrafast preset and all available threads
    await encodeVideo(file.path, outputPath, ['-crf', '28'], 1280, 720, true);
    const outputStat = await stat(outputPath).catch(() => null);
    if (outputStat && outputStat.size > 0) {
      return replaceWithCompressedFile(file, outputPath);
    }
    return file;
  } catch (error) {
    await unlink(outputPath).catch(() => {});
    console.warn('Video compression notice, continuing with original:', error.message);
    return file;
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
    '-preset', 'ultrafast',
    ...qualityArgs,
    ...(includeAudio ? ['-c:a', 'aac'] : ['-an']),
    '-movflags', '+faststart',
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
