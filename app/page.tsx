export default function HomePage() {
  return (
    <main>
      <h1>🎯 EPO → Bulk Batch Automation</h1>
      <p>✅ Monday.com cross-board automation service</p>
      <p>🌐 Deployed on Fly.io</p>
      
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
          <li>🔗 API endpoint: <code>/api/epo-automation</code></li>
          <li>📨 Webhook endpoint: <code>/api/epo-automation</code> (POST)</li>
        </ul>
      </div>
      
      <div style={{ 
        marginTop: '1rem', 
        padding: '1rem', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h3>How it works</h3>
        <p>Automatically updates Bulk Batch Traceability items to "To Do" when all connected EPO items reach "QA Passed" or "Cancelled" status.</p>
        <p><strong>Webhook URL:</strong> <code>https://pel-epo-automation.fly.dev/api/epo-automation</code></p>
      </div>
    </main>
  )
}
