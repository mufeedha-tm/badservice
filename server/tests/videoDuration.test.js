import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import ffmpegPath from 'ffmpeg-static';
import { readVideoDurationSeconds } from '../src/utils/videoDuration.js';

async function makeVideo(folder, format, seconds) {
  const filePath = path.join(folder, `sample.${format}`);
  const codec = format === 'webm' ? 'libvpx' : 'libx264';
  const args = [
    '-hide_banner',
    '-loglevel', 'error',
    '-f', 'lavfi',
    '-i', `color=c=black:s=160x120:r=12:d=${seconds}`,
    '-an',
    '-c:v', codec,
    '-t', String(seconds),
    '-y',
    filePath,
  ];

  await new Promise((resolve, reject) => {
    const process = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = '';
    process.stderr.setEncoding('utf8');
    process.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-4000);
    });
    process.once('error', reject);
    process.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `FFmpeg exited with code ${code}.`));
    });
  });

  return filePath;
}

async function withVideo(format, seconds, run) {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'video-duration-'));
  try {
    const filePath = await makeVideo(folder, format, seconds);
    return await run(filePath);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

test('reads MP4 duration metadata', async () => {
  await withVideo('mp4', 8, async (filePath) => {
    assert.equal(await readVideoDurationSeconds(filePath), 8);
  });
});

test('reads WebM duration metadata', async () => {
  await withVideo('webm', 8.3, async (filePath) => {
    assert.ok(Math.abs(await readVideoDurationSeconds(filePath) - 8.3) < 0.05);
  });
});

test('reads a clip at the 30-second duration limit', async () => {
  await withVideo('mp4', 30, async (filePath) => {
    assert.equal(await readVideoDurationSeconds(filePath), 30);
  });
});

test('reports clips longer than the 30-second upload limit', async () => {
  await withVideo('mp4', 31, async (filePath) => {
    assert.ok((await readVideoDurationSeconds(filePath)) > 30);
  });
});

test('rejects files without duration metadata', async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'video-duration-'));
  const filePath = path.join(folder, 'sample.mp4');
  try {
    await writeFile(filePath, Buffer.from('not a video'));
    await assert.rejects(readVideoDurationSeconds(filePath), /metadata/i);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
