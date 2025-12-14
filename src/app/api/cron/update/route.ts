import { createXai } from '@ai-sdk/xai';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { saveRadarData, initializeDatabase } from '@/lib/db';

const xai = createXai({
  apiKey: process.env.XAI_API_KEY!,
});

// Company configurations for separate API calls
const COMPANY_CONFIGS = [
  {
    name: 'Tesla',
    handles: ['elonmusk', 'Tesla'],
    newsDomains: ['electrek.co', 'insideevs.com', 'teslarati.com', 'cleantechnica.com'],
    keywords: 'Tesla, electric vehicles, EV, Cybertruck, Model S, Model 3, Model X, Model Y, FSD, Full Self-Driving, Gigafactory, Elon Musk Tesla',
  },
  {
    name: 'SpaceX',
    handles: ['elonmusk', 'SpaceX'],
    newsDomains: ['spacenews.com', 'nasaspaceflight.com', 'spaceflightnow.com', 'arstechnica.com'],
    keywords: 'SpaceX, Starship, Falcon 9, Falcon Heavy, Starlink launch, Dragon, ISS, rocket launch, Mars mission, Elon Musk SpaceX',
  },
  {
    name: 'xAI',
    handles: ['elonmusk', 'xai'],
    newsDomains: ['techcrunch.com', 'theverge.com', 'wired.com', 'venturebeat.com'],
    keywords: 'xAI, Grok, artificial intelligence, AI chatbot, Elon Musk AI, large language model, LLM',
  },
  {
    name: 'Neuralink',
    handles: ['elonmusk', 'neuralink'],
    newsDomains: ['techcrunch.com', 'theverge.com', 'wired.com', 'nature.com'],
    keywords: 'Neuralink, brain chip, brain-computer interface, BCI, neural implant, Elon Musk Neuralink',
  },
  {
    name: 'Boring Company',
    handles: ['elonmusk', 'boringcompany'],
    newsDomains: ['techcrunch.com', 'theverge.com', 'electrek.co'],
    keywords: 'Boring Company, tunnel, Vegas Loop, Hyperloop, underground transportation, Elon Musk tunnel',
  },
  {
    name: 'Starlink',
    handles: ['elonmusk', 'Starlink', 'SpaceX'],
    newsDomains: ['spacenews.com', 'arstechnica.com', 'theverge.com', 'pcmag.com'],
    keywords: 'Starlink, satellite internet, SpaceX Starlink, broadband, constellation, Elon Musk Starlink',
  },
];

// General news sources for Elon Musk coverage (split into groups of max 5 for API limit)
const GENERAL_NEWS_DOMAINS_GROUP1 = [
  'reuters.com',
  'bloomberg.com',
  'wsj.com',
  'forbes.com',
  'cnbc.com',
];

const GENERAL_NEWS_DOMAINS_GROUP2 = [
  'businessinsider.com',
  'bbc.com',
  'theguardian.com',
  'nytimes.com',
  'washingtonpost.com',
];

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET is set, allow the request (for development)
  if (!cronSecret) return true;

  return authHeader === `Bearer ${cronSecret}`;
}

interface ParsedPost {
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
}

interface ParsedTrend {
  name: string;
  score: number;
  sentiment: string;
}

interface ParsedData {
  posts: ParsedPost[];
  trends: ParsedTrend[];
  sentiment_overview: { overall: string; score: number; media_insights?: string };
}

// Fetch data for a specific company using X search
async function fetchCompanyXData(config: typeof COMPANY_CONFIGS[0], fromDate: string): Promise<ParsedPost[]> {
  console.log(`Fetching X data for ${config.name}...`);

  const query = `Latest posts, news, and announcements from ${config.name} (handles: ${config.handles.join(', ')}).

Search for posts from the last 30 days. Focus on:
- Product announcements and updates
- Company news and milestones
- Technical achievements
- Market-moving information
- Visual content (images/videos) and their context

Analyze any images and videos using visual understanding tools.

Output structured JSON only:
{
  "posts": [{
    "title": "Headline describing the post",
    "image_url": "url or null",
    "video_url": "url or null", 
    "media_analysis": "Description of visual content if present",
    "media_sentiment": "positive|negative|neutral",
    "url": "source url",
    "sentiment": "positive|negative|neutral",
    "company": "${config.name}",
    "timestamp": "ISO timestamp",
    "snippet": "Brief summary of the content"
  }]
}`;

  try {
    const result = await generateText({
      model: xai.responses('grok-4-1-fast'),
      prompt: query,
      tools: {
        x_search: xai.tools.xSearch({
          allowedXHandles: config.handles,
          fromDate: fromDate,
          enableImageUnderstanding: true,
          enableVideoUnderstanding: true,
        }),
      },
    });

    const parsed = parseJsonResponse(result.text);
    console.log(`Found ${parsed.posts?.length || 0} posts for ${config.name} from X`);
    return (parsed.posts || []).map((p: ParsedPost) => ({ ...p, company: config.name }));
  } catch (error) {
    console.error(`Error fetching X data for ${config.name}:`, error);
    return [];
  }
}

