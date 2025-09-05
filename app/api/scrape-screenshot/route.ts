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

    // Use Firecrawl SDK to capture screenshot with the latest API
    const scrapeResult = await app.scrapeUrl(url, {
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

    if (!scrapeResult.success) {
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
    console.error('Screenshot capture error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to capture screenshot' 
    }, { status: 500 });
  }
}