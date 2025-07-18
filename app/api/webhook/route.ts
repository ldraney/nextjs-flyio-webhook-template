import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { checkDatabaseHealth, saveWebhookEvent, getWebhookEvents } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const isDbHealthy = await checkDatabaseHealth()
    const searchParams = request.nextUrl.searchParams
    const showEvents = searchParams.get('events') === 'true'
    
    let recentEvents = null
    if (showEvents && isDbHealthy) {
      recentEvents = await getWebhookEvents(10, 0)
    }
    
    return NextResponse.json({ 
      status: 'ready',
      service: 'batch-webhook-fly',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: isDbHealthy,
        status: isDbHealthy ? 'healthy' : 'unhealthy'
      },
      recent_events: recentEvents,
      message: 'Webhook endpoint is operational',
      endpoints: {
        'GET /api/webhook': 'Status check',
        'GET /api/webhook?events=true': 'Status with recent events',
        'POST /api/webhook': 'Process webhook'
      }
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({ 
      status: 'error',
      service: 'batch-webhook-fly',
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const correlationId = nanoid()
  
  try {
    const body = await request.json()
    
    console.log(`🔔 [${correlationId}] Webhook received:`, JSON.stringify(body, null, 2))
    
    // Handle Monday.com challenge verification
    if (body.challenge) {
      console.log(`✅ [${correlationId}] Challenge verification:`, body.challenge)
      return NextResponse.json({ challenge: body.challenge })
    }
    
    // Determine event type
    const eventType = body.event?.type || body.type || 'unknown'
    
    // Save webhook data in database
    try {
      const savedEvent = await saveWebhookEvent({
        correlation_id: correlationId,
        event_type: eventType,
        payload: body,
        processed: false
      })
      
      console.log(`✅ [${correlationId}] Webhook stored in database with ID: ${savedEvent.id}`)
      
      // Process the webhook based on event type
      await processWebhookEvent(correlationId, eventType, body)
      
    } catch (dbError) {
      console.error(`❌ [${correlationId}] Database error:`, dbError)
      // Continue processing even if database save fails
    }
    
    return NextResponse.json({ 
      status: 'success',
      correlation_id: correlationId,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      message: 'Webhook processed and stored successfully'
    })
    
  } catch (error) {
    console.error(`❌ [${correlationId}] Webhook error:`, error)
    
    if (error instanceof SyntaxError) {
      return new NextResponse('Invalid JSON payload', { status: 400 })
    }
    
    return new NextResponse('Internal server error', { status: 500 })
  }
}

// Process different types of webhook events
async function processWebhookEvent(correlationId: string, eventType: string, payload: unknown) {
  console.log(`🔄 [${correlationId}] Processing event type: ${eventType}`)
  
  switch (eventType) {
    case 'create_pulse':
      console.log(`📝 [${correlationId}] Task created: ${(payload as { pulseName?: string }).pulseName || 'Unknown'}`)
      break
      
    case 'update_pulse':
      console.log(`📝 [${correlationId}] Task updated: ${(payload as { pulseName?: string }).pulseName || 'Unknown'}`)
      break
      
    case 'test':
      console.log(`🧪 [${correlationId}] Test event received`)
      break
      
    default:
      console.log(`❓ [${correlationId}] Unknown event type: ${eventType}`)
  }
  
  // Mark as processed (you can add more complex processing logic here)
  try {
    const { markWebhookProcessed } = await import('@/lib/database')
    await markWebhookProcessed(correlationId)
    console.log(`✅ [${correlationId}] Event marked as processed`)
  } catch (error) {
    console.error(`❌ [${correlationId}] Failed to mark as processed:`, error)
  }
}
