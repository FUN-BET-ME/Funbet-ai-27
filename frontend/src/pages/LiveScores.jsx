import React, { useState, useEffect } from 'react';
import { Activity, Clock, RefreshCw, AlertCircle, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';

const LiveScores = () => {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter, setFilter] = useState('all');
  const sports = ['all', 'football', 'cricket', 'basketball', 'hockey', 'baseball'];

  const fetchScores = async () => {
    setLoading(true);
    setError(null);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      
      // Fetch from odds endpoints to get upcoming matches (better for cricket and other sports)
      const [footballResponse, cricketResponse, generalResponse] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/odds/football/priority`, {
          params: { regions: 'uk', markets: 'h2h' }
        }),
        axios.get(`${BACKEND_URL}/api/odds/cricket/priority`, {
          params: { regions: 'uk', markets: 'h2h' }
        }),
        axios.get(`${BACKEND_URL}/api/odds/upcoming`, {
          params: { regions: 'uk', markets: 'h2h' }
        })
      ]);

      // Combine all matches from different sources
      const allMatches = [
        ...footballResponse.data,
        ...cricketResponse.data,
        ...generalResponse.data.filter(match => {
          // Exclude football and cricket from general to avoid duplicates
          const sport = match.sport_title?.toLowerCase() || '';
          return !sport.includes('soccer') && !sport.includes('football') &&
                 !sport.includes('cricket') && !sport.includes('la liga') && 
                 !sport.includes('epl');
        })
      ];

      if (!Array.isArray(allMatches)) {
        setError('Failed to load matches data.');
        setLoading(false);
        return;
      }
      
      // Remove duplicates based on id and add unique key
      const uniqueMatches = [];
      const seenIds = new Set();
      allMatches.forEach((match, index) => {
        const matchId = match.id || `${match.home_team}_${match.away_team}_${match.commence_time}`;
        if (!seenIds.has(matchId)) {
          seenIds.add(matchId);
          // Add unique key for React rendering
          match.uniqueKey = `${matchId}_${index}`;
          uniqueMatches.push(match);
        }
      });
      
      // Filter for UPCOMING matches only (next 7 days)
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
      
      const relevantMatches = uniqueMatches.filter(match => {
        if (!match.commence_time) return false;
        const matchDate = new Date(match.commence_time);
        
        // ONLY show matches that haven't started yet (future matches)
        return matchDate > now && matchDate <= sevenDaysFromNow;
      });

      // Sort by commence time (chronological - soonest first)
      relevantMatches.sort((a, b) => {
        return new Date(a.commence_time) - new Date(b.commence_time);
      });

      // Show up to 100 upcoming matches
      const topMatches = relevantMatches.slice(0, 100);
      
      setScores(topMatches);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load matches. Please try again.');
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchScores, 30000);
    
    // Update countdown display every minute
    const countdownInterval = setInterval(() => {
      setScores(prevScores => [...prevScores]);
    }, 60000);
    
    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, []);

  const getMatchStatus = (match) => {
    if (!match.commence_time) return 'Unknown';
    
    const now = new Date();
    const matchDate = new Date(match.commence_time);
    const minutesDiff = Math.floor((now - matchDate) / (1000 * 60));

    if (match.completed) {
      return 'Full Time';
    } else if (minutesDiff < 0) {
      return 'Not Started';
    } else if (minutesDiff >= 0 && minutesDiff <= 120) {
      return `${minutesDiff}'`;
    } else {
      return 'Full Time';
    }
  };

  const isLive = (match) => {
    if (match.completed) return false;
    if (!match.commence_time) return false;
    
    const now = new Date();
    const matchDate = new Date(match.commence_time);
    const minutesDiff = Math.floor((now - matchDate) / (1000 * 60));
    
    return minutesDiff >= 0 && minutesDiff <= 120;
  };

  const getCountdown = (match) => {
    if (!match.commence_time) return null;
    
    const now = new Date();
    const matchDate = new Date(match.commence_time);
    const diff = matchDate - now;
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatMatchDateTime = (match) => {
    if (!match.commence_time) return 'TBD';
    
    const matchDate = new Date(match.commence_time);
    const now = new Date();
    const isToday = matchDate.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = matchDate.toDateString() === tomorrow.toDateString();
    
    const time = matchDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    if (isToday) {
      return `Today, ${time}`;
    } else if (isTomorrow) {
      return `Tomorrow, ${time}`;
    } else {
      const date = matchDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      return `${date}, ${time}`;
    }
  };

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header - Match AI Predictions Format */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-8 h-8 text-[#FFD700]" />
            <h1 className="text-3xl sm:text-4xl font-bold">
              Upcoming <span className="text-[#FFD700]">Matches</span>
            </h1>
          </div>
          <p className="text-gray-400 text-lg mb-6">
            Starting soon - Next 7 days matches across all major sports. Auto-refreshes every 30 seconds.
          </p>
          
          {/* Sport Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="flex flex-wrap gap-2">
              {sports.map((sport) => (
                <button
                  key={sport}
                  onClick={() => setFilter(sport)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                    filter === sport
                      ? 'bg-[#FFD700] text-[#2E004F]'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-[#2E004F]/30'
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button
              onClick={fetchScores}
              disabled={loading}
              className="bg-[#FFD700] text-[#2E004F] hover:bg-[#FFD700]/90"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Matches
            </Button>
            {lastUpdated && (
              <span className="text-sm text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-500 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* No Matches State */}
        {!loading && !error && scores.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No upcoming matches found for {filter === 'all' ? 'all sports' : filter}.</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-32 bg-white/5 border border-[#2E004F]/30 rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Matches List - Filter by Sport */}
        {!loading && !error && scores.length > 0 && (
          <div className="space-y-4">
            {scores.filter(match => {
              if (filter === 'all') return true;
              const sport = match.sport_title?.toLowerCase() || '';
              if (filter === 'football') {
                return sport.includes('soccer') || sport.includes('football') || sport.includes('la liga') || 
                       sport.includes('epl') || sport.includes('serie a');
              }
              if (filter === 'cricket') {
                return sport.includes('cricket') || sport.includes('ipl') || sport.includes('twenty20') || 
                       sport.includes('t20') || sport.includes('odi') || sport.includes('test match');
              }
              if (filter === 'basketball') {
                return sport.includes('basketball') || sport.includes('nba');
              }
              if (filter === 'hockey') {
                return sport.includes('hockey') || sport.includes('nhl');
              }
              if (filter === 'baseball') {
                return sport.includes('baseball') || sport.includes('mlb');
              }
              return false;
            }).map((match) => (
              <div
                key={match.uniqueKey || match.id}
                className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6 hover:border-[#FFD700]/50 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Sport & League */}
                  <div className="flex-shrink-0">
                    <span className="text-xs font-semibold text-[#FFD700] bg-[#FFD700]/10 px-2 py-1 rounded">
                      {match.sport_title}
                    </span>
                  </div>

                  {/* Center: Teams & Score */}
                  <div className="flex-1">
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                      {/* Home Team */}
                      <div className="text-right">
                        <h3 className="text-lg font-semibold">{match.home_team}</h3>
                      </div>

                      {/* Score */}
                      <div className="bg-[#2E004F]/50 rounded-lg px-6 py-3 min-w-[140px]">
                        {match.scores && match.scores.length >= 2 ? (
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-2xl font-bold text-white">
                              {match.scores[0].score || '0'}
                            </span>
                            <span className="text-gray-500">-</span>
                            <span className="text-2xl font-bold text-white">
                              {match.scores[1].score || '0'}
                            </span>
                          </div>
                        ) : isLive(match) ? (
                          <div className="text-center">
                            <p className="text-sm text-[#FFD700] font-semibold mb-1">LIVE</p>
                            <p className="text-xs text-gray-400">Loading scores...</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className="text-sm text-gray-400 font-semibold mb-1">VS</p>
                            <p className="text-xs text-[#FFD700] font-medium">{formatMatchDateTime(match)}</p>
                            {getCountdown(match) && (
                              <p className="text-xs text-gray-500 mt-1">in {getCountdown(match)}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="text-left">
                        <h3 className="text-lg font-semibold">{match.away_team}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status */}
                  <div className="flex-shrink-0 text-center lg:text-right">
                    {isLive(match) ? (
                      <div className="flex items-center justify-center lg:justify-end gap-2">
                        <Clock className="w-4 h-4 text-red-500" />
                        <span className="text-red-500 font-semibold">
                          {getMatchStatus(match)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 font-semibold">
                        {getMatchStatus(match)}
                      </span>
                    )}
                    {match.completed && (
                      <span className="text-xs text-gray-400 mt-1 block">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Data */}
        {!loading && !error && scores.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No live or recent matches found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveScores;