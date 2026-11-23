/**
 * Turn the step pipeline into a Power Query (M) script that can be pasted into
 * Excel or Power BI (Get Data → Blank Query → Advanced Editor).
 */
import type { Op } from './ops'
import type { Table, Workbook } from './types'
import { type Node, parse } from './expression'
import { DICTS, describeStep } from './i18n'

const str = (s: string) => `"${s.replace(/"/g, '""')}"`
const field = (name: string) => (/^[A-Za-z_][A-Za-z0-9_ ]*$/.test(name) && !/\s$/.test(name) ? `[${name}]` : `[#${str(name)}]`)
const list = (xs: string[]) => `{${xs.map(str).join(', ')}}`
const ident = (name: string) => {
  const n = name.replace(/[^A-Za-z0-9_]/g, '_')
  return /^[A-Za-z_]/.test(n) ? n : `_${n}`
}

/** Excel-style expression → M expression (row context, columns as [Field]). */
export function exprToM(node: Node): string {
  const m = (n: Node): string => {
    switch (n.type) {
      case 'num': return String(n.value)
      case 'str': return str(n.value)
      case 'bool': return n.value ? 'true' : 'false'
      case 'col': return field(n.name)
      case 'unary': return `-(${m(n.arg)})`
      case 'bin':
        if (n.op === '&') return `(Text.From(${m(n.left)}) & Text.From(${m(n.right)}))`
        if (n.op === '^') return `Number.Power(${m(n.left)}, ${m(n.right)})`
        if (n.op === 'AND' || n.op === 'OR') return `(${m(n.left)} ${n.op.toLowerCase()} ${m(n.right)})`
        return `(${m(n.left)} ${n.op} ${m(n.right)})`
      case 'call': {
        const a = n.args.map(m)
        switch (n.name) {
          case 'ROUND': return `Number.Round(${a[0]}, ${a[1] ?? 0})`
          case 'ABS': return `Number.Abs(${a[0]})`
          case 'IF': return `(if ${a[0]} then ${a[1]} else ${a[2] ?? 'false'})`
          case 'IFERROR': return `(try ${a[0]} otherwise ${a[1]})`
          case 'MIN': return `List.Min({${a.join(', ')}})`
          case 'MAX': return `List.Max({${a.join(', ')}})`
          case 'AND': return `(${a.join(' and ')})`
          case 'OR': return `(${a.join(' or ')})`
          case 'NOT': return `(not ${a[0]})`
          case 'ISBLANK': return `(${a[0]} = null or ${a[0]} = "")`
          case 'ISNUMBER': {
            const inner = n.args[0]
            if (inner?.type === 'call' && inner.name === 'SEARCH') {
              return `Text.Contains(Text.From(${m(inner.args[1])}), ${m(inner.args[0])}, Comparer.OrdinalIgnoreCase)`
            }
            return `(${a[0]} is number)`
          }
          case 'UPPER': return `Text.Upper(Text.From(${a[0]}))`
          case 'LOWER': return `Text.Lower(Text.From(${a[0]}))`
          case 'TRIM': return `Text.Trim(Text.From(${a[0]}))`
          case 'LEN': return `Text.Length(Text.From(${a[0]}))`
          case 'LEFT': return `Text.Start(Text.From(${a[0]}), ${a[1] ?? 1})`
          case 'RIGHT': return `Text.End(Text.From(${a[0]}), ${a[1] ?? 1})`
          case 'SEARCH': return `(Text.PositionOf(Text.Lower(Text.From(${a[1]})), Text.Lower(${a[0]})) + 1)`
          case 'VALUE': return `Number.From(${a[0]})`
          case 'CONCAT': return `Text.Combine({${a.map((x) => `Text.From(${x})`).join(', ')}})`
        }
        return 'null'
      }
    }
  }
  return m(node)
}

const SAP_NUMBER = (culture: string, thousands: string) =>
  `each if _ = null or _ = "" then null else let t = Text.Trim(Text.From(_)), neg = Text.EndsWith(t, "-") or Text.StartsWith(t, "("), clean = Text.Remove(t, {"-", "(", ")", "$", " ", "${thousands}"}) in (if neg then -1 else 1) * Number.From(clean, "${culture}")`

