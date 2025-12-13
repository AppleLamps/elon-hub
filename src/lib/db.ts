import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Retention period in hours
const ARTICLE_RETENTION_HOURS = 48;

export interface Article {
  id?: number;
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
  created_at?: string;
}

export interface Trend {
  id?: number;
  name: string;
  score: number;
  sentiment: string;
  created_at?: string;
}

export interface SentimentOverview {
  id?: number;
  overall: string;
  score: number;
  media_insights: string | null;
  created_at?: string;
}

// Initialize database tables
export async function initializeDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      image_url TEXT,
      video_url TEXT,
      media_analysis TEXT,
      media_sentiment TEXT,
      url TEXT NOT NULL,
      sentiment TEXT NOT NULL,
      company TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      snippet TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS trends (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      score REAL NOT NULL,
      sentiment TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sentiment_overview (
      id SERIAL PRIMARY KEY,
      overall TEXT NOT NULL,
      score REAL NOT NULL,
      media_insights TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // Create indexes for faster queries
  await sql`
    CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_articles_company ON articles(company)
  `;

  // Add unique constraint on URL if it doesn't exist (for upsert support)
  try {
    await sql`
      ALTER TABLE articles ADD CONSTRAINT articles_url_unique UNIQUE (url)
    `;
  } catch {
    // Constraint already exists, ignore error
  }
}

// Clean up articles older than retention period
export async function cleanupOldArticles() {
  const cutoffTime = new Date(Date.now() - ARTICLE_RETENTION_HOURS * 60 * 60 * 1000);
  
  const result = await sql`
    DELETE FROM articles 
    WHERE created_at < ${cutoffTime.toISOString()}
    RETURNING id
  `;
  
  return result.length;
}

// Save new articles (keeps existing articles, adds new ones, removes old ones after 48 hours)
export async function saveRadarData(
  articles: Article[],
  trends: Trend[],
  sentimentOverview: { overall: string; score: number; media_insights?: string }
) {
  // Clean up articles older than 48 hours
  const deletedCount = await cleanupOldArticles();
  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} articles older than ${ARTICLE_RETENTION_HOURS} hours`);
  }

  // Insert new articles (skip duplicates based on URL)
  let newArticlesCount = 0;
  for (const article of articles) {
    try {
      await sql`
        INSERT INTO articles (title, image_url, video_url, media_analysis, media_sentiment, url, sentiment, company, timestamp, snippet)
        VALUES (${article.title}, ${article.image_url}, ${article.video_url}, ${article.media_analysis}, ${article.media_sentiment}, ${article.url}, ${article.sentiment}, ${article.company}, ${article.timestamp}, ${article.snippet})
        ON CONFLICT (url) DO UPDATE SET
          title = EXCLUDED.title,
          image_url = EXCLUDED.image_url,
          video_url = EXCLUDED.video_url,
          media_analysis = EXCLUDED.media_analysis,
          media_sentiment = EXCLUDED.media_sentiment,
          sentiment = EXCLUDED.sentiment,
          company = EXCLUDED.company,
          timestamp = EXCLUDED.timestamp,
          snippet = EXCLUDED.snippet
      `;
      newArticlesCount++;
    } catch (error) {
      console.error('Error inserting article:', error);
    }
  }

  // Clear old trends and insert new ones (trends are always current)
  await sql`DELETE FROM trends`;
  for (const trend of trends) {
    await sql`
      INSERT INTO trends (name, score, sentiment)
      VALUES (${trend.name}, ${trend.score}, ${trend.sentiment})
    `;
  }

  // Insert new sentiment overview (keep history)
  await sql`
    INSERT INTO sentiment_overview (overall, score, media_insights)
    VALUES (${sentimentOverview.overall}, ${sentimentOverview.score}, ${sentimentOverview.media_insights || null})
  `;

  // Clean up old sentiment overviews (keep last 100)
  await sql`
    DELETE FROM sentiment_overview 
    WHERE id NOT IN (
      SELECT id FROM sentiment_overview ORDER BY created_at DESC LIMIT 100
    )
  `;

  return { newArticlesCount, deletedCount };
}

// Fetch all radar data (articles from last 48 hours)
export async function getRadarData() {
  const articles = await sql`
    SELECT * FROM articles 
    ORDER BY created_at DESC
  `;

  const trends = await sql`
    SELECT * FROM trends ORDER BY score DESC
  `;

  const sentimentOverviewResult = await sql`
    SELECT * FROM sentiment_overview ORDER BY created_at DESC LIMIT 1
  `;

  return {
    posts: articles.map(row => ({
      title: row.title,
      image_url: row.image_url,
      video_url: row.video_url,
      media_analysis: row.media_analysis,
      media_sentiment: row.media_sentiment,
      url: row.url,
      sentiment: row.sentiment,
      company: row.company,
      timestamp: row.timestamp,
      snippet: row.snippet,
    })),
    trends: trends.map(row => ({
      name: row.name,
      score: row.score,
      sentiment: row.sentiment,
    })),
    sentiment_overview: sentimentOverviewResult[0] 
      ? {
          overall: sentimentOverviewResult[0].overall,
          score: sentimentOverviewResult[0].score,
          media_insights: sentimentOverviewResult[0].media_insights,
        }
      : { overall: 'neutral', score: 0.5, media_insights: null },
  };
}

// Get last update time
export async function getLastUpdateTime(): Promise<Date | null> {
  const result = await sql`
    SELECT created_at FROM articles ORDER BY created_at DESC LIMIT 1
  `;
  return result[0]?.created_at ? new Date(result[0].created_at) : null;
}

// Get article count
export async function getArticleCount(): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count FROM articles
  `;
  return parseInt(result[0]?.count || '0');
}

export { sql };
