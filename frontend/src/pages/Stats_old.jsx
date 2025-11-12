import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Flame, Clock, ArrowRight, RefreshCw, AlertCircle, BarChart3 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Stats = () => {
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
  const sports = ['all', 'football', 'cricket', 'basketball', 'hockey', 'baseball', 'tennis', 'boxing', 'mma', 'rugby'];

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      
      // Fetch from all sources: Football priority, Cricket priority, and general sports
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

      // Combine all matches (prioritized football, cricket, and other sports)
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

      // Filter for matches with bookmakers
      const upcomingMatches = allMatches.filter(match => {
        return match.bookmakers && match.bookmakers.length > 0;
      });

      // 1. 🔥 HOT MARKETS - Most bookmakers + tightest spreads
      const hotMarkets = upcomingMatches
        .map(match => {
          const bookmakerCount = match.bookmakers.length;
          const outcomes = match.bookmakers[0].markets[0].outcomes;
          
          // Calculate average spread across all outcomes
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
          
          // Hot market score: more bookmakers + tighter spread = higher score
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

      // 2. 💎 VALUE OPPORTUNITIES - Biggest discrepancies between bookmakers
      const valueOpportunities = upcomingMatches
        .filter(m => m.bookmakers.length >= 5)
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

      // 3. 📊 SHARP MONEY - Unusual odds patterns indicating betting pressure
      const sharpMoney = upcomingMatches
        .filter(m => m.bookmakers.length >= 5)
        .map(match => {
          const outcomes = match.bookmakers[0].markets[0].outcomes;
          
          // Calculate coefficient of variation for each outcome
          const variations = outcomes.map(outcome => {
            const allOdds = match.bookmakers
              .flatMap(b => b.markets[0].outcomes)
              .filter(o => o.name === outcome.name)
              .map(o => o.price);
            const mean = allOdds.reduce((a, b) => a + b, 0) / allOdds.length;
            const variance = allOdds.reduce((sum, odd) => sum + Math.pow(odd - mean, 2), 0) / allOdds.length;
            const stdDev = Math.sqrt(variance);
            const cv = (stdDev / mean) * 100; // Coefficient of variation
            
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

      // 4. ⚡ STARTING SOON - High-profile matches in next 6 hours
      const now = new Date();
      const sixHoursLater = new Date(now.getTime() + (6 * 60 * 60 * 1000));
      const startingSoon = upcomingMatches
        .filter(match => {
          const matchTime = new Date(match.commence_time);
          return matchTime >= now && matchTime <= sixHoursLater;
        })
        .map(match => {
          // Priority score based on league importance
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

      // 5. 🎯 ARBITRAGE ALERTS - Risk-free betting opportunities
      const arbitrageOpportunities = upcomingMatches
        .filter(m => m.bookmakers.length >= 3)
        .map(match => {
          const outcomes = match.bookmakers[0].markets[0].outcomes;
          
          // Find best odds for each outcome across all bookmakers
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
          
          // Calculate arbitrage percentage
          // If sum of (1/best_odds) < 1, there's an arbitrage opportunity
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
    // Auto-refresh every 10 minutes
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

  const getSportLink = (sport) => {
    if (sport.toLowerCase().includes('soccer') || sport.toLowerCase().includes('football')) return '/football-odds';
    if (sport.toLowerCase().includes('cricket')) return '/cricket-odds';
    if (sport.toLowerCase().includes('nfl')) return '/nfl-odds';
    if (sport.toLowerCase().includes('golf')) return '/golf-odds';
    return '/other-sports-odds';
  };

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-8 h-8 text-[#FFD700]" />
            <h1 className="text-3xl sm:text-4xl font-bold">
              Trending <span className="text-[#FFD700]">Insights</span>
            </h1>
          </div>
          <p className="text-gray-400 text-lg mb-6">
            Upcoming matches and real-time odds movements for the next 7 days. Auto-refreshes every 10 minutes.
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
                className="h-32 bg-white/5 border border-[#2E004F]/30 rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Upcoming Matches - Chronological */}
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="w-6 h-6 text-[#FFD700]" />
                <h2 className="text-2xl font-bold">Upcoming Matches (Next 7 Days)</h2>
                <span className="text-sm text-gray-400 ml-2">All sports chronological order</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {trendingMatches.filter(match => {
                  if (filter === 'all') return true;
                  const sport = match.sport?.toLowerCase() || '';
                  if (filter === 'football') {
                    return sport.includes('soccer') || sport.includes('football') || sport.includes('la liga') || sport.includes('epl') || sport.includes('serie a');
                  }
                  if (filter === 'cricket') {
                    return sport.includes('cricket') || sport.includes('ipl');
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
                }).map((match, index) => (
                  <Link
                    key={match.id}
                    to={getSportLink(match.sport_title)}
                    className="group"
                  >
                    <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-5 hover:border-[#FFD700]/50 transition-all hover:transform hover:scale-105">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#FFD700] bg-[#FFD700]/10 px-2 py-1 rounded">
                            #{index + 1}
                          </span>
                          <span className="text-xs text-gray-400">{match.sport_title}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(match.commence_time)}</span>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-semibold mb-2">
                        {match.home_team} <span className="text-gray-500">vs</span> {match.away_team}
                      </h3>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          {match.bookmakers.length} bookmakers
                        </span>
                        <div className="flex items-center gap-1 text-[#FFD700] group-hover:gap-2 transition-all">
                          <span className="text-sm font-semibold">View Odds</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Odds Movements */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-6 h-6 text-[#FFD700]" />
                <h2 className="text-2xl font-bold">Odds Movements & Insights</h2>
              </div>

              <div className="space-y-4">
                {oddsMovements.map((match) => (
                  <div
                    key={match.id}
                    className="bg-white/5 border border-[#2E004F]/30 rounded-lg overflow-hidden"
                  >
                    <div className="bg-[#2E004F]/50 px-6 py-3 border-b border-[#2E004F]/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold text-[#FFD700] bg-[#FFD700]/10 px-2 py-1 rounded mr-2">
                            {match.sport}
                          </span>
                          <span className="text-sm text-gray-400">
                            {formatTime(match.date)}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold mt-2">
                        {match.homeTeam} <span className="text-gray-500">vs</span> {match.awayTeam}
                      </h3>
                    </div>

                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {match.movements.map((movement, idx) => (
                          <div
                            key={idx}
                            className="bg-[#2E004F]/30 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-white">
                                {movement.team}
                              </span>
                              {movement.trend === 'up' ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-2xl font-bold text-[#FFD700]">
                                {movement.currentOdds.toFixed(2)}
                              </span>
                              <span className="text-sm text-gray-400">
                                avg: {movement.avgOdds}
                              </span>
                            </div>
                            
                            <div className="text-xs text-gray-500">
                              Spread: {movement.spread}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* No Data */}
        {!loading && !error && trendingMatches.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No data available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stats;