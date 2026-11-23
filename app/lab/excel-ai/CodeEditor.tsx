'use client'
import { type KeyboardEvent, type RefObject, useMemo, useRef } from 'react'
import { tokenizeSql } from '@/lib/excel-ai/sql-highlight'

function Tokens({ code, tables }: { code: string; tables: readonly string[] }) {
  const tokens = useMemo(() => tokenizeSql(code, tables), [code, tables])
  return (
    <>
      {tokens.map((t, i) => (t.kind === 'text' ? t.text : <span key={i} className={`tk-${t.kind}`}>{t.text}</span>))}
    </>
  )
}

/** Read-only coloured SQL, for lessons and previews. */
export function SqlCode({ code, tables = [], className = '' }: { code: string; tables?: readonly string[]; className?: string }) {
  return (
    <pre className={`xl-sqlcode ${className}`.trim()}>
      <code><Tokens code={code} tables={tables} /></code>
    </pre>
  )
}

type EditorProps = {
  value: string
  onChange: (v: string) => void
  onRun: () => void
  tables: readonly string[]
  textareaRef: RefObject<HTMLTextAreaElement | null>
  label: string
  runHint: string
  lineCountLabel: string
}

/**
 * A textarea with a coloured layer behind it. The textarea keeps native
 * editing (undo, selection, IME for Korean) and its text is transparent, so
 * what you see is the highlighted <pre> underneath, kept in scroll sync.
 */
export default function CodeEditor({ value, onChange, onRun, tables, textareaRef, label, runHint, lineCountLabel }: EditorProps) {
  const layer = useRef<HTMLPreElement>(null)
  const gutter = useRef<HTMLDivElement>(null)
  const lines = value.split('\n').length

  function syncScroll() {
    const ta = textareaRef.current
    if (!ta) return
    if (layer.current) {
      layer.current.scrollTop = ta.scrollTop
      layer.current.scrollLeft = ta.scrollLeft
    }
    if (gutter.current) gutter.current.scrollTop = ta.scrollTop
  }

  function replaceSelection(text: string, caretOffset = text.length) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    onChange(value.slice(0, start) + text + value.slice(end))
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + caretOffset
      syncScroll()
    })
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onRun(); return }
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); replaceSelection('  '); return }
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      // keep the current line's indent, like a code editor
      const ta = e.currentTarget
      const lineStart = value.lastIndexOf('\n', ta.selectionStart - 1) + 1
      const indent = /^[ \t]*/.exec(value.slice(lineStart))?.[0] ?? ''
      if (indent) { e.preventDefault(); replaceSelection('\n' + indent) }
    }
  }

  return (
    <div className="xl-editor">
      <div className="xl-editor-bar">
        <span className="xl-editor-lang">SQL</span>
        <span className="xl-editor-meta">{lines} {lineCountLabel}</span>
        <span className="xl-editor-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> {runHint}</span>
      </div>
      <div className="xl-editor-body">
        <div className="xl-editor-gutter" ref={gutter} aria-hidden="true">
          {Array.from({ length: lines }, (_, i) => <span key={i}>{i + 1}</span>)}
          <span className="xl-editor-pad" />
        </div>
        <div className="xl-editor-main">
          <pre className="xl-editor-layer" ref={layer} aria-hidden="true">
            <code><Tokens code={value} tables={tables} />{'\n'}</code>
          </pre>
          <textarea
            ref={textareaRef}
            className="xl-editor-input"
            value={value}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            wrap="off"
            aria-label={label}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
    </div>
  )
}
