import { NextRequest, NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Initialize Firecrawl with API key from environment
    const apiKey = process.env.FIRECRAWL_API_KEY;
    
    if (!apiKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return NextResponse.json({ 
        error: 'Firecrawl API key not configured' 
      }, { status: 500 });
    }
    
    const app = new FirecrawlApp({ apiKey });

    console.log('[scrape-screenshot] Attempting to capture screenshot for:', url);
    console.log('[scrape-screenshot] Using Firecrawl API key:', apiKey ? 'Present' : 'Missing');

    // Use the new v4 scrape method (not scrapeUrl)
    const scrapeResult = await app.scrape(url, {
      formats: ['screenshot'], // Request screenshot format
      waitFor: 3000, // Wait for page to fully load
      timeout: 30000,
      onlyMainContent: false, // Get full page for screenshot
      actions: [
        {
          type: 'wait',
          milliseconds: 2000 // Additional wait for dynamic content
        }
      ]
    });

    console.log('[scrape-screenshot] Scrape result success:', scrapeResult.success);
    console.log('[scrape-screenshot] Scrape result data:', scrapeResult.data ? Object.keys(scrapeResult.data) : 'No data');
    
    if (!scrapeResult.success) {
      console.error('[scrape-screenshot] Firecrawl API error:', scrapeResult.error);
      console.error('[scrape-screenshot] Full scrapeResult:', JSON.stringify(scrapeResult, null, 2));
      throw new Error(scrapeResult.error || 'Failed to capture screenshot');
    }
    
    if (!scrapeResult.data?.screenshot) {
      throw new Error('Screenshot not available in response');
    }

    return NextResponse.json({
      success: true,
      screenshot: scrapeResult.data.screenshot,
      metadata: scrapeResult.data.metadata || {}
    });

  } catch (error: any) {
    console.error('[scrape-screenshot] Screenshot capture error:', error);
    console.error('[scrape-screenshot] Error stack:', error.stack);
    
    // Provide fallback response for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[scrape-screenshot] Returning placeholder screenshot for development');
      return NextResponse.json({
        success: true,
        screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        metadata: { error: 'Screenshot capture failed, using placeholder' }
      });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to capture screenshot',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}