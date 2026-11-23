/**
 * The operation engine. The AI only ever proposes a list of these JSON steps;
 * every number on screen is computed here, deterministically, in the browser.
 */
import {
  type Cell, type ColumnFormat, type Table, type Workbook,
  cloneTable, columnLetter, isBlank, keyOf, quoteSheet, toNumber,
} from './types'
import { ExpressionError, bindColumns, columnsUsed, evaluate, parse, toExcel, toSource } from './expression'

export type Aggregation = { column?: string; func: 'sum' | 'average' | 'count' | 'min' | 'max' | 'count_distinct'; as?: string }

export type Op =
  | { op: 'use_sheet'; sheet: string }
  | { op: 'trim'; columns: string[] }
  | { op: 'change_case'; columns: string[]; case: 'upper' | 'lower' }
  | { op: 'standardize_id'; column: string; prefix: string; digits: number }
  | { op: 'replace_values'; column: string; mapping: { from: string; to: string }[] }
  | { op: 'fill_missing'; column: string; value: string | number }
  | { op: 'remove_duplicates'; columns?: string[] }
  | { op: 'filter'; where: string }
  | { op: 'sort'; by: { column: string; direction: 'asc' | 'desc' }[] }
  | { op: 'add_column'; name: string; expression: string; format?: ColumnFormat }
  | { op: 'lookup'; from_sheet: string; match_column: string; from_key: string; columns: string[] }
  | { op: 'group_by'; by: string[]; aggregations: Aggregation[] }
  | { op: 'reconcile'; with_sheet: string; keys: { left: string; right: string }[]; left_value: string; right_value: string; tolerance_pct?: number }
  | { op: 'select_columns'; columns: string[] }
  | { op: 'rename_column'; from: string; to: string }
  | { op: 'limit'; rows: number }
  | { op: 'convert_number'; columns: string[]; style?: 'auto' | 'us' | 'eu' }
  | { op: 'convert_date'; columns: string[]; order?: 'auto' | 'dmy' | 'mdy' | 'ymd' }
  | { op: 'remove_report_rows' }
  | { op: 'pivot'; rows: string[]; columns: string; value: string; func?: 'sum' | 'count' | 'average' }

export const OP_NAMES: Op['op'][] = [
  'use_sheet', 'trim', 'change_case', 'standardize_id', 'replace_values', 'fill_missing',
  'remove_duplicates', 'filter', 'sort', 'add_column', 'lookup', 'group_by', 'reconcile',
  'select_columns', 'rename_column', 'limit', 'convert_number', 'convert_date', 'remove_report_rows', 'pivot',
]

export type StepResult = {
  ok: boolean
  error?: string
  rowsBefore: number
  rowsAfter: number
  /** Count of rows the step changed or removed, when meaningful. */
  affected?: number
  excel?: string
}

export class StepError extends Error {}

// ── Validation of AI output ────────────────────────────────

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const strArr = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.every(isStr)

