import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { ACCESS_COOKIE, hasAccess } from '@/lib/excel-ai/access'
import ExcelAiClient from './ExcelAiClient'
import ExcelAiGate from './ExcelAiGate'

export const metadata: Metadata = {
  title: 'AI Excel Data Processor — Hyojin Kim',
  description: 'Upload a spreadsheet and describe what you need. An AI plans the steps, the browser computes them, and every step comes with its Excel formula. Works in English, Korean, and French.',
}

export default async function ExcelAiPage() {
  const cookieStore = await cookies()
  return hasAccess(cookieStore.get(ACCESS_COOKIE)?.value) ? <ExcelAiClient /> : <ExcelAiGate />
}
