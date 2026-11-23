'use client'
import { useMemo, useState } from 'react'
import type { Cell, Table } from '@/lib/excel-ai/types'
import type { Dict } from '@/lib/excel-ai/i18n'
import { quoteIdent } from '@/lib/excel-ai/sqlite'
import { SqlCode } from './CodeEditor'

type TableInfo = { name: string; columns: string[]; table: Table }
type CondOp = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'starts' | 'blank' | 'notblank'
type Cond = { col: string; op: CondOp; value: string }
type Agg = 'count' | 'sum' | 'avg' | 'min' | 'max'

const id = (s: string) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(s) ? s : quoteIdent(s))
const lit = (v: string) => (/^-?\d+(\.\d+)?$/.test(v.trim()) ? v.trim() : `'${v.replace(/'/g, "''")}'`)

function isNumericCol(t: Table, col: string) {
  const i = t.columns.indexOf(col)
  const vals = t.rows.slice(0, 500).map((r) => r[i]).filter((v) => v !== null && v !== '')
  return vals.length > 0 && vals.filter((v) => typeof v === 'number').length >= vals.length * 0.8
}

function condSql(c: Cond, numeric: boolean): string {
  const col = id(c.col)
  switch (c.op) {
    case 'blank': return `(${col} IS NULL OR TRIM(${col}) = '')`
    case 'notblank': return `(${col} IS NOT NULL AND TRIM(${col}) <> '')`
    case 'contains': return `${col} LIKE '%${c.value.replace(/'/g, "''")}%'`
    case 'starts': return `${col} LIKE '${c.value.replace(/'/g, "''")}%'`
    case 'eq': return numeric ? `${col} = ${lit(c.value)}` : `UPPER(TRIM(${col})) = UPPER(${lit(c.value.trim())})`
    case 'ne': return numeric ? `${col} <> ${lit(c.value)}` : `UPPER(TRIM(${col})) <> UPPER(${lit(c.value.trim())})`
    default: return `${col} ${{ gt: '>', gte: '>=', lt: '<', lte: '<=' }[c.op]} ${lit(c.value)}`
  }
}

