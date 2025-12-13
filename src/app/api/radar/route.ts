import { createXai } from '@ai-sdk/xai';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { saveRadarData, initializeDatabase } from '@/lib/db';

const xai = createXai({
  apiKey: process.env.XAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { hours = 24 } = await req.json();
    
    // Initialize database tables if they don't exist
    await initializeDatabase();
    
    const handles = [
      'elonmusk',
      'Tesla',
      'SpaceX',
      'xai',
      'neuralink',
      'boringcompany',
      'Starlink'
    ];

    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const query = `Latest news, posts, and updates from Elon Musk and his companies (${handles.join(', ')}). 

Analyze posts with images and videos using visual understanding tools. Extract key information, sentiment (positive/negative/neutral), and categorize by company.

Output structured JSON only:
{
  "posts": [{
    "title": "Headline",
    "image_url": "url or null",
    "video_url": "url or null",
    "media_analysis": "Description of visual content",
    "media_sentiment": "positive|negative|neutral",
    "url": "source url",
    "sentiment": "positive|negative|neutral",
    "company": "Tesla|SpaceX|xAI|Neuralink|Boring Company|Starlink|General",
    "timestamp": "ISO timestamp",
    "snippet": "Brief summary"
  }],
  "trends": [{
    "name": "Topic name",
    "score": 0.85,
    "sentiment": "positive"
  }],
  "sentiment_overview": {
    "overall": "positive",
    "score": 0.75,
    "media_insights": "Summary of visual content trends"
  }
}`;

    const result = await generateText({
      model: xai.responses('grok-4-1-fast'),
      prompt: query,
      tools: {
        x_search: xai.tools.xSearch({
          allowedXHandles: handles,
          fromDate: fromDate,
          enableImageUnderstanding: true,
          enableVideoUnderstanding: true,
        }),
        web_search: xai.tools.webSearch({
          allowedDomains: [
            'x.com',
            'techcrunch.com',
            'reuters.com',
            'bloomberg.com',
            'theverge.com'
          ]
        }),
        code_execution: xai.tools.codeExecution(),
      },
    });
    
    const { text, sources } = result;

    // Try to parse JSON from response
    let parsedData: {
      posts: Array<{
        title: string;
        image_url: string | null;
        video_url: string | null;
        media_analysis: string | null;
        media_sentiment: string | null;
        url: string;
        sentiment: string;
        company: string;
        timestamp: string;
        snippet: string | null;
      }>;
      trends: Array<{ name: string; score: number; sentiment: string }>;
      sentiment_overview: { overall: string; score: number; media_insights?: string };
    } = { 
      posts: [], 
      trends: [], 
      sentiment_overview: { overall: 'neutral', score: 0.5 } 
    };
    
    if (text) {
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                         text.match(/```\n([\s\S]*?)\n```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : text;
        parsedData = JSON.parse(jsonStr);
      } catch {
        // Fallback: try parsing the raw content
        try {
          parsedData = JSON.parse(text);
        } catch {
          console.error('Failed to parse JSON from response');
        }
      }
    }

    // Save to database (new articles are added, old ones kept for 48 hours)
    const { newArticlesCount, deletedCount } = await saveRadarData(
      parsedData.posts.map(post => ({
        title: post.title,
        image_url: post.image_url || null,
        video_url: post.video_url || null,
        media_analysis: post.media_analysis || null,
        media_sentiment: post.media_sentiment || null,
        url: post.url,
        sentiment: post.sentiment,
        company: post.company,
        timestamp: post.timestamp,
        snippet: post.snippet || null,
      })),
      parsedData.trends,
      parsedData.sentiment_overview
    );

    return NextResponse.json({
      success: true,
      data: parsedData,
      articlesProcessed: newArticlesCount,
      articlesCleanedUp: deletedCount,
      citations: sources || [],
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch radar data' },
      { status: 500 }
    );
  }
}
