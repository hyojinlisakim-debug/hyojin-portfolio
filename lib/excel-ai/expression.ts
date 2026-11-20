/**
 * A small, safe, Excel-like expression language used by `add_column` and `filter`.
 * Columns are written as [Column name]. Nothing is ever eval'd: expressions are
 * parsed into an AST, evaluated row by row, and printed back as real Excel formulas.
 */
import { type Cell, isBlank, toNumber } from './types'

export type Node =
  | { type: 'num'; value: number }
  | { type: 'str'; value: string }
  | { type: 'bool'; value: boolean }
  | { type: 'col'; name: string }
  | { type: 'unary'; op: '-'; arg: Node }
  | { type: 'bin'; op: string; left: Node; right: Node }
  | { type: 'call'; name: string; args: Node[] }

export const FUNCTIONS = [
  'ROUND', 'ABS', 'IF', 'IFERROR', 'MIN', 'MAX', 'AND', 'OR', 'NOT',
  'ISBLANK', 'ISNUMBER', 'UPPER', 'LOWER', 'TRIM', 'LEN', 'LEFT', 'RIGHT',
  'SEARCH', 'VALUE', 'CONCAT',
] as const

type Token =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'col'; v: string }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }

export class ExpressionError extends Error {}

function tokenize(src: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) { i++; continue }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?%?/i.exec(src.slice(i))
      if (!m) throw new ExpressionError(`Unexpected "${c}"`)
      const raw = m[0]
      const n = Number(raw.replace('%', ''))
      out.push({ t: 'num', v: raw.endsWith('%') ? n / 100 : n })
      i += raw.length
      continue
    }
    if (c === '"') {
      let s = ''
      i++
      while (i < src.length) {
        if (src[i] === '"') {
          if (src[i + 1] === '"') { s += '"'; i += 2; continue }
          break
        }
        s += src[i++]
      }
      if (src[i] !== '"') throw new ExpressionError('Unclosed text in quotes')
      i++
      out.push({ t: 'str', v: s })
      continue
    }
    if (c === '[') {
      const end = src.indexOf(']', i)
      if (end < 0) throw new ExpressionError('Missing "]" after column name')
      out.push({ t: 'col', v: src.slice(i + 1, end).trim() })
      i = end + 1
      continue
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i))!
      out.push({ t: 'id', v: m[0] })
      i += m[0].length
      continue
    }
    const two = src.slice(i, i + 2)
    if (two === '<=' || two === '>=' || two === '<>' || two === '!=' || two === '==') {
      out.push({ t: 'op', v: two === '!=' ? '<>' : two === '==' ? '=' : two })
      i += 2
      continue
    }
    if ('+-*/^&=<>(),'.includes(c)) {
      out.push({ t: 'op', v: c })
      i++
      continue
    }
    throw new ExpressionError(`Unexpected "${c}"`)
  }
  return out
}

export function parse(src: string, columns?: string[]): Node {
  const tokens = tokenize(src)
  let pos = 0
  const peek = () => tokens[pos]
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v
  const expectOp = (v: string) => {
    if (!isOp(v)) throw new ExpressionError(`Expected "${v}"`)
    pos++
  }

  const comparison = (): Node => {
    let left = concat()
    while (peek()?.t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(String(peek()!.v))) {
      const op = (tokens[pos++] as { v: string }).v
      left = { type: 'bin', op, left, right: concat() }
    }
    return left
  }
  const concat = (): Node => {
    let left = additive()
    while (isOp('&')) { pos++; left = { type: 'bin', op: '&', left, right: additive() } }
    return left
  }
  const additive = (): Node => {
    let left = multiplicative()
    while (isOp('+') || isOp('-')) {
      const op = (tokens[pos++] as { v: string }).v
      left = { type: 'bin', op, left, right: multiplicative() }
    }
    return left
  }
  const multiplicative = (): Node => {
    let left = power()
    while (isOp('*') || isOp('/')) {
      const op = (tokens[pos++] as { v: string }).v
      left = { type: 'bin', op, left, right: power() }
    }
    return left
  }
  const power = (): Node => {
    let left = unary()
    while (isOp('^')) { pos++; left = { type: 'bin', op: '^', left, right: unary() } }
    return left
  }
  const unary = (): Node => {
    if (isOp('-')) { pos++; return { type: 'unary', op: '-', arg: unary() } }
    if (isOp('+')) { pos++; return unary() }
    return primary()
  }
  const primary = (): Node => {
    const tk = peek()
    if (!tk) throw new ExpressionError('Expression ended too early')
    pos++
    if (tk.t === 'num') return { type: 'num', value: tk.v }
    if (tk.t === 'str') return { type: 'str', value: tk.v }
    if (tk.t === 'col') return { type: 'col', name: tk.v }
    if (tk.t === 'op' && tk.v === '(') {
      const e = comparison()
      expectOp(')')
      return e
    }
    if (tk.t === 'id') {
      const upper = tk.v.toUpperCase()
      if (isOp('(')) {
        pos++
        if (!(FUNCTIONS as readonly string[]).includes(upper)) {
          throw new ExpressionError(`Function ${tk.v} is not supported`)
        }
        const args: Node[] = []
        if (!isOp(')')) {
          args.push(comparison())
          while (isOp(',')) { pos++; args.push(comparison()) }
        }
        expectOp(')')
        return { type: 'call', name: upper, args }
      }
      if (upper === 'TRUE' || upper === 'FALSE') return { type: 'bool', value: upper === 'TRUE' }
      // Lenient: a bare word that is exactly a column name.
      const match = columns?.find((c) => c.toLowerCase() === tk.v.toLowerCase())
      if (match) return { type: 'col', name: match }
      throw new ExpressionError(`Unknown name "${tk.v}" — write columns as [${tk.v}]`)
    }
    throw new ExpressionError(`Unexpected "${tk.v}"`)
  }

  const node = comparison()
  if (pos < tokens.length) throw new ExpressionError(`Unexpected "${String(tokens[pos].v)}"`)
  return node
}