// Fetch news articles for a specific company using web search
async function fetchCompanyNewsData(config: typeof COMPANY_CONFIGS[0]): Promise<ParsedPost[]> {
  console.log(`Fetching news for ${config.name}...`);

  const query = `Latest news articles about ${config.name} and ${config.keywords}.

Search for recent news from the last 30 days covering:
- Breaking news and announcements
- Analysis and opinion pieces
- Financial and market news
- Technical developments
- Regulatory and legal news

Output structured JSON only:
{
  "posts": [{
    "title": "Article headline",
    "image_url": "url or null",
    "video_url": null,
    "media_analysis": null,
    "media_sentiment": null,
    "url": "article url",
    "sentiment": "positive|negative|neutral",
    "company": "${config.name}",
    "timestamp": "ISO timestamp",
    "snippet": "Brief summary of the article"
  }]
}`;

  try {
    const result = await generateText({
      model: xai.responses('grok-4-1-fast'),
      prompt: query,
      tools: {
        web_search: xai.tools.webSearch({
          allowedDomains: config.newsDomains,
        }),
      },
    });

    const parsed = parseJsonResponse(result.text);
    console.log(`Found ${parsed.posts?.length || 0} news articles for ${config.name}`);
    return (parsed.posts || []).map((p: ParsedPost) => ({ ...p, company: config.name }));
  } catch (error) {
    console.error(`Error fetching news for ${config.name}:`, error);
    return [];
  }
}

// Fetch general Elon Musk news from major outlets (single domain group)
async function fetchGeneralElonNewsFromGroup(domains: string[], groupName: string): Promise<ParsedPost[]> {
  console.log(`Fetching general Elon Musk news (${groupName})...`);

  const query = `Latest news about Elon Musk from major news outlets in the last 30 days.

Focus on:
- Major announcements and statements
- Business deals and partnerships
- Controversies and public statements
- Financial news (stock movements, acquisitions)
- Technology and innovation news
- Regulatory and political news

Output structured JSON only:
{
  "posts": [{
    "title": "Article headline",
    "image_url": "url or null",
    "video_url": null,
    "media_analysis": null,
    "media_sentiment": null,
    "url": "article url",
    "sentiment": "positive|negative|neutral",
    "company": "General",
    "timestamp": "ISO timestamp",
    "snippet": "Brief summary of the article"
  }]
}`;

  try {
    const result = await generateText({
      model: xai.responses('grok-4-1-fast'),
      prompt: query,
      tools: {
        web_search: xai.tools.webSearch({
          allowedDomains: domains,
        }),
      },
    });

    const parsed = parseJsonResponse(result.text);
    console.log(`Found ${parsed.posts?.length || 0} news articles from ${groupName}`);
    return parsed.posts || [];
  } catch (error) {
    console.error(`Error fetching news from ${groupName}:`, error);
    return [];
  }
}

// Fetch general Elon Musk news from all major outlets (parallel calls)
async function fetchGeneralElonNews(): Promise<ParsedPost[]> {
  const [group1Results, group2Results] = await Promise.all([
    fetchGeneralElonNewsFromGroup(GENERAL_NEWS_DOMAINS_GROUP1, 'Financial/Business'),
    fetchGeneralElonNewsFromGroup(GENERAL_NEWS_DOMAINS_GROUP2, 'General Media'),
  ]);

  return [...group1Results, ...group2Results];
}

