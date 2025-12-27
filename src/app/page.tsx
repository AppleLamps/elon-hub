'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ExternalLink, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface Post {
  title: string;
  image_url?: string;
  video_url?: string;
  media_analysis?: string;
  media_sentiment?: string;
  url: string;
  sentiment: string;
  company: string;
  timestamp: string;
  snippet?: string;
}

interface RadarData {
  posts: Post[];
  trends: Array<{ name: string; score: number; sentiment: string }>;
  sentiment_overview: {
    overall: string;
    score: number;
    media_insights?: string;
  };
}

export default function Home() {
  const [data, setData] = useState<RadarData>({
    posts: [],
    trends: [],
    sentiment_overview: { overall: 'neutral', score: 0.5 },
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null);
  const [timeUntilUpdate, setTimeUntilUpdate] = useState('');
  const refreshingRef = useRef(false);

  const categories = [
    { id: 'all', label: 'All News' },
    { id: 'Tesla', label: 'Tesla' },
    { id: 'SpaceX', label: 'SpaceX' },
    { id: 'xAI', label: 'xAI' },
    { id: 'Neuralink', label: 'Neuralink' },
    { id: 'Boring Company', label: 'Boring Company' },
    { id: 'Sentiment', label: 'Sentiment' },
  ];

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch('/api/articles');

      if (!res.ok) throw new Error('Failed to fetch');

      const { data: newData, lastUpdate: lastUpdateStr, nextUpdate: nextUpdateStr } = await res.json();
      setData(newData);
      
      if (lastUpdateStr) {
        setLastUpdate(new Date(lastUpdateStr));
      }
      if (nextUpdateStr) {
        setNextUpdate(new Date(nextUpdateStr));
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
      refreshingRef.current = false;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchArticles();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [fetchArticles]);

  // Update countdown timer
  useEffect(() => {
    if (!nextUpdate) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = nextUpdate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeUntilUpdate('Updating soon...');
        // Schedule refresh only if not already refreshing
        if (!refreshingRef.current) {
          refreshingRef.current = true;
          setTimeout(() => {
            fetchArticles();
          }, 5000);
        }
        return;
      }
      
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeUntilUpdate(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextUpdate, fetchArticles]);

  const filteredPosts = activeTab === 'all' || activeTab === 'Sentiment'
    ? data.posts
    : data.posts.filter((post) => 
        post.company.toLowerCase().includes(activeTab.toLowerCase())
      );

  const heroPost = filteredPosts[0];
  const secondaryPosts = filteredPosts.slice(1, 4);
  const remainingPosts = filteredPosts.slice(4);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const getSentimentClass = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'sentiment-positive';
      case 'negative': return 'sentiment-negative';
      default: return 'sentiment-neutral';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <h1 className="masthead text-4xl mb-4">Elon Radar</h1>
            <p className="dateline">Loading latest news...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Masthead */}
      <header className="border-b-2 border-black">
        <div className="max-w-[1200px] mx-auto px-4">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-200 text-xs gap-1 sm:gap-0">
            <div className="dateline">{todayDate}</div>
            <div className="flex items-center gap-3 sm:gap-4">
              {lastUpdate && (
                <span className="dateline flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(lastUpdate)}
                </span>
              )}
              {timeUntilUpdate && (
                <span className="dateline">
                  Next: {timeUntilUpdate}
                </span>
              )}
            </div>
          </div>

          {/* Main masthead */}
          <div className="py-4 text-center">
            <h1 className="masthead text-5xl md:text-6xl tracking-tight">
              Elon Radar
            </h1>
            <p className="dateline mt-1">Real-Time News & Sentiment Analysis · Updates Daily</p>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-gray-300 bg-white sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex overflow-x-auto scrollbar-hide px-4 sm:px-0 sm:justify-center">
            {categories.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`nav-item px-4 sm:px-5 py-3 transition-colors relative whitespace-nowrap flex-shrink-0 ${
                  activeTab === cat.id
                    ? 'text-black font-bold'
                    : 'text-gray-500 hover:text-black'
                } ${i !== categories.length - 1 ? 'border-r border-gray-200' : ''}`}
              >
                {cat.label}
                {activeTab === cat.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1200px] mx-auto px-4 py-8">
        {activeTab === 'Sentiment' ? (
          /* Sentiment Analysis View */
          <div>
            <div className="nyt-rule mb-6" />
            <div className="text-center mb-10">
              <p className="category-label mb-2">ANALYSIS</p>
              <h2 className="headline-lead mb-4">Market Sentiment Overview</h2>
              <p className="summary-text max-w-2xl mx-auto">
                Current sentiment is{' '}
                <span className={`font-bold ${getSentimentClass(data.sentiment_overview.overall)}`}>
                  {data.sentiment_overview.overall}
                </span>{' '}
                with a confidence score of {Math.round(data.sentiment_overview.score * 100)}%.
              </p>
              {data.sentiment_overview.media_insights && (
                <p className="summary-text max-w-2xl mx-auto mt-4 italic text-gray-600">
                  "{data.sentiment_overview.media_insights}"
                </p>
              )}
            </div>

            {data.trends.length > 0 && (
              <div className="mb-12">
                <div className="nyt-rule-thin mb-4" />
                <p className="category-label mb-6">TRENDING TOPICS</p>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.trends} margin={{ bottom: 80 }}>
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        border: '1px solid #000', 
                        borderRadius: 0,
                        fontSize: 13 
                      }} 
                    />
                    <Bar dataKey="score" radius={[2, 2, 0, 0]}>
                      {data.trends.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.sentiment === 'positive' ? '#326891' : 
                                entry.sentiment === 'negative' ? '#a81c1c' : '#666'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="nyt-rule-thin mb-6" />
            <p className="category-label mb-6">RELATED COVERAGE</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredPosts.slice(0, 6).map((post, i) => (
                <article key={i} className="group">
                  {post.image_url && (
                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden mb-3">
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      />
                    </div>
                  )}
                  <p className="category-label mb-1">
                    {post.company} · <span className={getSentimentClass(post.sentiment)}>{post.sentiment}</span>
                  </p>
                  <h3 className="headline-tertiary mb-2">
                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="article-link">
                      {post.title}
                    </a>
                  </h3>
                  {post.snippet && (
                    <p className="text-gray-600 text-sm line-clamp-2">{post.snippet}</p>
                  )}
                </article>
              ))}
            </div>
          </div>
        ) : (
          /* News Feed View */
          <div>
            {filteredPosts.length === 0 && !loading && (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg">No stories found for this section.</p>
                <p className="text-gray-400 text-sm mt-2">Articles will appear after the next scheduled update.</p>
              </div>
            )}

            {/* Hero Story */}
            {heroPost && (
              <article className="mb-10">
                <div className="nyt-rule mb-6" />
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  <div>
                    <p className="category-label mb-3">
                      {heroPost.company.toUpperCase()}
                    </p>
                    <h2 className="headline-lead mb-4">
                      <a 
                        href={heroPost.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="article-link"
                      >
                        {heroPost.title}
                      </a>
                    </h2>
                    {heroPost.snippet && (
                      <p className="summary-text mb-4">{heroPost.snippet}</p>
                    )}
                    <p className="byline">
                      {formatDate(heroPost.timestamp)} · <span className={getSentimentClass(heroPost.sentiment)}>{heroPost.sentiment}</span>
                    </p>
                    {heroPost.media_analysis && (
                      <div className="visual-analysis mt-4">
                        <p className="text-sm italic text-gray-700">
                          {heroPost.media_analysis}
                        </p>
                      </div>
                    )}
                  </div>
                  {(heroPost.image_url || heroPost.video_url) && (
                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                      {heroPost.video_url ? (
                        <video
                          src={heroPost.video_url}
                          controls
                          className="w-full h-full object-cover"
                          poster={heroPost.image_url}
                        />
                      ) : (
                        <img
                          src={heroPost.image_url}
                          alt={heroPost.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  )}
                </div>
              </article>
            )}

            {/* Secondary Stories Grid */}
            {secondaryPosts.length > 0 && (
              <div className="mb-10">
                <div className="nyt-rule-thin mb-6" />
                <div className="grid md:grid-cols-3 gap-6">
                  {secondaryPosts.map((post, i) => (
                    <article 
                      key={i} 
                      className={`group ${i !== secondaryPosts.length - 1 ? 'md:grid-divider-right md:pr-6' : ''}`}
                    >
                      {post.image_url && (
                        <div className="aspect-video bg-gray-100 overflow-hidden mb-3">
                          <img
                            src={post.image_url}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                          />
                        </div>
                      )}
                      <p className="category-label mb-1">{post.company.toUpperCase()}</p>
                      <h3 className="headline-secondary mb-2">
                        <a href={post.url} target="_blank" rel="noopener noreferrer" className="article-link">
                          {post.title}
                        </a>
                      </h3>
                      {post.snippet && (
                        <p className="text-gray-600 text-base mb-2 line-clamp-3">{post.snippet}</p>
                      )}
                      <p className="byline">
                        {formatDate(post.timestamp)} · <span className={getSentimentClass(post.sentiment)}>{post.sentiment}</span>
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Remaining Stories */}
            {remainingPosts.length > 0 && (
              <div>
                <div className="nyt-rule-thin mb-6" />
                <p className="category-label mb-6">MORE COVERAGE</p>
                <div className="space-y-0">
                  {remainingPosts.map((post, i) => (
                    <article
                      key={i}
                      className="py-5 border-b border-gray-200 last:border-b-0 group"
                    >
                      <div className="flex gap-6">
                        <div className="flex-1 min-w-0">
                          <p className="category-label mb-1">
                            {post.company.toUpperCase()} · <span className={getSentimentClass(post.sentiment)}>{post.sentiment}</span>
                          </p>
                          <h3 className="headline-tertiary mb-2">
                            <a href={post.url} target="_blank" rel="noopener noreferrer" className="article-link">
                              {post.title}
                            </a>
                          </h3>
                          {post.snippet && (
                            <p className="text-gray-600 mb-2">{post.snippet}</p>
                          )}
                          {post.media_analysis && (
                            <div className="visual-analysis">
                              <p className="text-sm italic text-gray-700">{post.media_analysis}</p>
                              {post.media_sentiment && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Visual sentiment: <span className={getSentimentClass(post.media_sentiment)}>{post.media_sentiment}</span>
                                </p>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="byline">{formatDate(post.timestamp)}</span>
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gray-500 hover:text-black flex items-center gap-1"
                            >
                              Read more <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                        {post.image_url && (
                          <div className="flex-shrink-0 w-32 h-24 md:w-40 md:h-28 bg-gray-100 overflow-hidden">
                            <img
                              src={post.image_url}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                            />
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-black mt-16">
        <div className="max-w-[1200px] mx-auto px-4 py-8">
          <div className="text-center">
            <p className="masthead text-2xl mb-2">Elon Radar</p>
            <p className="dateline">
              Real-time news monitoring powered by xAI Grok
            </p>
            <p className="dateline mt-1">
              © {new Date().getFullYear()} · Updates daily at 6 AM UTC
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
