// Genera los iconos PNG de la PWA (fondo oscuro + marca ◉ cyan).
// Uso: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve("public/icons");
mkdirSync(OUT, { recursive: true });

// Colores del tema LifeOS
const BG = [10, 14, 20];      // --background
const CYAN = [34, 211, 238];  // --cyan
const RING = [56, 189, 248];  // --primary

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** PNG RGB de size×size: fondo BG, anillo RING y punto central CYAN. */
function makePng(size, { maskable = false } = {}) {
  const cx = size / 2;
  const outer = maskable ? size * 0.32 : size * 0.38; // radio del anillo
  const ringW = Math.max(2, size * 0.045);            // grosor del anillo
  const dot = size * 0.14;                            // radio del punto

  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 3 + 1);
    raw[rowStart] = 0; // filtro: none
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx + 0.5, y - cx + 0.5);
      let px = BG;
      if (d <= dot) px = CYAN;
      else if (d <= outer && d >= outer - ringW) px = RING;
      const i = rowStart + 1 + x * 3;
      raw[i] = px[0]; raw[i + 1] = px[1]; raw[i + 2] = px[2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  // compression/filter/interlace = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const icons = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["icon-maskable-512.png", 512, { maskable: true }],
  ["apple-touch-icon.png", 180, {}],
];

for (const [name, size, opts] of icons) {
  writeFileSync(resolve(OUT, name), makePng(size, opts));
  console.log(`[icons] ${name} (${size}×${size})`);
}
console.log("[icons] listo en public/icons");
