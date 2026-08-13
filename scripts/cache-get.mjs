// Raw TCP ("telnet") client for a cache cluster that answers `get:<key>`.
// Usage: bun scripts/cache-get.mjs <host> <port> <key>
import net from 'node:net'

const [host = '127.0.0.1', port = '6379', key = ''] = process.argv.slice(2)

if (!key) {
  console.error('Usage: bun scripts/cache-get.mjs <host> <port> <key>')
  process.exit(1)
}

const sock = net.connect(Number(port), host)
sock.setEncoding('utf8')

sock.on('connect', () => sock.write(`get:${key}\r\n`))
sock.on('data', (d) => process.stdout.write(d))
sock.on('error', (e) => {
  console.error('\nERR:', e.message)
  process.exit(1)
})
sock.on('end', () => process.exit(0))

// These telnet-style protocols often keep the connection open after replying,
// so wait a moment for the reply to arrive, then close cleanly.
setTimeout(() => {
  sock.end()
  process.exit(0)
}, 3000)
