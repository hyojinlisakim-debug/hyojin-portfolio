// Small SQL tokenizer for syntax colouring. It never changes the text:
// joining every token's text gives back the input exactly, so the coloured
// layer lines up with the textarea character for character.

export type TokenKind = 'kw' | 'fn' | 'str' | 'id' | 'num' | 'com' | 'op' | 'tbl' | 'punc' | 'text'
export type Token = { kind: TokenKind; text: string }

const KEYWORDS = new Set(
  (
    'select from where and or not in is null like between as on join left right inner outer full cross ' +
    'group by order having limit offset distinct union all except intersect case when then else end asc desc ' +
    'insert into values update set delete create table view with exists cast true false glob escape collate ' +
    'natural using recursive over partition window rows range preceding following current row filter nulls first last'
  ).split(' '),
)

const FUNCTIONS = new Set(
  (
    'count sum avg min max total group_concat round abs upper lower trim ltrim rtrim length substr substring ' +
    'replace instr coalesce ifnull nullif iif date time datetime julianday strftime printf format typeof ' +
    'random hex quote char unicode row_number rank dense_rank ntile lag lead first_value last_value ' +
    'cume_dist percent_rank sign ceil ceiling floor power sqrt exp ln log mod'
  ).split(' '),
)

export function tokenizeSql(src: string, tables: readonly string[] = []): Token[] {
  const tableSet = new Set(tables.map((t) => t.toLowerCase()))
  const out: Token[] = []
  const push = (kind: TokenKind, text: string) => {
    const last = out[out.length - 1]
    if (last && last.kind === kind && (kind === 'text' || kind === 'punc')) last.text += text
    else out.push({ kind, text })
  }
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i]
    const next = src[i + 1]
    // line comment
    if (c === '-' && next === '-') {
      let j = src.indexOf('\n', i)
      if (j === -1) j = n
      push('com', src.slice(i, j))
      i = j
      continue
    }
    // block comment (may be unterminated while typing)
    if (c === '/' && next === '*') {
      let j = src.indexOf('*/', i + 2)
      j = j === -1 ? n : j + 2
      push('com', src.slice(i, j))
      i = j
      continue
    }
    // string literal or quoted identifier; doubled quote is an escape
    if (c === "'" || c === '"' || c === '`' || c === '[') {
      const close = c === '[' ? ']' : c
      let j = i + 1
      while (j < n) {
        if (src[j] === close) {
          if (close !== ']' && src[j + 1] === close) { j += 2; continue }
          j++
          break
        }
        j++
      }
      const text = src.slice(i, j)
      if (c === "'") push('str', text)
      else {
        const inner = text.slice(1, text.endsWith(close) && text.length > 1 ? -1 : undefined)
        push(tableSet.has(inner.toLowerCase()) ? 'tbl' : 'id', text)
      }
      i = j
      continue
    }
    // number
    if (/[0-9]/.test(c) || (c === '.' && next !== undefined && /[0-9]/.test(next))) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i))
      const text = m ? m[0] : c
      push('num', text)
      i += text.length
      continue
    }
    // word
    if (/[A-Za-z_À-￿]/.test(c)) {
      const m = /^[A-Za-z0-9_À-￿$]+/.exec(src.slice(i))
      const word = m ? m[0] : c
      const lower = word.toLowerCase()
      let j = i + word.length
      while (j < n && (src[j] === ' ' || src[j] === '\t')) j++
      const isCall = src[j] === '('
      if (FUNCTIONS.has(lower) && isCall) push('fn', word)
      else if (KEYWORDS.has(lower)) push('kw', word)
      else if (tableSet.has(lower)) push('tbl', word)
      else if (isCall) push('fn', word)
      else push('text', word)
      i += word.length
      continue
    }
    // operators
    const two = c + (next ?? '')
    if (['<=', '>=', '<>', '!=', '==', '||'].includes(two)) { push('op', two); i += 2; continue }
    if ('=<>+-*/%'.includes(c)) { push('op', c); i++; continue }
    if ('(),;.'.includes(c)) { push('punc', c); i++; continue }
    push('text', c)
    i++
  }
  return out
}
