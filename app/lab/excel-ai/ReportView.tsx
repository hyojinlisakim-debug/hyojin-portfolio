'use client'
import { useMemo, useState } from 'react'
import type { Cell, ColumnFormat, Lang, Table } from '@/lib/excel-ai/types'
import { type Dict, LOCALES, fmt } from '@/lib/excel-ai/i18n'
import { biExport, biSummary, columnRoles, sapExport, sapReport } from '@/lib/excel-ai/report'
import { type ExportSheet, writeXlsx } from '@/lib/excel-ai/xlsx'

const SAP_PREVIEW = 300
const BI_COLORS = { bar: '#118DFF', barDim: '#9fd0ff', line: '#12239E' }

type Props = {
  mode: 'sap' | 'bi'
  table: Table
  fileName: string
  lang: Lang
  d: Dict
  formatCell: (v: Cell, format: ColumnFormat | undefined, lang: Lang) => string
}

function saveSheets(sheets: ExportSheet[], name: string) {
  const bytes = writeXlsx(sheets)
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function printReport() {
  const root = document.documentElement
  root.classList.add('xl-printing')
  const done = () => { root.classList.remove('xl-printing'); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done)
  window.print()
  setTimeout(done, 1500)
}

/** SAP list display: 1,234.56- for negatives. */
function sapNumber(v: number, format: ColumnFormat | undefined, lang: Lang, decimals: boolean) {
  if (format === 'percent') return new Intl.NumberFormat(LOCALES[lang], { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
  const small = Math.abs(v) < 1 && v !== 0 && !Number.isInteger(v)
  const d = decimals || format === 'currency' ? 2 : 0
  const s = new Intl.NumberFormat(LOCALES[lang], {
    minimumFractionDigits: d,
    maximumFractionDigits: small ? Math.max(d, 4) : d,
  }).format(Math.abs(v))
  return v < 0 ? `${s}-` : s
}

export default function ReportView({ mode, table, fileName, lang, d, formatCell }: Props) {
  const roles = useMemo(() => columnRoles(table), [table])
  const [groupPick, setGroupPick] = useState<string | null>(null)
  const [measurePick, setMeasurePick] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const group = groupPick !== null && (groupPick === '' || table.columns.includes(groupPick)) ? groupPick : roles.groups[0] ?? ''
  const measure = measurePick !== null && (measurePick === '' || table.columns.includes(measurePick)) ? measurePick : roles.measures.includes('Amount') ? 'Amount' : roles.measures.find((m) => /amount|billed|revenue|total/i.test(m)) ?? roles.measures[0] ?? ''

  const generated = useMemo(() => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return lang === 'en'
      ? now.toLocaleString(LOCALES.en, { dateStyle: 'medium', timeStyle: 'short' })
      : `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    // Recompute when the table changes, so the timestamp matches the data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, lang])

  const measureIsWhole = useMemo(() => {
    const i = table.columns.indexOf(measure)
    return i < 0 || table.rows.every((r) => typeof r[i] !== 'number' || Number.isInteger(r[i]))
  }, [table, measure])
  const decimalsByCol = useMemo(
    () => table.columns.map((_, i) => table.rows.some((r) => typeof r[i] === 'number' && !Number.isInteger(r[i]))),
    [table],
  )
  const sap = useMemo(() => (mode === 'sap' ? sapReport(table, group || null, roles.measures) : null), [mode, table, group, roles.measures])
  const bi = useMemo(() => (mode === 'bi' ? biSummary(table, group || null, measure || null, roles.time, selected) : null), [mode, table, group, measure, roles.time, selected])
  const n = (x: number) => x.toLocaleString(LOCALES[lang])
  const money = (x: number) => {
    if (measure && table.formats[measure] === 'currency') return formatCell(Math.round(x * 100) / 100, 'currency', lang)
    const whole = Number.isInteger(Math.round(x * 100) / 100) && measureIsWhole
    return new Intl.NumberFormat(LOCALES[lang], { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(x)
  }
  const title = `${fileName} — ${table.name}`
  const base = fileName.replace(/\.[^.]+$/, '')

  const controls = (
    <div className="xl-row xl-no-print" style={{ marginTop: 0, marginBottom: '0.9rem' }}>
      <label className="xl-field inline">
        <span>{d.repGroupBy}</span>
        <select className="xl-select" value={group} onChange={(e) => { setGroupPick(e.target.value); setSelected(null) }}>
          <option value="">{d.repNone}</option>
          {table.columns.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      {mode === 'bi' && (
        <label className="xl-field inline">
          <span>{d.repMeasure}</span>
          <select className="xl-select" value={measure} onChange={(e) => setMeasurePick(e.target.value)}>
            <option value="">{d.repNone}</option>
            {roles.measures.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      )}
      <span style={{ flex: 1 }} />
      <button
        type="button"
        className="xl-btn primary"
        onClick={() => {
          const titles = [title, fmt(d.repGenerated, { date: generated })]
          if (mode === 'sap' && sap) saveSheets([sapExport(sap, table, titles)], `${base}_sap_report.xlsx`)
          if (mode === 'bi' && bi) saveSheets(biExport(table, biSummary(table, group || null, measure || null, roles.time, null), group || null, measure || null, roles.time, titles), `${base}_bi_report.xlsx`)
        }}
      >
        {d.repDownload}
      </button>
      <button type="button" className="xl-btn" onClick={printReport}>{d.repPrint}</button>
    </div>
  )

  if (mode === 'sap' && sap) {
    const shown = sap.rows.slice(0, SAP_PREVIEW)
    const kinds = sap.kinds.slice(0, SAP_PREVIEW)
    const totalIdx = sap.rows.length - 1
    return (
      <div>
        {controls}
        <p className="xl-meta xl-no-print" style={{ marginTop: 0 }}>{d.repSapHint}</p>
        <div id="xl-report" className="sap-report">
          <div className="sap-bar">
            <b>{title}</b>
            <span>{fmt(d.repGenerated, { date: generated })} · {fmt(d.repRows, { n: n(table.rows.length) })}</span>
          </div>
          <div className="sap-grid">
            <table>
              <thead><tr>{sap.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {shown.map((row, i) => (
                  <tr key={i} className={kinds[i] === 'data' ? undefined : kinds[i]}>
                    {row.map((v, ci) => (
                      <td key={ci} className={typeof v === 'number' ? 'num' : undefined}>
                        {typeof v === 'number' ? sapNumber(v, table.formats[sap.columns[ci]], lang, decimalsByCol[ci]) : v === null ? '' : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
                {sap.rows.length > SAP_PREVIEW && (
                  <>
                    <tr className="sap-gap"><td colSpan={sap.columns.length}>{fmt(d.repShowing, { n: SAP_PREVIEW })}</td></tr>
                    <tr className="total">
                      {sap.rows[totalIdx].map((v, ci) => (
                        <td key={ci} className={typeof v === 'number' ? 'num' : undefined}>
                          {typeof v === 'number' ? sapNumber(v, table.formats[sap.columns[ci]], lang, decimalsByCol[ci]) : v === null ? '' : String(v)}
                        </td>
                      ))}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'bi' && bi) {
    const maxGroup = Math.max(1, ...bi.groups.map((g) => Math.abs(g.total)))
    const groupsShown = bi.groups.slice(0, 12)
    const barH = 26
    const periods = bi.periods
    // Zoom the y-axis to the data (like Power BI's default), so small month-to-month changes are visible.
    const hi = Math.max(...periods.map((p) => p.total), 0)
    const lo = Math.min(...periods.map((p) => p.total), hi)
    const pad = (hi - lo) * 0.3 || Math.abs(hi) * 0.05 || 1
    const maxP = hi + pad
    const minP = lo - pad
    const W = 560, H = 220, padL = 10, padR = 10, padT = 24, padB = 28
    const px = (i: number) => padL + (periods.length <= 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (periods.length - 1))
    const py = (v: number) => padT + (H - padT - padB) * (1 - (v - minP) / (maxP - minP || 1))
    const grand = bi.groups.reduce((s, g) => s + g.total, 0)
    const selLabel = selected !== null ? bi.groups.find((g) => g.key === selected)?.label : null
    return (
      <div>
        {controls}
        <p className="xl-meta xl-no-print" style={{ marginTop: 0 }}>{d.repBiHint}</p>
        <div id="xl-report" className="bi-report">
          <div className="bi-head">
            <b>{title}</b>
            <span>{fmt(d.repGenerated, { date: generated })}{selLabel ? ` · ${d.repFilter}: ${group} = ${selLabel}` : ''}</span>
          </div>
          {!measure && <p className="bi-note">{d.repNoMeasure}</p>}
          <div className="bi-kpis">
            <div className="bi-tile"><span>{measure ? fmt(d.repTotal, { m: measure }) : d.repCount}</span><b>{measure ? money(bi.total) : n(bi.rows)}</b></div>
            <div className="bi-tile"><span>{d.repCount}</span><b>{n(bi.rows)}</b></div>
            {measure && <div className="bi-tile"><span>{fmt(d.repAverage, { m: measure })}</span><b>{money(bi.average)}</b></div>}
            {group && <div className="bi-tile"><span>{d.repGroups}</span><b>{n(bi.groups.length)}</b></div>}
          </div>
          <div className="bi-grid">
            {group && measure && (
              <div className="bi-tile">
                <span>{fmt(d.repByGroup, { m: measure, g: group })}</span>
                <svg viewBox={`0 0 ${W} ${groupsShown.length * barH + 8}`} role="img" aria-label={fmt(d.repByGroup, { m: measure, g: group })}>
                  {groupsShown.map((g, i) => {
                    const w = Math.max(2, ((W - 260) * Math.abs(g.total)) / maxGroup)
                    const active = selected === null || selected === g.key
                    return (
                      <g key={g.key} className="bi-bar" onClick={() => setSelected((s) => (s === g.key ? null : g.key))}>
                        <text x={130} y={i * barH + 18} textAnchor="end" className="bi-label">{g.label.slice(0, 18)}</text>
                        <rect x={140} y={i * barH + 5} width={w} height={barH - 9} rx={2} fill={active ? BI_COLORS.bar : BI_COLORS.barDim} />
                        <text x={146 + w} y={i * barH + 18} className="bi-value">{money(g.total)}</text>
                      </g>
                    )
                  })}
                </svg>
                <small className="xl-no-print">{d.repClickHint}</small>
              </div>
            )}
            {measure && periods.length > 1 && (
              <div className="bi-tile">
                <span>{fmt(d.repByMonth, { m: measure })}</span>
                <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={fmt(d.repByMonth, { m: measure })}>
                  <line x1={padL} x2={W - padR} y1={py(minP)} y2={py(minP)} className="bi-axis" />
                  <polyline fill="none" stroke={BI_COLORS.line} strokeWidth={2.5} points={periods.map((p, i) => `${px(i)},${py(p.total)}`).join(' ')} />
                  {periods.map((p, i) => (
                    <g key={p.period}>
                      <circle cx={px(i)} cy={py(p.total)} r={4} fill={BI_COLORS.line} />
                      <text x={px(i)} y={py(p.total) - 9} textAnchor={i === 0 ? 'start' : i === periods.length - 1 ? 'end' : 'middle'} className="bi-value">{money(p.total)}</text>
                      <text x={px(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === periods.length - 1 ? 'end' : 'middle'} className="bi-label">{p.period}</text>
                    </g>
                  ))}
                </svg>
              </div>
            )}
          </div>
          {group && (
            <div className="bi-tile">
              <span>{group}</span>
              <table className="bi-table">
                <thead>
                  <tr><th>{group}</th><th className="num">{d.repCount}</th>{measure && <th className="num">{measure}</th>}{measure && <th>{d.repShare}</th>}</tr>
                </thead>
                <tbody>
                  {bi.groups.map((g) => {
                    const share = grand ? g.total / grand : 0
                    return (
                      <tr key={g.key} className={selected === g.key ? 'sel' : undefined} onClick={() => setSelected((s) => (s === g.key ? null : g.key))}>
                        <td>{g.label}</td>
                        <td className="num">{n(g.rows)}</td>
                        {measure && <td className="num">{money(g.total)}</td>}
                        {measure && (
                          <td>
                            <div className="bi-share"><i style={{ width: `${Math.max(0, Math.min(100, share * 100))}%` }} /><span>{(share * 100).toFixed(1)}%</span></div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}
