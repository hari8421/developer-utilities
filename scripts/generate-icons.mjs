// Generates the browser-extension icon set (16/48/128 px) as PNG files.
// Dependency-free: encodes PNGs directly with node:zlib and node:fs.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'extension', 'icons')

// Brand colors: teal rounded square with a dark curly-brace mark.
const BG = [115, 214, 193] // #73d6c1
const FG = [16, 32, 39] // #102027

// --- Minimal PNG encoder --------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let crc = -1
  for (let i = 0; i < buf.length; i += 1) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(size, pixel) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0 // filter type: none
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(x, y)
      const o = y * stride + 1 + x * 4
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
      raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// --- Drawing helpers ------------------------------------------------------
function inRoundedRect(x, y, size, radius) {
  const px = x + 0.5
  const py = y + 0.5
  const half = size / 2
  const inner = half - radius
  const dx = Math.max(Math.abs(px - half) - inner, 0)
  const dy = Math.max(Math.abs(py - half) - inner, 0)
  return Math.sqrt(dx * dx + dy * dy) <= radius
}

// 5x7 curly-brace bitmaps (1 = filled).
const BRACE_LEFT = ['01100', '01000', '01000', '11000', '01000', '01000', '01100'].map((row) => [...row].map((c) => c === '1'))
const BRACE_RIGHT = ['00110', '00010', '00010', '00011', '00010', '00010', '00110'].map((row) => [...row].map((c) => c === '1'))

function glyphAt(x, y, gx, gy, scale, glyph) {
  const col = Math.floor((x - gx) / scale)
  const row = Math.floor((y - gy) / scale)
  if (col < 0 || col >= 5 || row < 0 || row >= 7) return false
  return glyph[row][col]
}

function makePixel(size) {
  const radius = size * 0.22
  const scale = Math.max(1, Math.floor(size / 14))
  const glyphW = 5 * scale
  const glyphH = 7 * scale
  const gap = scale
  const startX = Math.floor((size - (glyphW * 2 + gap)) / 2)
  const startY = Math.floor((size - glyphH) / 2)

  return (x, y) => {
    if (!inRoundedRect(x, y, size, radius)) return [0, 0, 0, 0]
    const onLeft = glyphAt(x, y, startX, startY, scale, BRACE_LEFT)
    const onRight = glyphAt(x, y, startX + glyphW + gap, startY, scale, BRACE_RIGHT)
    return onLeft || onRight ? [...FG, 255] : [...BG, 255]
  }
}

// --- Generate -------------------------------------------------------------
mkdirSync(outDir, { recursive: true })
for (const size of [16, 48, 128]) {
  const png = encodePng(size, makePixel(size))
  writeFileSync(join(outDir, `icon-${size}.png`), png)
  console.log(`wrote icon-${size}.png (${png.length} bytes)`)
}
