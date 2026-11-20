/**
 * Minimal, dependency-free .xlsx / .csv reader and .xlsx writer.
 * Reading uses the browser's DecompressionStream; writing produces an
 * uncompressed ("stored") zip, which Excel opens normally.
 */
import { type Cell, type ColumnFormat, type Table, type Workbook, MAX_ROWS, columnLetter } from './types'
import { columnsUsed, parse, toExcel } from './expression'

export class FileReadError extends Error {}

// ── Zip reading ────────────────────────────────────────────

type ZipEntry = { method: number; offset: number; size: number }

function listZip(buf: ArrayBuffer): Map<string, ZipEntry> {
  const view = new DataView(buf)
  const bytes = new Uint8Array(buf)
  let eocd = -1
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new FileReadError('not-xlsx')
  const count = view.getUint16(eocd + 10, true)
  let p = view.getUint32(eocd + 16, true)
  const dec = new TextDecoder()
  const entries = new Map<string, ZipEntry>()
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new FileReadError('not-xlsx')
    const method = view.getUint16(p + 10, true)
    const size = view.getUint32(p + 20, true)
    const nameLen = view.getUint16(p + 28, true)
    const extraLen = view.getUint16(p + 30, true)
    const commentLen = view.getUint16(p + 32, true)
    const local = view.getUint32(p + 42, true)
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen))
    const lNameLen = view.getUint16(local + 26, true)
    const lExtraLen = view.getUint16(local + 28, true)
    entries.set(name.replace(/^\//, ''), { method, offset: local + 30 + lNameLen + lExtraLen, size })
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

async function readEntry(buf: ArrayBuffer, e: ZipEntry): Promise<string> {
  const raw = buf.slice(e.offset, e.offset + e.size)
  if (e.method === 0) return new TextDecoder().decode(raw)
  if (e.method !== 8) throw new FileReadError('not-xlsx')
  const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new TextDecoder().decode(await new Response(stream).arrayBuffer())
}

// ── XML helpers ────────────────────────────────────────────

function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi, (_, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
    return ({ lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" } as Record<string, string>)[e.toLowerCase()]
  })
}

function attrs(s: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /([\w:]+)\s*=\s*"([^"]*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) out[m[1].replace(/^\w+:/, (p) => (p === 'r:' ? 'r:' : ''))] = decodeXml(m[2])
  return out
}

function textOf(xml: string): string {
  const clean = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '')
  let out = ''
  const re = /<t\b[^>]*>([\s\S]*?)<\/t>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(clean))) out += decodeXml(m[1])
  return out
}

function colIndex(ref: string): number {
  const letters = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? 'A'
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

const BUILTIN_DATE = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58])

type StyleKind = 'date' | ColumnFormat | null

