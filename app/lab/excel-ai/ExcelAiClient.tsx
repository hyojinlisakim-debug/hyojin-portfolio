'use client'
import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { type Cell, type ColumnFormat, type Lang, type Table, type Workbook, MAX_FILE_BYTES } from '@/lib/excel-ai/types'
import { type Op, type StepResult, profile, runPipeline, summarize, toCsv, validateOp } from '@/lib/excel-ai/ops'
import { FileReadError, readCsv, readXlsx, writeXlsx } from '@/lib/excel-ai/xlsx'
import { DICTS, LANGS, LOCALES, type Dict, describeStep, fmt } from '@/lib/excel-ai/i18n'
import { readLang, serverLang, subscribeLang, writeLang } from '@/lib/excel-ai/lang'

const SAMPLE_URL = '/samples/utility_billing_sample.xlsx'
const SAMPLE_NAME = 'utility_billing_sample.xlsx'
const PREVIEW_ROWS = 100

type ErrKey = 'errLocked' | 'errNotXlsx' | 'errTooBig' | 'errTooManyRows' | 'errEmpty' | 'errNotConfigured' | 'errRateLimited' | 'errFailed' | 'errNoFile' | 'errEmptyRequest'
type Request = { id: number; text: string; steps: Op[]; explanation: string; unsupported: string }
type Message = { role: 'user' | 'assistant'; content: string }

function apiErrorKey(code: unknown): ErrKey {
  if (code === 'not_configured') return 'errNotConfigured'
  if (code === 'rate_limited') return 'errRateLimited'
  if (code === 'locked') return 'errLocked'
  return 'errFailed'
}

function formatCell(v: Cell, format: ColumnFormat | undefined, lang: Lang): string {
  if (v === null) return ''
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'string') return v
  const locale = LOCALES[lang]
  if (format === 'percent') {
    return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
  }
  const small = Math.abs(v) > 0 && Math.abs(v) < 1
  const n = new Intl.NumberFormat(locale, {
    minimumFractionDigits: format === 'currency' ? 2 : 0,
    maximumFractionDigits: small ? 4 : 2,
  }).format(v)
  if (format !== 'currency') return n
  return lang === 'fr' ? `${n} $` : v < 0 ? `-$${n.replace('-', '')}` : `$${n}`
}

const STATUS_COL = /^(status|flag|check)$/i
const CHANGE_OPS: Op['op'][] = ['trim', 'change_case', 'standardize_id', 'replace_values', 'fill_missing']

