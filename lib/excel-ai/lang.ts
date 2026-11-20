import type { Lang } from './types'

// Language preference shared by the gate and the tool (and across tabs).
const LANG_KEY = 'excel-ai-lang'
const listeners = new Set<() => void>()

export function readLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY)
    return v === 'ko' || v === 'fr' ? v : 'en'
  } catch {
    return 'en'
  }
}

export const serverLang = (): Lang => 'en'

export function writeLang(l: Lang) {
  try { localStorage.setItem(LANG_KEY, l) } catch { /* private mode: keep in memory only */ }
  listeners.forEach((f) => f())
}

export function subscribeLang(f: () => void) {
  listeners.add(f)
  const onStorage = (e: StorageEvent) => { if (e.key === LANG_KEY) f() }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(f); window.removeEventListener('storage', onStorage) }
}