function dateFn(order: 'auto' | 'dmy' | 'mdy' | 'ymd' | undefined) {
  if (order === 'mdy') return 'each try Date.From(Date.FromText(Text.From(_), [Culture="en-US"])) otherwise null'
  if (order === 'dmy') return 'each try Date.From(Date.FromText(Text.From(_), [Culture="en-GB"])) otherwise null'
  return 'each if _ = null then null else try Date.FromText(Text.From(_), [Format="dd.MM.yyyy"]) otherwise try Date.FromText(Text.From(_), [Format="yyyyMMdd"]) otherwise try Date.From(_) otherwise null'
}

export function toPowerQuery(wb: Workbook, startSheet: string, steps: Op[]): string {
  const sheetsUsed = new Set<string>([startSheet])
  let current = startSheet
  for (const s of steps) {
    if (s.op === 'use_sheet') sheetsUsed.add(s.sheet)
    if (s.op === 'lookup') sheetsUsed.add(s.from_sheet)
    if (s.op === 'reconcile') sheetsUsed.add(s.with_sheet)
  }
  const find = (name: string): Table | undefined => wb.sheets.find((t) => t.name.toLowerCase() === name.toLowerCase())
  const isCsv = /\.(csv|tsv|txt)$/i.test(wb.fileName)
  const out: string[] = []
  out.push('// Generated from the steps applied in the AI Excel tool.')
  out.push('// Excel: Data > Get Data > From Other Sources > Blank Query > Advanced Editor, then paste.')
  out.push('// Change FilePath to where the file is saved on your computer.')
  out.push('let')
  out.push(`    FilePath = ${str(`C:\\Data\\${wb.fileName}`)},`)
  if (isCsv) {
    out.push('    // CSV/TXT source: check the delimiter (",", ";", "#(tab)" or "|").')
    out.push(`    ${ident(`Sheet_${startSheet}`)} = Table.PromoteHeaders(Csv.Document(File.Contents(FilePath), [Delimiter = ",", Encoding = 65001]), [PromoteAllScalars = true]),`)
  } else {
    out.push('    Source = Excel.Workbook(File.Contents(FilePath), null, true),')
    for (const name of sheetsUsed) {
      const t = find(name)
      const raw = `Source{[Item = ${str(t?.name ?? name)}, Kind = "Sheet"]}[Data]`
      const skip = t?.skipRows ? `Table.Skip(${raw}, ${t.skipRows})` : raw
      out.push(`    ${ident(`Sheet_${t?.name ?? name}`)} = Table.SelectRows(Table.PromoteHeaders(${skip}, [PromoteAllScalars = true]), each not List.IsEmpty(List.RemoveMatchingItems(Record.FieldValues(_), {"", null}))),`)
    }
  }
  let prev = ident(`Sheet_${find(startSheet)?.name ?? startSheet}`)
  let columns = [...(find(startSheet)?.columns ?? [])]
  let n = 0
  const emit = (comment: string, expr: string) => {
    n++
    const name = `Step${n}`
    out.push(`    // ${n}. ${comment}`)
    out.push(`    ${name} = ${expr},`)
    prev = name
  }
  for (const s of steps) {
    const comment = describeStep(s, DICTS.en).replace(/\n/g, ' ')
    switch (s.op) {
      case 'use_sheet':
        current = s.sheet
        n++
        out.push(`    // ${n}. ${comment}`)
        out.push(`    Step${n} = ${ident(`Sheet_${find(s.sheet)?.name ?? s.sheet}`)},`)
        prev = `Step${n}`
        columns = [...(find(s.sheet)?.columns ?? [])]
        break
      case 'trim':
        emit(comment, `Table.TransformColumns(${prev}, {${s.columns.map((c) => `{${str(c)}, each if _ = null then null else Text.Trim(Text.From(_)), type text}`).join(', ')}})`)
        break
      case 'change_case': {
        const fn = s.case === 'upper' ? 'Text.Upper' : 'Text.Lower'
        emit(comment, `Table.TransformColumns(${prev}, {${s.columns.map((c) => `{${str(c)}, each if _ = null then null else ${fn}(Text.From(_)), type text}`).join(', ')}})`)
        break
      }
      case 'standardize_id':
        emit(comment, `Table.TransformColumns(${prev}, {{${str(s.column)}, each if _ = null then null else ${str(s.prefix.toUpperCase())} & Text.PadStart(Text.From(Number.From(Text.Select(Text.From(_), {"0".."9"}))), ${s.digits}, "0"), type text}})`)
        break
      case 'replace_values':
        if (!s.mapping.length) break
        emit(comment, `Table.TransformColumns(${prev}, {{${str(s.column)}, each let k = Text.Lower(Text.Trim(Text.From(_ ?? ""))) in ${s.mapping.map((m) => `if k = ${str(m.from.trim().toLowerCase())} then ${str(m.to)}`).join(' else ')} else _}})`)
        break
      case 'fill_missing':
        emit(comment, `Table.ReplaceValue(Table.ReplaceValue(${prev}, null, ${typeof s.value === 'number' ? s.value : str(s.value)}, Replacer.ReplaceValue, {${str(s.column)}}), "", ${typeof s.value === 'number' ? s.value : str(s.value)}, Replacer.ReplaceValue, {${str(s.column)}})`)
        break
      case 'remove_duplicates':
        emit(comment, s.columns ? `Table.Distinct(${prev}, ${list(s.columns)})` : `Table.Distinct(${prev})`)
        break
      case 'filter':
        emit(comment, `Table.SelectRows(${prev}, each ${safeM(s.where, columns)})`)
        break
      case 'sort':
        emit(comment, `Table.Sort(${prev}, {${s.by.map((b) => `{${str(b.column)}, Order.${b.direction === 'desc' ? 'Descending' : 'Ascending'}}`).join(', ')}})`)
        break
      case 'add_column':
        emit(comment, `Table.AddColumn(${prev}, ${str(s.name)}, each ${safeM(s.expression, columns)}${s.format ? ', type number' : ''})`)
        if (!columns.includes(s.name)) columns.push(s.name)
        break
      case 'lookup': {
        const src = ident(`Sheet_${find(s.from_sheet)?.name ?? s.from_sheet}`)
        const tmp = `__${ident(s.from_sheet)}`
        emit(`${comment} (left join)`, `Table.NestedJoin(${prev}, {${str(s.match_column)}}, ${src}, {${str(s.from_key)}}, ${str(tmp)}, JoinKind.LeftOuter)`)
        emit('Expand the looked-up columns', `Table.ExpandTableColumn(${prev}, ${str(tmp)}, ${list(s.columns)}, ${list(s.columns)})`)
        columns.push(...s.columns)
        break
      }
      case 'group_by': {
        const aggs = s.aggregations.map((a) => {
          const name = a.as ?? (a.func === 'count' && !a.column ? 'Count' : `${a.func === 'average' ? 'Avg' : a.func[0].toUpperCase() + a.func.slice(1)}_${a.column}`)
          const col = a.column ? field(a.column) : ''
          const fn = a.func === 'sum' ? `List.Sum(${col})`
            : a.func === 'average' ? `List.Average(${col})`
            : a.func === 'min' ? `List.Min(${col})`
            : a.func === 'max' ? `List.Max(${col})`
            : a.func === 'count_distinct' ? `List.Count(List.Distinct(List.RemoveNulls(${col})))`
            : a.column ? `List.Count(List.RemoveNulls(${col}))` : 'Table.RowCount(_)'
          return { name, expr: `{${str(name)}, each ${fn}, type number}` }
        })
        emit(comment, `Table.Group(${prev}, ${list(s.by)}, {${aggs.map((a) => a.expr).join(', ')}})`)
        columns = [...s.by, ...aggs.map((a) => a.name)]
        break
      }
      case 'reconcile': {
        const other = ident(`Sheet_${find(s.with_sheet)?.name ?? s.with_sheet}`)
        const leftKeys = s.keys.map((k) => k.left)
        const rightKeys = s.keys.map((k) => k.right)
        emit(`${comment}: total the current table`, `Table.Group(${prev}, ${list(leftKeys)}, {{"Left_Total", each List.Sum(${field(s.left_value)}), type number}})`)
        const left = prev
        n++
        out.push(`    // ${n}. Total ${s.with_sheet} by the same keys`)
        out.push(`    Step${n} = Table.Group(${other}, ${list(rightKeys)}, {{"Right_Total", each List.Sum(${field(s.right_value)}), type number}}),`)
        const right = `Step${n}`
        emit('Match both sides (full outer join)', `Table.NestedJoin(${left}, ${list(leftKeys)}, ${right}, ${list(rightKeys)}, "__Right", JoinKind.FullOuter)`)
        emit('Expand the other total', `Table.ExpandTableColumn(${prev}, "__Right", {"Right_Total"}, {"Right_Total"})`)
        emit('Difference', `Table.AddColumn(${prev}, "Difference", each if [Left_Total] = null or [Right_Total] = null then null else Number.Round([Right_Total] - [Left_Total], 2), type number)`)
        emit('Status', `Table.AddColumn(${prev}, "Status", each if [Left_Total] = null then "Missing in ${current}" else if [Right_Total] = null then "Missing in ${s.with_sheet}" else if Number.Abs([Difference]) < 0.005 or ([Left_Total] <> 0 and Number.Abs([Difference] / [Left_Total]) <= ${(s.tolerance_pct ?? 0) / 100}) then "OK" else "Mismatch", type text)`)
        columns = [...leftKeys, 'Left_Total', 'Right_Total', 'Difference', 'Status']
        break
      }
      case 'select_columns':
        emit(comment, `Table.SelectColumns(${prev}, ${list(s.columns)})`)
        columns = [...s.columns]
        break
      case 'rename_column':
        emit(comment, `Table.RenameColumns(${prev}, {{${str(s.from)}, ${str(s.to)}}})`)
        columns = columns.map((c) => (c === s.from ? s.to : c))
        break
      case 'limit':
        emit(comment, `Table.FirstN(${prev}, ${s.rows})`)
        break
      case 'convert_number': {
        const fn = s.style === 'eu' ? SAP_NUMBER('de-DE', '.') : SAP_NUMBER('en-US', ',')
        emit(comment, `Table.TransformColumns(${prev}, {${s.columns.map((c) => `{${str(c)}, ${fn}, type number}`).join(', ')}})`)
        break
      }
      case 'convert_date':
        emit(comment, `Table.TransformColumns(${prev}, {${s.columns.map((c) => `{${str(c)}, ${dateFn(s.order)}, type date}`).join(', ')}})`)
        break
      case 'remove_report_rows': {
        const first = columns[0] ?? ''
        emit(comment, `Table.SelectRows(${prev}, each let v = Text.Trim(Text.From(Record.Field(_, ${str(first)}) ?? "")) in not Text.StartsWith(v, "*") and v <> ${str(first)} and not Text.StartsWith(Text.Lower(v), "total"))`)
        break
      }
      case 'pivot':
        emit(comment, `Table.Pivot(Table.TransformColumns(${prev}, {{${str(s.columns)}, Text.From, type text}}), List.Sort(List.Distinct(List.Transform(Table.Column(${prev}, ${str(s.columns)}), Text.From))), ${str(s.columns)}, ${str(s.value)}, ${s.func === 'count' ? 'List.Count' : s.func === 'average' ? 'List.Average' : 'List.Sum'})`)
        break
    }
  }
  // The last step must not end with a comma.
  if (out[out.length - 1].endsWith(',')) out[out.length - 1] = out[out.length - 1].slice(0, -1)
  out.push('in')
  out.push(`    ${prev}`)
  return out.join('\n')
}

function safeM(src: string, columns: string[]): string {
  try {
    return exprToM(parse(src, columns))
  } catch {
    return `true /* could not translate: ${src.replace(/\*\//g, '* /')} */`
  }
}
