import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'ready',
    service: 'batch-webhook-fly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Webhook endpoint is operational'
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('🔔 Webhook received:', JSON.stringify(body, null, 2))
    
    // Handle Monday.com challenge verification
    if (body.challenge) {
      console.log('✅ Challenge verification:', body.challenge)
      return NextResponse.json({ challenge: body.challenge })
    }
    
    // Simple test response
    return NextResponse.json({ 
      status: 'success',
      received: body,
      timestamp: new Date().toISOString(),
      message: 'Webhook processed successfully'
    })
    
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return new NextResponse('Invalid JSON', { status: 400 })
  }
}