export default function ExcelAiClient() {
  const lang = useSyncExternalStore(subscribeLang, readLang, serverLang)
  const d: Dict = DICTS[lang]

  const [wb, setWb] = useState<Workbook | null>(null)
  const [startSheet, setStartSheet] = useState('')
  const [requests, setRequests] = useState<Request[]>([])
  const [input, setInput] = useState('')
  const [planning, setPlanning] = useState(false)
  const [error, setError] = useState<ErrKey | null>(null)
  const [fileError, setFileError] = useState<ErrKey | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [chatError, setChatError] = useState<ErrKey | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const allSteps = useMemo(() => requests.flatMap((r) => r.steps), [requests])
  const pipeline = useMemo(
    () => (wb && startSheet ? runPipeline(wb, startSheet, allSteps) : null),
    [wb, startSheet, allSteps],
  )
  const resultsByRequest = useMemo(() => {
    const out: StepResult[][] = []
    let i = 0
    for (const r of requests) {
      out.push(pipeline ? pipeline.results.slice(i, i + r.steps.length) : [])
      i += r.steps.length
    }
    return out
  }, [requests, pipeline])

  // ── File loading ──
  function applyWorkbook(book: Workbook) {
    setWb(book)
    setStartSheet(book.sheets[0].name)
    setRequests([])
    setMessages([])
    setError(null)
    setChatError(null)
  }

  function readErrorKey(e: unknown): ErrKey {
    if (e instanceof FileReadError) {
      if (e.message === 'too-many-rows') return 'errTooManyRows'
      if (e.message === 'empty') return 'errEmpty'
    }
    return 'errNotXlsx'
  }

  async function loadFile(file: File) {
    setFileError(null)
    if (file.size > MAX_FILE_BYTES) { setFileError('errTooBig'); return }
    setLoadingFile(true)
    try {
      const book = /\.csv$/i.test(file.name)
        ? readCsv(await file.text(), file.name)
        : await readXlsx(await file.arrayBuffer(), file.name)
      applyWorkbook(book)
    } catch (e) {
      setFileError(readErrorKey(e))
    } finally {
      setLoadingFile(false)
    }
  }

  async function loadSample() {
    setFileError(null)
    setLoadingFile(true)
    try {
      const res = await fetch(SAMPLE_URL)
      if (!res.ok) throw new Error('sample')
      applyWorkbook(await readXlsx(await res.arrayBuffer(), SAMPLE_NAME))
    } catch (e) {
      setFileError(readErrorKey(e))
    } finally {
      setLoadingFile(false)
    }
  }

  // ── AI calls ──
  function planContext() {
    if (!wb || !pipeline) return {}
    const trim = (s: ReturnType<typeof summarize>) => ({ ...s, columns: s.columns.slice(0, 60) })
    return {
      file: wb.fileName,
      start_sheet: startSheet,
      sheets: wb.sheets.slice(0, 10).map((s) => trim(summarize(s, 3))),
      current_table: trim(summarize(pipeline.table, 4)),
      steps_already_applied: allSteps.map((s) => describeStep(s, DICTS.en)),
    }
  }

  function chatContext() {
    if (!wb || !pipeline) return {}
    return {
      file: wb.fileName,
      steps_applied: allSteps.map((s) => describeStep(s, DICTS.en)),
      result: { rows: pipeline.table.rows.length, columns: pipeline.table.columns },
      preview_csv: toCsv(pipeline.table, 80).slice(0, 15000),
      column_totals: profile(pipeline.table),
    }
  }

  async function run(text?: string) {
    if (planning) return
    const req = (text ?? input).trim()
    if (!wb) { setError('errNoFile'); return }
    if (!req) { setError('errEmptyRequest'); return }
    setPlanning(true)
    setError(null)
    try {
      const res = await fetch('/api/excel-ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'plan', lang, request: req, context: planContext() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(apiErrorKey(data?.error)); return }
      const steps: Op[] = []
      for (const raw of Array.isArray(data.steps) ? data.steps : []) {
        const v = validateOp(raw)
        if (typeof v !== 'string') steps.push(v)
      }
      const unsupported = typeof data.unsupported === 'string' ? data.unsupported : ''
      if (!steps.length && !unsupported) { setError('errFailed'); return }
      setRequests((rs) => [...rs, {
        id: Date.now(), text: req, steps,
        explanation: typeof data.explanation === 'string' ? data.explanation : '',
        unsupported,
      }])
      setInput('')
    } catch {
      setError('errFailed')
    } finally {
      setPlanning(false)
    }
  }

  async function ask(text: string) {
    const q = text.trim()
    if (!q || asking || !wb) return
    const next: Message[] = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setQuestion('')
    setAsking(true)
    setChatError(null)
    try {
      const res = await fetch('/api/excel-ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'chat', lang, messages: next, context: chatContext() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || typeof data.reply !== 'string') { setChatError(apiErrorKey(data?.error)); return }
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }])
    } catch {
      setChatError('errFailed')
    } finally {
      setAsking(false)
    }
  }

  // ── Export ──
  function download() {
    if (!wb || !pipeline) return
    const stepsTable: Table = {
      name: 'Steps',
      columns: ['#', 'Request', 'Step', 'Excel formula', 'Rows before', 'Rows after', 'Note'],
      rows: [],
      formulas: {},
      formats: {},
    }
    let n = 1
    requests.forEach((r, ri) => {
      r.steps.forEach((s, si) => {
        const res = resultsByRequest[ri]?.[si]
        stepsTable.rows.push([
          n++, r.text, describeStep(s, d), res?.excel ?? null,
          res?.rowsBefore ?? null, res?.rowsAfter ?? null,
          res && !res.ok ? res.error ?? 'failed' : null,
        ])
      })
    })
    const bytes = writeXlsx([
      { table: { ...pipeline.table, name: 'Result' }, liveFormulas: true },
      { table: stepsTable, wrapColumns: [1, 2, 3] },
      ...wb.sheets.map((t) => ({ table: t })),
    ])
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${wb.fileName.replace(/\.[^.]+$/, '')}_processed.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500)
    } catch { /* clipboard blocked: the formula stays visible to select manually */ }
  }

  const table = pipeline?.table
  const statusCols = table ? table.columns.map((c, i) => (STATUS_COL.test(c) ? i : -1)).filter((i) => i >= 0) : []
  const startTable = wb?.sheets.find((s) => s.name === startSheet)

  return (
    <div style={{ paddingTop: '60px' }} lang={lang}>
      <section style={{ padding: '100px 5vw 90px', background: 'var(--bg2)' }}>
        <div className="xl-wrap">
          <div className="xl-head">
            <div>
              <div className="section-tag">{d.tag}</div>
              <h2>{d.title}</h2>
            </div>
            <div className="xl-lang" role="group" aria-label="Language">
              {LANGS.map((l) => (
                <button key={l.code} type="button" className="xl-pill" aria-pressed={lang === l.code} onClick={() => writeLang(l.code)}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <p className="section-desc">{d.subtitle}</p>
          <p className="xl-note">{d.privacy}</p>

          <div className="xl-how">
            <div><b>{d.how1Title}</b><p>{d.how1}</p></div>
            <div><b>{d.how2Title}</b><p>{d.how2}</p></div>
            <div><b>{d.how3Title}</b><p>{d.how3}</p></div>
          </div>

          {/* ── Data ── */}
          <div className="xl-card">
            <span className="xl-label">{d.uploadTitle}</span>
            <div
              className={`xl-drop${dragOver ? ' over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const f = e.dataTransfer.files?.[0]
                if (f) void loadFile(f)
              }}
            >
              <p>
                {d.dropHint}{' '}
                <button type="button" className="xl-link" onClick={() => fileInput.current?.click()}>{d.chooseFile}</button>
                {' · '}{d.demoNote}
              </p>
              <button type="button" className="xl-btn primary" onClick={loadSample} aria-busy={loadingFile}>{d.useSample}</button>
              <a className="xl-btn" href={SAMPLE_URL} download>{d.downloadSample}</a>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,.csv"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void loadFile(f)
                  e.target.value = ''
                }}
              />
            </div>
            <div aria-live="polite">
              {loadingFile && <p className="xl-meta">{d.loading}</p>}
              {fileError && <p className="xl-error">{d[fileError]}</p>}
            </div>
            {wb && (
              <div className="xl-file">
                <b>{wb.fileName}</b>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)' }}>
                  {d.startSheet}
                  <select
                    className="xl-select"
                    value={startSheet}
                    onChange={(e) => { setStartSheet(e.target.value); setRequests([]); setMessages([]) }}
                  >
                    {wb.sheets.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </label>
                {startTable && (
                  <span style={{ color: 'var(--muted)' }}>
                    {fmt(d.rowsCols, { rows: startTable.rows.length.toLocaleString(LOCALES[lang]), cols: startTable.columns.length })}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Request ── */}
          <div className="xl-card">
            <label className="xl-label" htmlFor="xl-request">{d.requestLabel}</label>
            <textarea
              id="xl-request"
              className="xl-textarea"
              value={input}
              placeholder={d.requestPlaceholder}
              onChange={(e) => { setInput(e.target.value); if (error === 'errEmptyRequest') setError(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void run() } }}
            />
            <div className="xl-row">
              <button type="button" className="xl-btn primary" onClick={() => void run()} aria-busy={planning}>
                {planning ? d.running : d.run}
              </button>
              {requests.length > 0 && (
                <>
                  <button type="button" className="xl-btn" onClick={() => setRequests((r) => r.slice(0, -1))}>{d.undo}</button>
                  <button type="button" className="xl-btn" onClick={() => { setRequests([]); setMessages([]) }}>{d.reset}</button>
                </>
              )}
            </div>
            <div aria-live="polite">{error && <p className="xl-error">{d[error]}</p>}</div>
            {wb?.fileName === SAMPLE_NAME && (
              <>
                <p className="xl-meta" style={{ marginBottom: 0 }}>{d.suggestions}</p>
                <div className="xl-chips">
                  {d.suggest.map((s) => (
                    <button key={s} type="button" className="xl-chip" onClick={() => { setInput(s); void run(s) }}>{s}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Steps + Result ── */}
          {wb && pipeline && table && (
            <div className="xl-grid">
              <div className="xl-card">
                <span className="xl-label">{d.stepsTitle}</span>
                {requests.length === 0 && <p className="xl-empty">{d.noSteps}</p>}
                {requests.map((r, ri) => (
                  <div key={r.id} className="xl-req">
                    <div className="xl-req-title">{fmt(d.requestN, { n: ri + 1 })}</div>
                    <div className="xl-req-text">{r.text}</div>
                    {r.explanation && <p className="xl-expl">{r.explanation}</p>}
                    {r.unsupported && <p className="xl-unsup"><b>{d.unsupported}: </b>{r.unsupported}</p>}
                    <ol className="xl-steps">
                      {r.steps.map((s, si) => {
                        const res = resultsByRequest[ri]?.[si]
                        const key = `${r.id}-${si}`
                        const counts: string[] = []
                        if (res?.ok) {
                          const n = (x: number) => x.toLocaleString(LOCALES[lang])
                          if (s.op === 'reconcile') counts.push(fmt(d.issues, { n: n(res.affected ?? 0) }))
                          else if (res.rowsBefore !== res.rowsAfter) counts.push(fmt(d.rowsChange, { before: n(res.rowsBefore), after: n(res.rowsAfter) }))
                          else if (res.affected && CHANGE_OPS.includes(s.op)) counts.push(fmt(d.affected, { n: n(res.affected) }))
                        }
                        return (
                          <li key={key} className={`xl-step${res && !res.ok ? ' fail' : ''}`}>
                            <div className="xl-step-desc">{describeStep(s, d)}</div>
                            {counts.length > 0 && <div className="xl-step-meta">{counts.join(' · ')}</div>}
                            {res && !res.ok && (
                              <div className="xl-error" style={{ marginTop: 3 }}>
                                {res.error === 'skipped' ? d.stepSkipped : fmt(d.stepFailed, { error: res.error ?? '' })}
                              </div>
                            )}
                            {res?.ok && res.excel && (
                              <div className="xl-formula">
                                <code aria-label={d.excelFormula}>{res.excel}</code>
                                <button type="button" onClick={() => void copy(res.excel!, key)}>{copied === key ? d.copied : d.copy}</button>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ol>
                  </div>
                ))}
              </div>

              <div>
                <div className="xl-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span className="xl-label" style={{ marginBottom: 0 }}>{d.resultTitle} · {table.name}</span>
                    <button type="button" className="xl-btn primary" onClick={download} title={d.downloadHint}>{d.download}</button>
                  </div>
                  <p className="xl-meta">
                    {fmt(d.showing, {
                      shown: Math.min(PREVIEW_ROWS, table.rows.length).toLocaleString(LOCALES[lang]),
                      total: table.rows.length.toLocaleString(LOCALES[lang]),
                    })} · {d.downloadHint}
                  </p>
                  {table.rows.length === 0 ? (
                    <p className="xl-empty">{d.emptyResult}</p>
                  ) : (
                    <div className="xl-table-wrap">
                      <table className="xl-table">
                        <thead>
                          <tr>{table.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
                        </thead>
                        <tbody>
                          {table.rows.slice(0, PREVIEW_ROWS).map((row, ri) => {
                            const flagged = statusCols.some((i) => row[i] !== null && row[i] !== 'OK' && row[i] !== '')
                            return (
                              <tr key={ri} className={flagged ? 'flagged' : undefined}>
                                {row.map((v, ci) => {
                                  const isStatus = statusCols.includes(ci)
                                  const cls = typeof v === 'number' ? 'num'
                                    : isStatus && v === 'OK' ? 'good'
                                    : isStatus && v !== null && v !== '' ? 'bad' : undefined
                                  const text = formatCell(v, table.formats[table.columns[ci]], lang)
                                  return <td key={ci} className={cls} title={text.length > 30 ? text : undefined}>{text}</td>
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="xl-card">
                  <span className="xl-label">{d.askTitle}</span>
                  {messages.length > 0 && (
                    <div className="xl-chat" aria-live="polite">
                      {messages.map((m, i) => (
                        <div key={i} className={`xl-msg ${m.role}`}>
                          <b>{m.role === 'user' ? d.you : d.ai}</b>
                          {m.content}
                        </div>
                      ))}
                      {asking && <div className="xl-msg"><b>{d.ai}</b>{d.thinking}</div>}
                    </div>
                  )}
                  <form className="xl-row" style={{ marginTop: 0 }} onSubmit={(e) => { e.preventDefault(); void ask(question) }}>
                    <input
                      className="xl-input"
                      value={question}
                      placeholder={d.askPlaceholder}
                      onChange={(e) => setQuestion(e.target.value)}
                      aria-label={d.askTitle}
                    />
                    <button type="submit" className="xl-btn" aria-busy={asking}>{d.ask}</button>
                    <button type="button" className="xl-btn" onClick={() => void ask(d.explainPrompt)} aria-busy={asking}>{d.explain}</button>
                  </form>
                  {chatError && <p className="xl-error">{d[chatError]}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