/** Point-and-click query builder and SQL basics, for people who do not write SQL. */
export default function SqlHelper({ mode, tables, tableNames, d, onUse }: { mode: 'build' | 'learn'; tables: TableInfo[]; tableNames: readonly string[]; d: Dict; onUse: (sql: string) => void }) {
  const [tableName, setTableName] = useState(tables[0]?.name ?? 'result')
  const info = tables.find((t) => t.name === tableName) ?? tables[0]
  const [cols, setCols] = useState<string[]>([])
  const [conds, setConds] = useState<Cond[]>([])
  const [group, setGroup] = useState('')
  const [agg, setAgg] = useState<Agg>('sum')
  const [aggCol, setAggCol] = useState('')
  const [sortCol, setSortCol] = useState('')
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC')
  const [limit, setLimit] = useState(100)

  const numericCols = useMemo(() => (info ? info.columns.filter((c) => isNumericCol(info.table, c)) : []), [info])

  function chooseTable(name: string) {
    setTableName(name)
    setCols([]); setConds([]); setGroup(''); setAggCol(''); setSortCol('')
  }

  function build(): string {
    if (!info) return ''
    const aggTarget = aggCol || numericCols[0] || info.columns[0]
    const aggAlias = agg === 'count' ? 'row_count' : `${agg}_${aggTarget.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase()}`
    const aggExpr = agg === 'count' ? 'COUNT(*)' : `ROUND(${agg.toUpperCase()}(${id(aggTarget)}), 2)`
    const select = group
      ? `  ${id(group)},\n  ${aggExpr} AS ${aggAlias}`
      : cols.length ? cols.map((c) => `  ${id(c)}`).join(',\n') : '  *'
    const lines = [`SELECT\n${select}`, `FROM ${id(info.name)}`]
    const where = conds.filter((c) => c.col && (c.op === 'blank' || c.op === 'notblank' || c.value.trim() !== ''))
    if (where.length) lines.push(`WHERE ${where.map((c) => condSql(c, numericCols.includes(c.col))).join('\n  AND ')}`)
    if (group) lines.push(`GROUP BY ${id(group)}`)
    const sort = sortCol === '__agg' ? aggAlias : sortCol ? id(sortCol) : ''
    if (sort) lines.push(`ORDER BY ${sort} ${sortDir}`)
    if (limit > 0) lines.push(`LIMIT ${limit}`)
    return lines.join('\n') + ';'
  }

  // ── SQL basics, written against the user's own data ──
  const lessons = useMemo(() => {
    const t = tables[0]
    if (!t) return []
    const text = t.columns.find((c) => !isNumericCol(t.table, c) && new Set(t.table.rows.map((r) => r[t.columns.indexOf(c)])).size <= 40) ?? t.columns[0]
    const num = t.columns.find((c) => isNumericCol(t.table, c) && !/id|no|rate|pct/i.test(c)) ?? t.columns.find((c) => isNumericCol(t.table, c))
    const sample: Cell = t.table.rows.map((r) => r[t.columns.indexOf(text)]).find((v) => typeof v === 'string' && v.trim() !== '') ?? 'A'
    const T = id(t.name), X = id(text), N = num ? id(num) : null
    const other = tables.slice(1).find((o) => o.columns.some((c) => t.columns.includes(c) && c !== num))
    const shared = other?.columns.find((c) => t.columns.includes(c) && c !== num)
    const extra = other?.columns.find((c) => !t.columns.includes(c))
    const L = d.learn
    const out: { title: string; text: string; sql: string }[] = [
      { ...L.select, sql: `SELECT *\nFROM ${T}\nLIMIT 20;` },
      { ...L.columns, sql: `SELECT ${X}${N ? `, ${N}` : ''}\nFROM ${T}\nLIMIT 20;` },
      { ...L.where, sql: `SELECT *\nFROM ${T}\nWHERE UPPER(TRIM(${X})) = ${lit(String(sample).trim().toUpperCase())}\nLIMIT 50;` },
      { ...L.like, sql: `SELECT *\nFROM ${T}\nWHERE ${X} LIKE '%${String(sample).trim().slice(0, 2).replace(/'/g, "''")}%'\nLIMIT 50;` },
    ]
    if (N) {
      out.push({ ...L.order, sql: `SELECT *\nFROM ${T}\nORDER BY ${N} DESC\nLIMIT 10;` })
      out.push({ ...L.group, sql: `SELECT\n  ${X},\n  COUNT(*) AS row_count,\n  ROUND(SUM(${N}), 2) AS total\nFROM ${T}\nGROUP BY ${X}\nORDER BY total DESC;` })
    }
    if (other && shared && extra) {
      out.push({ ...L.join, sql: `SELECT\n  a.*,\n  b.${id(extra)}\nFROM ${T} AS a\nLEFT JOIN ${id(other.name)} AS b\n  ON a.${id(shared)} = b.${id(shared)}\nLIMIT 50;` })
    }
    return out
  }, [tables, d])

  if (mode === 'learn') {
    return (
      <div className="xl-learn">
        <p className="xl-meta" style={{ marginTop: 0 }}>{d.learnIntro}</p>
        {lessons.map((l, i) => (
          <div key={i} className="xl-lesson">
            <div>
              <b>{i + 1}. {l.title}</b>
              <p>{l.text}</p>
            </div>
            <SqlCode code={l.sql} tables={tableNames} />
            <button type="button" className="xl-btn" onClick={() => onUse(l.sql)}>{d.learnTry}</button>
          </div>
        ))}
      </div>
    )
  }

  if (!info) return null
  const opNeedsValue = (op: CondOp) => op !== 'blank' && op !== 'notblank'
  return (
    <div className="xl-builder">
      <label className="xl-field">
        <span>{d.bTable}</span>
        <select className="xl-select" value={info.name} onChange={(e) => chooseTable(e.target.value)}>
          {tables.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
      </label>

      {!group && (
        <fieldset className="xl-field">
          <legend>{d.bColumns}</legend>
          <div className="xl-checks">
            <label><input type="checkbox" checked={cols.length === 0} onChange={() => setCols([])} /> {d.bAll}</label>
            {info.columns.map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={cols.includes(c)}
                  onChange={(e) => setCols((xs) => (e.target.checked ? [...xs, c] : xs.filter((x) => x !== c)))}
                /> {c}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="xl-field">
        <legend>{d.bFilters}</legend>
        {conds.map((c, i) => (
          <div key={i} className="xl-row" style={{ marginTop: i ? 6 : 0 }}>
            <select className="xl-select" value={c.col} onChange={(e) => setConds((xs) => xs.map((x, j) => (j === i ? { ...x, col: e.target.value } : x)))}>
              {info.columns.map((col) => <option key={col} value={col}>{col}</option>)}
            </select>
            <select className="xl-select" value={c.op} onChange={(e) => setConds((xs) => xs.map((x, j) => (j === i ? { ...x, op: e.target.value as CondOp } : x)))}>
              {(Object.keys(d.bOps) as CondOp[]).map((op) => <option key={op} value={op}>{d.bOps[op]}</option>)}
            </select>
            {opNeedsValue(c.op) && (
              <input className="xl-input" style={{ flex: '1 1 140px' }} value={c.value} placeholder={d.bValue} aria-label={d.bValue}
                onChange={(e) => setConds((xs) => xs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
            )}
            <button type="button" className="xl-link" onClick={() => setConds((xs) => xs.filter((_, j) => j !== i))}>{d.bRemove}</button>
          </div>
        ))}
        {conds.length < 4 && (
          <button type="button" className="xl-btn" style={{ marginTop: conds.length ? 8 : 0 }}
            onClick={() => setConds((xs) => [...xs, { col: info.columns[0], op: 'eq', value: '' }])}>+ {d.bAddFilter}</button>
        )}
      </fieldset>

      <div className="xl-row">
        <label className="xl-field inline">
          <span>{d.bGroup}</span>
          <select className="xl-select" value={group} onChange={(e) => { setGroup(e.target.value); if (sortCol && sortCol !== '__agg') setSortCol('') }}>
            <option value="">{d.bNoGroup}</option>
            {info.columns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        {group && (
          <label className="xl-field inline">
            <span>{d.bAgg}</span>
            <select className="xl-select" value={agg} onChange={(e) => setAgg(e.target.value as Agg)}>
              {(Object.keys(d.bAggs) as Agg[]).map((a) => <option key={a} value={a}>{d.bAggs[a]}</option>)}
            </select>
            {agg !== 'count' && (
              <select className="xl-select" value={aggCol || numericCols[0] || ''} onChange={(e) => setAggCol(e.target.value)}>
                {(numericCols.length ? numericCols : info.columns).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </label>
        )}
      </div>

      <div className="xl-row">
        <label className="xl-field inline">
          <span>{d.bSort}</span>
          <select className="xl-select" value={sortCol} onChange={(e) => setSortCol(e.target.value)}>
            <option value="">{d.bNoSort}</option>
            {group ? (
              <>
                <option value={group}>{group}</option>
                <option value="__agg">{agg === 'count' ? d.bAggs.count : `${d.bAggs[agg]} ${aggCol || numericCols[0] || ''}`}</option>
              </>
            ) : info.columns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {sortCol && (
            <select className="xl-select" value={sortDir} onChange={(e) => setSortDir(e.target.value as 'ASC' | 'DESC')}>
              <option value="DESC">{d.bDesc}</option>
              <option value="ASC">{d.bAsc}</option>
            </select>
          )}
        </label>
        <label className="xl-field inline">
          <span>{d.bLimit}</span>
          <input className="xl-input" type="number" min={1} max={50000} style={{ width: 100, flex: 'none' }} value={limit}
            onChange={(e) => setLimit(Math.max(0, Math.min(50000, Number(e.target.value) || 0)))} />
        </label>
      </div>

      <p className="xl-meta" style={{ marginBottom: 4 }}>{d.bPreview}</p>
      <SqlCode code={build()} tables={tableNames} className="xl-sqlcode-preview" />
      <div className="xl-row">
        <button type="button" className="xl-btn primary" onClick={() => onUse(build())}>{d.bBuild}</button>
        <span className="xl-meta" style={{ margin: 0 }}>{d.bNote}</span>
      </div>
    </div>
  )
}
