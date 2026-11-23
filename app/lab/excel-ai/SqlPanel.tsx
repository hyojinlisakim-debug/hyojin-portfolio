'use client'
import { useMemo, useRef, useState } from 'react'
import type { Cell, Lang, Table, Workbook } from '@/lib/excel-ai/types'
import { type Dict, LOCALES, fmt } from '@/lib/excel-ai/i18n'
import { summarize } from '@/lib/excel-ai/ops'
import { writeXlsx } from '@/lib/excel-ai/xlsx'
import { type QueryResult, type SqlDb, buildDatabase, loadSqlJs, planTables, quoteIdent, runSql } from '@/lib/excel-ai/sqlite'
import { SQL_EXAMPLES } from '@/lib/excel-ai/sql-examples'
import SqlHelper from './SqlHelper'
import CodeEditor from './CodeEditor'

const PREVIEW = 200
const isPlainIdent = (s: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s)

type Props = {
  wb: Workbook
  result: Table
  lang: Lang
  d: Dict
  sample: 'utility' | 'sap' | null
  formatCell: (v: Cell, lang: Lang) => string
}

type ErrKey = 'sqlLoadError' | 'errNotConfigured' | 'errRateLimited' | 'errFailed' | 'errLocked' | 'errEmptyRequest'

export default function SqlPanel({ wb, result, lang, d, sample, formatCell }: Props) {
  const [sql, setSql] = useState('SELECT *\nFROM result\nLIMIT 100;')
  const [running, setRunning] = useState(false)
  const [engineLoading, setEngineLoading] = useState(false)
  const [out, setOut] = useState<QueryResult | null>(null)
  const [sqlError, setSqlError] = useState<string | null>(null)
  const [errKey, setErrKey] = useState<ErrKey | null>(null)
  const [ask, setAsk] = useState('')
  const [asking, setAsking] = useState(false)
  const [aiNote, setAiNote] = useState('')
  const [mode, setMode] = useState<'write' | 'build' | 'learn'>('write')
  const editor = useRef<HTMLTextAreaElement>(null)
  const cache = useRef<{ wb: Workbook; result: Table; db: SqlDb } | null>(null)

  const tables = useMemo(() => planTables(wb.sheets, result), [wb, result])
  const tableNames = useMemo(() => tables.map((t) => t.name), [tables])
  const examples = sample ? SQL_EXAMPLES[sample] : []

  function insert(text: string) {
    const el = editor.current
    if (!el) { setSql((s) => s + text); return }
    const start = el.selectionStart ?? sql.length
    const end = el.selectionEnd ?? sql.length
    const next = sql.slice(0, start) + text + sql.slice(end)
    setSql(next)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = start + text.length
    })
  }

  async function getDb(): Promise<SqlDb> {
    const c = cache.current
    if (c && c.wb === wb && c.result === result) return c.db
    setEngineLoading(true)
    try {
      const SQL = await loadSqlJs()
      c?.db.close()
      const db = buildDatabase(SQL, wb.sheets, result)
      cache.current = { wb, result, db }
      return db
    } finally {
      setEngineLoading(false)
    }
  }

  async function run(query = sql) {
    if (running || !query.trim()) return
    setRunning(true)
    setSqlError(null)
    setErrKey(null)
    try {
      let db: SqlDb
      try {
        db = await getDb()
      } catch {
        setErrKey('sqlLoadError')
        return
      }
      try {
        setOut(runSql(db, query))
      } catch (e) {
        setOut(null)
        setSqlError(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setRunning(false)
    }
  }

  async function writeWithAi() {
    const req = ask.trim()
    if (!req) { setErrKey('errEmptyRequest'); return }
    if (asking) return
    setAsking(true)
    setErrKey(null)
    setAiNote('')
    try {
      const context = {
        tables: tables.slice(0, 10).map((t) => ({
          name: t.name,
          source_sheet: t.source,
          rows: t.rows,
          columns: summarize(t.table, 3).columns.slice(0, 50).map((c) => ({ name: c.name, type: c.type, samples: c.samples })),
        })),
      }
      const res = await fetch('/api/excel-ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'sql', lang, request: req, context }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrKey(data?.error === 'not_configured' ? 'errNotConfigured' : data?.error === 'rate_limited' ? 'errRateLimited' : data?.error === 'locked' ? 'errLocked' : 'errFailed')
        return
      }
      setAiNote(typeof data.explanation === 'string' ? data.explanation : '')
      if (typeof data.sql === 'string' && data.sql) {
        setSql(data.sql)
        void run(data.sql)
      }
    } catch {
      setErrKey('errFailed')
    } finally {
      setAsking(false)
    }
  }

  function download() {
    if (!out) return
    const query: Table = { name: 'Query', columns: out.columns, rows: out.rows, formulas: {}, formats: {} }
    const text: Table = { name: 'SQL', columns: ['SQL'], rows: sql.split('\n').map((l) => [l]), formulas: {}, formats: {} }
    const bytes = writeXlsx([{ table: query }, { table: text }])
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${wb.fileName.replace(/\.[^.]+$/, '')}_query.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const n = (x: number) => x.toLocaleString(LOCALES[lang])

  return (
    <div className="xl-card">
      <span className="xl-label">{d.sqlTitle}</span>
      <p className="xl-meta" style={{ marginTop: 0 }}>{d.sqlDesc}</p>
      <div className="xl-tabs" role="tablist" aria-label={d.sqlTitle}>
        {(['write', 'build', 'learn'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} className="xl-tab" onClick={() => setMode(m)}>
            {m === 'write' ? d.sqlModeWrite : m === 'build' ? d.sqlModeBuild : d.sqlModeLearn}
          </button>
        ))}
      </div>
      {mode !== 'write' && (
        <SqlHelper
          key={`${mode}-${tables.map((t) => t.name).join('|')}`}
          mode={mode}
          tables={tables}
          tableNames={tableNames}
          d={d}
          onUse={(q) => { setSql(q); setAiNote(''); setMode('write'); void run(q) }}
        />
      )}
      <div className="xl-sql" hidden={mode !== 'write'}>
        <aside className="xl-schema" aria-label={d.sqlTables}>
          <p className="xl-meta" style={{ margin: '0 0 0.5rem' }}>{d.sqlInsertHint}</p>
          {tables.map((t) => (
            <details key={t.name} open={t.name === 'result'}>
              <summary>
                <button type="button" className="xl-ident" onClick={() => insert(t.name)}>{t.name}</button>
                <span className="xl-schema-rows">{n(t.rows)} {d.sqlRows}</span>
              </summary>
              <ul>
                {t.columns.map((c) => (
                  <li key={c}>
                    <button type="button" className="xl-ident col" onClick={() => insert(isPlainIdent(c) ? c : quoteIdent(c))}>{c}</button>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </aside>
        <div style={{ minWidth: 0 }}>
          <CodeEditor
            value={sql}
            onChange={setSql}
            onRun={() => void run()}
            tables={tableNames}
            textareaRef={editor}
            label="SQL"
            runHint={d.sqlRunHint}
            lineCountLabel={d.sqlLines}
          />
          <div className="xl-row">
            <button type="button" className="xl-btn primary" onClick={() => void run()} aria-busy={running}>
              {engineLoading ? d.sqlLoading : running ? d.sqlRunning : d.sqlRun}
            </button>
            {out && out.columns.length > 0 && (
              <button type="button" className="xl-btn" onClick={download}>{d.sqlDownload}</button>
            )}
          </div>
          {examples.length > 0 && (
            <>
              <p className="xl-meta" style={{ marginBottom: 0 }}>{d.sqlExamples}</p>
              <div className="xl-chips">
                {examples.map((x) => (
                  <button key={x.id} type="button" className="xl-chip" onClick={() => { setSql(x.sql); setAiNote(''); void run(x.sql) }}>
                    {x.label[lang]}
                  </button>
                ))}
              </div>
            </>
          )}
          <form className="xl-row" onSubmit={(e) => { e.preventDefault(); void writeWithAi() }}>
            <input
              className="xl-input"
              value={ask}
              placeholder={d.sqlAiPlaceholder}
              aria-label={d.sqlAiLabel}
              onChange={(e) => { setAsk(e.target.value); if (errKey === 'errEmptyRequest') setErrKey(null) }}
            />
            <button type="submit" className="xl-btn" aria-busy={asking}>{asking ? d.sqlAiWorking : d.sqlAiButton}</button>
          </form>
          <div aria-live="polite">
            {aiNote && <p className="xl-expl" style={{ marginTop: '0.75rem' }}>{aiNote}</p>}
            {errKey && <p className="xl-error">{d[errKey]}</p>}
            {sqlError && <p className="xl-error" style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{fmt(d.sqlError, { msg: sqlError })}</p>}
          </div>
        </div>
      </div>

      {out && (
        <div aria-live="polite" style={{ marginTop: '1rem' }}>
          {out.columns.length === 0 ? (
            <p className="xl-empty">{d.sqlNoResult}</p>
          ) : (
            <>
              <p className="xl-meta">
                {fmt(d.sqlStats, { n: n(out.rows.length), ms: out.ms })}
                {out.rows.length > PREVIEW && ` · ${fmt(d.sqlShowing, { n: PREVIEW })}`}
              </p>
              {out.rows.length === 0 ? (
                <p className="xl-empty">{d.sqlEmpty}</p>
              ) : (
                <div className="xl-table-wrap" style={{ maxHeight: 420 }}>
                  <table className="xl-table">
                    <thead>
                      <tr>{out.columns.map((c, i) => <th key={`${c}-${i}`} scope="col">{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {out.rows.slice(0, PREVIEW).map((row, ri) => (
                        <tr key={ri}>
                          {row.map((v, ci) => <td key={ci} className={typeof v === 'number' ? 'num' : undefined}>{formatCell(v, lang)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
