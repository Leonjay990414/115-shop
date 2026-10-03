const fs = require('fs');
const zlib = require('zlib');

function createPng(width, height, renderFn) {
  // RGBA buffer: 4 bytes per pixel
  const rowSize = width * 4;
  const rawData = Buffer.alloc((rowSize + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowSize + 1);
    rawData[rowStart] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderFn(x, y, width, height);
      const pixelStart = rowStart + 1 + x * 4;
      rawData[pixelStart] = r;
      rawData[pixelStart + 1] = g;
      rawData[pixelStart + 2] = b;
      rawData[pixelStart + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression method
  ihdr[11] = 0; // Filter method
  ihdr[12] = 0; // Interlace method

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crc = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// 7x10 pixel font for "115"
// Each digit is defined on a 5x9 grid
const DIGITS = {
  '1': [
    [0,1,1,0,0],
    [1,1,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [1,1,1,1,1],
    [1,1,1,1,1]
  ],
  '5': [
    [1,1,1,1,1],
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [1,1,1,1,0],
    [1,1,1,0,0]
  ]
};

function renderLogo(x, y, w, h, isRound = false) {
  const nx = x / w;
  const ny = y / h;
  const cx = 0.5;
  const cy = 0.5;
  const dx = nx - cx;
  const dy = ny - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background clipping
  if (isRound) {
    if (dist > 0.49) return [0, 0, 0, 0]; // Transparent outside circle
  } else {
    // Rounded rect squircle
    const cornerR = 0.22;
    const clampedX = Math.max(Math.abs(dx) - (0.5 - cornerR), 0);
    const clampedY = Math.max(Math.abs(dy) - (0.5 - cornerR), 0);
    const cornerDist = Math.sqrt(clampedX * clampedX + clampedY * clampedY);
    if (cornerDist > cornerR) return [0, 0, 0, 0];
  }

  // Vibrant gradient from #fb923c (orange) -> #f472b6 (pink) -> #38bdf8 (sky blue) -> #6366f1 (indigo)
  // Matching CSS: linear-gradient(135deg, #fb923c, #f472b6, #38bdf8, #fb923c)
  const t = (nx + ny) / 2;
  let bgR, bgG, bgB;
  if (t < 0.35) {
    const k = t / 0.35;
    bgR = Math.round(251 + (244 - 251) * k);
    bgG = Math.round(146 + (114 - 146) * k);
    bgB = Math.round(60 + (182 - 60) * k);
  } else if (t < 0.7) {
    const k = (t - 0.35) / 0.35;
    bgR = Math.round(244 + (56 - 244) * k);
    bgG = Math.round(114 + (189 - 114) * k);
    bgB = Math.round(182 + (248 - 182) * k);
  } else {
    const k = (t - 0.7) / 0.3;
    bgR = Math.round(56 + (99 - 56) * k);
    bgG = Math.round(189 + (102 - 189) * k);
    bgB = Math.round(248 + (241 - 248) * k);
  }

  // Subtle inner border highlight
  if (dist > 0.44 && dist <= 0.48 && isRound) {
    bgR = Math.min(255, bgR + 30);
    bgG = Math.min(255, bgG + 30);
    bgB = Math.min(255, bgB + 30);
  }

  // Draw "115"
  // Layout 3 digits: '1', '1', '5'
  // Grid size: each digit is 5x9 cells.
  // Digit spacing: width = 5, spacing = 2. Total width for 3 digits = 5*3 + 2*2 = 19 units. Height = 9 units.
  // Place in central bounding box:
  // Center is (0.5, 0.45)
  const scale = 0.027; // each unit in relative coords
  const totalW = 19 * scale;
  const totalH = 9 * scale;
  const startX = cx - totalW / 2;
  const startY = 0.42 - totalH / 2;

  let inText = false;
  let isShadow = false;

  const checkPixel = (testNx, testNy) => {
    if (testNx < startX || testNx >= startX + totalW || testNy < startY || testNy >= startY + totalH) {
      return false;
    }
    const relX = (testNx - startX) / scale;
    const relY = (testNy - startY) / scale;
    const cellY = Math.floor(relY);
    if (cellY < 0 || cellY >= 9) return false;

    // Check digit 1: cols 0..4
    if (relX >= 0 && relX < 5) {
      return DIGITS['1'][cellY][Math.floor(relX)] === 1;
    }
    // Check digit 2: cols 7..11
    if (relX >= 7 && relX < 12) {
      return DIGITS['1'][cellY][Math.floor(relX - 7)] === 1;
    }
    // Check digit 3: cols 14..18
    if (relX >= 14 && relX < 19) {
      return DIGITS['5'][cellY][Math.floor(relX - 14)] === 1;
    }
    return false;
  };

  inText = checkPixel(nx, ny);
  if (!inText) {
    isShadow = checkPixel(nx - 0.015, ny - 0.015);
  }

  // Draw banner bar / star at bottom
  // A small white bar/badge with "ZG" under 115
  const barY = 0.72;
  const barH = 0.08;
  const barW = 0.55;
  const inBar = (Math.abs(nx - cx) <= barW / 2) && (Math.abs(ny - barY) <= barH / 2);

  if (inText) {
    // Crisp White with slight warm sheen
    return [255, 255, 255, 255];
  } else if (isShadow) {
    // Drop shadow behind text
    return [
      Math.max(0, Math.floor(bgR * 0.55)),
      Math.max(0, Math.floor(bgG * 0.55)),
      Math.max(0, Math.floor(bgB * 0.55)),
      255
    ];
  } else if (inBar) {
    // Gold ribbon banner
    return [254, 240, 138, 255]; // Yellow gold #fef08a
  }

  return [bgR, bgG, bgB, 255];
}

module.exports = { createPng, renderLogo };