/** Turn untrusted JSON into a typed Op, or explain why it is invalid. */
export function validateOp(raw: unknown): Op | string {
  if (typeof raw !== 'object' || raw === null) return 'Step is not an object'
  const o = raw as Record<string, unknown>
  switch (o.op) {
    case 'use_sheet': return isStr(o.sheet) ? { op: 'use_sheet', sheet: o.sheet } : 'use_sheet needs "sheet"'
    case 'trim': return strArr(o.columns) ? { op: 'trim', columns: o.columns } : 'trim needs "columns"'
    case 'change_case':
      return strArr(o.columns) && (o.case === 'upper' || o.case === 'lower')
        ? { op: 'change_case', columns: o.columns, case: o.case } : 'change_case needs "columns" and "case"'
    case 'standardize_id': {
      const digits = Number(o.digits)
      return isStr(o.column) && typeof o.prefix === 'string' && Number.isInteger(digits) && digits > 0 && digits <= 20
        ? { op: 'standardize_id', column: o.column, prefix: o.prefix, digits } : 'standardize_id needs "column", "prefix", "digits"'
    }
    case 'replace_values': {
      const m = o.mapping
      if (!isStr(o.column) || !Array.isArray(m) || m.length === 0) return 'replace_values needs "column" and "mapping"'
      const mapping = m.filter((x): x is { from: unknown; to: unknown } => typeof x === 'object' && x !== null)
        .map((x) => ({ from: String(x.from ?? ''), to: String(x.to ?? '') }))
      return { op: 'replace_values', column: o.column, mapping }
    }
    case 'fill_missing':
      return isStr(o.column) && (typeof o.value === 'string' || typeof o.value === 'number')
        ? { op: 'fill_missing', column: o.column, value: o.value } : 'fill_missing needs "column" and "value"'
    case 'remove_duplicates':
      return o.columns === undefined || (Array.isArray(o.columns) && o.columns.length === 0)
        ? { op: 'remove_duplicates' }
        : strArr(o.columns) ? { op: 'remove_duplicates', columns: o.columns } : 'remove_duplicates "columns" must be a list'
    case 'filter': return isStr(o.where) ? { op: 'filter', where: o.where } : 'filter needs "where"'
    case 'sort': {
      if (!Array.isArray(o.by) || o.by.length === 0) return 'sort needs "by"'
      const by = o.by.map((b) => {
        const r = (b ?? {}) as Record<string, unknown>
        return { column: String(r.column ?? ''), direction: r.direction === 'desc' ? 'desc' as const : 'asc' as const }
      })
      return by.every((b) => b.column) ? { op: 'sort', by } : 'sort columns missing'
    }
    case 'add_column': {
      const format = o.format === 'currency' || o.format === 'percent' || o.format === 'number' ? o.format : undefined
      return isStr(o.name) && isStr(o.expression)
        ? { op: 'add_column', name: o.name.trim(), expression: o.expression, format } : 'add_column needs "name" and "expression"'
    }
    case 'lookup':
      return isStr(o.from_sheet) && isStr(o.match_column) && isStr(o.from_key) && strArr(o.columns)
        ? { op: 'lookup', from_sheet: o.from_sheet, match_column: o.match_column, from_key: o.from_key, columns: o.columns }
        : 'lookup needs "from_sheet", "match_column", "from_key", "columns"'
    case 'group_by': {
      if (!strArr(o.by) || !Array.isArray(o.aggregations) || o.aggregations.length === 0) return 'group_by needs "by" and "aggregations"'
      const funcs = ['sum', 'average', 'count', 'min', 'max', 'count_distinct']
      const aggs: Aggregation[] = []
      for (const a of o.aggregations) {
        const r = (a ?? {}) as Record<string, unknown>
        const func = r.func === 'avg' || r.func === 'mean' ? 'average' : r.func
        if (typeof func !== 'string' || !funcs.includes(func)) return `Unknown aggregation "${String(r.func)}"`
        if (func !== 'count' && !isStr(r.column)) return `${func} needs a column`
        aggs.push({ func: func as Aggregation['func'], column: isStr(r.column) ? r.column : undefined, as: isStr(r.as) ? r.as : undefined })
      }
      return { op: 'group_by', by: o.by, aggregations: aggs }
    }
    case 'reconcile': {
      if (!isStr(o.with_sheet) || !isStr(o.left_value) || !isStr(o.right_value) || !Array.isArray(o.keys) || o.keys.length === 0) {
        return 'reconcile needs "with_sheet", "keys", "left_value", "right_value"'
      }
      const keys = o.keys.map((k) => {
        const r = (k ?? {}) as Record<string, unknown>
        return { left: String(r.left ?? ''), right: String(r.right ?? r.left ?? '') }
      })
      if (keys.some((k) => !k.left || !k.right)) return 'reconcile keys need "left" and "right"'
      const tol = Number(o.tolerance_pct)
      return {
        op: 'reconcile', with_sheet: o.with_sheet, keys, left_value: o.left_value, right_value: o.right_value,
        tolerance_pct: Number.isFinite(tol) && tol >= 0 ? tol : 0,
      }
    }
    case 'select_columns': return strArr(o.columns) ? { op: 'select_columns', columns: o.columns } : 'select_columns needs "columns"'
    case 'rename_column': return isStr(o.from) && isStr(o.to) ? { op: 'rename_column', from: o.from, to: o.to.trim() } : 'rename_column needs "from" and "to"'
    case 'limit': {
      const n = Number(o.rows)
      return Number.isInteger(n) && n > 0 ? { op: 'limit', rows: n } : 'limit needs a positive "rows"'
    }
    case 'convert_number': {
      const style = o.style === 'us' || o.style === 'eu' ? o.style : 'auto'
      return strArr(o.columns) ? { op: 'convert_number', columns: o.columns, style } : 'convert_number needs "columns"'
    }
    case 'convert_date': {
      const order = o.order === 'dmy' || o.order === 'mdy' || o.order === 'ymd' ? o.order : 'auto'
      return strArr(o.columns) ? { op: 'convert_date', columns: o.columns, order } : 'convert_date needs "columns"'
    }
    case 'remove_report_rows': return { op: 'remove_report_rows' }
    case 'pivot': {
      const func = o.func === 'count' || o.func === 'average' ? o.func : 'sum'
      return strArr(o.rows) && isStr(o.columns) && isStr(o.value)
        ? { op: 'pivot', rows: o.rows, columns: o.columns, value: o.value, func } : 'pivot needs "rows", "columns", "value"'
    }
  }
  return `Unknown step "${String(o.op)}"`
}


// ── Parsing helpers for report exports (SAP and similar) ──

/**
 * Read numbers the way ERP exports write them: "1,234.50-" (SAP trailing minus),
 * "(1,234.50)", "1.234,50" (European), "$ 1 234,50", "12.5%".
 */
