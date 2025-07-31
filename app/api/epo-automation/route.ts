import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promisify } from 'util';

const COLUMN_IDS = {
  EPO_STATUS: 'deal_stage',
};

// Helper function to run automation via child process
async function runAutomationProcess(dryRun: boolean = false): Promise<any> {
  return new Promise((resolve, reject) => {
    const args = dryRun ? ['--dry-run'] : [];
    const child = spawn('node', ['epo-automation/epo-bulk-automation.js', ...args], {
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
        // Parse the output to extract results
        const lines = stdout.split('\n');
        const summaryMatch = stdout.match(/(\d+) bulk items would be updated|(\d+) bulk items updated/);
        const processedMatch = stdout.match(/Processing (\d+) bulk/);
        
        const updated = summaryMatch ? parseInt(summaryMatch[1] || summaryMatch[2] || '0') : 0;
        const processed = processedMatch ? parseInt(processedMatch[1]) : 0;
        
        resolve({
          processed,
          updated,
          output: stdout,
          results: [] // Could parse detailed results if needed
        });
      } else {
        reject(new Error(`Automation failed with code ${code}: ${stderr}`));
      }
    });
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dry') === 'true';
    
    if (!process.env.MONDAY_API_TOKEN) {
      return NextResponse.json(
        { error: 'MONDAY_API_TOKEN not configured' },
        { status: 500 }
      );
    }
    
    console.log(`🚀 Starting EPO → Bulk Batch Automation ${dryRun ? '(DRY RUN)' : ''}`);
    
    const result = await runAutomationProcess(dryRun);
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      dryRun,
      summary: {
        processed: result.processed,
        updated: result.updated,
        skipped: result.processed - result.updated
      },
      output: result.output
    };
    
    console.log(`✅ Automation Complete: ${result.updated}/${result.processed} bulk items updated`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Handle webhook from Monday.com when EPO status changes
  try {
    const body = await request.json();
    
    console.log('📦 Received Monday.com webhook:', JSON.stringify(body, null, 2));
    
    // Check if this is an EPO status change
    if (body.event?.type === 'update_column_value' && 
        body.event?.columnId === COLUMN_IDS.EPO_STATUS &&
        body.event?.value?.label?.text === 'QA Passed') {
      
      console.log('🎯 EPO status changed to QA Passed, triggering automation...');
      
      const result = await runAutomationProcess(false);
      
      return NextResponse.json({
        success: true,
        trigger: 'webhook',
        timestamp: new Date().toISOString(),
        summary: {
          processed: result.processed,
          updated: result.updated
        }
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook received but no action needed',
      timestamp: new Date().toISOString(),
      event: body.event
    });
    
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}