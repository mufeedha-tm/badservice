import { readFile } from 'node:fs/promises';

const MP4_FAMILY_BRANDS = new Set(['isom', 'iso2', 'iso5', 'iso6', 'mp41', 'mp42', 'M4V ', 'qt  ', '3gp4', '3gp5']);
const EBML_SEGMENT_ID = 0x18538067;
const EBML_INFO_ID = 0x1549a966;
const EBML_DURATION_ID = 0x4489;
const EBML_TIMECODE_SCALE_ID = 0x2ad7b1;

export class VideoMetadataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VideoMetadataError';
  }
}

export async function readVideoDurationSeconds(filePath) {
  const buffer = await readFile(filePath);
  const duration = buffer.subarray(4, 8).toString('ascii') === 'ftyp'
    ? readMp4Duration(buffer)
    : readWebmDuration(buffer);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new VideoMetadataError('Video duration metadata is unavailable or invalid.');
  }
  return duration;
}

function readMp4Duration(buffer) {
  const moov = findChildBox(buffer, 0, buffer.length, 'moov');
  if (!moov) throw new VideoMetadataError('MP4 metadata is unavailable.');
  const mvhd = findChildBox(buffer, moov.start, moov.end, 'mvhd');
  if (!mvhd) throw new VideoMetadataError('MP4 duration metadata is unavailable.');

  const version = buffer[mvhd.start];
  const timescaleOffset = mvhd.start + (version === 1 ? 20 : 12);
  const durationOffset = mvhd.start + (version === 1 ? 24 : 16);
  if (version !== 0 && version !== 1) throw new VideoMetadataError('MP4 duration metadata version is unsupported.');

  const timescale = buffer.readUInt32BE(timescaleOffset);
  const duration = version === 1
    ? Number(buffer.readBigUInt64BE(durationOffset))
    : buffer.readUInt32BE(durationOffset);
  if (timescale === 0) throw new VideoMetadataError('MP4 timescale is invalid.');
  return duration / timescale;
}

function findChildBox(buffer, start, end, targetType) {
  let offset = start;
  while (offset + 8 <= end) {
    let size = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    let headerSize = 8;

    if (size === 1) {
      if (offset + 16 > end) return null;
      const largeSize = buffer.readBigUInt64BE(offset + 8);
      if (largeSize > BigInt(Number.MAX_SAFE_INTEGER)) return null;
      size = Number(largeSize);
      headerSize = 16;
    } else if (size === 0) {
      size = end - offset;
    }

    if (size < headerSize || offset + size > end) return null;
    const contentStart = offset + headerSize;
    const boxEnd = offset + size;
    if (type === targetType) return { start: contentStart, end: boxEnd };
    if (type === 'moov') {
      const nested = findChildBox(buffer, contentStart, boxEnd, targetType);
      if (nested) return nested;
    }
    offset = boxEnd;
  }
  return null;
}

function readWebmDuration(buffer) {
  const scaleAndDuration = { timecodeScale: 1_000_000, duration: null };
  readEbmlElements(buffer, 0, buffer.length, scaleAndDuration, true);
  if (scaleAndDuration.duration === null) throw new VideoMetadataError('WebM duration metadata is unavailable.');
  return (scaleAndDuration.duration * scaleAndDuration.timecodeScale) / 1_000_000_000;
}

function readEbmlElements(buffer, start, end, metadata, mayDescend) {
  let offset = start;
  while (offset < end) {
    const id = readVint(buffer, offset, true);
    if (!id) return;
    const size = readVint(buffer, id.next, false);
    if (!size) return;
    const contentStart = size.next;
    const contentEnd = size.unknown ? end : contentStart + size.value;
    if (contentEnd > end || contentEnd < contentStart) return;

    if (id.value === EBML_INFO_ID) {
      readEbmlInfo(buffer, contentStart, contentEnd, metadata);
    } else if (mayDescend && id.value === EBML_SEGMENT_ID) {
      readEbmlElements(buffer, contentStart, contentEnd, metadata, false);
    }
    offset = contentEnd;
  }
}

function readEbmlInfo(buffer, start, end, metadata) {
  let offset = start;
  while (offset < end) {
    const id = readVint(buffer, offset, true);
    if (!id) return;
    const size = readVint(buffer, id.next, false);
    if (!size || size.unknown) return;
    const contentStart = size.next;
    const contentEnd = contentStart + size.value;
    if (contentEnd > end || contentEnd < contentStart) return;

    if (id.value === EBML_TIMECODE_SCALE_ID && size.value > 0 && size.value <= 8) {
      metadata.timecodeScale = readUnsignedInteger(buffer, contentStart, size.value);
    } else if (id.value === EBML_DURATION_ID && (size.value === 4 || size.value === 8)) {
      metadata.duration = size.value === 4
        ? buffer.readFloatBE(contentStart)
        : buffer.readDoubleBE(contentStart);
    }
    offset = contentEnd;
  }
}

function readUnsignedInteger(buffer, offset, length) {
  let value = 0;
  for (let index = 0; index < length; index += 1) {
    value = (value * 256) + buffer[offset + index];
  }
  return value;
}

function readVint(buffer, offset, isId) {
  if (offset >= buffer.length) return null;
  const firstByte = buffer[offset];
  let marker = 0x80;
  let length = 1;
  while (length <= 8 && !(firstByte & marker)) {
    marker >>= 1;
    length += 1;
  }
  if (length > 8 || offset + length > buffer.length) return null;

  let value = isId ? firstByte : firstByte & (marker - 1);
  for (let index = 1; index < length; index += 1) {
    value = (value * 256) + buffer[offset + index];
  }
  const unknown = !isId && value === (2 ** (7 * length)) - 1;
  return { value, unknown, next: offset + length };
}
