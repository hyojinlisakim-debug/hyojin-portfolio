/**
 * Automatic data quality check: the kind of review done before data is used
 * in a model or a regulatory filing. Runs entirely in the browser.
 */
import { type Cell, type Table, isBlank, keyOf } from './types'
import { isReportRow, parseLooseDate, parseLooseNumber } from './ops'

export type IssueKind =
  | 'duplicate_rows' | 'report_rows' | 'blanks' | 'spaces' | 'numbers_as_text'
  | 'dates_as_text' | 'mixed_formats' | 'label_variants' | 'negatives' | 'outliers'

export type QualityIssue = { column: string | null; kind: IssueKind; count: number; example: string }

const shapeOf = (s: string) => s.replace(/[A-Za-z]/g, 'A').replace(/\d/g, '9')
const show = (v: Cell) => {
  if (v === null) return ''
  if (typeof v !== 'string') return String(v)
  // Keep quotes when spaces matter, so "RESID " is visibly different from "RESID".
  return v !== v.trim() ? JSON.stringify(v).slice(0, 42) : v.slice(0, 40)
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos), hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

/** A short label column (2–12 values, e.g. rate class) to group numbers by, or -1. */
function groupColumn(t: Table, exclude: number): number {
  let best = -1
  let bestSize = Infinity
  t.columns.forEach((_, i) => {
    if (i === exclude) return
    const vals = t.rows.map((r) => r[i]).filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    if (vals.length < t.rows.length * 0.9) return
    // Dates and numeric codes are not categories.
    if (vals.filter((v) => parseLooseDate(v) !== null || parseLooseNumber(v) !== null).length > vals.length * 0.5) return
    const size = new Set(vals.map((v) => keyOf(v))).size
    if (size >= 2 && size <= 12 && size < bestSize) { best = i; bestSize = size }
  })
  return best
}