// Analyze trends and sentiment across all collected data
async function analyzeTrendsAndSentiment(allPosts: ParsedPost[]): Promise<{ trends: ParsedTrend[]; sentiment_overview: ParsedData['sentiment_overview'] }> {
  console.log('Analyzing trends and sentiment...');

  const postsSummary = allPosts.slice(0, 50).map(p => `- [${p.company}] ${p.title} (${p.sentiment})`).join('\n');

  const query = `Analyze these posts/articles about Elon Musk and his companies from the last 30 days:

${postsSummary}

Identify:
1. Top trending topics (max 10)
2. Overall sentiment distribution
3. Key themes and patterns
4. Notable media trends

Output structured JSON only:
{
  "trends": [{
    "name": "Topic name",
    "score": 0.85,
    "sentiment": "positive|negative|neutral"
  }],
  "sentiment_overview": {
    "overall": "positive|negative|neutral",
    "score": 0.75,
    "media_insights": "Summary of key trends, themes, and notable developments"
  }
}`;

  try {
    const result = await generateText({
      model: xai.responses('grok-4-1-fast'),
      prompt: query,
    });

    const parsed = parseJsonResponse(result.text);
    return {
      trends: parsed.trends || [],
      sentiment_overview: parsed.sentiment_overview || { overall: 'neutral', score: 0.5, media_insights: null },
    };
  } catch (error) {
    console.error('Error analyzing trends:', error);
    return {
      trends: [],
      sentiment_overview: { overall: 'neutral', score: 0.5, media_insights: undefined },
    };
  }
}

// Parse JSON from AI response
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJsonResponse(text: string | undefined): any {
  if (!text) return { posts: [], trends: [], sentiment_overview: { overall: 'neutral', score: 0.5 } };

  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
      text.match(/```\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text;
    return JSON.parse(jsonStr);
  } catch {
    try {
      return JSON.parse(text);
    } catch {
      console.error('Failed to parse JSON from response');
      return { posts: [], trends: [], sentiment_overview: { overall: 'neutral', score: 0.5 } };
    }
  }
}

// Deduplicate posts by URL
function deduplicatePosts(posts: ParsedPost[]): ParsedPost[] {
  const seen = new Set<string>();
  return posts.filter(post => {
    if (!post.url || seen.has(post.url)) return false;
    seen.add(post.url);
    return true;
  });
}

export async function GET(request: NextRequest) {
  // Verify authorization for production
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('=== Daily Cron Job Started ===');
    console.log('Time:', new Date().toISOString());

    // Initialize database tables if they don't exist
    await initializeDatabase();

    // Look back 30 days to gather more comprehensive data
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Collect all posts from multiple sources
    const allPosts: ParsedPost[] = [];

    // 1. Fetch X posts for each company (parallel for efficiency)
    console.log('\n--- Fetching X Posts ---');
    const xDataPromises = COMPANY_CONFIGS.map(config => fetchCompanyXData(config, fromDate));
    const xResults = await Promise.all(xDataPromises);
    xResults.forEach(posts => allPosts.push(...posts));
    console.log(`Total X posts collected: ${allPosts.length}`);

    // 2. Fetch news articles for each company (parallel)
    console.log('\n--- Fetching Company News ---');
    const newsPromises = COMPANY_CONFIGS.map(config => fetchCompanyNewsData(config));
    const newsResults = await Promise.all(newsPromises);
    newsResults.forEach(posts => allPosts.push(...posts));
    console.log(`Total posts after news: ${allPosts.length}`);

    // 3. Fetch general Elon Musk news
    console.log('\n--- Fetching General News ---');
    const generalNews = await fetchGeneralElonNews();
    allPosts.push(...generalNews);
    console.log(`Total posts after general news: ${allPosts.length}`);

    // 4. Deduplicate posts
    const uniquePosts = deduplicatePosts(allPosts);
    console.log(`\nUnique posts after deduplication: ${uniquePosts.length}`);

    // 5. Analyze trends and sentiment
    console.log('\n--- Analyzing Trends & Sentiment ---');
    const { trends, sentiment_overview } = await analyzeTrendsAndSentiment(uniquePosts);

    // 6. Save to database
    console.log('\n--- Saving to Database ---');
    const { newArticlesCount, deletedCount } = await saveRadarData(
      uniquePosts.map(post => ({
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
      trends,
      sentiment_overview
    );

    console.log('\n=== Daily Cron Job Completed ===');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`New/Updated articles: ${newArticlesCount}`);
    console.log(`Cleaned up articles: ${deletedCount}`);
    console.log(`Trends identified: ${trends.length}`);

    return NextResponse.json({
      success: true,
      message: 'Daily data update completed successfully',
      stats: {
        totalPostsCollected: allPosts.length,
        uniquePosts: uniquePosts.length,
        articlesProcessed: newArticlesCount,
        articlesCleanedUp: deletedCount,
        trendsIdentified: trends.length,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update data' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