export function columnsUsed(node: Node, acc: Set<string> = new Set()): Set<string> {
  switch (node.type) {
    case 'col': acc.add(node.name); break
    case 'unary': columnsUsed(node.arg, acc); break
    case 'bin': columnsUsed(node.left, acc); columnsUsed(node.right, acc); break
    case 'call': node.args.forEach((a) => columnsUsed(a, acc)); break
  }
  return acc
}

/** Resolve column names case-insensitively against the table; throws on unknown columns. */
export function bindColumns(node: Node, columns: string[]): Node {
  const resolve = (name: string) => {
    const exact = columns.indexOf(name)
    if (exact >= 0) return columns[exact]
    const ci = columns.find((c) => c.toLowerCase() === name.toLowerCase())
    if (ci) return ci
    throw new ExpressionError(`Column "${name}" not found`)
  }
  const walk = (n: Node): Node => {
    switch (n.type) {
      case 'col': return { type: 'col', name: resolve(n.name) }
      case 'unary': return { ...n, arg: walk(n.arg) }
      case 'bin': return { ...n, left: walk(n.left), right: walk(n.right) }
      case 'call': return { ...n, args: n.args.map(walk) }
      default: return n
    }
  }
  return walk(node)
}

// ── Evaluation ─────────────────────────────────────────────

const ERR = Symbol('error')
type Val = Cell | typeof ERR

const num = (v: Val): number | typeof ERR => {
  if (v === ERR) return ERR
  const n = toNumber(v)
  return n === null ? ERR : n
}
const str = (v: Val): string | typeof ERR => {
  if (v === ERR) return ERR
  if (v === null) return ''
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return String(v)
}
const truthy = (v: Val): boolean | typeof ERR => {
  if (v === ERR) return ERR
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (v === null) return false
  const s = v.trim().toUpperCase()
  if (s === 'TRUE') return true
  if (s === 'FALSE' || s === '') return false
  const n = toNumber(v)
  return n === null ? ERR : n !== 0
}

function compare(a: Val, b: Val): number | typeof ERR {
  if (a === ERR || b === ERR) return ERR
  const na = typeof a === 'number' ? a : typeof a === 'string' && a.trim() !== '' ? toNumber(a) : null
  const nb = typeof b === 'number' ? b : typeof b === 'string' && b.trim() !== '' ? toNumber(b) : null
  if (na !== null && nb !== null && (typeof a === 'number' || typeof b === 'number')) return na - nb
  if (a === null && typeof b === 'number') return 0 - b
  if (b === null && typeof a === 'number') return a
  const sa = (str(a) as string).toLowerCase()
  const sb = (str(b) as string).toLowerCase()
  return sa < sb ? -1 : sa > sb ? 1 : 0
}

export function evaluate(node: Node, row: Cell[], index: Record<string, number>): Cell {
  const v = ev(node, row, index)
  if (v === ERR) return null
  if (typeof v === 'number' && !Number.isFinite(v)) return null
  return v
}

function ev(node: Node, row: Cell[], index: Record<string, number>): Val {
  switch (node.type) {
    case 'num': return node.value
    case 'str': return node.value
    case 'bool': return node.value
    case 'col': return row[index[node.name]] ?? null
    case 'unary': {
      const n = num(ev(node.arg, row, index))
      return n === ERR ? ERR : -n
    }
    case 'bin': {
      const l = ev(node.left, row, index)
      const r = ev(node.right, row, index)
      if (node.op === '&') {
        const a = str(l), b = str(r)
        return a === ERR || b === ERR ? ERR : a + b
      }
      if (['=', '<>', '<', '>', '<=', '>='].includes(node.op)) {
        const c = compare(l, r)
        if (c === ERR) return ERR
        switch (node.op) {
          case '=': return c === 0
          case '<>': return c !== 0
          case '<': return c < 0
          case '>': return c > 0
          case '<=': return c <= 0
          default: return c >= 0
        }
      }
      const a = num(l), b = num(r)
      if (a === ERR || b === ERR) return ERR
      switch (node.op) {
        case '+': return a + b
        case '-': return a - b
        case '*': return a * b
        case '/': return b === 0 ? ERR : a / b
        case '^': return Math.pow(a, b)
      }
      return ERR
    }
    case 'call': return call(node, row, index)
  }
}

