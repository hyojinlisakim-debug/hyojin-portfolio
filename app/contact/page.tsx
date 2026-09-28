import type { Metadata } from 'next'
import ContactClient from './ContactClient'

export const metadata: Metadata = {
  title: 'Contact — Hyojin Kim',
  description: 'Get in touch with Hyojin Kim — Software Engineer & IT Specialist based in Calgary, Canada, open to new opportunities.',
}

export default function ContactPage() {
  return <ContactClient />
}