export function checkQuality(t: Table): QualityIssue[] {
  const issues: QualityIssue[] = []
  const rows = t.rows

  // Whole-row checks
  const seen = new Map<string, number>()
  let dupes = 0
  let dupeExample = ''
  rows.forEach((r, i) => {
    const k = r.map(keyOf).join('\u0001')
    if (seen.has(k)) { dupes++; if (!dupeExample) dupeExample = `row ${i + 2} = row ${seen.get(k)! + 2}` }
    else seen.set(k, i)
  })
  if (dupes) issues.push({ column: null, kind: 'duplicate_rows', count: dupes, example: dupeExample })
  const report = rows.filter((r) => isReportRow(r, t.columns))
  if (report.length) issues.push({ column: null, kind: 'report_rows', count: report.length, example: show(report[0].find((c) => typeof c === 'string') ?? null) })

  // Column checks ignore subtotal/header lines, which are reported once above.
  const body = report.length ? rows.filter((r) => !isReportRow(r, t.columns)) : rows
  t.columns.forEach((name, ci) => {
    const vals = body.map((r) => r[ci])
    const filled = vals.filter((v) => !isBlank(v))
    if (!filled.length) return
    const strings = filled.filter((v): v is string => typeof v === 'string')
    const numbers = filled.filter((v): v is number => typeof v === 'number')

    const blanks = vals.length - filled.length
    if (blanks) issues.push({ column: name, kind: 'blanks', count: blanks, example: '' })

    const spaced = strings.filter((s) => s !== s.trim() || /\s{2,}/.test(s))
    if (spaced.length) issues.push({ column: name, kind: 'spaces', count: spaced.length, example: show(spaced[0]) })

    // Numbers stored as text (IDs with leading zeros are left alone).
    const numText = strings.filter((s) => !/^0\d/.test(s.trim()) && parseLooseNumber(s) !== null)
    // Long plain digit strings are identifiers (document, installation numbers), not amounts.
    const idLike = numText.length > 0 && numText.every((s) => /^\d{6,}$/.test(s.trim()))
    if (!idLike && numText.length && numText.length >= strings.length * 0.5 && strings.length >= filled.length * 0.3) {
      issues.push({ column: name, kind: 'numbers_as_text', count: numText.length, example: show(numText.find((s) => /[-,()]/.test(s)) ?? numText[0]) })
    }

    // Dates stored as text in a non-ISO format.
    const dateText = strings.filter((s) => !/^\d{4}-\d{2}-\d{2}$/.test(s.trim()) && parseLooseDate(s) !== null)
    if (dateText.length && dateText.length >= strings.length * 0.5) {
      issues.push({ column: name, kind: 'dates_as_text', count: dateText.length, example: show(dateText[0]) })
    }

    const distinct = new Set(strings)
    if (strings.length >= 10 && distinct.size > 25 && (idLike || !numText.length) && !dateText.length) {
      // ID-like columns: values should share one shape (C000123), flag the rest (C123, c000123).
      const shapes = new Map<string, number>()
      strings.forEach((s) => shapes.set(shapeOf(s), (shapes.get(shapeOf(s)) ?? 0) + 1))
      const [top, topCount] = [...shapes.entries()].sort((a, b) => b[1] - a[1])[0]
      const odd = strings.filter((s) => shapeOf(s) !== top || s !== s.trim() || (/[a-z]/.test(s) && !/[a-z]/.test(strings[0])))
      if (topCount >= strings.length * 0.8 && odd.length) {
        issues.push({ column: name, kind: 'mixed_formats', count: odd.length, example: show(odd[0]) })
      }
    } else if (distinct.size > 1 && distinct.size <= 40) {
      // Label columns: the same label written several ways ("RES", "res", "RES ").
      const groups = new Map<string, Map<string, number>>()
      strings.forEach((s) => {
        const k = s.trim().toLowerCase().replace(/\s+/g, ' ')
        const g = groups.get(k) ?? new Map<string, number>()
        g.set(s, (g.get(s) ?? 0) + 1)
        groups.set(k, g)
      })
      let count = 0
      let example = ''
      for (const g of groups.values()) {
        if (g.size < 2) continue
        const sorted = [...g.entries()].sort((a, b) => b[1] - a[1])
        sorted.slice(1).forEach(([v, n]) => { count += n; if (!example) example = `${show(v)} vs ${show(sorted[0][0])}` })
      }
      if (count) issues.push({ column: name, kind: 'label_variants', count, example })
    }

    if (numbers.length >= filled.length * 0.8) {
      const neg = numbers.filter((n) => n < 0)
      if (neg.length) issues.push({ column: name, kind: 'negatives', count: neg.length, example: show(neg[0]) })
      if (numbers.length >= 20) {
        // Judge outliers within each category (e.g. rate class) when the table has one,
        // so large customers are not flagged just for being large.
        const groupIdx = groupColumn(t, ci)
        const groups = new Map<string, number[]>()
        body.forEach((r) => {
          const v = r[ci]
          if (typeof v !== 'number') return
          const k = groupIdx >= 0 ? keyOf(r[groupIdx]) : ''
          const g = groups.get(k) ?? []
          g.push(v)
          groups.set(k, g)
        })
        const out: number[] = []
        for (const g of groups.values()) {
          if (g.length < 8) continue
          const sorted = [...g].sort((a, b) => a - b)
          const q1 = quantile(sorted, 0.25), q3 = quantile(sorted, 0.75)
          const iqr = q3 - q1
          if (iqr <= 0) continue
          out.push(...g.filter((n) => n > q3 + 3 * iqr || n < q1 - 3 * iqr))
        }
        if (out.length && out.length <= numbers.length * 0.05) {
          issues.push({ column: name, kind: 'outliers', count: out.length, example: show(out.sort((a, b) => Math.abs(b) - Math.abs(a))[0]) })
        }
      }
    }
  })
  return issues
}