function call(node: Extract<Node, { type: 'call' }>, row: Cell[], index: Record<string, number>): Val {
  const arg = (i: number) => (node.args[i] ? ev(node.args[i], row, index) : null)
  const need = (n: number) => {
    if (node.args.length < n) throw new ExpressionError(`${node.name} needs ${n} argument(s)`)
  }
  switch (node.name) {
    case 'ROUND': {
      need(1)
      const x = num(arg(0)), d = node.args[1] ? num(arg(1)) : 0
      if (x === ERR || d === ERR) return ERR
      const f = Math.pow(10, d)
      return Math.round((x + Math.sign(x) * Number.EPSILON) * f) / f
    }
    case 'ABS': { need(1); const x = num(arg(0)); return x === ERR ? ERR : Math.abs(x) }
    case 'IF': {
      need(2)
      const c = truthy(arg(0))
      if (c === ERR) return ERR
      return c ? arg(1) : node.args[2] ? arg(2) : false
    }
    case 'IFERROR': { need(2); const a = arg(0); return a === ERR ? arg(1) : a }
    case 'MIN':
    case 'MAX': {
      need(1)
      const ns = node.args.map((_, i) => num(arg(i)))
      if (ns.some((n) => n === ERR)) return ERR
      return node.name === 'MIN' ? Math.min(...(ns as number[])) : Math.max(...(ns as number[]))
    }
    case 'AND':
    case 'OR': {
      need(1)
      const bs = node.args.map((_, i) => truthy(arg(i)))
      if (bs.some((b) => b === ERR)) return ERR
      return node.name === 'AND' ? bs.every(Boolean) : bs.some(Boolean)
    }
    case 'NOT': { need(1); const b = truthy(arg(0)); return b === ERR ? ERR : !b }
    case 'ISBLANK': { need(1); const a = arg(0); return a !== ERR && isBlank(a) }
    case 'ISNUMBER': { need(1); const a = arg(0); return typeof a === 'number' }
    case 'UPPER':
    case 'LOWER':
    case 'TRIM': {
      need(1)
      const s = str(arg(0))
      if (s === ERR) return ERR
      return node.name === 'UPPER' ? s.toUpperCase() : node.name === 'LOWER' ? s.toLowerCase() : s.trim().replace(/\s+/g, ' ')
    }
    case 'LEN': { need(1); const s = str(arg(0)); return s === ERR ? ERR : s.length }
    case 'LEFT':
    case 'RIGHT': {
      need(1)
      const s = str(arg(0)), n = node.args[1] ? num(arg(1)) : 1
      if (s === ERR || n === ERR) return ERR
      return node.name === 'LEFT' ? s.slice(0, n) : n <= 0 ? '' : s.slice(-n)
    }
    case 'SEARCH': {
      need(2)
      const find = str(arg(0)), within = str(arg(1))
      if (find === ERR || within === ERR) return ERR
      const at = within.toLowerCase().indexOf(find.toLowerCase())
      return at < 0 ? ERR : at + 1
    }
    case 'VALUE': { need(1); const n = num(arg(0)); return n }
    case 'CONCAT': {
      const parts = node.args.map((_, i) => str(arg(i)))
      return parts.some((p) => p === ERR) ? ERR : parts.join('')
    }
  }
  return ERR
}

// ── Printing back to Excel ─────────────────────────────────

const PREC: Record<string, number> = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4, '^': 5 }

/**
 * Print an AST as an Excel formula (without the leading "=").
 * `ref` turns a column name into a cell or range reference, e.g. "E2" or "E2:E2113".
 */
export function toExcel(node: Node, ref: (column: string) => string): string {
  const p = (n: Node, parentPrec: number): string => {
    switch (n.type) {
      case 'num': return String(n.value)
      case 'str': return `"${n.value.replace(/"/g, '""')}"`
      case 'bool': return n.value ? 'TRUE' : 'FALSE'
      case 'col': return ref(n.name)
      case 'unary': return `-${p(n.arg, 6)}`
      case 'bin': {
        const prec = PREC[n.op]
        const s = `${p(n.left, prec)}${n.op}${p(n.right, prec + 1)}`
        return prec < parentPrec ? `(${s})` : s
      }
      case 'call': {
        if (n.name === 'CONCAT') {
          const s = n.args.map((a) => p(a, 3)).join('&')
          return 2 < parentPrec ? `(${s})` : s
        }
        return `${n.name}(${n.args.map((a) => p(a, 0)).join(',')})`
      }
    }
  }
  return p(node, 0)
}

/** Print back to the internal expression syntax (used when a column is renamed). */
export function toSource(node: Node): string {
  return toExcel(node, (c) => `[${c}]`)
}
