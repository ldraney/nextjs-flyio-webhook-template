export default function HomePage() {
  return (
    <main>
      <h1>🚀 Batch Webhook Fly</h1>
      <p>✅ Next.js app running successfully!</p>
      <p>🌐 Ready for Fly.io deployment</p>
      
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        backgroundColor: 'white', 
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h2>Status</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>📦 Environment: {process.env.NODE_ENV || 'development'}</li>
          <li>⏰ Timestamp: {new Date().toISOString()}</li>
          <li>🔗 Webhook endpoint: <code>/api/webhook</code> (coming soon)</li>
        </ul>
      </div>
    </main>
  )
}
