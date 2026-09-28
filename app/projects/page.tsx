import type { Metadata } from 'next'
import ProjectsClient from './ProjectsClient'

export const metadata: Metadata = {
  title: 'Projects — Hyojin Kim',
  description: 'Development, design, and AI/ML projects by Hyojin Kim, including a YOLO-based intelligent CCTV research project and Shopify storefront work.',
}

export default function ProjectsPage() {
  return <ProjectsClient />
}
