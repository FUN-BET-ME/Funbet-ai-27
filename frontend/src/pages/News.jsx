import React, { useState, useEffect } from 'react';
import { Calendar, ArrowRight, RefreshCw, AlertCircle, Newspaper } from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';

const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter, setFilter] = useState('all');
  const [subFilter, setSubFilter] = useState('all');

  // Main categories - Football & Cricket only
  const categories = ['all', 'cricket', 'football'];
  
  // Sub-categories for cricket and football
  const subCategories = {
    cricket: ['all', 'IPL', 'International', 'T20', 'Test', 'ODI'],
    football: ['all', 'EPL', 'La Liga', 'Champions League', 'Serie A', 'Bundesliga']
  };

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const API = `${BACKEND_URL}/api`;
      
      // Build query based on filter and subFilter
      let query = '';
      
      if (filter === 'cricket') {
        if (subFilter === 'IPL') {
          query = '(IPL OR "Indian Premier League") AND (cricket OR match OR wicket OR runs)';
        } else if (subFilter === 'International') {
          query = '(cricket) AND ("World Cup" OR "T20 World Cup" OR international OR India OR Australia OR England) AND (match OR wicket)';
        } else if (subFilter === 'T20') {
          query = '(T20 OR "Twenty20") AND cricket AND (match OR league)';
        } else if (subFilter === 'Test') {
          query = '("Test cricket" OR "Test match") AND (wicket OR runs OR century)';
        } else if (subFilter === 'ODI') {
          query = '(ODI OR "One Day") AND cricket AND (match OR wicket)';
        } else {
          query = '(cricket) AND (IPL OR "World Cup" OR T20 OR Test OR ODI OR match OR wicket OR runs)';
        }
      } else if (filter === 'football') {
        if (subFilter === 'EPL') {
          query = '("Premier League" OR EPL) AND (football OR soccer) AND (match OR goal OR win)';
        } else if (subFilter === 'La Liga') {
          query = '("La Liga" OR "Spanish football") AND (match OR goal OR Barcelona OR Madrid)';
        } else if (subFilter === 'Champions League') {
          query = '("Champions League" OR UCL OR "European Cup") AND (football OR soccer) AND (match OR goal)';
        } else if (subFilter === 'Serie A') {
          query = '("Serie A" OR "Italian football") AND (match OR goal OR Milan OR Juventus)';
        } else if (subFilter === 'Bundesliga') {
          query = '(Bundesliga OR "German football") AND (match OR goal OR Bayern)';
        } else {
          query = '(football OR soccer) AND (EPL OR "Premier League" OR "La Liga" OR "Serie A" OR "Bundesliga" OR "Champions League" OR match OR goal)';
        }
      } else if (filter === 'basketball') {
        query = '(basketball OR NBA) AND (game OR match OR championship OR playoffs OR score)';
      } else if (filter === 'hockey') {
        query = '(hockey OR NHL) AND (game OR match OR playoffs OR goal OR score)';
      } else if (filter === 'baseball') {
        query = '(baseball OR MLB) AND (game OR match OR World Series OR playoffs OR home run)';
      } else {
        query = '(sports OR football OR soccer OR cricket OR basketball OR hockey OR baseball) AND (game OR match OR league OR championship OR tournament OR score OR win)';
      }
      
      const newsResponse = await axios.get(`${API}/news`, {
        params: {
          q: query,
          pageSize: 50  // Increased to get more results to filter from
        }
      });

      // Process and format news articles
      const articles = newsResponse.data.articles
        .filter(article => {
          if (!article.title || !article.description) return false;
          
          const fullText = (article.title + ' ' + article.description).toLowerCase();
          
          // For specific sport filters, match the sport
          if (filter === 'football') {
            return fullText.includes('football') || fullText.includes('soccer') || 
                   fullText.includes('epl') || fullText.includes('premier') ||
                   fullText.includes('la liga') || fullText.includes('champions') ||
                   fullText.includes('madrid') || fullText.includes('manchester') ||
                   fullText.includes('barcelona') || fullText.includes('arsenal');
          }
          if (filter === 'cricket') {
            return fullText.includes('cricket') || fullText.includes('ipl') || 
                   fullText.includes('test') || fullText.includes('odi') ||
                   fullText.includes('india') || fullText.includes('world cup');
          }
          
          // For "all", show all articles
          return true;
        })
        .slice(0, 20)
        .map(article => ({
          id: article.url,
          title: article.title,
          summary: article.description,
          category: determineSportCategory(article.title + ' ' + article.description),
          date: article.publishedAt,
          image: article.urlToImage,
          source: article.source.name,
          url: article.url
        }));

      setNews(articles);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load news. Please try again.');
      console.error('Error fetching news:', err);
    } finally {
      setLoading(false);
    }
  };

  const determineSportCategory = (text) => {
    const lowerText = text.toLowerCase();
    // Football prioritized with more keywords
    if (lowerText.includes('football') || lowerText.includes('soccer') || 
        lowerText.includes('premier league') || lowerText.includes('epl') ||
        lowerText.includes('la liga') || lowerText.includes('serie a') || 
        lowerText.includes('bundesliga') || lowerText.includes('champions league') ||
        lowerText.includes('liga mx') || lowerText.includes('mls')) {
      return 'Football';
    } 
    // Cricket prioritized
    else if (lowerText.includes('cricket') || lowerText.includes('ipl') || 
             lowerText.includes('test match') || lowerText.includes('t20') ||
             lowerText.includes('odi')) {
      return 'Cricket';
    } 
    else if (lowerText.includes('basketball') || lowerText.includes('nba')) {
      return 'Basketball';
    } 
    else if (lowerText.includes('hockey') || lowerText.includes('nhl')) {
      return 'Hockey';
    } 
    else if (lowerText.includes('baseball') || lowerText.includes('mlb')) {
      return 'Baseball';
    } 
    else {
      return 'Sports';
    }
  };

  useEffect(() => {
    fetchNews();
    // Auto-refresh every 3 minutes
    const interval = setInterval(fetchNews, 180000);
    return () => clearInterval(interval);
  }, [filter, subFilter]);

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#2E004F] to-[#4a0080] flex items-center justify-center">
              <Newspaper className="w-6 h-6 text-[#FFD700]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">
              Latest <span className="text-[#FFD700]">Sports News</span>
            </h1>
          </div>
          <p className="text-gray-400 text-lg mb-6">
            {filter === 'cricket' 
              ? '🏏 Live Cricket News - IPL, International matches, T20, Test, and ODI updates' 
              : filter === 'football' 
              ? '⚽ Football News - EPL, La Liga, Champions League, Serie A, and Bundesliga coverage'
              : 'Top sports headlines and breaking news from around the world. Auto-refreshes every 3 minutes.'}
          </p>
          
          <div className="flex items-center gap-4">
            <Button
              onClick={fetchNews}
              disabled={loading}
              className="bg-[#FFD700] text-[#2E004F] hover:bg-[#FFD700]/90"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh News
            </Button>
            {lastUpdated && (
              <span className="text-sm text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setFilter(category);
                setSubFilter('all'); // Reset sub-filter when changing main filter
              }}
              className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap transition-all ${
                filter === category
                  ? 'bg-[#FFD700] text-[#2E004F]'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-[#2E004F]/30'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Sub-Filter for Cricket and Football */}
        {(filter === 'cricket' || filter === 'football') && (
          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            <div className="flex gap-2 items-center">
              <span className="text-gray-400 text-sm px-2 whitespace-nowrap">
                {filter === 'cricket' ? '🏏 Cricket:' : '⚽ Football:'}
              </span>
              {subCategories[filter].map((subCat) => (
                <button
                  key={subCat}
                  onClick={() => setSubFilter(subCat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    subFilter === subCat
                      ? 'bg-[#FFD700]/80 text-[#2E004F]'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-[#2E004F]/20'
                  }`}
                >
                  {subCat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-500 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 bg-white/5 border border-[#2E004F]/30 rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && !error && news.length > 0 && (
          <>
            {/* Featured News */}
            <div className="mb-12">
              <a
                href={news[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="relative rounded-xl overflow-hidden bg-white/5 border border-[#2E004F]/30 hover:border-[#FFD700]/50 transition-all group">
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={news[0].image}
                      alt={news[0].title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0012] via-[#0a0012]/50 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-block text-xs font-semibold text-[#FFD700] bg-[#FFD700]/10 px-3 py-1 rounded">
                        {news[0].category}
                      </span>
                      <span className="text-xs text-gray-400">
                        {news[0].source}
                      </span>
                    </div>
                    <h2 className="text-3xl font-bold mb-3 text-white line-clamp-2">
                      {news[0].title}
                    </h2>
                    <p className="text-gray-300 mb-4 line-clamp-2">{news[0].summary}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(news[0].date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#FFD700] group-hover:gap-3 transition-all">
                        <span className="text-sm font-semibold">Read More</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            </div>

            {/* News Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.slice(1).map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg overflow-hidden hover:border-[#FFD700]/50 transition-all group h-full">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80';
                        }}
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#FFD700] bg-[#0a0012]/80 backdrop-blur-sm px-2 py-1 rounded">
                          {article.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="text-xs text-gray-500 mb-2">{article.source}</div>
                      <h3 className="text-lg font-bold mb-2 text-white line-clamp-2 group-hover:text-[#FFD700] transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                        {article.summary}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#FFD700] group-hover:gap-2 transition-all">
                          <span className="text-xs font-semibold">Read</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}

        {/* No Data */}
        {!loading && !error && news.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No news available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default News;