/**
 * Report layouts for the current result: an SAP ALV-style list with subtotals,
 * and a Power BI-style summary (KPIs, totals by category and by month).
 */
import { type Cell, type Table, columnLetter, isBlank, keyOf, quoteSheet } from './types'
import { type ExportSheet, headerRowFor } from './xlsx'

export type ColumnRoles = { groups: string[]; measures: string[]; time: string | null }

const NOT_ADDITIVE = /(^|_|\s)(id|no|nr|number|rate|pct|percent|price|year|month|day|doc\.?)($|_|\s)|rate_per|per_|_pct$|%/i

/** Guess which columns are categories, which are additive numbers, and which is time. */
export function columnRoles(t: Table): ColumnRoles {
  const groups: string[] = []
  const measures: string[] = []
  let time: string | null = null
  t.columns.forEach((c, i) => {
    const vals = t.rows.map((r) => r[i]).filter((v) => !isBlank(v))
    if (!vals.length) return
    const nums = vals.filter((v) => typeof v === 'number').length
    if (nums >= vals.length * 0.9) {
      if (t.formats[c] !== 'percent' && !NOT_ADDITIVE.test(c)) measures.push(c)
      return
    }
    const strings = vals.filter((v): v is string => typeof v === 'string')
    if (strings.length >= vals.length * 0.9 && strings.every((s) => /^\d{4}-\d{2}/.test(s))) {
      if (!time) time = c
      return
    }
    const distinct = new Set(strings.map((s) => keyOf(s))).size
    if (distinct >= 2 && distinct <= 40) groups.push(c)
  })
  return { groups, measures, time }
}

// ── SAP list ───────────────────────────────────────────────

export type RowKind = 'data' | 'subtotal' | 'total'
export type SapReport = { columns: string[]; rows: Cell[][]; kinds: RowKind[]; sumCols: number[] }

export function sapReport(t: Table, groupCol: string | null, measures: string[]): SapReport {
  const gi = groupCol ? t.columns.indexOf(groupCol) : -1
  const sumCols = measures.map((m) => t.columns.indexOf(m)).filter((i) => i >= 0)
  const rows = [...t.rows]
  if (gi >= 0) rows.sort((a, b) => String(a[gi] ?? '').localeCompare(String(b[gi] ?? ''), undefined, { numeric: true, sensitivity: 'base' }))
  const out: Cell[][] = []
  const kinds: RowKind[] = []
  const blank = () => t.columns.map(() => null as Cell)
  const marker = (row: Cell[], text: string) => {
    if (gi === 0) row[0] = `${text} ${row[0] ?? ''}`.trim()
    else row[0] = text
  }
  let sums = sumCols.map(() => 0)
  const grand = sumCols.map(() => 0)
  let current: string | null = null
  let currentLabel: Cell = null
  const flush = () => {
    if (gi < 0 || current === null) return
    const row = blank()
    row[gi] = currentLabel
    sumCols.forEach((ci, k) => { row[ci] = Math.round(sums[k] * 100) / 100 })
    marker(row, '*')
    out.push(row)
    kinds.push('subtotal')
    sums = sumCols.map(() => 0)
  }
  for (const r of rows) {
    const k = gi >= 0 ? keyOf(r[gi]) : ''
    if (gi >= 0 && current !== null && k !== current) flush()
    if (current !== k) { current = k; currentLabel = gi >= 0 ? r[gi] : null }
    out.push([...r])
    kinds.push('data')
    sumCols.forEach((ci, j) => {
      const v = r[ci]
      if (typeof v === 'number') { sums[j] += v; grand[j] += v }
    })
  }
  flush()
  const total = blank()
  sumCols.forEach((ci, k) => { total[ci] = Math.round(grand[k] * 100) / 100 })
  if (gi >= 0 && gi !== 0) total[gi] = 'Total'
  marker(total, '**')
  out.push(total)
  kinds.push('total')
  return { columns: t.columns, rows: out, kinds, sumCols }
}

export function sapExport(rep: SapReport, t: Table, titleRows: string[]): ExportSheet {
  const header = headerRowFor(titleRows.length)
  const cellFormulas: Record<number, Record<number, string>> = {}
  const emphasisRows: Record<number, 'subtotal' | 'total'> = {}
  let blockStart = 0
  rep.kinds.forEach((kind, i) => {
    if (kind === 'data') return
    emphasisRows[i] = kind
    const from = kind === 'total' ? header + 1 : header + 1 + blockStart
    const to = header + i
    cellFormulas[i] = {}
    for (const ci of rep.sumCols) {
      const L = columnLetter(ci)
      // SUBTOTAL(9, …) ignores other SUBTOTAL cells, so the grand total does not double count.
      cellFormulas[i][ci] = `=SUBTOTAL(9,${L}${from}:${L}${to})`
    }
    blockStart = i + 1
  })
  return {
    table: { name: 'SAP_Report', columns: rep.columns, rows: rep.rows, formulas: {}, formats: t.formats },
    titleRows,
    cellFormulas,
    emphasisRows,
  }
}

