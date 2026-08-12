import { useMemo, useState } from 'react'

type IconName =
  | 'spark'
  | 'braces'
  | 'check'
  | 'copy'
  | 'download'
  | 'format'
  | 'minify'
  | 'sort'
  | 'encode'
  | 'compare'
  | 'refresh'
  | 'arrow'
  | 'shield'
  | 'book'
  | 'terminal'
  | 'chevron'
  | 'x'
  | 'upload'

type Operation = 'format' | 'minify' | 'sort' | 'validate' | 'encode' | 'decode'
type Mode = 'workbench' | 'compare'
type Notice = { kind: 'success' | 'error' | 'info'; title: string; detail?: string }
type Difference = { path: string; kind: 'changed' | 'added' | 'removed'; left?: string; right?: string }
type CompareResult = {
  same: number
  changed: number
  added: number
  removed: number
  differences: Difference[]
}

const sampleJson = `{
  "service": "checkout-api",
  "version": "2.4.1",
  "healthy": true,
  "owners": ["platform", "payments"],
  "limits": {
    "timeoutMs": 3500,
    "retries": 3,
    "burst": null
  },
  "regions": [
    { "name": "us-east-1", "latencyMs": 42 },
    { "name": "eu-west-1", "latencyMs": 88 }
  ]
}`

const samples: Record<string, string> = {
  'API response': sampleJson,
  'Feature flags': `{
  "release": "spring-cleanup",
  "flags": {
    "newNavigation": true,
    "commandPalette": true,
    "bulkExport": false
  },
  "rollout": 25
}`,
  'Package config': `{
  "name": "tiny-service",
  "private": true,
  "scripts": {
    "dev": "node server.js",
    "test": "vitest run"
  },
  "engines": { "node": ">=20" }
}`,
}

const iconPaths: Record<IconName, string[]> = {
  spark: ['M12 3l1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3z', 'M19 15l.6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6L19 15z'],
  braces: ['M8 4H6.8A1.8 1.8 0 005 5.8v4.4A1.8 1.8 0 013.2 12 1.8 1.8 0 005 13.8v4.4A1.8 1.8 0 006.8 20H8', 'M16 4h1.2A1.8 1.8 0 0119 5.8v4.4a1.8 1.8 0 001.8 1.8 1.8 1.8 0 00-1.8 1.8v4.4a1.8 1.8 0 01-1.8 1.8H16', 'M9 9h6M9 13h6'],
  check: ['M5 12.5l4.2 4L19 7'],
  copy: ['M8 8V6.8A1.8 1.8 0 019.8 5h8.4A1.8 1.8 0 0120 6.8v8.4a1.8 1.8 0 01-1.8 1.8H17', 'M14.2 8H5.8A1.8 1.8 0 004 9.8v8.4A1.8 1.8 0 005.8 20h8.4a1.8 1.8 0 001.8-1.8V9.8A1.8 1.8 0 0014.2 8z'],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M4 20h16'],
  format: ['M4 6h16M4 12h16M4 18h10', 'M7 4v16'],
  minify: ['M5 5l14 14M19 5L5 19', 'M4 12h16'],
  sort: ['M8 6h12M8 12h8M8 18h4', 'M4 4v16M2 7l2-3 2 3M2 17l2 3 2-3'],
  encode: ['M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16'],
  compare: ['M4 7h16M4 17h16', 'M8 4l-4 3 4 3M16 14l4 3-4 3'],
  refresh: ['M20 11a8 8 0 00-14.9-3.9L4 9', 'M4 5v4h4', 'M4 13a8 8 0 0014.9 3.9L20 15', 'M20 19v-4h-4'],
  arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  shield: ['M12 3l7 3v5c0 4.6-3 8.2-7 10-4-1.8-7-5.4-7-10V6l7-3z', 'M9 12l2 2 4-4'],
  book: ['M4 5.5A2.5 2.5 0 016.5 3H20v16H6.5A2.5 2.5 0 014 16.5v-11z', 'M4 16.5A2.5 2.5 0 016.5 14H20', 'M8 7h7M8 10h5'],
  terminal: ['M4 5h16v14H4z', 'M7 9l3 3-3 3M13 15h4'],
  chevron: ['M7 10l5 5 5-5'],
  x: ['M6 6l12 12M18 6L6 18'],
  upload: ['M12 16V4', 'M8 8l4-4 4 4', 'M5 15v4h14v-4'],
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[name].map((path, index) => <path key={`${name}-${index}`} d={path} />)}
    </svg>
  )
}