function styleKinds(stylesXml: string): StyleKind[] {
  const custom = new Map<number, string>()
  const fmtRe = /<numFmt\b([^>]*)\/?>/g
  let m: RegExpExecArray | null
  while ((m = fmtRe.exec(stylesXml))) {
    const a = attrs(m[1])
    custom.set(Number(a.numFmtId), a.formatCode ?? '')
  }
  const xfsBlock = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(stylesXml)?.[1] ?? ''
  const kinds: StyleKind[] = []
  const xfRe = /<xf\b([^>]*?)(\/>|>)/g
  while ((m = xfRe.exec(xfsBlock))) {
    const id = Number(attrs(m[1]).numFmtId ?? 0)
    const code = custom.get(id)
    if (code !== undefined) {
      const bare = code.replace(/"[^"]*"|\[[^\]]*\]|\\./g, '')
      if (/%/.test(bare)) kinds.push('percent')
      else if (/[dmyhs]/i.test(bare) && !/^general$/i.test(bare.trim())) kinds.push('date')
      else if (/\$|€|£|₩/.test(code)) kinds.push('currency')
      else kinds.push(/[0#]/.test(bare) ? 'number' : null)
    } else if (BUILTIN_DATE.has(id)) kinds.push('date')
    else if (id === 9 || id === 10) kinds.push('percent')
    else if (id === 5 || id === 6 || id === 7 || id === 8 || (id >= 41 && id <= 44)) kinds.push('currency')
    else if (id >= 1 && id <= 4) kinds.push('number')
    else kinds.push(null)
  }
  return kinds
}

function serialToDate(serial: number, date1904: boolean): string {
  const ms = Math.round((serial + (date1904 ? 1462 : 0)) * 86400000) + Date.UTC(1899, 11, 30)
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  return serial % 1 === 0 ? day : `${day} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

// ── Grid → Table ───────────────────────────────────────────

function gridToTable(name: string, grid: Cell[][], cellFormats: (ColumnFormat | null)[][]): Table {
  const headerRow = grid.findIndex((r) => r && r.some((c) => c !== null && String(c).trim() !== ''))
  if (headerRow < 0) return { name, columns: [], rows: [], formulas: {}, formats: {} }
  const width = Math.max(...grid.map((r) => (r ? r.length : 0)))
  const body = grid.slice(headerRow + 1).filter((r) => r && r.some((c) => c !== null && String(c).trim() !== ''))
  if (body.length > MAX_ROWS) throw new FileReadError('too-many-rows')

  const keep: number[] = []
  for (let c = 0; c < width; c++) {
    const head = grid[headerRow][c]
    const hasHead = head !== null && head !== undefined && String(head).trim() !== ''
    if (hasHead || body.some((r) => r[c] !== null && r[c] !== undefined && String(r[c]).trim() !== '')) keep.push(c)
  }
  const columns: string[] = []
  for (const c of keep) {
    const head = grid[headerRow][c]
    let n = head !== null && head !== undefined && String(head).trim() !== '' ? String(head).trim() : `Column_${columnLetter(c)}`
    let k = 2
    const base = n
    while (columns.includes(n)) n = `${base}_${k++}`
    columns.push(n)
  }
  const rows = body.map((r) => keep.map((c) => (r[c] === undefined ? null : r[c])))
  const formats: Record<string, ColumnFormat> = {}
  const bodyFormats = cellFormats.slice(headerRow + 1)
  keep.forEach((c, j) => {
    const counts: Record<string, number> = {}
    for (const r of bodyFormats.slice(0, 200)) {
      const f = r?.[c]
      if (f) counts[f] = (counts[f] ?? 0) + 1
    }
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    if (best) formats[columns[j]] = best[0] as ColumnFormat
  })
  return { name, columns, rows, formulas: {}, formats }
}

export async function readXlsx(buf: ArrayBuffer, fileName: string): Promise<Workbook> {
  const zip = listZip(buf)
  const get = async (path: string) => {
    const e = zip.get(path)
    return e ? readEntry(buf, e) : ''
  }
  const workbookXml = await get('xl/workbook.xml')
  if (!workbookXml) throw new FileReadError('not-xlsx')
  const relsXml = await get('xl/_rels/workbook.xml.rels')
  const rels = new Map<string, string>()
  const relRe = /<Relationship\b([^>]*)\/?>/g
  let m: RegExpExecArray | null
  while ((m = relRe.exec(relsXml))) {
    const a = attrs(m[1])
    const target = a.Target ?? ''
    rels.set(a.Id, target.startsWith('/') ? target.slice(1) : `xl/${target}`.replace(/\/\.\//g, '/'))
  }
  const date1904 = /date1904\s*=\s*"(1|true)"/i.test(workbookXml)
  const sst: string[] = []
  const sstXml = await get('xl/sharedStrings.xml')
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>|<si\s*\/>/g
  while ((m = siRe.exec(sstXml))) sst.push(m[1] ? textOf(m[1]) : '')
  const kinds = styleKinds(await get('xl/styles.xml'))

  const sheets: Table[] = []
  const sheetRe = /<sheet\b([^>]*)\/?>/g
  while ((m = sheetRe.exec(workbookXml))) {
    const a = attrs(m[1])
    const path = rels.get(a['r:id'] ?? a.id ?? '')
    if (!path || !/worksheets\//.test(path)) continue
    const xml = await get(path)
    const grid: Cell[][] = []
    const fmt: (ColumnFormat | null)[][] = []
    const rowRe = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g
    let rm: RegExpExecArray | null
    let nextRow = 0
    while ((rm = rowRe.exec(xml))) {
      const ra = attrs(rm[1])
      const r = ra.r ? Number(ra.r) - 1 : nextRow
      nextRow = r + 1
      if (r >= MAX_ROWS + 50) throw new FileReadError('too-many-rows')
      const row: Cell[] = []
      const frow: (ColumnFormat | null)[] = []
      const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g
      let cm: RegExpExecArray | null
      let nextCol = 0
      while ((cm = cellRe.exec(rm[2] ?? ''))) {
        const ca = attrs(cm[1])
        const c = ca.r ? colIndex(ca.r) : nextCol
        nextCol = c + 1
        const inner = cm[2] ?? ''
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1]
        const kind = ca.s ? kinds[Number(ca.s)] ?? null : null
        let value: Cell = null
        switch (ca.t) {
          case 's': value = v !== undefined ? sst[Number(v)] ?? null : null; break
          case 'inlineStr': value = textOf(inner); break
          case 'str': value = v !== undefined ? decodeXml(v) : null; break
          case 'b': value = v === '1'; break
          case 'e': value = null; break
          default:
            if (v !== undefined && v !== '') {
              const n = Number(v)
              value = kind === 'date' && Number.isFinite(n) ? serialToDate(n, date1904) : Number.isFinite(n) ? n : decodeXml(v)
            }
        }
        row[c] = value
        frow[c] = kind === 'date' ? null : kind
      }
      for (let i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = null
      grid[r] = row
      fmt[r] = frow
    }
    for (let i = 0; i < grid.length; i++) if (!grid[i]) { grid[i] = []; fmt[i] = [] }
    const table = gridToTable(a.name ?? `Sheet${sheets.length + 1}`, grid, fmt)
    if (table.columns.length) sheets.push(table)
  }
  if (!sheets.length) throw new FileReadError('empty')
  return { fileName, sheets }
}

// ── CSV ────────────────────────────────────────────────────

export function readCsv(text: string, fileName: string): Workbook {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? ''
  const delim = [',', ';', '\t'].map((d) => ({ d, n: firstLine.split(d).length })).sort((a, b) => b.n - a.n)[0].d
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === delim) { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += ch
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  const grid: Cell[][] = rows.map((r) => r.map((s) => {
    const t = s.trim()
    if (t === '') return null
    if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(t)) return Number(t)
    if (/^(true|false)$/i.test(t)) return t.toLowerCase() === 'true'
    return s
  }))
  const table = gridToTable(fileName.replace(/\.[^.]+$/, '').slice(0, 31) || 'Sheet1', grid, [])
  if (!table.columns.length) throw new FileReadError('empty')
  return { fileName, sheets: [table] }
}

// ── Writing ────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const name = enc.encode(f.name)
    const crc = crc32(f.data)
    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)
    lv.setUint16(8, 0, true)
    lv.setUint16(10, 0, true)
    lv.setUint16(12, 0x21, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, f.data.length, true)
    lv.setUint32(22, f.data.length, true)
    lv.setUint16(26, name.length, true)
    local.set(name, 30)
    const central = new Uint8Array(46 + name.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(12, 0, true)
    cv.setUint16(14, 0x21, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, f.data.length, true)
    cv.setUint32(24, f.data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, offset, true)
    central.set(name, 46)
    locals.push(local, f.data)
    centrals.push(central)
    offset += local.length + f.data.length
  }
  const cdSize = centrals.reduce((s, c) => s + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, cdSize, true)
  ev.setUint32(16, offset, true)
  const out = new Uint8Array(offset + cdSize + 22)
  let p = 0
  for (const part of [...locals, ...centrals, end]) { out.set(part, p); p += part.length }
  return out
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c])
  // Strip characters that are illegal in XML 1.0.
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')

/** Style indexes in the generated styles.xml. */
const S = { header: 1, number: 2, currency: 3, percent: 4, wrap: 5 } as const

export type ExportSheet = {
  table: Table
  /** Write stored column formulas as live Excel formulas (with cached values). */
  liveFormulas?: boolean
  wrapColumns?: number[]
}

function safeSheetName(name: string, used: Set<string>): string {
  const base = name.replace(/[[\]:*?/\\]/g, '_').slice(0, 31) || 'Sheet'
  let n = base
  let k = 2
  while (used.has(n.toLowerCase())) n = `${base.slice(0, 28)}_${k++}`
  used.add(n.toLowerCase())
  return n
}

function sheetXml(s: ExportSheet): string {
  const t = s.table
  const letters = t.columns.map((_, i) => columnLetter(i))
  const formulaAsts = new Map<number, { node: ReturnType<typeof parse>; refs: string[] }>()
  if (s.liveFormulas) {
    for (const [name, src] of Object.entries(t.formulas)) {
      const ci = t.columns.indexOf(name)
      if (ci < 0) continue
      try {
        const node = parse(src)
        const refs = [...columnsUsed(node)]
        if (refs.every((r) => t.columns.includes(r) && r !== name)) formulaAsts.set(ci, { node, refs })
      } catch { /* fall back to values */ }
    }
  }
  const styleFor = (ci: number, v: Cell) => {
    const f = t.formats[t.columns[ci]]
    if (typeof v !== 'number') return s.wrapColumns?.includes(ci) ? S.wrap : 0
    if (f === 'currency') return S.currency
    if (f === 'percent') return S.percent
    if (f === 'number' || !Number.isInteger(v)) return S.number
    return 0
  }
  const widths = t.columns.map((c, ci) => {
    let w = c.length
    for (const r of t.rows.slice(0, 300)) {
      const v = r[ci]
      const len = v === null ? 0 : typeof v === 'number' ? 12 : String(v).length
      if (len > w) w = len
    }
    return Math.min(Math.max(w + 2, 8), s.wrapColumns?.includes(ci) ? 70 : 45)
  })
  const out: string[] = []
  out.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
  out.push('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">')
  out.push('<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>')
  out.push('<sheetFormatPr defaultRowHeight="15"/>')
  if (widths.length) out.push(`<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`)
  out.push('<sheetData>')
  out.push(`<row r="1">${t.columns.map((c, i) => `<c r="${letters[i]}1" t="inlineStr" s="${S.header}"><is><t>${esc(c)}</t></is></c>`).join('')}</row>`)
  t.rows.forEach((row, ri) => {
    const r = ri + 2
    const cells: string[] = []
    row.forEach((v, ci) => {
      const ref = `${letters[ci]}${r}`
      const st = styleFor(ci, v)
      const sAttr = st ? ` s="${st}"` : ''
      const fa = formulaAsts.get(ci)
      if (fa && fa.refs.every((name) => row[t.columns.indexOf(name)] !== null)) {
        const f = esc(toExcel(fa.node, (name) => `${letters[t.columns.indexOf(name)]}${r}`))
        if (typeof v === 'number') cells.push(`<c r="${ref}"${sAttr}><f>${f}</f><v>${v}</v></c>`)
        else if (typeof v === 'boolean') cells.push(`<c r="${ref}" t="b"${sAttr}><f>${f}</f><v>${v ? 1 : 0}</v></c>`)
        else if (typeof v === 'string') cells.push(`<c r="${ref}" t="str"${sAttr}><f>${f}</f><v>${esc(v)}</v></c>`)
        else cells.push(`<c r="${ref}"${sAttr}><f>${f}</f></c>`)
        return
      }
      if (v === null) return
      if (typeof v === 'number') cells.push(`<c r="${ref}"${sAttr}><v>${v}</v></c>`)
      else if (typeof v === 'boolean') cells.push(`<c r="${ref}" t="b"${sAttr}><v>${v ? 1 : 0}</v></c>`)
      else cells.push(`<c r="${ref}" t="inlineStr"${sAttr}><is><t xml:space="preserve">${esc(v)}</t></is></c>`)
    })
    out.push(`<row r="${r}">${cells.join('')}</row>`)
  })
  out.push('</sheetData></worksheet>')
  return out.join('')
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/></numFmts>
<fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F3A4D"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

export function writeXlsx(sheets: ExportSheet[]): Uint8Array {
  const enc = new TextEncoder()
  const used = new Set<string>()
  const names = sheets.map((s) => safeSheetName(s.table.name, used))
  const files: { name: string; data: Uint8Array }[] = []
  files.push({
    name: '[Content_Types].xml',
    data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`),
  })
  files.push({
    name: '_rels/.rels',
    data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
  })
  files.push({
    name: 'xl/workbook.xml',
    data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`),
  })
  files.push({
    name: 'xl/_rels/workbook.xml.rels',
    data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
  })
  files.push({ name: 'xl/styles.xml', data: enc.encode(STYLES) })
  sheets.forEach((s, i) => {
    files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(sheetXml({ ...s, table: { ...s.table, name: names[i] } })) })
  })
  return zipStore(files)
}
