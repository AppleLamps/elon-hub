# Elon Radar

A real-time news monitoring and sentiment analysis platform focused on Elon Musk and his portfolio of companies. Built with Next.js, powered by xAI's Grok agentic search, and styled after The New York Times.

## Overview

Elon Radar aggregates, analyzes, and visualizes news, social media posts, and updates from Elon Musk and his companies—Tesla, SpaceX, xAI, Neuralink, The Boring Company, and Starlink. The platform leverages advanced AI to autonomously search multiple sources, analyze visual content, and provide comprehensive sentiment analysis.

**Updates automatically once daily at 6 AM UTC** — articles are retained for **48 hours** to build a comprehensive news archive.

## Features

### Real-Time News Aggregation

- Automated monitoring of X (Twitter) posts from verified accounts
- Web search across trusted news domains
- Automatic categorization by company and topic
- **Persistent storage** with Neon PostgreSQL database
- **Scheduled updates** via Vercel Cron (daily at 6 AM UTC)
- **48-hour article retention** — articles accumulate over time, old ones automatically cleaned up

### Visual Content Analysis

- Image understanding and description generation
- Video content analysis and summarization
- Visual sentiment detection from media content
- Media insights extraction

### Sentiment Analysis

- Automated sentiment classification (positive, negative, neutral)
- Trend analysis with visual charts
- Overall sentiment scoring and insights
- Company-specific sentiment tracking

### New York Times-Inspired Interface

- **Centered masthead** with elegant Playfair Display typography
- **Hero story treatment** with large headlines (2.5-3.75rem)
- **3-column grid layout** for secondary stories
- **Thick black rules** separating sections
- **Subtle sentiment labels** (blue for positive, red for negative)
- **Visual analysis blocks** with blue left borders
- **Automatic countdown** showing time until next update
- Responsive layout optimized for all devices

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Neon PostgreSQL (serverless)
- **AI Engine**: xAI SDK with Grok-4-1-fast
- **Visualization**: Recharts
- **Icons**: Lucide React
- **Deployment**: Vercel (with Cron Jobs)

## Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- xAI API key ([Get one here](https://console.x.ai))
- Neon PostgreSQL database ([Get one here](https://neon.tech))

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/elon-radar.git
   cd elon-radar
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your credentials:

   ```
   XAI_API_KEY=your_xai_api_key_here
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   CRON_SECRET=your_random_secret_here
   ```

4. Initialize the database:

   ```bash
   npm run dev
   # Then visit: http://localhost:3000/api/init-db
   ```

5. Trigger initial data fetch:

   ```bash
   curl -X POST http://localhost:3000/api/radar -H "Content-Type: application/json" -d "{}"
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

### How It Works

1. **Vercel Cron** triggers `/api/cron/update` once daily at 6 AM UTC
2. The cron endpoint calls xAI Grok to fetch latest news
3. **New articles are added** to the database (duplicates are updated via URL matching)
4. **Articles older than 48 hours** are automatically cleaned up
5. Frontend fetches from `/api/articles` (reading from database)
6. Users see last update time and countdown to next update

### Article Retention

- **New articles** are added without removing existing ones
- **Duplicate URLs** trigger an update to the existing article (upsert)
- **Automatic cleanup** removes articles older than 48 hours
- Articles accumulate over time, providing a richer news feed

### Database Schema

```sql
-- Articles table (with unique URL constraint for upsert support)
CREATE TABLE articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  media_analysis TEXT,
  media_sentiment TEXT,
  url TEXT NOT NULL UNIQUE,  -- Prevents duplicates
  sentiment TEXT NOT NULL,
  company TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  snippet TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trends table (refreshed on each update)
CREATE TABLE trends (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  score REAL NOT NULL,
  sentiment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sentiment overview table (keeps history)
CREATE TABLE sentiment_overview (
  id SERIAL PRIMARY KEY,
  overall TEXT NOT NULL,
  score REAL NOT NULL,
  media_insights TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Project Structure

```
elon-radar/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── articles/
│   │   │   │   └── route.ts      # GET articles from database
│   │   │   ├── cron/
│   │   │   │   └── update/
│   │   │   │       └── route.ts  # Scheduled update endpoint
│   │   │   ├── init-db/
│   │   │   │   └── route.ts      # Database initialization
│   │   │   └── radar/
│   │   │       └── route.ts      # Manual fetch + save to DB
│   │   ├── globals.css           # NYT-inspired styles
│   │   ├── layout.tsx            # Root layout with fonts
│   │   └── page.tsx              # Main dashboard component
│   └── lib/
│       └── db.ts                 # Neon database utilities
├── public/                       # Static assets
├── .env.example                  # Environment variable template
├── vercel.json                   # Vercel + Cron configuration
└── README.md                     # This file
```

## API Endpoints

### GET `/api/articles`

Fetches articles from the database (up to 48 hours of history).

**Response:**

```json
{
  "data": {
    "posts": [...],
    "trends": [...],
    "sentiment_overview": {...}
  },
  "lastUpdate": "2025-12-13T07:27:04.153Z",
  "nextUpdate": "2025-12-13T07:57:04.153Z"
}
```

### GET `/api/cron/update`

Triggered by Vercel Cron once daily at 6 AM UTC. Fetches fresh data from xAI, adds new articles, and cleans up old ones.

**Response:**

```json
{
  "success": true,
  "message": "Data updated successfully",
  "articlesProcessed": 8,
  "articlesCleanedUp": 3,
  "updatedAt": "2025-12-13T07:27:04.153Z"
}
```

### POST `/api/radar`

Manual trigger to fetch and save new articles.

**Request Body:**

```json
{
  "hours": 24
}
```

**Response:**

```json
{
  "success": true,
  "data": {...},
  "articlesProcessed": 8,
  "articlesCleanedUp": 0,
  "citations": [...],
  "savedAt": "2025-12-13T07:27:04.153Z"
}
```

### GET `/api/init-db`

Initializes database tables and constraints. Run once after setup.

## Usage

### Viewing News

Navigate between categories using the top navigation bar:

- **All News**: Complete feed of all monitored sources (last 48 hours)
- **Tesla**: Tesla-specific news and updates
- **SpaceX**: SpaceX launches, missions, and announcements
- **xAI**: xAI and Grok-related content
- **Neuralink**: Neuralink developments and news
- **Boring Company**: Tunnel and infrastructure projects
- **Sentiment**: Comprehensive sentiment trends and charts

### Automatic Updates

- The system automatically updates **once daily at 6 AM UTC**
- Articles are retained for **48 hours** before cleanup
- Last update time is displayed in the header
- Countdown shows time until next scheduled update
- No manual refresh button — fully automated

### Understanding Sentiment

Each article displays:

- Sentiment label (Positive in blue, Negative in red, Neutral in gray)
- Company categorization (ALL CAPS section label)
- Visual content analysis (when available) with blue left border
- Source links for verification

## Deployment

### Vercel Deployment

1. Push your code to GitHub

2. Import the repository in [Vercel Dashboard](https://vercel.com)

3. Add environment variables:
   - `XAI_API_KEY` - Your xAI API key
   - `DATABASE_URL` - Your Neon PostgreSQL connection string
   - `CRON_SECRET` - Random secret for securing cron endpoint (optional)

4. Deploy

5. Initialize the database by visiting: `https://your-app.vercel.app/api/init-db`

6. Trigger first data fetch: `https://your-app.vercel.app/api/cron/update`

The cron job will automatically run once daily at 6 AM UTC after deployment.

### Vercel Cron Configuration

The `vercel.json` includes:

```json
{
  "crons": [
    {
      "path": "/api/cron/update",
      "schedule": "0 6 * * *"
    }
  ]
}
```

## Monitored Sources

### X Handles

- @elonmusk
- @Tesla
- @SpaceX
- @xai
- @neuralink
- @boringcompany
- @Starlink

### News Domains

- x.com
- techcrunch.com
- reuters.com
- bloomberg.com
- theverge.com

To modify these, edit `src/app/api/radar/route.ts` and `src/app/api/cron/update/route.ts`.

## Configuration

### Article Retention

The default retention period is **48 hours**. To modify, edit the constant in `src/lib/db.ts`:

```typescript
const ARTICLE_RETENTION_HOURS = 48;  // Change this value
```

## Performance & Costs

- API calls typically take 10-30 seconds
- Results are stored in database for instant frontend loads
- Cron runs once daily at 6 AM UTC (1 call/day)
- Estimated xAI cost: $0.05-0.20 per update
- Neon free tier: 0.5 GB storage, sufficient for months of articles
- Article count grows over time (typically 50-100 articles in a 48-hour window)

## Limitations

- Rate limits apply based on your xAI API plan
- Visual analysis increases token usage and costs
- Some X posts may be unavailable due to privacy settings
- Web search is limited to 5 domains (xAI API restriction)
- Vercel Hobby plan: Cron jobs run once per day (current configuration)

## Contributing

Contributions are welcome. Please ensure:

- Code follows TypeScript best practices
- Components maintain the NYT-inspired design aesthetic
- API routes include proper error handling
- Database migrations are documented

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with [xAI Grok](https://x.ai)
- Database by [Neon](https://neon.tech)
- Deployed on [Vercel](https://vercel.com)
- Typography: Playfair Display & Source Serif 4 via Google Fonts
- Design inspired by The New York Times