function valueType(value: unknown) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function measureJson(value: unknown): { keys: number; nodes: number; depth: number } {
  if (Array.isArray(value)) {
    const children = value.map(measureJson)
    return {
      keys: 0,
      nodes: 1 + children.reduce((sum, child) => sum + child.nodes, 0),
      depth: children.length ? 1 + Math.max(...children.map((child) => child.depth)) : 1,
    }
  }
  if (value && typeof value === 'object') {
    const children = Object.values(value).map(measureJson)
    return {
      keys: Object.keys(value).length + children.reduce((sum, child) => sum + child.keys, 0),
      nodes: 1 + children.reduce((sum, child) => sum + child.nodes, 0),
      depth: children.length ? 1 + Math.max(...children.map((child) => child.depth)) : 1,
    }
  }
  return { keys: 0, nodes: 1, depth: 0 }
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortKeys(child)]),
    )
  }
  return value
}

function printable(value: unknown) {
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function compareJson(left: unknown, right: unknown, path = '$', differences: Difference[] = []): CompareResult {
  if (Object.is(left, right)) return { same: 1, changed: 0, added: 0, removed: 0, differences }
  if (left === undefined) {
    differences.push({ path, kind: 'added', right: printable(right) })
    return { same: 0, changed: 0, added: 1, removed: 0, differences }
  }
  if (right === undefined) {
    differences.push({ path, kind: 'removed', left: printable(left) })
    return { same: 0, changed: 0, added: 0, removed: 1, differences }
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    const result = { same: 0, changed: 0, added: 0, removed: 0, differences }
    const length = Math.max(left.length, right.length)
    for (let index = 0; index < length; index += 1) {
      const item = compareJson(left[index], right[index], `${path}[${index}]`, differences)
      result.same += item.same
      result.changed += item.changed
      result.added += item.added
      result.removed += item.removed
    }
    return result
  }
  if (left && right && typeof left === 'object' && typeof right === 'object' && !Array.isArray(left) && !Array.isArray(right)) {
    const result = { same: 0, changed: 0, added: 0, removed: 0, differences }
    const keys = new Set([...Object.keys(left), ...Object.keys(right)])
    keys.forEach((key) => {
      const item = compareJson((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key], path === '$' ? `$.${key}` : `${path}.${key}`, differences)
      result.same += item.same
      result.changed += item.changed
      result.added += item.added
      result.removed += item.removed
    })
    return result
  }
  differences.push({ path, kind: 'changed', left: printable(left), right: printable(right) })
  return { same: 0, changed: 1, added: 0, removed: 0, differences }
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  return `${(value / 1024).toFixed(1)} KB`
}

function JsonWorkbench({ onOpenDecrypt }: { onOpenDecrypt: () => void }) {
  const [mode, setMode] = useState<Mode>('workbench')
  const [operation, setOperation] = useState<Operation>('format')
  const [input, setInput] = useState(sampleJson)
  const [compareInput, setCompareInput] = useState(sampleJson.replace('2.4.1', '2.5.0').replace('"burst": null', '"burst": 10'))
  const [output, setOutput] = useState(() => JSON.stringify(JSON.parse(sampleJson), null, 2))
  const [notice, setNotice] = useState<Notice | null>({ kind: 'success', title: 'JSON is valid', detail: 'Ready for your next operation.' })
  const [copied, setCopied] = useState(false)
  const [selectedSample, setSelectedSample] = useState('API response')
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null)

  const stats = useMemo(() => {
    try {
      const parsed = JSON.parse(input) as unknown
      return { valid: true, ...measureJson(parsed), type: valueType(parsed) }
    } catch {
      return { valid: false, keys: 0, nodes: 0, depth: 0, type: 'unknown' }
    }
  }, [input])

  const inputLines = input.split('\n').length
  const outputLines = output ? output.split('\n').length : 0

  const runOperation = (nextOperation: Operation = operation) => {
    try {
      const parsed = JSON.parse(input) as unknown
      let nextOutput = ''
      let title = ''
      let detail = ''
      if (nextOperation === 'format') {
        nextOutput = JSON.stringify(parsed, null, 2)
        title = 'JSON formatted'
        detail = 'Readable indentation applied.'
      } else if (nextOperation === 'minify') {
        nextOutput = JSON.stringify(parsed)
        title = 'JSON minified'
        detail = 'Whitespace removed from the payload.'
      } else if (nextOperation === 'sort') {
        nextOutput = JSON.stringify(sortKeys(parsed), null, 2)
        title = 'Keys sorted'
        detail = 'Object keys sorted alphabetically at every level.'
      } else if (nextOperation === 'validate') {
        nextOutput = JSON.stringify({ valid: true, type: valueType(parsed), keys: measureJson(parsed).keys }, null, 2)
        title = 'JSON is valid'
        detail = `Parsed successfully as ${valueType(parsed)}.`
      } else if (nextOperation === 'encode') {
        nextOutput = JSON.stringify(input)
        title = 'String escaped'
        detail = 'The document is now safe to embed as a JSON string.'
      } else {
        const decoded = JSON.parse(input) as unknown
        if (typeof decoded !== 'string') throw new Error('Unescape expects a quoted JSON string.')
        nextOutput = decoded
        title = 'String unescaped'
        detail = 'Escape sequences have been resolved.'
      }
      setOutput(nextOutput)
      setNotice({ kind: 'success', title, detail })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'The input could not be parsed.'
      setNotice({ kind: 'error', title: 'JSON needs attention', detail: reason })
      setOutput('')
    }
  }

  const loadSample = (name: string) => {
    setSelectedSample(name)
    setInput(samples[name])
    setOutput(JSON.stringify(JSON.parse(samples[name]), null, 2))
    setNotice({ kind: 'success', title: `${name} loaded`, detail: 'Sample data is ready to edit.' })
  }

  const handleCopy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const handleDownload = () => {
    if (!output) return
    const blob = new Blob([output], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'json-forge-output.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleCompare = () => {
    try {
      const result = compareJson(JSON.parse(input), JSON.parse(compareInput))
      setCompareResult(result)
      setNotice({ kind: 'success', title: result.differences.length ? 'Differences found' : 'Documents match', detail: `${result.differences.length} difference${result.differences.length === 1 ? '' : 's'} across both documents.` })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Both documents must contain valid JSON.'
      setNotice({ kind: 'error', title: 'Comparison paused', detail: reason })
      setCompareResult(null)
    }
  }

  const reset = () => {
    setInput(sampleJson)
    setOutput(JSON.stringify(JSON.parse(sampleJson), null, 2))
    setOperation('format')
    setNotice({ kind: 'info', title: 'Workbench reset', detail: 'Back to the starter API response.' })
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="JSON Forge home">
          <span className="brand-mark"><Icon name="braces" size={20} /></span>
          <span>json<span className="brand-accent">forge</span></span>
          <span className="beta-tag">BETA</span>
        </a>
        <nav className="topnav" aria-label="Main navigation">
          <button className={mode === 'workbench' ? 'nav-link active' : 'nav-link'} onClick={() => setMode('workbench')}><Icon name="terminal" size={15} /> Workbench</button>
          <button className={mode === 'compare' ? 'nav-link active' : 'nav-link'} onClick={() => setMode('compare')}><Icon name="compare" size={15} /> Compare</button>
          <button className="nav-link" onClick={onOpenDecrypt}><Icon name="shield" size={15} /> Decrypt utilities</button>
          <a className="nav-link" href="#guide"><Icon name="book" size={15} /> Field guide</a>
        </nav>
        <div className="topbar-end"><span className="local-dot" /> 100% local <button className="icon-button" title="Reset workbench" onClick={reset}><Icon name="refresh" size={16} /></button></div>
      </header>

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <div className="eyebrow"><Icon name="spark" size={14} /> A calmer JSON workflow</div>
            <h1>Make JSON feel<br /><em>less like a chore.</em></h1>
            <p className="hero-subtitle">Validate, reshape, compare, and ship clean JSON without leaving your browser. Built for the moments between “it should work” and “why is this undefined?”</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => { setMode('workbench'); document.getElementById('workbench')?.scrollIntoView({ behavior: 'smooth' }) }}>Open the workbench <Icon name="arrow" size={16} /></button>
              <span className="shortcut"><kbd>⌘</kbd><kbd>K</kbd> quick operations</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-large" />
            <div className="orbit orbit-small" />
            <div className="code-card">
              <div className="code-card-top"><span className="window-dots"><i /><i /><i /></span><span>response.json</span><span className="valid-pill"><Icon name="check" size={12} /> valid</span></div>
              <pre><code><span className="code-brace">{'{'}</span>{'\n'}  <span className="code-key">"status"</span>: <span className="code-string">"ready"</span>,{ '\n' }  <span className="code-key">"latency_ms"</span>: <span className="code-number">42</span>,{ '\n' }  <span className="code-key">"features"</span>: <span className="code-brace">{'['}</span>{ '\n' }    <span className="code-string">"fast"</span>, <span className="code-string">"local"</span>{ '\n' }  <span className="code-brace">{']'}</span>{ '\n' }<span className="code-brace">{' }'}</span></code></pre>
              <div className="code-card-footer"><span><span className="pulse" /> Parsed in 0.4ms</span><span>6 lines</span></div>
            </div>
            <div className="float-note note-top"><span className="note-icon teal"><Icon name="shield" size={15} /></span><span><strong>Zero uploads</strong><small>stays in your tab</small></span></div>
            <div className="float-note note-bottom"><span className="note-icon coral"><Icon name="spark" size={15} /></span><span><strong>Pretty by default</strong><small>developer-approved</small></span></div>
          </div>
        </section>

        <section className="tool-section section-wrap" id="workbench">
          <div className="section-heading">
            <div><p className="section-kicker">THE MAIN EVENT</p><h2>{mode === 'workbench' ? 'Your JSON, in good hands.' : 'See exactly what changed.'}</h2></div>
            <div className="privacy-note"><Icon name="shield" size={16} /><span><strong>Private by design</strong><small>No servers. No sign-in. No surprises.</small></span></div>
          </div>
          <div className="mode-tabs" role="tablist" aria-label="JSON tools">
            <button className={mode === 'workbench' ? 'mode-tab selected' : 'mode-tab'} onClick={() => setMode('workbench')} role="tab"><Icon name="braces" size={16} /> Workbench <span>6 tools</span></button>
            <button className={mode === 'compare' ? 'mode-tab selected' : 'mode-tab'} onClick={() => setMode('compare')} role="tab"><Icon name="compare" size={16} /> Compare <span>side by side</span></button>
          </div>

          {mode === 'workbench' ? (
            <div className="workbench-card">
              <div className="operation-rail">
                <div className="rail-label">OPERATIONS</div>
                <div className="operation-list">
                  {([['format', 'format', 'Format'], ['minify', 'minify', 'Minify'], ['sort', 'sort', 'Sort keys'], ['validate', 'shield', 'Validate'], ['encode', 'encode', 'Escape'], ['decode', 'encode', 'Unescape']] as [Operation, IconName, string][]).map(([value, icon, label]) => (
                    <button key={value} className={operation === value ? 'operation selected' : 'operation'} onClick={() => { setOperation(value); runOperation(value) }}><span className="operation-icon"><Icon name={icon} size={16} /></span><span>{label}</span></button>
                  ))}
                </div>
                <div className="rail-divider" />
                <div className="rail-label">START WITH</div>
                <label className="sample-select"><select value={selectedSample} onChange={(event) => loadSample(event.target.value)} aria-label="Choose a sample"><option>API response</option><option>Feature flags</option><option>Package config</option></select><Icon name="chevron" size={14} /></label>
                <button className="text-button" onClick={reset}><Icon name="refresh" size={14} /> Reset sample</button>
              </div>
              <div className="editor-area">
                <div className="editor-pane">
                  <div className="pane-header"><div><span className="pane-title">Input</span><span className="file-chip"><Icon name="braces" size={12} /> JSON</span></div><span className={stats.valid ? 'status-text good' : 'status-text bad'}><span className="status-dot" /> {stats.valid ? 'Valid JSON' : 'Needs a fix'}</span></div>
                  <textarea className="json-editor" spellCheck={false} value={input} onChange={(event) => setInput(event.target.value)} aria-label="JSON input" />
                  <div className="pane-footer"><span>{inputLines} lines</span><span>{formatBytes(new TextEncoder().encode(input).length)}</span></div>
                </div>
                <div className="transform-arrow"><Icon name="arrow" size={18} /></div>
                <div className="editor-pane output-pane">
                  <div className="pane-header"><div><span className="pane-title">Output</span><span className="file-chip output-chip"><Icon name="spark" size={12} /> {operation}</span></div><div className="pane-actions"><button className="small-icon-button" onClick={handleCopy} disabled={!output} title="Copy output">{copied ? <Icon name="check" size={14} /> : <Icon name="copy" size={14} />}</button><button className="small-icon-button" onClick={handleDownload} disabled={!output} title="Download output"><Icon name="download" size={14} /></button></div></div>
                  <pre className={output ? 'json-output' : 'json-output placeholder'}>{output || 'Run an operation to see your cleaned JSON here.'}</pre>
                  <div className="pane-footer"><span>{output ? `${outputLines} lines` : 'Waiting for input'}</span><span>{output ? formatBytes(new TextEncoder().encode(output).length) : '—'}</span></div>
                </div>
              </div>
              {notice && <div className={`notice ${notice.kind}`}><span className="notice-icon">{notice.kind === 'success' ? <Icon name="check" size={15} /> : notice.kind === 'error' ? <Icon name="x" size={15} /> : <Icon name="spark" size={15} />}</span><span><strong>{notice.title}</strong>{notice.detail && <small>{notice.detail}</small>}</span>{notice.kind === 'error' && <button className="notice-close" onClick={() => setNotice(null)}><Icon name="x" size={14} /></button>}</div>}
            </div>
          ) : (
            <div className="compare-card">
              <div className="compare-toolbar"><div><span className="pane-title">Compare two documents</span><p>Values are compared recursively, so nested changes never hide.</p></div><button className="primary-button compact" onClick={handleCompare}><Icon name="compare" size={15} /> Compare JSON</button></div>
              <div className="compare-editors">
                <div className="compare-editor"><div className="pane-header"><div><span className="pane-title">Original</span><span className="file-chip"><Icon name="braces" size={12} /> JSON A</span></div><span className="editor-label">BEFORE</span></div><textarea className="json-editor" spellCheck={false} value={input} onChange={(event) => setInput(event.target.value)} aria-label="Original JSON" /></div>
                <div className="compare-editor"><div className="pane-header"><div><span className="pane-title">Changed</span><span className="file-chip changed-chip"><Icon name="braces" size={12} /> JSON B</span></div><span className="editor-label">AFTER</span></div><textarea className="json-editor" spellCheck={false} value={compareInput} onChange={(event) => setCompareInput(event.target.value)} aria-label="Changed JSON" /></div>
              </div>
              {compareResult ? <div className="compare-results"><div className="result-summary"><div className="result-total"><strong>{compareResult.differences.length}</strong><span>differences found</span></div><div className="result-stat changed-stat"><strong>{compareResult.changed}</strong><span>changed</span></div><div className="result-stat added-stat"><strong>{compareResult.added}</strong><span>added</span></div><div className="result-stat removed-stat"><strong>{compareResult.removed}</strong><span>removed</span></div><div className="result-stat same-stat"><strong>{compareResult.same}</strong><span>matching</span></div></div>{compareResult.differences.length > 0 && <div className="difference-list">{compareResult.differences.slice(0, 8).map((difference, index) => <div className="difference-row" key={`${difference.path}-${index}`}><span className={`diff-mark ${difference.kind}`}>{difference.kind === 'changed' ? '~' : difference.kind === 'added' ? '+' : '−'}</span><code>{difference.path}</code><span className="diff-values">{difference.left && <del>{difference.left}</del>}{difference.right && <ins>{difference.right}</ins>}</span><span className={`diff-kind ${difference.kind}`}>{difference.kind}</span></div>)}</div>}</div> : <div className="compare-empty"><span className="empty-graphic"><Icon name="compare" size={24} /></span><strong>Ready when you are</strong><span>Paste two JSON documents above, then compare their structure and values.</span></div>}
            </div>
          )}
        </section>

        <section className="feature-strip section-wrap" id="guide">
          <div className="feature-intro"><p className="section-kicker">BUILT FOR THE EVERYDAY</p><h2>Small tools.<br /><em>Big relief.</em></h2><p>Everything you reach for while debugging an API, reviewing a config, or wrangling a webhook payload.</p></div>
          <div className="feature-grid">
            <article className="feature-card teal-card"><span className="feature-icon"><Icon name="shield" size={20} /></span><h3>Validate with confidence</h3><p>Instant syntax feedback and useful parse details. No more hunting for the missing comma.</p><span className="feature-tag">syntax · structure · types</span></article>
            <article className="feature-card coral-card"><span className="feature-icon"><Icon name="format" size={20} /></span><h3>Shape it your way</h3><p>Pretty print, minify, sort every nested key, or escape a payload for your next code snippet.</p><span className="feature-tag">format · minify · transform</span></article>
            <article className="feature-card blue-card"><span className="feature-icon"><Icon name="compare" size={20} /></span><h3>Spot the difference</h3><p>Compare payloads recursively and jump straight to what changed, was added, or disappeared.</p><span className="feature-tag">diff · review · debug</span></article>
          </div>
        </section>

        <section className="closing section-wrap"><div className="closing-inner"><div className="closing-mark"><Icon name="spark" size={26} /></div><div><p className="section-kicker">YOUR DATA, YOUR TAB</p><h2>Good tools get out<br />of the way.</h2></div><p className="closing-copy">JSON Forge runs entirely in your browser. Your payloads never leave your machine, so you can work with real data without turning privacy into another task.</p><button className="secondary-button" onClick={() => { setMode('workbench'); document.getElementById('workbench')?.scrollIntoView({ behavior: 'smooth' }) }}>Start shaping JSON <Icon name="arrow" size={16} /></button></div></section>
      </main>
      <footer className="footer section-wrap"><span className="footer-brand"><span className="brand-mark small"><Icon name="braces" size={15} /></span> json<span className="brand-accent">forge</span></span><span>Made for the in-between moments of development.</span><span className="footer-right"><span className="local-dot" /> Runs locally in your browser</span></footer>
    </div>
  )
}

export default JsonWorkbench
