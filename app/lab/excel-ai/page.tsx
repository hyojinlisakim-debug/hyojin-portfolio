import type { Metadata } from 'next'
import ExcelAiClient from './ExcelAiClient'

export const metadata: Metadata = {
  title: 'AI Excel Data Processor — Hyojin Kim',
  description: 'Upload a spreadsheet and describe what you need. An AI plans the steps, the browser computes them, and every step comes with its Excel formula. Works in English, Korean, and French.',
}

export default function ExcelAiPage() {
  return <ExcelAiClient />
}
