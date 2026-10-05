import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readVideoDurationSeconds } from '../src/utils/videoDuration.js';

function makeMp4(seconds) {
  const mvhd = Buffer.alloc(108);
  mvhd.writeUInt32BE(mvhd.length, 0);
  mvhd.write('mvhd', 4);
  mvhd.writeUInt32BE(30_000, 20);
  mvhd.writeUInt32BE(seconds * 30_000, 24);

  const moov = Buffer.alloc(mvhd.length + 8);
  moov.writeUInt32BE(moov.length, 0);
  moov.write('moov', 4);
  mvhd.copy(moov, 8);

  const ftyp = Buffer.alloc(16);
  ftyp.writeUInt32BE(ftyp.length, 0);
  ftyp.write('ftyp', 4);
  ftyp.write('isom', 8);
  return Buffer.concat([ftyp, moov]);
}

function makeWebm(seconds) {
  const duration = Buffer.alloc(8);
  duration.writeDoubleBE(seconds * 1000);
  const durationElement = Buffer.concat([
    Buffer.from([0x44, 0x89, 0x88]),
    duration,
  ]);
  const timecodeScaleElement = Buffer.from([0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40]);
  const infoContent = Buffer.concat([timecodeScaleElement, durationElement]);
  const info = Buffer.concat([
    Buffer.from([0x15, 0x49, 0xa9, 0x66, 0x80 + infoContent.length]),
    infoContent,
  ]);
  return Buffer.concat([
    Buffer.from([0x18, 0x53, 0x80, 0x67, 0x80 + info.length]),
    info,
  ]);
}

async function withVideo(buffer, run) {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'video-duration-'));
  const filePath = path.join(folder, 'sample.mp4');
  try {
    await writeFile(filePath, buffer);
    return await run(filePath);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

test('reads MP4 duration metadata', async () => {
  await withVideo(makeMp4(8), async (filePath) => {
    assert.equal(await readVideoDurationSeconds(filePath), 8);
  });
});

test('reads WebM duration metadata', async () => {
  await withVideo(makeWebm(8.3), async (filePath) => {
    assert.equal(await readVideoDurationSeconds(filePath), 8.3);
  });
});

test('reports clips longer than the upload limit from their actual duration', async () => {
  await withVideo(makeMp4(16), async (filePath) => {
    assert.ok((await readVideoDurationSeconds(filePath)) > 15);
  });
});

test('rejects files without duration metadata', async () => {
  await withVideo(Buffer.from('not a video'), async (filePath) => {
    await assert.rejects(readVideoDurationSeconds(filePath), /metadata/i);
  });
});
