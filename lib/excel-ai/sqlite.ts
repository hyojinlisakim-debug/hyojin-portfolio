/**
 * In-browser SQLite (sql.js 1.17.0, MIT, vendored in /public/sql) loaded only when
 * the SQL panel is used. Every sheet becomes a table, plus "result" for the
 * current processed table. Nothing leaves the browser.
 */
import type { Cell, Table } from './types'

type Exec = { columns: string[]; values: (string | number | Uint8Array | null)[][] }
type Stmt = { run(params: (string | number | null)[]): void; free(): void }
export type SqlDb = { run(sql: string): void; exec(sql: string): Exec[]; prepare(sql: string): Stmt; close(): void }
type SqlJs = { Database: new () => SqlDb }

declare global {
  interface Window { initSqlJs?: (config: { locateFile: (file: string) => string }) => Promise<SqlJs> }
}

let loading: Promise<SqlJs> | null = null

export function loadSqlJs(): Promise<SqlJs> {
  if (loading) return loading
  loading = new Promise<SqlJs>((resolve, reject) => {
    const init = () => window.initSqlJs!({ locateFile: (f) => `/sql/${f}` }).then(resolve, reject)
    if (window.initSqlJs) { init(); return }
    const s = document.createElement('script')
    s.src = '/sql/sql-wasm.js'
    s.async = true
    s.onload = () => (window.initSqlJs ? init() : reject(new Error('sql.js missing')))
    s.onerror = () => reject(new Error('sql.js failed to load'))
    document.head.appendChild(s)
  })
  loading.catch(() => { loading = null })
  return loading
}

/** Table names that need no quoting: letters, digits, underscore. */
export function sqlName(name: string): string {
  let n = name.trim().replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
  if (!n) n = 'sheet'
  if (/^\d/.test(n)) n = `t_${n}`
  return n
}

export const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`

export type SqlTableInfo = { name: string; source: string; columns: string[]; rows: number }

const toSql = (v: Cell): string | number | null => (v === null ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v)

/** Table names and columns as they will appear in SQL (no engine needed). */
export function planTables(sheets: Table[], result: Table): (SqlTableInfo & { table: Table })[] {
  const used = new Set<string>(['result'])
  const out: (SqlTableInfo & { table: Table })[] = []
  if (result.columns.length) out.push({ name: 'result', source: result.name, columns: result.columns, rows: result.rows.length, table: result })
  for (const s of sheets) {
    if (!s.columns.length) continue
    let n = sqlName(s.name)
    let k = 2
    const base = n
    while (used.has(n.toLowerCase())) n = `${base}_${k++}`
    used.add(n.toLowerCase())
    out.push({ name: n, source: s.name, columns: s.columns, rows: s.rows.length, table: s })
  }
  return out
}

export function buildDatabase(SQL: SqlJs, sheets: Table[], result: Table): SqlDb {
  const db = new SQL.Database()
  for (const { name, table: t } of planTables(sheets, result)) {
    db.run(`CREATE TABLE ${quoteIdent(name)} (${t.columns.map(quoteIdent).join(', ')})`)
    const stmt = db.prepare(`INSERT INTO ${quoteIdent(name)} VALUES (${t.columns.map(() => '?').join(', ')})`)
    db.run('BEGIN')
    for (const row of t.rows) stmt.run(t.columns.map((_, i) => toSql(row[i] ?? null)))
    db.run('COMMIT')
    stmt.free()
  }
  return db
}

export type QueryResult = { columns: string[]; rows: Cell[][]; ms: number }

export function runSql(db: SqlDb, sql: string, maxRows = 50_000): QueryResult {
  const t0 = performance.now()
  const out = db.exec(sql)
  const last = [...out].reverse().find((r) => r.columns.length) ?? { columns: [], values: [] }
  const rows = last.values.slice(0, maxRows).map((r) => r.map((v) => (v instanceof Uint8Array ? `[${v.length} bytes]` : v)))
  return { columns: last.columns, rows, ms: Math.round(performance.now() - t0) }
}
