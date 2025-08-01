import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { checkDatabaseHealth, saveWebhookEvent, getWebhookEvents } from '@/lib/database'

interface WebhookPayload {
  challenge?: string;
  event?: {
    type?: string;
    columnId?: string;
    pulseId?: string;
    value?: {
      label?: {
        text?: string;
      };
    };
  };
  type?: string;
  pulseName?: string;
}

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
      await processWebhookEvent(correlationId, eventType, body as WebhookPayload)
      
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
async function processWebhookEvent(correlationId: string, eventType: string, payload: WebhookPayload) {
  console.log(`🔄 [${correlationId}] Processing event type: ${eventType}`)
  
  // Handle EPO automation for column value changes
  if (eventType === 'update_column_value' && payload.event?.columnId === 'deal_stage') {
    const newStatus = payload.event?.value?.label?.text;
    
    if (newStatus && ['QA Passed', 'Cancelled'].includes(newStatus)) {
      const epoId = payload.event?.pulseId;
      
      if (epoId) {
        console.log(`🎯 [${correlationId}] EPO ${epoId} status changed to "${newStatus}", triggering targeted automation...`);
        
        try {
          // Import and run targeted EPO processing
          const { spawn } = await import('child_process');
          
          const result = await new Promise((resolve, reject) => {
            const child = spawn('node', ['epo-automation/epo-bulk-automation.js', '--targeted', epoId], {
              cwd: process.cwd(),
              env: { ...process.env }
            });
            
            let stdout = '';
            let stderr = '';
            
            child.stdout.on('data', (data) => {
              stdout += data.toString();
            });
            
            child.stderr.on('data', (data) => {
              stderr += data.toString();
            });
            
            child.on('close', (code) => {
              if (code === 0) {
                const summaryMatch = stdout.match(/(\d+) bulk items would be updated|(\d+) bulk items updated/);
                const processedMatch = stdout.match(/Processing (\d+) bulk|Analyzing (\d+) bulk/);
                
                const updated = summaryMatch ? parseInt(summaryMatch[1] || summaryMatch[2] || '0') : 0;
                const processed = processedMatch ? parseInt(processedMatch[1] || processedMatch[2] || '0') : 0;
                
                resolve({ processed, updated, output: stdout });
              } else {
                reject(new Error(`Targeted automation failed with code ${code}: ${stderr}`));
              }
            });
          });
          
          const automationResult = result as { updated: number; processed: number };
          console.log(`✅ [${correlationId}] EPO automation completed: ${automationResult.updated}/${automationResult.processed} bulk items updated`);
          
        } catch (error) {
          console.error(`❌ [${correlationId}] EPO automation error:`, error);
        }
      } else {
        console.log(`⚠️ [${correlationId}] No EPO ID found in webhook payload`);
      }
    } else {
      console.log(`📝 [${correlationId}] EPO status changed to "${newStatus}" - no automation needed`);
    }
    
  } else {
    // Handle other webhook events
    switch (eventType) {
      case 'create_pulse':
        console.log(`📝 [${correlationId}] Task created: ${payload.pulseName || 'Unknown'}`)
        break
        
      case 'update_pulse':
        console.log(`📝 [${correlationId}] Task updated: ${payload.pulseName || 'Unknown'}`)
        break
        
      case 'test':
        console.log(`🧪 [${correlationId}] Test event received`)
        break
        
      default:
        console.log(`❓ [${correlationId}] Unknown event type: ${eventType}`)
    }
  }
  
  // Mark as processed
  try {
    const { markWebhookProcessed } = await import('@/lib/database')
    await markWebhookProcessed(correlationId)
    console.log(`✅ [${correlationId}] Event marked as processed`)
  } catch (error) {
    console.error(`❌ [${correlationId}] Failed to mark as processed:`, error)
  }
}
