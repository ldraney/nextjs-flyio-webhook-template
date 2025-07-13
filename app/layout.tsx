import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Batch Webhook Fly',
  description: 'Monday.com batch code webhook service running on Fly.io',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ 
        fontFamily: 'system-ui, sans-serif',
        margin: 0,
        padding: '2rem',
        backgroundColor: '#f5f5f5'
      }}>
        {children}
      </body>
    </html>
  )
}
