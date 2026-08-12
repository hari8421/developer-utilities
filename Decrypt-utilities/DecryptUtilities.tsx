import { useState } from 'react'

type CryptoMode = 'base64-encode' | 'base64-decode' | 'encrypt' | 'decrypt' | 'hash'
type Algorithm = 'AES-GCM' | 'AES-CBC'

type Notice = { kind: 'success' | 'error' | 'info'; title: string; detail: string }

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const initialText = 'Build tools that respect your data.'

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index])
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function concatBytes(...chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  chunks.forEach((chunk) => {
    result.set(chunk, offset)
    offset += chunk.length
  })
  return result
}

async function deriveAesKey(password: string, salt: BufferSource, algorithm: Algorithm, usages: KeyUsage[]) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120_000, hash: 'SHA-256' },
    material,
    { name: algorithm, length: 256 },
    false,
    usages,
  )
}

async function encryptText(value: string, password: string, algorithm: Algorithm) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(algorithm === 'AES-GCM' ? 12 : 16))
  const key = await deriveAesKey(password, salt, algorithm, ['encrypt'])
  const encrypted = algorithm === 'AES-GCM'
    ? await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(value))
    : await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, encoder.encode(value))
  return bytesToBase64(concatBytes(salt, iv, new Uint8Array(encrypted)))
}

async function decryptText(value: string, password: string, algorithm: Algorithm) {
  const packed = base64ToBytes(value)
  const ivLength = algorithm === 'AES-GCM' ? 12 : 16
  const minimumLength = 16 + ivLength + 1
  if (packed.length < minimumLength) throw new Error('This does not look like a JSON Forge encrypted payload.')
  const salt = packed.slice(0, 16)
  const iv = packed.slice(16, 16 + ivLength)
  const ciphertext = packed.slice(16 + ivLength)
  const key = await deriveAesKey(password, salt, algorithm, ['decrypt'])
  const decrypted = algorithm === 'AES-GCM'
    ? await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    : await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, ciphertext)
  return decoder.decode(decrypted)
}

function modeLabel(mode: CryptoMode) {
  if (mode === 'base64-encode') return 'Base64 encode'
  if (mode === 'base64-decode') return 'Base64 decode'
  if (mode === 'encrypt') return 'Encrypt'
  if (mode === 'decrypt') return 'Decrypt'
  return 'SHA-256 hash'
}

function CryptoGlyph({ children }: { children: string }) {
  return <span className="crypto-glyph" aria-hidden="true">{children}</span>
}