export function parseLooseNumber(v: Cell, style: 'auto' | 'us' | 'eu' = 'auto'): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  let s = v.trim()
  if (!s) return null
  let neg = false
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1).trim() }
  if (s.endsWith('-')) { neg = !neg; s = s.slice(0, -1).trim() }
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1).trim() }
  else if (s.startsWith('+')) s = s.slice(1).trim()
  const pct = s.endsWith('%')
  if (pct) s = s.slice(0, -1).trim()
  s = s.replace(/^[A-Z]{3}\s*|\s*[A-Z]{3}$|[$€£₩]/g, '').replace(/[\s\u00a0\u202f']/g, '')
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null
  const lastDot = s.lastIndexOf('.'), lastComma = s.lastIndexOf(',')
  let decimal: '.' | ',' | null
  if (style === 'us') decimal = '.'
  else if (style === 'eu') decimal = ','
  else if (lastDot >= 0 && lastComma >= 0) decimal = lastDot > lastComma ? '.' : ','
  else if (lastComma >= 0) decimal = /^\d{1,3}(,\d{3})+$/.test(s) ? null : ','
  else if (lastDot >= 0) decimal = /^\d{1,3}(\.\d{3}){2,}$/.test(s) ? null : '.'
  else decimal = null
  const normalised = decimal === ','
    ? s.replace(/\./g, '').replace(',', '.')
    : s.replace(/,/g, '')
  if ((normalised.match(/\./g) ?? []).length > 1) return null
  const n = Number(normalised)
  if (!Number.isFinite(n)) return null
  const out = (neg ? -n : n) / (pct ? 100 : 1)
  return Math.round(out * 1e9) / 1e9
}

/** Read dates as ERP exports write them: 31.05.2026, 20260531, 05/31/2026, 2026-05-31. Returns YYYY-MM-DD. */
export function parseLooseDate(v: Cell, order: 'auto' | 'dmy' | 'mdy' | 'ymd' = 'auto'): string | null {
  if (v === null || typeof v === 'boolean') return null
  const s = String(v).trim()
  const pad = (n: number) => String(n).padStart(2, '0')
  const ok = (y: number, m: number, d: number) => {
    if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null
    const dt = new Date(Date.UTC(y, m - 1, d))
    return dt.getUTCMonth() === m - 1 ? `${y}-${pad(m)}-${pad(d)}` : null
  }
  let m = /^(\d{4})(\d{2})(\d{2})$/.exec(s)
  if (m) return ok(+m[1], +m[2], +m[3])
  m = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:[ T].*)?$/.exec(s)
  if (m) return ok(+m[1], +m[2], +m[3])
  m = /^(\d{1,2})([-./])(\d{1,2})\2(\d{2}|\d{4})(?:\s.*)?$/.exec(s)
  if (m) {
    const a = +m[1], b = +m[3]
    let y = +m[4]
    if (y < 100) y += 2000
    let dmy: boolean
    if (order === 'dmy') dmy = true
    else if (order === 'mdy') dmy = false
    else if (a > 12) dmy = true
    else if (b > 12) dmy = false
    else dmy = m[2] !== '/'
    return dmy ? ok(y, b, a) : ok(y, a, b)
  }
  return null
}

const REPORT_ROW = /^\s*(\*+|(grand\s+|sub-?)?totals?\b|result\b|summe\b)/i

/** Subtotal lines ("*", "Total", "Result") and page-break repeats of the header row. */
export function isReportRow(row: Cell[], columns: string[]): boolean {
  const strings = row.filter((c): c is string => typeof c === 'string')
  if (strings.some((c) => REPORT_ROW.test(c))) return true
  const headerHits = row.filter((c, i) => typeof c === 'string' && keyOf(c) === keyOf(columns[i])).length
  return headerHits >= Math.max(2, Math.ceil(columns.length * 0.6))
}

// ── Helpers ────────────────────────────────────────────────

function col(t: Table, name: string): number {
  const exact = t.columns.indexOf(name)
  if (exact >= 0) return exact
  const ci = t.columns.findIndex((c) => c.toLowerCase() === name.trim().toLowerCase())
  if (ci >= 0) return ci
  throw new StepError(`Column "${name}" not found in ${t.name}`)
}

function sheet(wb: Workbook, name: string): Table {
  const s = wb.sheets.find((x) => x.name === name) ?? wb.sheets.find((x) => x.name.toLowerCase() === name.trim().toLowerCase())
  if (!s) throw new StepError(`Sheet "${name}" not found`)
  return s
}

function indexOf(t: Table): Record<string, number> {
  const idx: Record<string, number> = {}
  t.columns.forEach((c, i) => { idx[c] = i })
  return idx
}

function compileExpr(src: string, t: Table) {
  try {
    return bindColumns(parse(src, t.columns), t.columns)
  } catch (e) {
    throw new StepError(e instanceof ExpressionError ? e.message : 'Invalid expression')
  }
}

/** Values in a column changed: any stored formula for it no longer describes the data. */
function dropFormula(t: Table, name: string) {
  delete t.formulas[name]
}

function uniqueName(t: Table, wanted: string): string {
  if (!t.columns.includes(wanted)) return wanted
  let i = 2
  while (t.columns.includes(`${wanted}_${i}`)) i++
  return `${wanted}_${i}`
}

