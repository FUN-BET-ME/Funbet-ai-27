import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Flame, Clock, ArrowRight, RefreshCw, AlertCircle, BarChart3, Zap, Target, Gem, Activity } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Stats = () => {
  const navigate = useNavigate();
  const [trendingMatches, setTrendingMatches] = useState({
    hotMarkets: [],
    valueOpportunities: [],
    sharpMoney: [],
    startingSoon: [],
    arbitrageOpportunities: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter, setFilter] = useState('all');
  const sports = ['all', 'football', 'cricket'];
  
  const formatSportName = (sport) => {
    const sportNames = {
      'all': 'All',
      'football': 'Football',
      'cricket': 'Cricket'
    };
    return sportNames[sport] || sport;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      
      // FAST: Fetch from database instead of 3 slow API calls
      const response = await axios.get(`${BACKEND_URL}/api/odds/all-cached`, {
        params: {
          limit: 200, // Increased to include all sports
          skip: 0
        }
      });

      // Filter for UPCOMING matches with bookmakers (next 14 days only)
      const now = new Date();
      const fourteenDaysFromNow = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
      
      const upcomingMatches = (response.data.matches || []).filter(match => {
        if (!match.bookmakers || match.bookmakers.length === 0) return false;
        
        // Only include upcoming matches (not past matches)
        const matchTime = new Date(match.commence_time);
        return matchTime >= now && matchTime <= fourteenDaysFromNow;
      });

      // 1. 🔥 HOT MARKETS
      const hotMarkets = upcomingMatches
        .map(match => {
          const bookmakerCount = match.bookmakers.length;
          const outcomes = match.bookmakers[0].markets[0].outcomes;
          
          let totalSpread = 0;
          outcomes.forEach(outcome => {
            const allOdds = match.bookmakers
              .flatMap(b => b.markets[0].outcomes)
              .filter(o => o.name === outcome.name)
              .map(o => o.price);
            const maxOdds = Math.max(...allOdds);
            const minOdds = Math.min(...allOdds);
            const spread = ((maxOdds - minOdds) / minOdds * 100);
            totalSpread += spread;
          });
          const avgSpread = totalSpread / outcomes.length;
          const hotScore = bookmakerCount * (100 / (avgSpread + 1));
          
          return {
            ...match,
            bookmakerCount,
            avgSpread: avgSpread.toFixed(2),
            hotScore
          };
        })
        .sort((a, b) => b.hotScore - a.hotScore)
        .slice(0, 10);

      // 2. 💎 VALUE OPPORTUNITIES
      const valueOpportunities = upcomingMatches
        .filter(m => m.bookmakers.length >= 3)  // Reduced from 5 to 3
        .map(match => {
          const outcomes = match.bookmakers[0].markets[0].outcomes;
          let maxDiscrepancy = 0;
          let bestValue = null;
          
          outcomes.forEach(outcome => {
            const allOdds = match.bookmakers
              .flatMap(b => b.markets[0].outcomes)
              .filter(o => o.name === outcome.name)
              .map(o => o.price);
            const maxOdds = Math.max(...allOdds);
            const minOdds = Math.min(...allOdds);
            const discrepancy = ((maxOdds - minOdds) / minOdds * 100);
            
            if (discrepancy > maxDiscrepancy) {
              maxDiscrepancy = discrepancy;
              bestValue = {
                team: outcome.name,
                bestOdds: maxOdds,
                worstOdds: minOdds,
                difference: discrepancy.toFixed(1)
              };
            }
          });
          
          return {
            ...match,
            maxDiscrepancy,
            bestValue
          };
        })
        .sort((a, b) => b.maxDiscrepancy - a.maxDiscrepancy)
        .slice(0, 10);

      // 3. 📊 SHARP MONEY
      const sharpMoney = upcomingMatches
        .filter(m => m.bookmakers.length >= 3)  // Reduced from 5 to 3
        .map(match => {
          const outcomes = match.bookmakers[0].markets[0].outcomes;
          
          const variations = outcomes.map(outcome => {
            const allOdds = match.bookmakers
              .flatMap(b => b.markets[0].outcomes)
              .filter(o => o.name === outcome.name)
              .map(o => o.price);
            const mean = allOdds.reduce((a, b) => a + b, 0) / allOdds.length;
            const variance = allOdds.reduce((sum, odd) => sum + Math.pow(odd - mean, 2), 0) / allOdds.length;
            const stdDev = Math.sqrt(variance);
            const cv = (stdDev / mean) * 100;
            
            return {
              team: outcome.name,
              avgOdds: mean.toFixed(2),
              volatility: cv.toFixed(1)
            };
          });
          
          const totalVolatility = variations.reduce((sum, v) => sum + parseFloat(v.volatility), 0);
          
          return {
            ...match,
            volatility: totalVolatility,
            variations
          };
        })
        .sort((a, b) => b.volatility - a.volatility)
        .slice(0, 10);

      // 4. ⚡ STARTING SOON
      const sixHoursLater = new Date(now.getTime() + (6 * 60 * 60 * 1000));
      const startingSoon = upcomingMatches
        .filter(match => {
          const matchTime = new Date(match.commence_time);
          return matchTime >= now && matchTime <= sixHoursLater;
        })
        .map(match => {
          const sport = match.sport_title.toLowerCase();
          let priority = 0;
          if (sport.includes('premier') || sport.includes('epl')) priority = 10;
          else if (sport.includes('champions')) priority = 9;
          else if (sport.includes('ipl') || sport.includes('world cup')) priority = 9;
          else if (sport.includes('la liga') || sport.includes('serie a') || sport.includes('bundesliga')) priority = 8;
          else if (sport.includes('international')) priority = 7;
          else priority = 5;
          
          return {
            ...match,
            priority
          };
        })
        .sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          return new Date(a.commence_time) - new Date(b.commence_time);
        })
        .slice(0, 10);

      // 5. 🎯 ARBITRAGE ALERTS
      const arbitrageOpportunities = upcomingMatches
        .filter(m => m.bookmakers.length >= 3)
        .map(match => {
          const outcomes = match.bookmakers[0].markets[0].outcomes;
          
          const bestOddsPerOutcome = outcomes.map(outcome => {
            const allOdds = match.bookmakers
              .flatMap(b => b.markets[0].outcomes)
              .filter(o => o.name === outcome.name)
              .map(o => o.price);
            return {
              team: outcome.name,
              bestOdds: Math.max(...allOdds)
            };
          });
          
          const arbPercentage = bestOddsPerOutcome.reduce((sum, outcome) => {
            return sum + (1 / outcome.bestOdds);
          }, 0);
          
          const profitMargin = ((1 / arbPercentage) - 1) * 100;
          
          return {
            ...match,
            arbPercentage: arbPercentage.toFixed(4),
            profitMargin: profitMargin.toFixed(2),
            bestOddsPerOutcome,
            hasArbitrage: arbPercentage < 1
          };
        })
        .filter(match => match.hasArbitrage)
        .sort((a, b) => parseFloat(b.profitMargin) - parseFloat(a.profitMargin))
        .slice(0, 10);

      setTrendingMatches({
        hotMarkets,
        valueOpportunities,
        sharpMoney,
        startingSoon,
        arbitrageOpportunities
      });
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 600000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSportEmoji = (sport) => {
    const s = sport.toLowerCase();
    if (s.includes('football') || s.includes('soccer')) return '⚽';
    if (s.includes('cricket')) return '🏏';
    if (s.includes('basketball')) return '🏀';
    if (s.includes('baseball')) return '⚾';
    if (s.includes('hockey')) return '🏒';
    if (s.includes('tennis')) return '🎾';
    return '🏆';
  };

  // Filter matches by sport
  const filterMatches = (matches) => {
    if (filter === 'all') return matches;
    return matches.filter(match => {
      const sport = match.sport_title.toLowerCase();
      const sportKey = match.sport_key?.toLowerCase() || '';
      
      // Handle football/soccer - includes ALL soccer/football leagues worldwide
      if (filter === 'football') {
        return sportKey.includes('soccer') || 
               sport.includes('soccer') || sport.includes('football') ||
               sport.includes('la liga') || sport.includes('premier league') || 
               sport.includes('epl') || sport.includes('serie a') || 
               sport.includes('bundesliga') || sport.includes('ligue 1') ||
               sport.includes('champions league') || sport.includes('europa league') ||
               sport.includes('liga mx') || sport.includes('mls') ||
               sport.includes('brasileirão') || sport.includes('campeonato') ||
               sport.includes('primera división') || sport.includes('fa cup') || 
               sport.includes('world cup') || sport.includes('international') && sport.includes('friendly');
      }
      
      // Handle cricket - ALL cricket formats
      if (filter === 'cricket') {
        return sportKey.includes('cricket') ||
               sport.includes('cricket') || sport.includes('twenty20') || 
               sport.includes('t20') || sport.includes('test') || 
               sport.includes('odi') || sport.includes('ipl') ||
               sport.includes('big bash') || sport.includes('cpl');
      }
      
      // Handle basketball - ALL basketball leagues
      if (filter === 'basketball') {
        return sportKey.includes('basketball') ||
               sport.includes('basketball') || sport.includes('nba') || 
               sport.includes('ncaab') || sport.includes('euroleague') ||
               sport.includes('fiba');
      }
      
      // Handle hockey - ALL hockey leagues
      if (filter === 'hockey') {
        return sportKey.includes('hockey') ||
               sport.includes('hockey') || sport.includes('nhl');
      }
      
      // Handle baseball - ALL baseball leagues
      if (filter === 'baseball') {
        return sportKey.includes('baseball') ||
               sport.includes('baseball') || sport.includes('mlb');
      }
      
      // Handle tennis - ALL tennis tournaments
      if (filter === 'tennis') {
        return sportKey.includes('tennis') ||
               sport.includes('tennis') || sport.includes('atp') || 
               sport.includes('wta') || sport.includes('grand slam');
      }
      
      // Handle American Football
      if (filter === 'americanfootball') {
        return sportKey.includes('americanfootball') || 
               sport.includes('nfl') || sport.includes('ncaaf');
      }
      
      // Handle MMA
      if (filter === 'mma') {
        return sportKey.includes('mma') || 
               sport.includes('mma') || sport.includes('ufc') || 
               sport.includes('mixed martial');
      }
      
      // Handle Boxing
      if (filter === 'boxing') {
        return sportKey.includes('boxing') || sport.includes('boxing');
      }
      
      // Handle Rugby
      if (filter === 'rugby') {
        return sportKey.includes('rugby') || sport.includes('rugby');
      }
      
      // Default: check if filter term appears in sport title or key
      return sport.includes(filter) || sportKey.includes(filter);
    });
  };

  const MatchCard = ({ match, badge, badgeColor }) => (
    <Link 
      to="/odds"
      className="block bg-white/5 border border-[#2E004F]/30 rounded-lg p-4 hover:border-[#FFD700]/50 transition-all group"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-semibold text-gray-400 bg-white/5 px-2 py-1 rounded">
          {getSportEmoji(match.sport_title)} {match.sport_title}
        </span>
        {badge && (
          <span className={`text-xs font-bold px-2 py-1 rounded ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="text-white font-semibold mb-1">
        {match.home_team} vs {match.away_team}
      </div>
      <div className="text-sm text-gray-400">
        {formatTime(match.commence_time)}
      </div>
    </Link>
  );

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* FunBet.ME Promotional Banner */}
        <a 
          href="https://funbet.me" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block mb-8 bg-gradient-to-r from-[#FFD700]/20 via-amber-500/10 to-[#FFD700]/20 dark:from-[#FFD700]/20 dark:via-amber-500/10 dark:to-[#FFD700]/20 border-2 border-[#FFD700] rounded-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all group"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-[280px]">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🏆</span>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  FunBet<span className="text-[#FFD700]">.ME</span>
                </h3>
                <span className="px-3 py-1 bg-[#FFD700] text-[#2E004F] text-xs font-bold rounded-full">FEATURED</span>
              </div>
              <p className="text-gray-800 dark:text-gray-200 text-sm sm:text-base font-medium">
                The best sports betting site covering <span className="text-amber-600 dark:text-[#FFD700] font-bold">almost every market</span> with the <span className="text-amber-600 dark:text-[#FFD700] font-bold">ultimate odds and bonus</span> in the industry.
              </p>
            </div>
            <div className="text-amber-600 dark:text-[#FFD700] group-hover:translate-x-2 transition-transform">
              <ArrowRight className="w-6 h-6" />
            </div>
          </div>
        </a>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-8 h-8 text-[#FFD700]" />
            <h1 className="text-3xl sm:text-4xl font-bold">
              Betting <span className="text-[#FFD700]">Intelligence</span>
            </h1>
          </div>
          <p className="text-gray-400 text-lg mb-6">
            Advanced market analytics to find the best betting opportunities
          </p>
          
          {/* Sport Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {sports.map((sport) => (
              <button
                key={sport}
                onClick={() => setFilter(sport)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === sport
                    ? 'bg-[#FFD700] text-[#2E004F]'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-[#2E004F]/30'
                }`}
              >
                {formatSportName(sport)}
              </button>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button
              onClick={fetchData}
              disabled={loading}
              className="bg-[#FFD700] text-[#2E004F] hover:bg-[#FFD700]/90"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
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
            <p className="text-red-500 font-medium">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-white/5 border border-[#2E004F]/30 rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-8">
            {/* 1. Hot Markets */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-6 h-6 text-[#FFD700]" />
                <h2 className="text-2xl font-bold">🔥 Hot Markets</h2>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Most liquid markets with tight spreads - high betting activity
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filterMatches(trendingMatches.hotMarkets).slice(0, 6).map(match => (
                  <div 
                    key={match.id} 
                    className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-4 hover:border-[#FFD700]/30 hover:bg-white/10 transition-all cursor-pointer transform hover:scale-[1.02]"
                    onClick={() => navigate(`/match/${match.id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-gray-400">
                        {getSportEmoji(match.sport_title)} {match.sport_title}
                      </span>
                      <span className="text-xs font-bold text-[#FFD700] bg-[#FFD700]/10 px-2 py-1 rounded">
                        {match.bookmakerCount} bookmakers
                      </span>
                    </div>
                    <div className="text-white font-semibold mb-1">
                      {match.home_team} vs {match.away_team}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">{formatTime(match.commence_time)}</span>
                      <span className="text-green-400">Spread: {match.avgSpread}%</span>
                    </div>
                    <div className="mt-2 text-xs text-[#FFD700] flex items-center justify-end gap-1">
                      View Details <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
              {filterMatches(trendingMatches.hotMarkets).length === 0 && (
                <p className="text-gray-500 text-center py-4">No hot markets found for selected sport</p>
              )}
            </section>

            {/* 2. Value Opportunities */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Gem className="w-6 h-6 text-[#FFD700]" />
                <h2 className="text-2xl font-bold">💎 Value Opportunities</h2>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Biggest odds discrepancies between bookmakers - find the best value
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filterMatches(trendingMatches.valueOpportunities).slice(0, 6).map(match => (
                  <div 
                    key={match.id} 
                    className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-4 hover:border-[#FFD700]/30 hover:bg-white/10 transition-all cursor-pointer transform hover:scale-[1.02]"
                    onClick={() => navigate(`/match/${match.id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-gray-400">
                        {getSportEmoji(match.sport_title)} {match.sport_title}
                      </span>
                      <span className="text-xs font-bold text-[#FFD700] bg-[#FFD700]/10 px-2 py-1 rounded">
                        {match.bestValue.difference}% difference
                      </span>
                    </div>
                    <div className="text-white font-semibold mb-1">
                      {match.home_team} vs {match.away_team}
                    </div>
                    <div className="text-sm mb-1">
                      <span className="text-[#FFD700] font-bold">{match.bestValue.team}:</span>
                      <span className="text-green-400 ml-2">{match.bestValue.bestOdds.toFixed(2)}</span>
                      <span className="text-gray-500 mx-1">vs</span>
                      <span className="text-red-400">{match.bestValue.worstOdds.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">{formatTime(match.commence_time)}</span>
                      <span className="text-[#FFD700] flex items-center gap-1">
                        View Details <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {filterMatches(trendingMatches.valueOpportunities).length === 0 && (
                <p className="text-gray-500 text-center py-4">No value opportunities found for selected sport</p>
              )}
            </section>

            {/* 3. Sharp Money */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-6 h-6 text-[#FFD700]" />
                <h2 className="text-2xl font-bold">📊 Sharp Money</h2>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Unusual volatility patterns indicating significant betting pressure
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filterMatches(trendingMatches.sharpMoney).slice(0, 6).map(match => (
                  <div 
                    key={match.id} 
                    className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-4 hover:border-[#FFD700]/30 hover:bg-white/10 transition-all cursor-pointer transform hover:scale-[1.02]"
                    onClick={() => navigate(`/match/${match.id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-gray-400">
                        {getSportEmoji(match.sport_title)} {match.sport_title}
                      </span>
                      <span className="text-xs font-bold text-[#FFD700] bg-[#FFD700]/10 px-2 py-1 rounded">
                        {match.volatility.toFixed(1)}% volatility
                      </span>
                    </div>
                    <div className="text-white font-semibold mb-2">
                      {match.home_team} vs {match.away_team}
                    </div>
                    <div className="space-y-1 mb-2">
                      {match.variations.map((v, i) => (
                        <div key={i} className="text-xs flex justify-between">
                          <span className="text-gray-400">{v.team}:</span>
                          <span className="text-[#FFD700]">{v.avgOdds} (±{v.volatility}%)</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">{formatTime(match.commence_time)}</span>
                      <span className="text-[#FFD700] flex items-center gap-1">
                        View Details <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {filterMatches(trendingMatches.sharpMoney).length === 0 && (
                <p className="text-gray-500 text-center py-4">No sharp money indicators for selected sport</p>
              )}
            </section>

            {/* 4. Starting Soon */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6 text-[#FFD700]" />
                <h2 className="text-2xl font-bold">⚡ Starting Soon</h2>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                High-profile matches starting in the next 6 hours
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filterMatches(trendingMatches.startingSoon).map(match => (
                  <div 
                    key={match.id} 
                    className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-4 hover:border-[#FFD700]/30 hover:bg-white/10 transition-all cursor-pointer transform hover:scale-[1.02]"
                    onClick={() => navigate(`/match/${match.id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-gray-400">
                        {getSportEmoji(match.sport_title)} {match.sport_title}
                      </span>
                      <span className="text-xs font-bold text-[#FFD700] bg-[#FFD700]/10 px-2 py-1 rounded">
                        Starts in {Math.round((new Date(match.commence_time) - new Date()) / (1000 * 60))}m
                      </span>
                    </div>
                    <div className="text-white font-semibold mb-1">
                      {match.home_team} vs {match.away_team}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">{formatTime(match.commence_time)}</span>
                      <span className="text-[#FFD700] text-xs flex items-center gap-1">
                        View Prediction <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {filterMatches(trendingMatches.startingSoon).length === 0 && (
                <p className="text-gray-500 text-center py-4">No matches starting soon for selected sport</p>
              )}
            </section>

            {/* 5. Arbitrage Alerts */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-6 h-6 text-[#FFD700]" />
                <h2 className="text-2xl font-bold">🎯 Arbitrage Alerts</h2>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Risk-free betting opportunities - guaranteed profit potential
              </p>
              {filterMatches(trendingMatches.arbitrageOpportunities).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filterMatches(trendingMatches.arbitrageOpportunities).map(match => (
                    <div 
                      key={match.id} 
                      className="bg-green-500/5 border border-green-500/30 rounded-lg p-4 hover:border-green-500/50 hover:bg-green-500/10 transition-all cursor-pointer transform hover:scale-[1.02]"
                      onClick={() => navigate(`/prediction/${match.id}`)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold text-gray-400">
                          {getSportEmoji(match.sport_title)} {match.sport_title}
                        </span>
                        <span className="text-xs font-bold text-green-400 bg-green-500/20 px-2 py-1 rounded">
                          +{match.profitMargin}% profit
                        </span>
                      </div>
                      <div className="text-white font-semibold mb-2">
                        {match.home_team} vs {match.away_team}
                      </div>
                      <div className="space-y-1 mb-2">
                        {match.bestOddsPerOutcome.map((outcome, i) => (
                          <div key={i} className="text-xs flex justify-between">
                            <span className="text-gray-400">{outcome.team}:</span>
                            <span className="text-[#FFD700] font-bold">{outcome.bestOdds.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">{formatTime(match.commence_time)}</span>
                        <span className="text-[#FFD700] flex items-center gap-1">
                          View Prediction <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6 text-center">
                  <p className="text-gray-400">No arbitrage opportunities currently available for selected sport</p>
                  <p className="text-xs text-gray-500 mt-2">Arbitrage opportunities are rare and usually close quickly</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Important Disclaimers */}
        <div className="mt-12 space-y-4">
          {/* Odds Accuracy Disclaimer */}
          <div className="p-6 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-2">Odds Accuracy Notice</h3>
                <p className="text-gray-400 text-sm">
                  <strong className="text-amber-500">Odds can change rapidly and may not be accurate in real-time.</strong> The information displayed is for reference and analysis purposes only. 
                  Always verify odds directly with bookmakers before placing any bets. FunBet.AI updates data every 5 minutes but cannot guarantee real-time accuracy.
                </p>
              </div>
            </div>
          </div>

          {/* General Disclaimer */}
          <div className="p-6 rounded-lg bg-[#2E004F]/10 border border-[#2E004F]/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-2">Statistical Analysis Disclaimer</h3>
                <p className="text-gray-400 text-sm">
                  This analysis is for informational purposes only. Past patterns do not guarantee future results. 
                  Always conduct your own research and gamble responsibly. FunBet.AI does not accept bets or facilitate gambling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stats;
