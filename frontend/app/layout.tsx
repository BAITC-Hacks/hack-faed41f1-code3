import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EmployeeProvider } from '@/lib/employee-context'
import './globals.css'

const _geistSans = Geist({ subsets: ['latin', 'cyrillic'], variable: '--font-geist-sans' })
const _geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Career Quest — карьерное развитие сотрудников',
  description: 'Внутренний сервис банка для отслеживания карьерного профиля, рекомендаций по развитию и HR-аналитики.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`bg-background ${_geistSans.variable} ${_geistMono.variable}`}>
      <body className="font-sans antialiased">
        <TooltipProvider>
          <EmployeeProvider>{children}</EmployeeProvider>
        </TooltipProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