const cellRef = (t: Table, name: string, row = 2) => `${columnLetter(col(t, name))}${row}`
const rangeRef = (t: Table, name: string) => {
  const L = columnLetter(col(t, name))
  return `${L}2:${L}${t.rows.length + 1}`
}
const wholeCol = (t: Table, name: string, sheetName?: string) => {
  const L = columnLetter(col(t, name))
  return `${sheetName ? quoteSheet(sheetName) + '!' : ''}${L}:${L}`
}

// ── Execution ──────────────────────────────────────────────

/** Run one step against the current table (mutates and returns it, or a new table). */
export function applyOp(wb: Workbook, current: Table, op: Op): { table: Table; affected?: number; excel?: string } {
  const t = current
  switch (op.op) {
    case 'use_sheet': {
      return { table: cloneTable(sheet(wb, op.sheet)) }
    }
    case 'trim':
    case 'change_case': {
      let affected = 0
      const idxs = op.columns.map((c) => col(t, c))
      for (const row of t.rows) {
        for (const i of idxs) {
          const v = row[i]
          if (typeof v !== 'string') continue
          const next = op.op === 'trim' ? v.trim().replace(/\s+/g, ' ') : op.case === 'upper' ? v.toUpperCase() : v.toLowerCase()
          if (next !== v) { row[i] = next; affected++ }
        }
      }
      idxs.forEach((i) => dropFormula(t, t.columns[i]))
      const fn = op.op === 'trim' ? 'TRIM' : op.case === 'upper' ? 'UPPER' : 'LOWER'
      return { table: t, affected, excel: `=${fn}(${cellRef(t, t.columns[idxs[0]])})` }
    }
    case 'standardize_id': {
      const i = col(t, op.column)
      let affected = 0
      const prefix = op.prefix.toUpperCase()
      for (const row of t.rows) {
        const v = row[i]
        if (v === null) continue
        const digits = String(v).replace(/\D/g, '')
        if (!digits) continue
        const next = prefix + digits.replace(/^0+(?=\d)/, '').padStart(op.digits, '0')
        if (next !== v) { row[i] = next; affected++ }
      }
      dropFormula(t, t.columns[i])
      const ref = cellRef(t, t.columns[i])
      const inner = prefix ? `SUBSTITUTE(UPPER(TRIM(${ref})),"${prefix}","")` : `TRIM(${ref})`
      return { table: t, affected, excel: `="${prefix}"&TEXT(VALUE(${inner}),"${'0'.repeat(op.digits)}")` }
    }
    case 'replace_values': {
      const i = col(t, op.column)
      const map = new Map(op.mapping.map((m) => [keyOf(m.from), m.to]))
      let affected = 0
      for (const row of t.rows) {
        const hit = map.get(keyOf(row[i]))
        if (hit !== undefined && row[i] !== hit) { row[i] = hit; affected++ }
      }
      dropFormula(t, t.columns[i])
      const ref = cellRef(t, t.columns[i])
      const pairs = op.mapping.slice(0, 4).map((m) => `"${m.from}","${m.to}"`).join(',')
      return { table: t, affected, excel: `=SWITCH(TRIM(${ref}),${pairs},${ref})` }
    }
    case 'fill_missing': {
      const i = col(t, op.column)
      let affected = 0
      for (const row of t.rows) {
        if (isBlank(row[i])) { row[i] = op.value; affected++ }
      }
      dropFormula(t, t.columns[i])
      const ref = cellRef(t, t.columns[i])
      const val = typeof op.value === 'number' ? op.value : `"${op.value}"`
      return { table: t, affected, excel: `=IF(ISBLANK(${ref}),${val},${ref})` }
    }
    case 'remove_duplicates': {
      const idxs = op.columns ? op.columns.map((c) => col(t, c)) : t.columns.map((_, i) => i)
      const seen = new Set<string>()
      const before = t.rows.length
      t.rows = t.rows.filter((row) => {
        const k = idxs.map((i) => keyOf(row[i])).join('\u0001')
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      const shown = idxs.slice(0, 3).map((i) => `${wholeCol(t, t.columns[i])},${cellRef(t, t.columns[i])}`).join(',')
      return { table: t, affected: before - t.rows.length, excel: `=COUNTIFS(${shown})>1` }
    }
    case 'filter': {
      const node = compileExpr(op.where, t)
      const idx = indexOf(t)
      const excel = `=FILTER(A2:${columnLetter(t.columns.length - 1)}${t.rows.length + 1},${toExcel(node, (c) => rangeRef(t, c))})`
      const before = t.rows.length
      t.rows = t.rows.filter((row) => {
        const v = evaluate(node, row, idx)
        return v === true || (typeof v === 'number' && v !== 0)
      })
      return { table: t, affected: before - t.rows.length, excel }
    }
    case 'sort': {
      const keys = op.by.map((b) => ({ i: col(t, b.column), dir: b.direction === 'desc' ? -1 : 1 }))
      const excel = `=SORTBY(A2:${columnLetter(t.columns.length - 1)}${t.rows.length + 1},${keys
        .map((k) => `${rangeRef(t, t.columns[k.i])},${k.dir}`).join(',')})`
      t.rows.sort((a, b) => {
        for (const k of keys) {
          const x = a[k.i], y = b[k.i]
          if (x === y) continue
          if (x === null) return 1
          if (y === null) return -1
          const nx = typeof x === 'number' ? x : null, ny = typeof y === 'number' ? y : null
          const c = nx !== null && ny !== null ? nx - ny : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' })
          if (c !== 0) return c * k.dir
        }
        return 0
      })
      return { table: t, excel }
    }
    case 'add_column': {
      const node = compileExpr(op.expression, t)
      const idx = indexOf(t)
      const name = t.columns.includes(op.name) ? op.name : uniqueName(t, op.name)
      const existing = t.columns.indexOf(name)
      let errors = 0
      const values = t.rows.map((row) => {
        const v = evaluate(node, row, idx)
        if (v === null) errors++
        return v
      })
      if (existing >= 0) t.rows.forEach((row, r) => { row[existing] = values[r] })
      else { t.columns.push(name); t.rows.forEach((row, r) => row.push(values[r])) }
      t.formulas[name] = toSource(node)
      if (op.format) t.formats[name] = op.format
      else delete t.formats[name]
      return { table: t, affected: errors, excel: `=${toExcel(node, (c) => cellRef(t, c))}` }
    }
    case 'lookup': {
      const src = sheet(wb, op.from_sheet)
      const mi = col(t, op.match_column)
      const ki = col(src, op.from_key)
      const bring = op.columns.map((c) => col(src, c))
      const map = new Map<string, Cell[]>()
      for (const row of src.rows) {
        const k = keyOf(row[ki])
        if (!map.has(k)) map.set(k, row)
      }
      let missing = 0
      const reserved: string[] = []
      for (const bi of bring) {
        const name = uniqueName({ ...t, columns: [...t.columns, ...reserved] }, src.columns[bi])
        reserved.push(name)
      }
      for (const row of t.rows) {
        const hit = map.get(keyOf(row[mi]))
        if (!hit) missing++
        for (const bi of bring) row.push(hit ? hit[bi] ?? null : null)
      }
      t.columns.push(...reserved)
      reserved.forEach((n, j) => {
        const f = src.formats[src.columns[bring[j]]]
        if (f) t.formats[n] = f
      })
      const first = bring[0]
      const key = cellRef(t, t.columns[mi])
      const sheetRef = quoteSheet(src.name)
      const lines: string[] = []
      // VLOOKUP only looks to the right of the key column; otherwise show XLOOKUP / INDEX-MATCH.
      if (first > ki) {
        lines.push(`=VLOOKUP(${key},${sheetRef}!$${columnLetter(ki)}:$${columnLetter(first)},${first - ki + 1},FALSE)`)
      }
      lines.push(`=XLOOKUP(${key},${wholeCol(src, src.columns[ki], src.name)},${wholeCol(src, src.columns[first], src.name)})`)
      lines.push(`=INDEX(${wholeCol(src, src.columns[first], src.name)},MATCH(${key},${wholeCol(src, src.columns[ki], src.name)},0))`)
      const excel = lines.join('\n')
      return { table: t, affected: missing, excel }
    }
    case 'group_by': {
      const byIdx = op.by.map((c) => col(t, c))
      const aggs = op.aggregations.map((a) => ({ ...a, i: a.column ? col(t, a.column) : -1 }))
      const groups = new Map<string, { key: Cell[]; rows: Cell[][] }>()
      for (const row of t.rows) {
        const k = byIdx.map((i) => keyOf(row[i])).join('\u0001')
        let g = groups.get(k)
        if (!g) { g = { key: byIdx.map((i) => row[i]), rows: [] }; groups.set(k, g) }
        g.rows.push(row)
      }
      const out: Table = {
        name: t.name,
        columns: [...byIdx.map((i) => t.columns[i])],
        rows: [],
        formulas: {},
        formats: {},
      }
      aggs.forEach((a) => {
        const base = a.as ?? (a.func === 'count' && !a.column ? 'Count' : `${a.func === 'average' ? 'Avg' : a.func[0].toUpperCase() + a.func.slice(1)}_${a.column}`)
        const name = uniqueName(out, base)
        out.columns.push(name)
        if (a.column && t.formats[a.column] && a.func !== 'count' && a.func !== 'count_distinct') out.formats[name] = t.formats[a.column]
      })
      for (const g of groups.values()) {
        const vals = aggs.map((a) => {
          if (a.func === 'count' && a.i < 0) return g.rows.length
          const cells = g.rows.map((r) => r[a.i])
          if (a.func === 'count') return cells.filter((c) => !isBlank(c)).length
          if (a.func === 'count_distinct') return new Set(cells.filter((c) => !isBlank(c)).map(keyOf)).size
          const nums = cells.filter((c) => !isBlank(c)).map(toNumber).filter((n): n is number => n !== null)
          if (nums.length === 0) return null
          if (a.func === 'sum') return Math.round(nums.reduce((s, n) => s + n, 0) * 1e6) / 1e6
          if (a.func === 'average') return nums.reduce((s, n) => s + n, 0) / nums.length
          return a.func === 'min' ? Math.min(...nums) : Math.max(...nums)
        })
        out.rows.push([...g.key, ...vals])
      }
      const first = aggs.find((a) => a.i >= 0)
      const crit = byIdx.slice(0, 3).map((bi, j) => `${wholeCol(t, t.columns[bi], t.name)},${columnLetter(j)}2`).join(',')
      const excel = first
        ? `=${first.func === 'average' ? 'AVERAGEIFS' : first.func === 'count' ? 'COUNTIFS' : 'SUMIFS'}(${first.func === 'count' ? '' : wholeCol(t, t.columns[first.i], t.name) + ','}${crit})`
        : `=COUNTIFS(${crit})`
      const label = (a: (typeof aggs)[number]) => `${a.func === 'average' ? 'Average' : a.func === 'count_distinct' ? 'Distinct count' : a.func[0].toUpperCase() + a.func.slice(1)} of ${a.column ?? 'rows'}`
      const pivotNote = `PivotTable: Rows = ${byIdx.map((i) => t.columns[i]).join(', ')} · Values = ${aggs.map(label).join(', ')}`
      return { table: out, excel: `${excel}\n${pivotNote}` }
    }
    case 'reconcile': {
      const other = sheet(wb, op.with_sheet)
      const lk = op.keys.map((k) => col(t, k.left))
      const rk = op.keys.map((k) => col(other, k.right))
      const lv = col(t, op.left_value)
      const rv = col(other, op.right_value)
      const sum = (tbl: Table, keyIdx: number[], valIdx: number) => {
        const m = new Map<string, { key: Cell[]; total: number }>()
        for (const row of tbl.rows) {
          const k = keyIdx.map((i) => keyOf(row[i])).join('\u0001')
          let e = m.get(k)
          if (!e) { e = { key: keyIdx.map((i) => row[i]), total: 0 }; m.set(k, e) }
          e.total += toNumber(row[valIdx]) ?? 0
        }
        return m
      }
      const L = sum(t, lk, lv)
      const R = sum(other, rk, rv)
      const leftName = t.columns[lv]
      let rightName = other.columns[rv]
      if (rightName.toLowerCase() === leftName.toLowerCase()) rightName = `${rightName}_${other.name}`
      const keyNames = lk.map((i) => t.columns[i])
      const out: Table = {
        name: 'Reconciliation',
        columns: [...keyNames, leftName, rightName, 'Difference', 'Difference_Pct', 'Status'],
        rows: [],
        formulas: {},
        formats: { Difference_Pct: 'percent' },
      }
      const lf = t.formats[leftName]
      if (lf) { out.formats[leftName] = lf; out.formats[rightName] = lf; out.formats.Difference = lf }
      const tol = (op.tolerance_pct ?? 0) / 100
      const r2 = (n: number) => Math.round(n * 100) / 100
      const keys = new Set([...L.keys(), ...R.keys()])
      let issues = 0
      for (const k of keys) {
        const l = L.get(k), r = R.get(k)
        const key = (l ?? r)!.key
        const lt = l ? r2(l.total) : null
        const rt = r ? r2(r.total) : null
        let status: string
        let diff: number | null = null
        let pct: number | null = null
        if (lt === null) status = `Missing in ${t.name}`
        else if (rt === null) status = `Missing in ${other.name}`
        else {
          diff = r2(rt - lt)
          pct = lt === 0 ? null : diff / lt
          const within = lt === 0 ? diff === 0 : Math.abs(diff / lt) <= tol + 1e-12
          status = Math.abs(diff) < 0.005 || within ? 'OK' : 'Mismatch'
        }
        if (status !== 'OK') issues++
        out.rows.push([...key, lt, rt, diff, pct, status])
      }
      out.rows.sort((a, b) => {
        const sa = a[a.length - 1] === 'OK' ? 1 : 0, sb = b[b.length - 1] === 'OK' ? 1 : 0
        if (sa !== sb) return sa - sb
        for (let i = 0; i < keyNames.length; i++) {
          const c = String(a[i] ?? '').localeCompare(String(b[i] ?? ''), undefined, { numeric: true })
          if (c) return c
        }
        return 0
      })
      out.formulas.Difference = `[${rightName}]-[${leftName}]`
      out.formulas.Difference_Pct = `IF([${leftName}]=0,"",([${rightName}]-[${leftName}])/[${leftName}])`
      const crit = op.keys.slice(0, 3).map((k, j) => `${wholeCol(other, k.right, other.name)},${columnLetter(j)}2`).join(',')
      const excel = `=SUMIFS(${wholeCol(other, other.columns[rv], other.name)},${crit})`
      return { table: out, affected: issues, excel }
    }
    case 'select_columns': {
      const idxs = op.columns.map((c) => col(t, c))
      const names = idxs.map((i) => t.columns[i])
      t.rows = t.rows.map((row) => idxs.map((i) => row[i]))
      t.columns = names
      return { table: t }
    }
    case 'rename_column': {
      const i = col(t, op.from)
      const from = t.columns[i]
      if (from === op.to) return { table: t }
      if (t.columns.includes(op.to)) throw new StepError(`Column "${op.to}" already exists`)
      t.columns[i] = op.to
      if (t.formulas[from]) { t.formulas[op.to] = t.formulas[from]; delete t.formulas[from] }
      if (t.formats[from]) { t.formats[op.to] = t.formats[from]; delete t.formats[from] }
      for (const [name, src] of Object.entries(t.formulas)) {
        try {
          const node = parse(src)
          if (columnsUsed(node).has(from)) {
            const rename = (n: ReturnType<typeof parse>): ReturnType<typeof parse> => {
              switch (n.type) {
                case 'col': return n.name === from ? { type: 'col', name: op.to } : n
                case 'unary': return { ...n, arg: rename(n.arg) }
                case 'bin': return { ...n, left: rename(n.left), right: rename(n.right) }
                case 'call': return { ...n, args: n.args.map(rename) }
                default: return n
              }
            }
            t.formulas[name] = toSource(rename(node))
          }
        } catch {
          delete t.formulas[name]
        }
      }
      return { table: t }
    }
    case 'limit': {
      const before = t.rows.length
      t.rows = t.rows.slice(0, op.rows)
      return { table: t, affected: before - t.rows.length }
    }
    case 'convert_number': {
      const idxs = op.columns.map((c) => col(t, c))
      let affected = 0
      let failed = 0
      for (const row of t.rows) {
        for (const i of idxs) {
          const v = row[i]
          if (typeof v !== 'string') continue
          if (v.trim() === '') { row[i] = null; continue }
          const n = parseLooseNumber(v, op.style)
          if (n === null) failed++
          else { row[i] = n; affected++ }
        }
      }
      idxs.forEach((i) => dropFormula(t, t.columns[i]))
      if (failed > 0 && affected === 0) throw new StepError(`No values in ${op.columns.join(', ')} look like numbers`)
      const ref = cellRef(t, t.columns[idxs[0]])
      const excel = op.style === 'eu'
        ? `=NUMBERVALUE(SUBSTITUTE(${ref},"-",""),",",".")*IF(RIGHT(${ref},1)="-",-1,1)`
        : `=VALUE(SUBSTITUTE(SUBSTITUTE(${ref},",",""),"-",""))*IF(RIGHT(${ref},1)="-",-1,1)`
      return { table: t, affected, excel }
    }
    case 'convert_date': {
      const idxs = op.columns.map((c) => col(t, c))
      let affected = 0
      let failed = 0
      for (const row of t.rows) {
        for (const i of idxs) {
          const v = row[i]
          if (v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v))) continue
          const d = parseLooseDate(v, op.order)
          if (d === null) failed++
          else { row[i] = d; affected++ }
        }
      }
      idxs.forEach((i) => dropFormula(t, t.columns[i]))
      if (failed > 0 && affected === 0) throw new StepError(`No values in ${op.columns.join(', ')} look like dates`)
      const ref = cellRef(t, t.columns[idxs[0]])
      return { table: t, affected, excel: `=DATE(RIGHT(${ref},4),MID(${ref},4,2),LEFT(${ref},2))` }
    }
    case 'remove_report_rows': {
      const before = t.rows.length
      t.rows = t.rows.filter((row) => !isReportRow(row, t.columns))
      const first = t.columns[0]
      return { table: t, affected: before - t.rows.length, excel: `=OR(LEFT(${cellRef(t, first)},1)="*",ISNUMBER(SEARCH("total",${cellRef(t, first)})))` }
    }
    case 'pivot': {
      const rIdx = op.rows.map((c) => col(t, c))
      const cIdx = col(t, op.columns)
      const vIdx = col(t, op.value)
      const heads: string[] = []
      const headKey = new Map<string, string>()
      for (const row of t.rows) {
        const k = keyOf(row[cIdx])
        if (!headKey.has(k)) {
          if (heads.length >= 60) throw new StepError(`${t.columns[cIdx]} has more than 60 different values — too many columns`)
          const label = row[cIdx] === null || String(row[cIdx]).trim() === '' ? '(blank)' : String(row[cIdx]).trim()
          headKey.set(k, label)
          heads.push(label)
        }
      }
      heads.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      const order = new Map(heads.map((h, i) => [h, i]))
      const groups = new Map<string, { key: Cell[]; sums: number[]; counts: number[] }>()
      for (const row of t.rows) {
        const k = rIdx.map((i) => keyOf(row[i])).join('\u0001')
        let g = groups.get(k)
        if (!g) { g = { key: rIdx.map((i) => row[i]), sums: heads.map(() => 0), counts: heads.map(() => 0) }; groups.set(k, g) }
        const h = order.get(headKey.get(keyOf(row[cIdx]))!)!
        const n = toNumber(row[vIdx])
        if (op.func === 'count') { if (!isBlank(row[vIdx])) g.counts[h]++ }
        else if (n !== null && !isBlank(row[vIdx])) { g.sums[h] += n; g.counts[h]++ }
      }
      const out: Table = { name: t.name, columns: [...rIdx.map((i) => t.columns[i])], rows: [], formulas: {}, formats: {} }
      const vFormat = t.formats[t.columns[vIdx]]
      for (const h of heads) {
        const name = uniqueName(out, h)
        out.columns.push(name)
        if (vFormat && op.func !== 'count') out.formats[name] = vFormat
      }
      for (const g of groups.values()) {
        out.rows.push([...g.key, ...heads.map((_, i) => {
          if (op.func === 'count') return g.counts[i]
          if (g.counts[i] === 0) return null
          const v = op.func === 'average' ? g.sums[i] / g.counts[i] : g.sums[i]
          return Math.round(v * 1e6) / 1e6
        })])
      }
      out.rows.sort((a, b) => String(a[0] ?? '').localeCompare(String(b[0] ?? ''), undefined, { numeric: true }))
      const fn = op.func === 'count' ? 'COUNTIFS' : op.func === 'average' ? 'AVERAGEIFS' : 'SUMIFS'
      const crit = rIdx.slice(0, 2).map((ri, j) => `${wholeCol(t, t.columns[ri], t.name)},$${columnLetter(j)}2`).join(',')
      const excel = `=${fn}(${fn === 'COUNTIFS' ? '' : wholeCol(t, t.columns[vIdx], t.name) + ','}${crit},${wholeCol(t, t.columns[cIdx], t.name)},${columnLetter(rIdx.length)}$1)`
      const pivotNote = `PivotTable: Rows = ${rIdx.map((i) => t.columns[i]).join(', ')} · Columns = ${t.columns[cIdx]} · Values = ${op.func === 'count' ? 'Count' : op.func === 'average' ? 'Average' : 'Sum'} of ${t.columns[vIdx]}`
      return { table: out, excel: `${excel}\n${pivotNote}` }
    }
  }
}