function DecryptUtilities({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<CryptoMode>('base64-encode')
  const [algorithm, setAlgorithm] = useState<Algorithm>('AES-GCM')
  const [input, setInput] = useState(initialText)
  const [secret, setSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [output, setOutput] = useState('')
  const [notice, setNotice] = useState<Notice>({ kind: 'info', title: 'Ready for a payload', detail: 'Choose a utility, then run it locally in your browser.' })
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const needsSecret = mode === 'encrypt' || mode === 'decrypt'
  const isBase64 = mode === 'base64-encode' || mode === 'base64-decode'
  const inputLabel = mode === 'base64-decode' || mode === 'decrypt' ? 'Encoded payload' : 'Plaintext input'

  const chooseMode = (nextMode: CryptoMode) => {
    setMode(nextMode)
    setOutput('')
    setNotice({ kind: 'info', title: `${modeLabel(nextMode)} selected`, detail: nextMode === 'hash' ? 'Hashing is one-way and does not require a key.' : 'Your input stays in this browser tab.' })
  }

  const run = async () => {
    if (!input.trim()) {
      setNotice({ kind: 'error', title: 'Input is empty', detail: 'Add text or an encoded payload before running this utility.' })
      return
    }
    if (needsSecret && !secret) {
      setNotice({ kind: 'error', title: 'Key or password required', detail: `${algorithm} uses your passphrase through PBKDF2 key derivation.` })
      return
    }
    setBusy(true)
    try {
      let nextOutput = ''
      let detail = ''
      if (mode === 'base64-encode') {
        nextOutput = bytesToBase64(encoder.encode(input))
        detail = 'UTF-8 text converted to Base64.'
      } else if (mode === 'base64-decode') {
        nextOutput = decoder.decode(base64ToBytes(input))
        detail = 'Base64 decoded as UTF-8 text.'
      } else if (mode === 'encrypt') {
        if (!crypto.subtle) throw new Error('Web Crypto is unavailable in this browser context.')
        nextOutput = await encryptText(input, secret, algorithm)
        detail = `${algorithm} encrypted payload with a generated salt and IV packaged into the result.`
      } else if (mode === 'decrypt') {
        if (!crypto.subtle) throw new Error('Web Crypto is unavailable in this browser context.')
        nextOutput = await decryptText(input, secret, algorithm)
        detail = `${algorithm} decrypted the payload using the supplied key or password.`
      } else {
        if (!crypto.subtle) throw new Error('Web Crypto is unavailable in this browser context.')
        const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input))
        nextOutput = bytesToHex(new Uint8Array(digest))
        detail = 'SHA-256 digest generated as lowercase hexadecimal.'
      }
      setOutput(nextOutput)
      setNotice({ kind: 'success', title: `${modeLabel(mode)} complete`, detail })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'The operation could not be completed.'
      setOutput('')
      setNotice({ kind: 'error', title: 'Operation failed', detail: mode === 'decrypt' ? `${detail} Check the algorithm and key/password.` : detail })
    } finally {
      setBusy(false)
    }
  }

  const copyOutput = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const clearAll = () => {
    setInput('')
    setSecret('')
    setOutput('')
    setNotice({ kind: 'info', title: 'Cleared', detail: 'The utility is ready for a new payload.' })
  }

  return (
    <div className="crypto-shell">
      <div className="crypto-glow glow-a" />
      <div className="crypto-glow glow-b" />
      <header className="crypto-topbar">
        <button className="crypto-back" onClick={onBack} type="button"><span className="crypto-back-arrow" aria-hidden="true">←</span><span className="crypto-back-label">Back to JSON Forge</span></button>
        <div className="crypto-brand" aria-label="Developer utilities"><span className="crypto-brand-mark">⌘</span><span>developer<span>utilities</span></span></div>
        <div className="crypto-breadcrumb"><span>TOOLS</span><i>/</i><strong>DECRYPT-UTILITIES</strong></div>
        <div className="crypto-local"><span /> browser-only</div>
      </header>

      <main className="crypto-main">
        <section className="crypto-hero">
          <div>
            <div className="crypto-eyebrow"><CryptoGlyph>⌁</CryptoGlyph> Secure utility desk</div>
            <h1>Encode less.<br /><em>Understand more.</em></h1>
            <p>Small, deliberate tools for the strings that sit between systems. Encode, encrypt, decrypt, and hash without handing your payload to another service.</p>
          </div>
          <div className="crypto-hero-stats"><div><strong>0</strong><span>uploads</span></div><div><strong>5</strong><span>utilities</span></div><div><strong>256</strong><span>bit AES</span></div></div>
        </section>

        <section className="crypto-workspace">
          <aside className="crypto-sidebar">
            <div className="crypto-sidebar-label">CHOOSE A UTILITY</div>
            <button className={mode === 'base64-encode' ? 'crypto-nav active' : 'crypto-nav'} onClick={() => chooseMode('base64-encode')}><CryptoGlyph>⇥</CryptoGlyph><span><strong>Base64 encode</strong><small>text → safe string</small></span></button>
            <button className={mode === 'base64-decode' ? 'crypto-nav active' : 'crypto-nav'} onClick={() => chooseMode('base64-decode')}><CryptoGlyph>⇤</CryptoGlyph><span><strong>Base64 decode</strong><small>safe string → text</small></span></button>
            <div className="crypto-sidebar-divider" />
            <button className={mode === 'encrypt' ? 'crypto-nav active' : 'crypto-nav'} onClick={() => chooseMode('encrypt')}><CryptoGlyph>✦</CryptoGlyph><span><strong>Encrypt payload</strong><small>AES-GCM or AES-CBC</small></span><b>KEY</b></button>
            <button className={mode === 'decrypt' ? 'crypto-nav active' : 'crypto-nav'} onClick={() => chooseMode('decrypt')}><CryptoGlyph>⌁</CryptoGlyph><span><strong>Decrypt payload</strong><small>reverse AES locally</small></span><b>KEY</b></button>
            <div className="crypto-sidebar-divider" />
            <button className={mode === 'hash' ? 'crypto-nav active' : 'crypto-nav'} onClick={() => chooseMode('hash')}><CryptoGlyph>#</CryptoGlyph><span><strong>SHA-256 hash</strong><small>one-way fingerprint</small></span></button>
            <div className="crypto-sidebar-bottom"><span className="crypto-lock">▣</span><strong>Private by design</strong><p>Nothing leaves this tab. AES salts and IVs are generated with the browser's secure random source.</p></div>
          </aside>

          <div className="crypto-panel">
            <div className="crypto-panel-header"><div><span className="crypto-panel-kicker">CURRENT UTILITY</span><h2>{modeLabel(mode)}</h2></div><button className="crypto-clear" onClick={clearAll}>Clear all</button></div>
            <div className="crypto-input-grid">
              <div className="crypto-field"><div className="crypto-field-label"><label htmlFor="crypto-input">{inputLabel}</label><span>{new TextEncoder().encode(input).length} bytes</span></div><textarea id="crypto-input" value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} placeholder={mode === 'base64-decode' || mode === 'decrypt' ? 'Paste an encoded payload here…' : 'Type or paste text here…'} /></div>
              <div className="crypto-side-controls">
                {isBase64 && <div className="crypto-info-card"><CryptoGlyph>i</CryptoGlyph><p>Base64 is an encoding format, not encryption. Use AES when the payload must stay secret.</p></div>}
                {needsSecret && <div className="crypto-secret-field"><div className="crypto-field-label"><label htmlFor="crypto-secret">Key / password</label><span>never stored</span></div><div className="secret-input"><input id="crypto-secret" type={showSecret ? 'text' : 'password'} value={secret} onChange={(event) => setSecret(event.target.value)} placeholder="Enter a strong passphrase" /><button onClick={() => setShowSecret((visible) => !visible)}>{showSecret ? 'hide' : 'show'}</button></div><small>PBKDF2 · 120,000 rounds · SHA-256</small></div>}
                {(mode === 'encrypt' || mode === 'decrypt') && <div className="algorithm-field"><label htmlFor="algorithm">Cipher algorithm</label><select id="algorithm" value={algorithm} onChange={(event) => setAlgorithm(event.target.value as Algorithm)}><option value="AES-GCM">AES-GCM (recommended)</option><option value="AES-CBC">AES-CBC (compatibility)</option></select></div>}
              </div>
            </div>
            <div className="crypto-run-row"><button className="crypto-run" onClick={run} disabled={busy}><span>{busy ? 'Working…' : modeLabel(mode)}</span><span className="run-arrow">→</span></button><span className="crypto-shortcut"><kbd>⌘</kbd><kbd>↵</kbd> run utility</span></div>
            <div className={`crypto-notice ${notice.kind}`}><span className="notice-symbol">{notice.kind === 'success' ? '✓' : notice.kind === 'error' ? '!' : 'i'}</span><span><strong>{notice.title}</strong><small>{notice.detail}</small></span></div>
            <div className="crypto-output"><div className="crypto-output-header"><div><span className="crypto-panel-kicker">RESULT</span><span className="output-type">{output ? (mode === 'hash' ? 'HEX' : mode.includes('base64') || mode === 'encrypt' ? 'BASE64' : 'TEXT') : 'WAITING'}</span></div><div className="crypto-output-actions"><button onClick={copyOutput} disabled={!output}>{copied ? 'Copied ✓' : 'Copy'}</button></div></div><pre className={output ? '' : 'empty-output'}>{output || 'Your result will appear here.'}</pre></div>
          </div>
        </section>

        <section className="crypto-notes"><article><span>01</span><div><h3>Encoding is not encryption</h3><p>Base64 makes binary or Unicode data transport-safe, but anyone can decode it. Reach for AES when confidentiality matters.</p></div></article><article><span>02</span><div><h3>Password in, key out</h3><p>AES modes derive a 256-bit key from your password using PBKDF2. Every encryption gets a fresh salt and IV.</p></div></article><article><span>03</span><div><h3>Decryption needs the recipe</h3><p>Use the same algorithm and password used for encryption. JSON Forge packages the salt and IV into the Base64 result automatically.</p></div></article></section>
      </main>
      <footer className="crypto-footer"><button onClick={onBack}>← JSON Forge</button><span>Browser-native Web Crypto · no server · no account</span><span>developer-utilities / decrypt-utilities</span></footer>
    </div>
  )
}

export default DecryptUtilities
