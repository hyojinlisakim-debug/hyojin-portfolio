export type Cell = string | number | boolean | null

export type ColumnFormat = 'number' | 'currency' | 'percent'

export type Table = {
  name: string
  columns: string[]
  rows: Cell[][]
  /** Column name → row-level expression, kept so the export can write live Excel formulas. */
  formulas: Record<string, string>
  formats: Record<string, ColumnFormat>
  /** Rows above the header in the original sheet (report titles), for Power Query. */
  skipRows?: number
}

export type Workbook = {
  fileName: string
  sheets: Table[]
}

export type Lang = 'en' | 'ko' | 'fr'

export const MAX_ROWS = 50_000
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export function emptyTable(name: string, columns: string[] = []): Table {
  return { name, columns, rows: [], formulas: {}, formats: {} }
}

export function cloneTable(t: Table): Table {
  return {
    name: t.name,
    columns: [...t.columns],
    rows: t.rows.map((r) => [...r]),
    formulas: { ...t.formulas },
    formats: { ...t.formats },
    skipRows: t.skipRows,
  }
}

export function columnLetter(index: number): string {
  let n = index + 1
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export function isBlank(v: Cell): boolean {
  return v === null || (typeof v === 'string' && v.trim() === '')
}

export function toNumber(v: Cell): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'boolean') return v ? 1 : 0
  if (v === null) return 0
  const s = v.trim().replace(/[$,\s]/g, '')
  if (s === '') return 0
  const pct = s.endsWith('%')
  const n = Number(pct ? s.slice(0, -1) : s)
  if (!Number.isFinite(n)) return null
  return pct ? n / 100 : n
}

/** Normalised key for case/space-insensitive matching (lookups, reconciliation, duplicates). */
export function keyOf(v: Cell): string {
  if (v === null) return ''
  if (typeof v === 'number') return String(Math.round(v * 1e9) / 1e9)
  return String(v).trim().toLowerCase()
}

export function quoteSheet(name: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `'${name.replace(/'/g, "''")}'`
}
