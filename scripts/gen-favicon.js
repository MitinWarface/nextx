// Generate minimal PNG favicon - no external deps needed
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xffffffff;
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
    table[n] = v;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makePNG(width, height, rgb) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0); // filter: none
    for (let x = 0; x < width; x++) {
      // Rounded rect with gradient
      const margin = Math.floor(width * 0.12);
      const cornerR = Math.floor(width * 0.22);
      const inRect = x >= margin && x < width - margin && y >= margin && y < height - margin;
      
      let inside = false;
      if (inRect) {
        const dx = Math.min(x - margin, width - margin - 1 - x);
        const dy = Math.min(y - margin, height - margin - 1 - y);
        if (dx >= cornerR || dy >= cornerR) inside = true;
        else if (dx * dx + dy * dy <= cornerR * cornerR) inside = true;
      }
      
      // Letter N region
      const letterMargin = Math.floor(width * 0.28);
      const letterW = Math.floor(width * 0.08);
      const nx = x - letterMargin;
      const ny = y - letterMargin;
      const letterSize = width - 2 * letterMargin;
      const inLetterArea = nx >= 0 && nx < letterSize && ny >= 0 && ny < letterSize;
      let isLetter = false;
      if (inLetterArea) {
        const t = ny / letterSize;
        const leftEdge = Math.floor(letterSize * 0.18);
        const rightEdge = Math.floor(letterSize * 0.82);
        const strokeW = Math.max(2, Math.floor(letterSize * 0.12));
        // Left vertical
        if (nx >= leftEdge && nx < leftEdge + strokeW) isLetter = true;
        // Right vertical
        if (nx >= rightEdge - strokeW && nx < rightEdge) isLetter = true;
        // Diagonal
        const diagX = leftEdge + (rightEdge - leftEdge) * t;
        if (Math.abs(nx - diagX) < strokeW * 0.7) isLetter = true;
      }
      
      const r = (rgb[0] * (x / width) + rgb[2] * (1 - x / width)) | 0;
      const g = (rgb[1] * (x / width) + rgb[3] * (1 - x / width)) | 0;
      const b = (rgb[4] * (x / width) + rgb[5] * (1 - x / width)) | 0;
      
      if (inside && !isLetter) {
        raw.push(r, g, b);
      } else if (inside && isLetter) {
        raw.push(255, 255, 255);
      } else {
        raw.push(0, 0, 0, 0); // transparent
        raw.pop(); raw.pop(); raw.pop(); raw.pop();
        raw.push(0, 0, 0);
      }
    }
  }
  
  const rawBuf = Buffer.from(raw);
  const compressed = zlib.deflateSync(rawBuf);
  
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const publicDir = path.join(__dirname, '..', 'public');

// Purple gradient: #6366f1 → #8b5cf6 (99,102,241 → 139,92,246)
const rgb = [99, 102, 241, 139, 92, 246];

const png192 = makePNG(192, 192, rgb);
const png512 = makePNG(512, 512, rgb);

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);
console.log(`Generated icon-192.png (${png192.length} bytes) and icon-512.png (${png512.length} bytes)`);
