import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { ThemeProvider } from '@/components/ThemeProvider'
import PageTransition from '@/components/PageTransition'

export const metadata: Metadata = {
  title: 'Hyojin Kim — Portfolio',
  description: 'Software Engineer & IT Specialist based in Calgary, Canada. 5+ years bridging infrastructure, automation, and web development.',
  keywords: ['Software Engineer', 'IT Specialist', 'Calgary', 'Canada', 'Shopify', 'Python', 'AWS', 'Network Engineer'],
  authors: [{ name: 'Hyojin Kim' }],
  openGraph: {
    title: 'Hyojin Kim — Software Engineer & IT Specialist',
    description: 'Software Engineer & IT Specialist based in Calgary, Canada. From network infrastructure to Shopify storefronts.',
    url: 'https://hyojinkim.dev',
    siteName: 'Hyojin Kim Portfolio',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Hyojin Kim — Software Engineer & IT Specialist',
      },
    ],
    locale: 'en_CA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hyojin Kim — Software Engineer & IT Specialist',
    description: 'Software Engineer & IT Specialist based in Calgary, Canada.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent theme flash: set data-theme before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <Nav />
          <main>
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
