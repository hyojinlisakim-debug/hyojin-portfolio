import type { Metadata } from 'next'
import AboutClient from './AboutClient'

export const metadata: Metadata = {
  title: 'About — Hyojin Kim',
  description: 'Software Engineer & IT Specialist based in Calgary, Canada — career journey from network infrastructure and enterprise asset management to Shopify development.',
}

export default function AboutPage() {
  return <AboutClient />
}