export type PipelineResult = { table: Table; results: StepResult[] }

/** Run every step from a fresh copy of the starting sheet. Stops at the first failing step. */
export function runPipeline(wb: Workbook, startSheet: string, steps: Op[]): PipelineResult {
  let table = cloneTable(sheet(wb, startSheet))
  const results: StepResult[] = []
  let failed = false
  for (const step of steps) {
    const rowsBefore = table.rows.length
    if (failed) {
      results.push({ ok: false, rowsBefore, rowsAfter: rowsBefore, error: 'skipped' })
      continue
    }
    try {
      const r = applyOp(wb, table, step)
      table = r.table
      results.push({ ok: true, rowsBefore, rowsAfter: table.rows.length, affected: r.affected, excel: r.excel })
    } catch (e) {
      failed = true
      results.push({ ok: false, rowsBefore, rowsAfter: rowsBefore, error: e instanceof Error ? e.message : 'Step failed' })
    }
  }
  return { table, results }
}

// ── Summaries sent to the AI (schema only, never the full data) ──

export type ColumnSummary = { name: string; type: 'number' | 'text' | 'date' | 'boolean' | 'empty'; samples: string[]; blanks: number }
export type SheetSummary = { name: string; rows: number; columns: ColumnSummary[] }

export function summarize(t: Table, sampleCount = 4): SheetSummary {
  return {
    name: t.name,
    rows: t.rows.length,
    columns: t.columns.map((c, i) => {
      const vals = t.rows.map((r) => r[i])
      const filled = vals.filter((v) => !isBlank(v))
      const nums = filled.filter((v) => typeof v === 'number').length
      const bools = filled.filter((v) => typeof v === 'boolean').length
      const dates = filled.filter((v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)).length
      const type: ColumnSummary['type'] = filled.length === 0 ? 'empty'
        : nums / filled.length > 0.8 ? 'number'
        : bools / filled.length > 0.8 ? 'boolean'
        : dates / filled.length > 0.8 ? 'date' : 'text'
      const distinct: string[] = []
      for (const v of filled) {
        const s = String(v).slice(0, 40)
        if (!distinct.includes(s)) distinct.push(s)
        if (distinct.length >= sampleCount) break
      }
      return { name: c, type, samples: distinct, blanks: vals.length - filled.length }
    }),
  }
}

/** Small numeric profile of a result table, used to ground "explain this result". */
export function profile(t: Table): Record<string, { sum: number; min: number; max: number }> {
  const out: Record<string, { sum: number; min: number; max: number }> = {}
  t.columns.forEach((c, i) => {
    const nums = t.rows.map((r) => r[i]).filter((v): v is number => typeof v === 'number')
    if (nums.length && nums.length >= t.rows.length * 0.8) {
      out[c] = {
        sum: Math.round(nums.reduce((s, n) => s + n, 0) * 100) / 100,
        min: Math.min(...nums),
        max: Math.max(...nums),
      }
    }
  })
  return out
}

export function toCsv(t: Table, maxRows: number): string {
  const esc = (v: Cell) => {
    if (v === null) return ''
    const s = typeof v === 'number' ? String(Math.round(v * 10000) / 10000) : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [t.columns.map(esc).join(','), ...t.rows.slice(0, maxRows).map((r) => r.map(esc).join(','))].join('\n')
}
