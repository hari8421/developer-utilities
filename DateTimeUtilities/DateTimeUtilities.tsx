import { useMemo, useState } from 'react'

type Mode = 'epoch' | 'timezone' | 'units'
type Notice = { kind: 'success' | 'error' | 'info'; title: string; detail: string }

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
]

const UNITS = [
  { id: 'ns', label: 'Nanoseconds', ms: 1e-6 },
  { id: 'us', label: 'Microseconds', ms: 1e-3 },
  { id: 'ms', label: 'Milliseconds', ms: 1 },
  { id: 's', label: 'Seconds', ms: 1000 },
  { id: 'min', label: 'Minutes', ms: 60000 },
  { id: 'hr', label: 'Hours', ms: 3600000 },
  { id: 'day', label: 'Days', ms: 86400000 },
  { id: 'week', label: 'Weeks', ms: 604800000 },
  { id: 'month', label: 'Months (avg)', ms: 2630016000 },
  { id: 'year', label: 'Years (avg)', ms: 31557600000 },
] as const

type UnitId = (typeof UNITS)[number]['id']

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toLocalInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function zoned(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const p: Record<string, string> = {}
  parts.forEach((part) => { p[part.type] = part.value })
  const offset = new Intl.DateTimeFormat('en-GB', { timeZone, timeZoneName: 'shortOffset' })
    .formatToParts(date).find((part) => part.type === 'timeZoneName')?.value ?? ''
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}:${p.second}`,
    offset: offset.replace('GMT', 'UTC'),
  }
}

function zoneToInstant(wallClock: string, timeZone: string): Date | null {
  if (!wallClock) return null
  const [datePart, timePart = '00:00:00'] = wallClock.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number)
  if (![year, month, day, hour, minute, second].every(Number.isFinite)) return null
  const base = Date.UTC(year, month - 1, day, hour, minute, second)
  const target = `${datePart} ${pad(hour)}:${pad(minute)}:${pad(second)}`
  for (let offset = -14; offset <= 14; offset += 1) {
    const candidate = new Date(base - offset * 3600000)
    const z = zoned(candidate, timeZone)
    if (`${z.date} ${z.time}` === target) return candidate
  }
  return null
}

function modeLabel(mode: Mode) {
  if (mode === 'epoch') return 'Epoch ↔ date'
  if (mode === 'timezone') return 'Timezone converter'
  return 'Unit converter'
}

function Glyph({ children }: { children: string }) {
  return <span className="time-glyph" aria-hidden="true">{children}</span>
}

function group(n: number) {
  return Math.round(n).toLocaleString('en-US')
}

function DateTimeUtilities({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>('epoch')
  const [epochValue, setEpochValue] = useState(() => String(Math.floor(Date.now() / 1000)))
  const [epochUnit, setEpochUnit] = useState<'s' | 'ms'>('s')
  const [dateInput, setDateInput] = useState(() => toLocalInput(new Date()))
  const [sourceZone, setSourceZone] = useState('UTC')
  const [unitValue, setUnitValue] = useState('1')
  const [fromUnit, setFromUnit] = useState<UnitId>('hr')
  const [toUnit, setToUnit] = useState<UnitId>('min')
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState<Notice>({ kind: 'info', title: 'Time, unboxed', detail: 'Convert timestamps, timezones, and durations without leaving the tab.' })

  const epochMs = useMemo(() => {
    if (epochValue.trim() === '') return null
    const value = Number(epochValue)
    if (!Number.isFinite(value)) return null
    return epochUnit === 's' ? value * 1000 : value
  }, [epochValue, epochUnit])

  const epochDate = epochMs !== null && Number.isFinite(epochMs) ? new Date(epochMs) : null

  const tzInstant = useMemo(() => zoneToInstant(dateInput, sourceZone) ?? new Date(), [dateInput, sourceZone])

  const from = UNITS.find((unit) => unit.id === fromUnit)!
  const to = UNITS.find((unit) => unit.id === toUnit)!
  const unitResult = useMemo(() => {
    if (unitValue.trim() === '') return null
    const value = Number(unitValue)
    if (!Number.isFinite(value)) return null
    return (value * from.ms) / to.ms
  }, [unitValue, from, to])

  const epochLines = epochDate
    ? [
        `ISO 8601 (UTC)  ${epochDate.toISOString()}`,
        `UTC             ${epochDate.toUTCString()}`,
        `Local           ${epochDate.toString()}`,
        `Seconds         ${Math.floor(epochDate.getTime() / 1000)}`,
        `Milliseconds    ${epochDate.getTime()}`,
      ]
    : []

  const setEpochNow = () => {
    const now = new Date()
    setEpochValue(String(epochUnit === 's' ? Math.floor(now.getTime() / 1000) : now.getTime()))
    setDateInput(toLocalInput(now))
    setNotice({ kind: 'success', title: 'Current time loaded', detail: 'Snapshot taken at this instant.' })
  }

  const setTimezoneNow = () => {
    const z = zoned(new Date(), sourceZone)
    setDateInput(`${z.date}T${z.time}`)
    setNotice({ kind: 'success', title: 'Current time loaded', detail: `Now in ${sourceZone}.` })
  }

  const reverseEpochMs = useMemo(() => {
    const parsed = new Date(dateInput)
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
  }, [dateInput])

  const copyResult = async (text: string) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const clearAll = () => {
    setEpochValue('')
    setDateInput(toLocalInput(new Date()))
    setUnitValue('1')
    setNotice({ kind: 'info', title: 'Cleared', detail: 'The converter is ready for new values.' })
  }

  return (
    <div className="time-shell">
      <div className="time-glow time-glow-a" />
      <div className="time-glow time-glow-b" />
      <header className="time-topbar">
        <button className="time-back" onClick={onBack} type="button"><span className="time-back-arrow" aria-hidden="true">←</span><span className="time-back-label">Back to JSON Utilities</span></button>
        <div className="time-brand" aria-label="Developer utilities"><span className="time-brand-mark">⌘</span><span>developer<span>utilities</span></span></div>
        <div className="time-breadcrumb"><span>TOOLS</span><i>/</i><strong>DATETIME-UTILITIES</strong></div>
        <div className="time-local"><span /> browser-only</div>
      </header>

      <main className="time-main">
        <section className="time-hero">
          <div>
            <div className="time-eyebrow"><Glyph>◷</Glyph> Date &amp; time utility desk</div>
            <h1>Same instant.<br /><em>Every zone.</em></h1>
            <p>Translate Unix timestamps, jump between timezones, and convert durations — the quiet math behind logs, schedulers, and API timestamps.</p>
          </div>
          <div className="time-hero-stats"><div><strong>{TIMEZONES.length}</strong><span>zones</span></div><div><strong>3</strong><span>utilities</span></div><div><strong>UTC</strong><span>native</span></div></div>
        </section>

        <section className="time-workspace">
          <aside className="time-sidebar">
            <div className="time-sidebar-label">CHOOSE A UTILITY</div>
            <button className={mode === 'epoch' ? 'time-nav active' : 'time-nav'} onClick={() => { setMode('epoch'); setNotice({ kind: 'info', title: 'Epoch ↔ date', detail: 'Unix timestamps in seconds or milliseconds.' }) }}><Glyph>◷</Glyph><span><strong>Epoch ↔ date</strong><small>unix ts ⇄ readable</small></span></button>
            <button className={mode === 'timezone' ? 'time-nav active' : 'time-nav'} onClick={() => { setMode('timezone'); setNotice({ kind: 'info', title: 'Timezone converter', detail: 'See one instant across many zones.' }) }}><Glyph>◉</Glyph><span><strong>Timezone converter</strong><small>wall clock everywhere</small></span></button>
            <button className={mode === 'units' ? 'time-nav active' : 'time-nav'} onClick={() => { setMode('units'); setNotice({ kind: 'info', title: 'Unit converter', detail: 'Convert durations between time units.' }) }}><Glyph>⇄</Glyph><span><strong>Unit converter</strong><small>ms · s · hr · day …</small></span></button>
            <div className="time-sidebar-divider" />
            <div className="time-sidebar-bottom"><span className="time-lock">◷</span><strong>Timezone-aware</strong><p>All conversions use the browser's Intl engine and your system clock. Nothing is sent anywhere.</p></div>
          </aside>

          <div className="time-panel">
            <div className="time-panel-header"><div><span className="time-panel-kicker">CURRENT UTILITY</span><h2>{modeLabel(mode)}</h2></div><button className="time-clear" onClick={clearAll}>Clear all</button></div>

            {mode === 'epoch' && (
              <div className="time-input-grid">
                <div className="time-field">
                  <div className="time-field-label"><label htmlFor="epoch-input">Unix timestamp</label><span>{epochUnit}</span></div>
                  <div className="time-field-row">
                    <input id="epoch-input" className="time-input" inputMode="numeric" value={epochValue} onChange={(event) => setEpochValue(event.target.value)} placeholder="e.g. 1755030600" />
                    <select className="time-select" value={epochUnit} onChange={(event) => setEpochUnit(event.target.value as 's' | 'ms')} aria-label="Timestamp unit">
                      <option value="s">seconds</option>
                      <option value="ms">milliseconds</option>
                    </select>
                  </div>
                  <div className="time-run-row">
                    <button className="time-run" onClick={setEpochNow}><span>Use current time</span><span className="run-arrow">→</span></button>
                  </div>
                </div>
                <div className="time-side-controls">
                  <div className="time-info-card"><Glyph>i</Glyph><p>Epoch time counts from 1970-01-01T00:00:00Z. Seconds vs milliseconds is the most common source of off-by-1000 bugs.</p></div>
                  <div className="time-field">
                    <div className="time-field-label"><label htmlFor="date-input">Date → timestamp</label><span>local</span></div>
                    <input id="date-input" className="time-input time-datetime" type="datetime-local" step="1" value={dateInput} onChange={(event) => setDateInput(event.target.value)} />
                    <div className="time-reverse-result">{reverseEpochMs !== null ? `${group(reverseEpochMs / 1000)} s · ${group(reverseEpochMs)} ms` : '—'}</div>
                  </div>
                </div>
              </div>
            )}

            {mode === 'timezone' && (
              <div className="time-input-grid">
                <div className="time-field">
                  <div className="time-field-label"><label htmlFor="tz-date-input">Date &amp; time</label><span>in source zone</span></div>
                  <input id="tz-date-input" className="time-input time-datetime" type="datetime-local" step="1" value={dateInput} onChange={(event) => setDateInput(event.target.value)} />
                  <div className="time-field-label time-field-label-sub"><label htmlFor="tz-source">Source timezone</label><span>IANA</span></div>
                  <select id="tz-source" className="time-select time-select-block" value={sourceZone} onChange={(event) => setSourceZone(event.target.value)}>
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                  <div className="time-run-row">
                    <button className="time-run" onClick={setTimezoneNow}><span>Use current time</span><span className="run-arrow">→</span></button>
                  </div>
                </div>
                <div className="time-field">
                  <div className="time-field-label"><label>Everywhere at once</label><span>{TIMEZONES.length} zones</span></div>
                  <div className="time-zone-list">
                    {TIMEZONES.map((tz) => {
                      const z = zoned(tzInstant, tz)
                      return (
                        <div key={tz} className={tz === sourceZone ? 'time-zone-row active' : 'time-zone-row'}>
                          <span className="time-zone-name">{tz.replace('_', ' ')}</span>
                          <span className="time-zone-time">{z.date} <b>{z.time}</b></span>
                          <span className="time-zone-offset">{z.offset}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {mode === 'units' && (
              <div className="time-input-grid">
                <div className="time-field">
                  <div className="time-field-label"><label htmlFor="unit-input">Duration value</label><span>number</span></div>
                  <input id="unit-input" className="time-input" inputMode="decimal" value={unitValue} onChange={(event) => setUnitValue(event.target.value)} placeholder="e.g. 2.5" />
                  <div className="time-unit-selects">
                    <div className="time-field-label time-field-label-sub"><label htmlFor="from-unit">From</label><span>unit</span></div>
                    <select id="from-unit" className="time-select time-select-block" value={fromUnit} onChange={(event) => setFromUnit(event.target.value as UnitId)}>
                      {UNITS.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
                    </select>
                    <div className="time-field-label time-field-label-sub"><label htmlFor="to-unit">To</label><span>unit</span></div>
                    <select id="to-unit" className="time-select time-select-block" value={toUnit} onChange={(event) => setToUnit(event.target.value as UnitId)}>
                      {UNITS.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="time-side-controls">
                  <div className="time-info-card"><Glyph>i</Glyph><p>Months and years use average lengths (30.44 and 365.25 days) for a consistent conversion ratio.</p></div>
                  <div className="time-field time-result-card">
                    <div className="time-field-label"><label>Result</label><span>{to.label}</span></div>
                    <div className="time-result">{unitResult !== null ? unitResult.toLocaleString('en-US', { maximumFractionDigits: 6 }) : '—'}</div>
                    <div className="time-result-detail">{unitResult !== null ? `${Number(unitValue).toLocaleString('en-US')} ${from.label.toLowerCase()} = ${unitResult.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${to.label.toLowerCase()}` : 'Enter a value to convert.'}</div>
                  </div>
                </div>
              </div>
            )}

            <div className={`time-notice ${notice.kind}`}><span className="notice-symbol">{notice.kind === 'success' ? '✓' : notice.kind === 'error' ? '!' : 'i'}</span><span><strong>{notice.title}</strong><small>{notice.detail}</small></span></div>

            {mode === 'epoch' && (
              <div className="time-output">
                <div className="time-output-header"><div><span className="time-panel-kicker">RESULT</span><span className="output-type">{epochDate ? 'DATE' : 'WAITING'}</span></div><div className="time-output-actions"><button onClick={() => copyResult(epochLines.join('\n'))} disabled={!epochDate}>{copied ? 'Copied ✓' : 'Copy'}</button></div></div>
                <pre className={epochDate ? '' : 'empty-output'}>{epochDate ? epochLines.join('\n') : 'Enter a valid timestamp to see it as a date.'}</pre>
              </div>
            )}
          </div>
        </section>

        <section className="time-notes">
          <article><span>01</span><div><h3>Epoch is UTC-agnostic</h3><p>Timestamps are a count of time from the Unix epoch; the same number is the same instant for everyone. Timezones only change how you print it.</p></div></article>
          <article><span>02</span><div><h3>Store UTC, render local</h3><p>Keep UTC (or epoch) in your database and APIs, then format into a user's zone at display time — the converter shows both at a glance.</p></div></article>
          <article><span>03</span><div><h3>Offsets shift</h3><p>Wall-clock offsets change with daylight saving. The converter uses the browser's IANA database, so historical and future dates follow real rules.</p></div></article>
        </section>
      </main>
      <footer className="time-footer"><button onClick={onBack}>← JSON Utilities</button><span>Browser-native Intl · no server · no account</span><span>developer-utilities / datetime-utilities</span></footer>
    </div>
  )
}

export default DateTimeUtilities
