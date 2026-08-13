// Generates the Date & Time extension icon set (16/48/128 px) as PNG files.
// Dependency-free: encodes PNGs directly with node:zlib and node:fs.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'datetime-extension', 'icons')

// Brand colors: amber rounded square with a dark clock face and hands.
const BG = [232, 180, 90] // #e8b45a
const FG = [20, 21, 25] // #141519

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

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

function makePixel(size) {
  const half = size / 2
  const radius = size * 0.22
  const outer = size * 0.34 // clock ring outer radius
  const inner = size * 0.25 // clock ring inner radius
  const handHalf = Math.max(1, size * 0.035) // hand thickness
  const minuteLen = size * 0.15 // points to 3 o'clock
  const hourLen = size * 0.1 // points to 12 o'clock
  const dot = Math.max(1, size * 0.045)

  return (x, y) => {
    if (!inRoundedRect(x, y, size, radius)) return [0, 0, 0, 0]
    const px = x + 0.5
    const py = y + 0.5
    const d = Math.hypot(px - half, py - half)

    const inRing = d >= inner && d <= outer
    const onMinute = distToSegment(px, py, half, half, half + minuteLen, half) <= handHalf
    const onHour = distToSegment(px, py, half, half, half, half - hourLen) <= handHalf
    const onDot = d <= dot

    return inRing || onMinute || onHour || onDot ? [...FG, 255] : [...BG, 255]
  }
}

// --- Generate -------------------------------------------------------------
mkdirSync(outDir, { recursive: true })
for (const size of [16, 48, 128]) {
  const png = encodePng(size, makePixel(size))
  writeFileSync(join(outDir, `icon-${size}.png`), png)
  console.log(`wrote icon-${size}.png (${png.length} bytes)`)
}