// ── Power BI-style summary ─────────────────────────────────

export type BiSummary = {
  total: number
  rows: number
  average: number
  groups: { key: string; label: string; total: number; rows: number }[]
  periods: { period: string; total: number }[]
}

export function biSummary(t: Table, groupCol: string | null, measure: string | null, timeCol: string | null, onlyGroup: string | null): BiSummary {
  const gi = groupCol ? t.columns.indexOf(groupCol) : -1
  const mi = measure ? t.columns.indexOf(measure) : -1
  const ti = timeCol ? t.columns.indexOf(timeCol) : -1
  const groups = new Map<string, { key: string; label: string; total: number; rows: number }>()
  const periods = new Map<string, number>()
  let total = 0
  let rows = 0
  for (const r of t.rows) {
    const k = gi >= 0 ? keyOf(r[gi]) : ''
    const v = mi >= 0 && typeof r[mi] === 'number' ? (r[mi] as number) : 0
    if (gi >= 0) {
      const g = groups.get(k) ?? { key: k, label: r[gi] === null ? '(blank)' : String(r[gi]).trim(), total: 0, rows: 0 }
      g.total += v
      g.rows++
      groups.set(k, g)
    }
    if (onlyGroup !== null && k !== onlyGroup) continue
    total += v
    rows++
    if (ti >= 0 && typeof r[ti] === 'string') {
      const p = (r[ti] as string).slice(0, 7)
      periods.set(p, (periods.get(p) ?? 0) + v)
    }
  }
  return {
    total: Math.round(total * 100) / 100,
    rows,
    average: rows ? total / rows : 0,
    groups: [...groups.values()].sort((a, b) => b.total - a.total || b.rows - a.rows),
    periods: [...periods.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([period, v]) => ({ period, total: Math.round(v * 100) / 100 })),
  }
}

export function biExport(t: Table, sum: BiSummary, groupCol: string | null, measure: string | null, timeCol: string | null, titleRows: string[]): ExportSheet[] {
  const data: ExportSheet = { table: { ...t, name: 'Data', formulas: {} } }
  const sheets: ExportSheet[] = []
  const dataRef = (col: string) => {
    const L = columnLetter(t.columns.indexOf(col))
    return `${quoteSheet('Data')}!$${L}:$${L}`
  }
  const last = t.rows.length + 1
  const dataRange = (col: string) => {
    const L = columnLetter(t.columns.indexOf(col))
    return `${quoteSheet('Data')}!$${L}$2:$${L}$${last}`
  }
  if (groupCol) {
    const header = headerRowFor(titleRows.length)
    const rows: Cell[][] = sum.groups.map((g) => [g.label, g.rows, measure ? Math.round(g.total * 100) / 100 : null, null])
    const grand = sum.groups.reduce((s, g) => s + g.total, 0)
    rows.forEach((r, i) => { r[3] = grand ? (sum.groups[i].total / grand) : null })
    const cellFormulas: Record<number, Record<number, string>> = {}
    const first = header + 1
    const lastRow = header + rows.length
    rows.forEach((_, i) => {
      const r = header + 1 + i
      const f: Record<number, string> = { 1: `=COUNTIFS(${dataRef(groupCol)},A${r})` }
      if (measure) {
        f[2] = `=SUMIFS(${dataRef(measure)},${dataRef(groupCol)},A${r})`
        f[3] = `=IF(SUM($C$${first}:$C$${lastRow})=0,"",C${r}/SUM($C$${first}:$C$${lastRow}))`
      }
      cellFormulas[i] = f
    })
    sheets.push({
      table: {
        name: 'Summary',
        columns: [groupCol, 'Rows', measure ? `Total ${measure}` : 'Total', 'Share'],
        rows,
        formulas: {},
        formats: { ...(measure && t.formats[measure] ? { [`Total ${measure}`]: t.formats[measure] } : {}), Share: 'percent' },
      },
      titleRows,
      cellFormulas,
    })
  }
  if (timeCol && measure && sum.periods.length) {
    const header = headerRowFor(1)
    const cellFormulas: Record<number, Record<number, string>> = {}
    sum.periods.forEach((_, i) => {
      const r = header + 1 + i
      cellFormulas[i] = { 1: `=SUMPRODUCT((LEFT(${dataRange(timeCol)},7)=A${r})*${dataRange(measure)})` }
    })
    sheets.push({
      table: {
        name: 'By_Month',
        columns: ['Month', `Total ${measure}`],
        rows: sum.periods.map((p) => [p.period, p.total]),
        formulas: {},
        formats: t.formats[measure] ? { [`Total ${measure}`]: t.formats[measure] } : {},
      },
      titleRows: ['Totals by month (add a line chart: Insert > Chart > Line)'],
      cellFormulas,
    })
  }
  sheets.push(data)
  return sheets
}
