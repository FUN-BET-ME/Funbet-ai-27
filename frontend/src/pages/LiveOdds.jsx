import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TrendingUp, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Brain, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import OddsTable from '../components/OddsTable';
import { TeamLogo, OddsMovement, CountdownTimer, FollowTeamButton, ShareButton } from '../components/MatchComponents';
import { MatchCardSkeletonList } from '../components/SkeletonLoaders';
import { useFavorites } from '../contexts/FavoritesContext';
import { getTeamLogo, getCricketFlag } from '../services/teamLogos';
import oddsTracker from '../services/oddsTracker';
import axios from 'axios';

const LiveOdds = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get filter from URL and initialize state with it
  const getFilterFromURL = () => {
    const params = new URLSearchParams(location.search);
    return params.get('filter') || 'all';
  };
  
  const [filter, setFilter] = useState(() => getFilterFromURL());
  
  // Sync filter state when URL changes (e.g., clicking nav links)
  useEffect(() => {
    const urlFilter = getFilterFromURL();
    setFilter(urlFilter);
  }, [location.search]);
  const [timeFilter, setTimeFilter] = useState('live-upcoming'); // 'live-upcoming', 'inplay', 'recent-results'
  const [refreshKey, setRefreshKey] = useState(0);
  const [allOdds, setAllOdds] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedMatches, setExpandedMatches] = useState({});
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [teamLogos, setTeamLogos] = useState({}); // Cache for team logos
  const [oddsSortBy, setOddsSortBy] = useState({}); // Track sort preference per match: {matchId: 'home'|'draw'|'away'|null}
  const [aiPredictions, setAiPredictions] = useState([]); // Store AI predictions
  const [hasMore, setHasMore] = useState(false); // Pagination state
  const [loadingMore, setLoadingMore] = useState(false); // Loading more state
  const { toggleFollowTeam, isFollowing, isMatchFollowed} = useFavorites();

  const sports = ['all', 'football', 'cricket'];

  const sportEmojis = {
    all: '🏆',
    football: '⚽',
    cricket: '🏏'
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const toggleMatchExpansion = (matchId) => {
    setExpandedMatches(prev => ({
      ...prev,
      [matchId]: !prev[matchId]
    }));
  };

  // Fetch live scores from ESPN
  const fetchScores = async () => {
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await axios.get(`${BACKEND_URL}/api/espn/scores`);
      console.log('✅ ESPN Scores fetched:', response.data?.count || 0, 'matches');
      return response.data?.scores || [];
    } catch (error) {
      console.error('Error fetching ESPN scores:', error);
      return [];
    }
  };

  // Fetch historical odds for Recent Results
  const fetchHistoricalOdds = async () => {
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await axios.get(`${BACKEND_URL}/api/odds/historical/recent`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching historical odds:', error);
      return [];
    }
  };

  // Fetch in-play odds for Live In-Play filter
  const fetchInPlayOdds = async () => {
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await axios.get(`${BACKEND_URL}/api/odds/inplay`, {
        params: { regions: 'uk,eu,us,au', markets: 'h2h' }
      });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching in-play odds:', error);
      return [];
    }
  };

  // Helper to find matching score for a match
  const findScoreForMatch = (match, scoresData) => {
    if (!scoresData || scoresData.length === 0) return null;
    
    // Find all matching scores for this match
    const allMatches = scoresData.filter(score => {
      const homeMatch = score.home_team?.toLowerCase() === match.home_team?.toLowerCase();
      const awayMatch = score.away_team?.toLowerCase() === match.away_team?.toLowerCase();
      return homeMatch && awayMatch;
    });
    
    if (allMatches.length === 0) return null;
    
    // Prefer matches with actual score data
    const matchWithScores = allMatches.find(m => m.scores && m.scores.length > 0);
    if (matchWithScores) return matchWithScores;
    
    // Fall back to first match
    return allMatches[0];
  };

  // Fetch all odds - FETCH FROM DATABASE WITH SPORT FILTER
  const fetchAllOdds = async (loadMore = false, currentFilter = filter) => {
    console.log('🚀 fetchAllOdds called with:', { loadMore, currentFilter, allOddsLength: allOdds.length });
    
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      
      // Simple paginated fetch from database
      const currentSkip = loadMore ? allOdds.length : 0;
      const limit = 100;

      // Map frontend filter to backend sport_key pattern - FOOTBALL & CRICKET ONLY
      const sportKeyMap = {
        'football': 'soccer',
        'cricket': 'cricket'
      };
      
      const sportFilter = currentFilter !== 'all' ? sportKeyMap[currentFilter] : null;
      
      console.log('🎯 CRITICAL DEBUG - About to fetch:', { 
        currentFilter, 
        sportFilter, 
        willSendToBackend: sportFilter ? `sport=${sportFilter}` : 'NO SPORT FILTER',
        limit, 
        currentSkip 
      });

      // Build URL with query params manually
      let apiURL = `${BACKEND_URL}/api/odds/all-cached?limit=${limit}&skip=${currentSkip}`;
      
      // Add sport filter if specified
      if (sportFilter) {
        apiURL += `&sport=${sportFilter}`;
        console.log('✅ Fetching with sport filter:', sportFilter);
      } else {
        console.log('⚠️  Fetching ALL sports');
      }

      console.log('📡 API URL:', apiURL);
      const response = await axios.get(apiURL);
      
      console.log('📥 API Response received:', {
        matchesCount: response.data?.matches?.length || 0,
        firstMatchSportKey: response.data?.matches?.[0]?.sport_key || 'NONE',
        firstMatchTeams: response.data?.matches?.[0] ? `${response.data.matches[0].home_team} vs ${response.data.matches[0].away_team}` : 'NO MATCHES'
      });
      
      console.log('🔎 First 3 matches sport_keys:', response.data?.matches?.slice(0,3).map(m => m.sport_key) || []);
      
      const responseData = response.data || {};
      const newMatches = responseData.matches || [];
      
      // Merge with existing if loading more
      if (loadMore) {
        setAllOdds(prev => [...prev, ...newMatches]);
        console.log('➕ Appended matches, new total:', allOdds.length + newMatches.length);
      } else {
        setAllOdds(newMatches);
        console.log('🔄 Replaced all matches, new total:', newMatches.length);
      }
      
      // Check if there are more matches (if we got full limit, there might be more)
      setHasMore(newMatches.length >= limit);
      setLastUpdated(new Date());
      
      console.log(`✅ SUCCESS: Loaded ${newMatches.length} matches for filter="${currentFilter}"`);
    } catch (error) {
      console.error('❌ ERROR fetching odds:', error);
    } finally {
      console.log('🏁 FINALLY BLOCK: Setting loading=false');
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  // Removed logo fetching for speed - using sport icons instead

  // Fetch AI predictions to know which matches have predictions available
  const fetchAIPredictions = useCallback(async () => {
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await axios.get(`${BACKEND_URL}/api/ai/predictions`, {
        params: { limit: 50 } // Fetch more predictions to cover all visible matches
      });
      setAiPredictions(response.data || []);
    } catch (error) {
      console.error('Error fetching AI predictions:', error);
      setAiPredictions([]);
    }
  }, []);

  // Check if a match has an AI prediction
  const hasAIPrediction = (matchId) => {
    return aiPredictions.some(pred => pred.match_id === matchId);
  };

  // Load data on mount and when filters change
  // Load data when filter changes
  useEffect(() => {
    console.log('🔥 FILTER CHANGED useEffect triggered, filter=', filter);
    fetchAllOdds(false, filter);
  }, [filter]);

  // Load data when manually refreshed
  useEffect(() => {
    if (refreshKey > 0) { // Skip initial render
      fetchAllOdds(false, filter);
    }
  }, [refreshKey]);

  // Auto-refresh for live scores and odds
  useEffect(() => {
    if (filter === 'all') {
      const refreshInterval = 300000; // 5 minutes
      
      const intervalId = setInterval(() => {
        console.log(`Auto-refreshing ${timeFilter} odds and scores...`);
        setRefreshKey(prev => prev + 1);
      }, refreshInterval);

      return () => clearInterval(intervalId);
    }
  }, [filter, timeFilter]);

  // Scroll to specific match if hash is present in URL
  useEffect(() => {
    if (window.location.hash && allOdds.length > 0) {
      const matchId = window.location.hash.replace('#match-', '');
      setTimeout(() => {
        const element = document.getElementById(`match-${matchId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the match briefly
          element.style.border = '2px solid #FFD700';
          setTimeout(() => {
            element.style.border = '';
          }, 3000);
        }
      }, 500);
    }
  }, [allOdds]);

  // Sport keys configuration - FOOTBALL & CRICKET ONLY
  const sportKeysMap = {
    football: [
      'soccer_epl', 'soccer_spain_la_liga', 'soccer_germany_bundesliga',
      'soccer_italy_serie_a', 'soccer_france_ligue_one', 'soccer_brazil_campeonato',
      'soccer_uefa_champs_league', 'soccer_uefa_europa_league', 'soccer_argentina_primera_division',
      'soccer_usa_mls', 'soccer_mexico_ligamx'
    ],
    cricket: [
      'cricket_ipl', 'cricket_icc_world_cup', 'cricket_international_t20',
      'cricket_test_match', 'cricket_odi', 'cricket_big_bash', 'cricket_psl',
      'cricket_caribbean_premier_league'
    ]
  };

  const getBestOdds = (bookmakers, outcomeIndex, homeTeam, awayTeam) => {
    if (!bookmakers || bookmakers.length === 0) return null;
    
    let bestOdds = 0;
    let bestBookmaker = null;
    
    bookmakers.forEach(bookmaker => {
      if (bookmaker.markets && bookmaker.markets[0] && bookmaker.markets[0].outcomes) {
        const outcomes = bookmaker.markets[0].outcomes;
        
        // Try to find outcome by matching team name
        let outcome = null;
        if (outcomeIndex === 0) {
          // Home team - match by name (case-insensitive, trim whitespace)
          outcome = outcomes.find(o => 
            o.name && homeTeam && 
            o.name.trim().toLowerCase() === homeTeam.trim().toLowerCase()
          );
          if (!outcome) outcome = outcomes[0]; // Fallback to first
        } else if (outcomeIndex === 1) {
          // Away team - match by name (case-insensitive, trim whitespace)
          outcome = outcomes.find(o => 
            o.name && awayTeam && 
            o.name.trim().toLowerCase() === awayTeam.trim().toLowerCase()
          );
          if (!outcome) outcome = outcomes[outcomes.length - 1]; // Fallback to last
        } else if (outcomeIndex === 2) {
          // Draw/Tie - match by keyword
          outcome = outcomes.find(o => 
            o.name && (
              o.name.toLowerCase().includes('draw') || 
              o.name.toLowerCase().includes('tie')
            )
          );
          if (!outcome && outcomes.length > 2) outcome = outcomes[1]; // Fallback to middle
        }
        
        if (outcome && outcome.price > bestOdds) {
          bestOdds = outcome.price;
          bestBookmaker = bookmaker.key;
        }
      }
    });
    
    // Return null if no odds found
    if (bestOdds === 0) return null;
    
    return { odds: bestOdds, bookmaker: bestBookmaker };
  };

  const getCountdown = (commenceTime) => {
    const now = new Date();
    const matchDate = new Date(commenceTime);
    const diff = matchDate - now;
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `in ${days}d ${hours}h`;
    } else if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    } else {
      return `in ${minutes}m`;
    }
  };

  const formatMatchDateTime = (commenceTime) => {
    const matchDate = new Date(commenceTime);
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-8 h-8 text-[#FFD700]" />
            <h1 className="text-3xl sm:text-4xl font-bold">
              {timeFilter === 'inplay' ? (
                <>LIVE <span className="text-[#FFD700]">Matches</span></>
              ) : timeFilter === 'recent-results' ? (
                <>Recent <span className="text-[#FFD700]">Results</span></>
              ) : (
                <>Upcoming <span className="text-[#FFD700]">Matches</span></>
              )}
            </h1>
          </div>
          <p className="text-gray-400 text-lg mb-6">
            {timeFilter === 'inplay'
              ? 'Real-time in-play betting odds for matches currently in progress. Odds and scores update every minute.'
              : timeFilter === 'recent-results' 
              ? 'Compare final odds with actual results from matches completed in the last 48 hours (2 days). Analyze bookmaker accuracy and past predictions.'
              : 'Compare real-time odds from top bookmakers around the world for upcoming matches in the next 14 days. Auto-refreshes every 5 minutes.'}
          </p>
          
          {/* Time Period Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setTimeFilter('inplay')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                timeFilter === 'inplay'
                  ? 'bg-[#FFD700] text-[#2E004F]'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-[#2E004F]/30'
              }`}
            >
              🔴 LIVE Now
            </button>
            <button
              onClick={() => setTimeFilter('live-upcoming')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                timeFilter === 'live-upcoming'
                  ? 'bg-[#FFD700] text-[#2E004F]'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-[#2E004F]/30'
              }`}
            >
              📅 Upcoming
            </button>
            <button
              onClick={() => setTimeFilter('recent-results')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                timeFilter === 'recent-results'
                  ? 'bg-[#FFD700] text-[#2E004F]'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-[#2E004F]/30'
              }`}
            >
              ✅ Recent Results (48h)
            </button>
          </div>
          
          {/* Sport Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="flex flex-wrap gap-2">
              {sports.map((sport) => (
                <button
                  key={sport}
                  onClick={() => {
                    navigate(`/live-odds?filter=${sport}`);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all capitalize flex items-center gap-2 ${
                    filter === sport
                      ? 'bg-[#FFD700] text-[#2E004F]'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-[#2E004F]/30'
                  }`}
                >
                  <span>{sportEmojis[sport]}</span>
                  <span>{sport}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button
              onClick={handleRefresh}
              disabled={loading}
              className="bg-[#FFD700] text-[#2E004F] hover:bg-[#FFD700]/90"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Odds
            </Button>
            {lastUpdated && filter === 'all' && (
              <span className="text-sm text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* All Sports Combined View */}
        {filter === 'all' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-[#FFD700] animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading odds...</p>
              </div>
            ) : allOdds.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">
                  {timeFilter === 'recent-results' 
                    ? 'No completed matches with results in the last 48 hours. Historical odds are being collected - check back after matches finish!' 
                    : 'No odds available at the moment.'}
                </p>
              </div>
            ) : (
              <>
                {(() => {
                  // NO CLIENT-SIDE FILTERING - backend already filtered
                  const filteredMatches = allOdds.filter(match => {
                    // Only filter: must have bookmakers
                    return match.bookmakers && match.bookmakers.length > 0;
                  });
                  
                  // Show skeleton loaders while loading
                  if (loading) {
                    return <MatchCardSkeletonList count={5} />;
                  }
                  
                  // If no matches after filtering, show message
                  if (filteredMatches.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <p className="text-gray-400">
                          {timeFilter === 'inplay'
                            ? '⏱️ No live matches in progress at the moment. Check back when matches start!'
                            : timeFilter === 'recent-results' 
                            ? '⏳ No completed matches yet. The system is collecting odds from upcoming matches. Completed matches will appear here 0.5-48 hours after they finish!' 
                            : '📅 No upcoming matches available at the moment.'}
                        </p>
                      </div>
                    );
                  }
                  
                  return filteredMatches.map((match) => {
                const homeTeam = match.home_team;
                const awayTeam = match.away_team;
                const league = match.sport_title;
                const commenceTime = new Date(match.commence_time);
                // Get ALL bookmakers for this match (including FunBet)
                const bookmakers = match.bookmakers || [];
                
                // Get bookmakers EXCLUDING FunBet for best odds calculation
                // (FunBet is always 5% higher, so we exclude it from best odds calc)
                const nonFunbetBookmakers = bookmakers.filter(b => b.key !== 'funbet');

                // Get best odds from non-FunBet bookmakers
                const homeBest = getBestOdds(nonFunbetBookmakers, 0, match.home_team, match.away_team);
                const awayBest = getBestOdds(nonFunbetBookmakers, 1, match.home_team, match.away_team);
                
                // Check if this sport allows draws (all except baseball)
                const sportAllowsDraws = !league?.toLowerCase().includes('baseball') && 
                                        !league?.toLowerCase().includes('mlb');
                
                // FunBet.ME should show 3 outcomes for all sports except baseball
                const showThreeOutcomes = sportAllowsDraws;
                
                // Try to get draw odds from non-FunBet bookmakers
                // Some bookmakers might have 3 outcomes while others have 2
                let drawBest = null;
                if (showThreeOutcomes) {
                  drawBest = getBestOdds(nonFunbetBookmakers, 2, match.home_team, match.away_team);
                  
                  // If no bookmaker provides draw odds, calculate an implied draw odd
                  // Using the formula: implied draw odd based on home/away odds
                  if (!drawBest && homeBest && awayBest) {
                    // Calculate implied probabilities
                    const homeProb = 1 / homeBest.odds;
                    const awayProb = 1 / awayBest.odds;
                    const drawProb = Math.max(0.1, 1 - homeProb - awayProb); // Ensure at least 10% probability
                    const impliedDrawOdds = 1 / drawProb;
                    drawBest = { odds: impliedDrawOdds, bookmaker: 'calculated' };
                  }
                }

                // Calculate FunBet.ME odds (5% better than market best)
                const funbetHomeOdds = homeBest ? (homeBest.odds * 1.05).toFixed(2) : null;
                const funbetAwayOdds = awayBest ? (awayBest.odds * 1.05).toFixed(2) : null;
                const funbetDrawOdds = showThreeOutcomes && drawBest ? (drawBest.odds * 1.05).toFixed(2) : null;

                // Remove duplicate bookmakers by TITLE (not key)
                // Keep the one with best total odds for each title
                const bookmakersByTitle = {};
                bookmakers.forEach(bookmaker => {
                  const title = bookmaker.title;
                  const totalOdds = (bookmaker.markets?.[0]?.outcomes || []).reduce((sum, o) => sum + (o.price || 0), 0);
                  
                  if (!bookmakersByTitle[title] || totalOdds > bookmakersByTitle[title].totalOdds) {
                    bookmakersByTitle[title] = {
                      ...bookmaker,
                      totalOdds
                    };
                  }
                });
                
                const uniqueBookmakers = Object.values(bookmakersByTitle);
                
                const matchId = match.id || `${homeTeam}_${awayTeam}_${match.commence_time}`;
                const currentSort = oddsSortBy[matchId];

                // SORTING LOGIC: User can sort by Home, Draw, or Away odds
                const sortedBookmakers = [...uniqueBookmakers].sort((a, b) => {
                  const aOutcomes = a.markets?.[0]?.outcomes || [];
                  const bOutcomes = b.markets?.[0]?.outcomes || [];
                  
                  if (currentSort) {
                    // User-selected sorting by specific outcome
                    let aOdds = 0;
                    let bOdds = 0;
                    
                    if (currentSort === 'home') {
                      // Sort by home team odds (highest first)
                      aOdds = aOutcomes.find(o => o.name === homeTeam)?.price || 0;
                      bOdds = bOutcomes.find(o => o.name === homeTeam)?.price || 0;
                    } else if (currentSort === 'draw') {
                      // Sort by draw odds (highest first)
                      aOdds = aOutcomes.find(o => o.name === 'Draw')?.price || 0;
                      bOdds = bOutcomes.find(o => o.name === 'Draw')?.price || 0;
                    } else if (currentSort === 'away') {
                      // Sort by away team odds (highest first)
                      aOdds = aOutcomes.find(o => o.name === awayTeam)?.price || 0;
                      bOdds = bOutcomes.find(o => o.name === awayTeam)?.price || 0;
                    }
                    
                    return bOdds - aOdds; // Highest to lowest
                  } else {
                    // Default: Sort by best odds for the FAVORITE (lowest odds = favorite)
                    const getLowestOdds = (bookmaker) => {
                      const outcomes = bookmaker.markets?.[0]?.outcomes || [];
                      if (outcomes.length === 0) return 0;
                      const allOdds = outcomes.map(o => o.price || 999);
                      return Math.min(...allOdds);
                    };
                    
                    const aLowestOdds = getLowestOdds(a);
                    const bLowestOdds = getLowestOdds(b);
                    
                    return bLowestOdds - aLowestOdds;
                  }
                });

                // Get top 4 bookmakers to display by default
                const isExpanded = expandedMatches[matchId];
                const displayedBookmakers = isExpanded ? sortedBookmakers : sortedBookmakers.slice(0, 4);
                
                // Get best odds from displayed bookmakers EXCLUDING FunBet for highlighting
                // FunBet is always 5% higher, so we highlight the best market odds among real bookmakers
                const nonFunbetBookmakers = displayedBookmakers.filter(b => b.key !== 'funbet');
                const homeDisplayBest = getBestOdds(nonFunbetBookmakers, 0, homeTeam, awayTeam);
                const awayDisplayBest = getBestOdds(nonFunbetBookmakers, 1, homeTeam, awayTeam);
                const drawDisplayBest = showThreeOutcomes
                  ? getBestOdds(nonFunbetBookmakers, 2, homeTeam, awayTeam) 
                  : null;

                return (
                  <div
                    id={`match-${match.id}`}
                    key={match.id || `${homeTeam}_${awayTeam}_${match.commence_time}`}
                    className="bg-purple-900/20 border border-[#2E004F]/30 rounded-lg p-6 transition-all duration-300"
                  >
                    {/* Match Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                      <div className="flex-1">
                        {/* First line: AI Icon (PROMINENT), Sport title, LIVE indicator, Score */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {/* FunBet IQ - PROMINENT HEADER POSITION */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/prediction/${matchId}`);
                            }}
                            className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded sm:rounded-lg transition-all duration-200 shadow-sm sm:shadow-lg shadow-purple-500/30 group"
                            title="View FunBet IQ Smart Pick"
                          >
                            <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-[#FFD700] group-hover:scale-110 transition-transform" />
                            <span className="text-white text-[10px] sm:text-xs font-bold">IQ</span>
                          </button>
                          <span className="text-[#FFD700] text-sm font-medium bg-[#2E004F]/50 px-3 py-1 rounded">
                            {league}
                          </span>
                          <CountdownTimer commenceTime={match.commence_time} completed={match.completed} />
                          {new Date(match.commence_time) < new Date() && (() => {
                            const now = new Date();
                            const commenceTime = new Date(match.commence_time);
                            const matchScore = findScoreForMatch(match, scores);
                            const hoursSinceStart = (now - commenceTime) / (1000 * 60 * 60);
                            
                            // Calculate elapsed time in minutes
                            const elapsedMs = now - commenceTime;
                            const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
                            
                            // Determine if match is completed
                            const isCompleted = match.completed || hoursSinceStart > 2;
                            
                            // Show status for matches within last 35 hours (for recent results view)
                            if (hoursSinceStart < 35) {
                              let homeScore = null;
                              let awayScore = null;
                              let matchStatus = '';
                              let hasRealScores = false;
                              
                              // First, try to get scores from match object itself (from historical data)
                              if (match.scores && Array.isArray(match.scores) && match.scores.length > 0) {
                                match.scores.forEach(scoreData => {
                                  if (scoreData.name === match.home_team) {
                                    homeScore = scoreData.score;
                                    hasRealScores = true;
                                  } else if (scoreData.name === match.away_team) {
                                    awayScore = scoreData.score;
                                    hasRealScores = true;
                                  }
                                });
                              }
                              // If no scores on match, try matchScore from findScoreForMatch
                              else if (matchScore?.scores && matchScore.scores.length > 0) {
                                matchScore.scores.forEach(scoreData => {
                                  if (scoreData.name === match.home_team) {
                                    homeScore = scoreData.score;
                                    hasRealScores = true;
                                  } else if (scoreData.name === match.away_team) {
                                    awayScore = scoreData.score;
                                    hasRealScores = true;
                                  }
                                });
                                matchStatus = matchScore.match_status || '';
                              }
                              
                              // ALWAYS calculate and show elapsed time for live matches (not completed)
                              if (!isCompleted && hoursSinceStart > 0 && hoursSinceStart < 3) {
                                // Format elapsed time based on typical match phases
                                if (elapsedMinutes <= 45) {
                                  matchStatus = `${elapsedMinutes}'`; // First half (0-45 min)
                                } else if (elapsedMinutes <= 60) {
                                  matchStatus = 'HT'; // Half time break (45-60 min)
                                } else if (elapsedMinutes <= 90) {
                                  matchStatus = `${elapsedMinutes - 15}'`; // Second half (46-90 min, accounting for 15 min HT)
                                } else if (elapsedMinutes <= 105) {
                                  matchStatus = `90+${elapsedMinutes - 90}'`; // Injury time (90+ min)
                                } else if (elapsedMinutes <= 120) {
                                  matchStatus = `${elapsedMinutes - 30}'`; // Extra time (91-120 min total)
                                } else {
                                  matchStatus = `120+'`; // Penalties or late extra time
                                }
                              }
                              
                              return (
                                <>
                                  {/* Only show scores if we have real score data */}
                                  {hasRealScores && homeScore !== null && awayScore !== null ? (
                                    <span className="text-white text-sm font-bold bg-blue-600/20 px-3 py-1 rounded border border-blue-500/30">
                                      {homeScore} - {awayScore}
                                    </span>
                                  ) : null}
                                  {matchStatus && (
                                    <span className="text-yellow-400 text-xs font-medium bg-yellow-400/10 px-2 py-1 rounded border border-yellow-400/30">
                                      {matchStatus}
                                    </span>
                                  )}
                                </>
                              );
                            }
                            
                            // Don't show anything for matches older than 35 hours
                            return null;
                          })()}
                        </div>
                        
                        {/* Team names with logos */}
                        <div className="flex items-center gap-3 mt-3">
                          <TeamLogo 
                            logoUrl={teamLogos[homeTeam]} 
                            teamName={homeTeam}
                            sport={match.sport_key}
                            size="md"
                          />
                          <h3 className="text-xl font-bold text-white">
                            {homeTeam}
                          </h3>
                          <span className="text-gray-500 text-lg mx-2">vs</span>
                          <h3 className="text-xl font-bold text-white">
                            {awayTeam}
                          </h3>
                          <TeamLogo 
                            logoUrl={teamLogos[awayTeam]} 
                            teamName={awayTeam}
                            sport={match.sport_key}
                            size="md"
                          />
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <FollowTeamButton 
                          homeTeam={homeTeam}
                          awayTeam={awayTeam}
                          isFollowing={isFollowing}
                          onToggle={toggleFollowTeam}
                        />
                        <ShareButton 
                          matchTitle={`${homeTeam} vs ${awayTeam}`}
                          url={window.location.href}
                        />
                        <span className="text-sm text-gray-400 ml-2">
                          {sortedBookmakers.length} bookmakers
                        </span>
                      </div>
                    </div>

                    {/* Odds Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#2E004F]/30">
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">Bookmaker</th>
                            <th className="text-center py-3 px-4 text-gray-400 font-medium">
                              <button
                                onClick={() => {
                                  setOddsSortBy(prev => ({
                                    ...prev,
                                    [matchId]: prev[matchId] === 'home' ? null : 'home'
                                  }));
                                }}
                                className="flex items-center justify-center gap-1 mx-auto hover:text-[#FFD700] transition-colors"
                                title="Sort by Home odds (highest to lowest)"
                              >
                                <span>{homeTeam}</span>
                                {oddsSortBy[matchId] === 'home' ? (
                                  <ChevronDown className="w-4 h-4 text-[#FFD700]" />
                                ) : (
                                  <ChevronUp className="w-4 h-4 opacity-30" />
                                )}
                              </button>
                            </th>
                            {showThreeOutcomes && (
                              <th className="text-center py-3 px-4 text-gray-400 font-medium">
                                <button
                                  onClick={() => {
                                    setOddsSortBy(prev => ({
                                      ...prev,
                                      [matchId]: prev[matchId] === 'draw' ? null : 'draw'
                                    }));
                                  }}
                                  className="flex items-center justify-center gap-1 mx-auto hover:text-[#FFD700] transition-colors"
                                  title="Sort by Draw odds (highest to lowest)"
                                >
                                  <span>
                                    {league?.toLowerCase().includes('soccer') || 
                                     league?.toLowerCase().includes('football') || 
                                     league?.toLowerCase().includes('serie') ||
                                     league?.toLowerCase().includes('la liga') ||
                                     league?.toLowerCase().includes('bundesliga') ||
                                     league?.toLowerCase().includes('ligue') ||
                                     league?.toLowerCase().includes('epl') ||
                                     league?.toLowerCase().includes('premier') ||
                                     league?.toLowerCase().includes('championship') && !league?.toLowerCase().includes('world') ? 'Draw' : 'Tie/Draw'}
                                  </span>
                                  {oddsSortBy[matchId] === 'draw' ? (
                                    <ChevronDown className="w-4 h-4 text-[#FFD700]" />
                                  ) : (
                                    <ChevronUp className="w-4 h-4 opacity-30" />
                                  )}
                                </button>
                              </th>
                            )}
                            <th className="text-center py-3 px-4 text-gray-400 font-medium">
                              <button
                                onClick={() => {
                                  setOddsSortBy(prev => ({
                                    ...prev,
                                    [matchId]: prev[matchId] === 'away' ? null : 'away'
                                  }));
                                }}
                                className="flex items-center justify-center gap-1 mx-auto hover:text-[#FFD700] transition-colors"
                                title="Sort by Away odds (highest to lowest)"
                              >
                                <span>{awayTeam}</span>
                                {oddsSortBy[matchId] === 'away' ? (
                                  <ChevronDown className="w-4 h-4 text-[#FFD700]" />
                                ) : (
                                  <ChevronUp className="w-4 h-4 opacity-30" />
                                )}
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* FunBet.ME row is now provided by the backend API and rendered via OddsTable component */}
                          
                          {/* FunBet.ME Boost & Standard rows - HIDDEN FOR PUBLIC (shown only in admin) */}
                          {false && (() => {
                            // Smart team name matching function
                            const teamsMatch = (team1, team2) => {
                              if (!team1 || !team2) return false;
                              const t1 = team1.toLowerCase().trim();
                              const t2 = team2.toLowerCase().trim();
                              
                              // Exact match
                              if (t1 === t2) return true;
                              
                              // Handle common abbreviations
                              const normalize = (name) => name
                                .replace(/\bunited\b/g, 'utd')
                                .replace(/\butd\b/g, 'united')
                                .replace(/\bfc\b/g, '')
                                .replace(/\bafc\b/g, '')
                                .replace(/\bcf\b/g, '')
                                .replace(/\s+/g, ' ')
                                .trim();
                              
                              const n1 = normalize(t1);
                              const n2 = normalize(t2);
                              
                              return n1 === n2 || 
                                     n1.includes(n2) || 
                                     n2.includes(n1) ||
                                     normalize(t1).replace(/\s/g, '') === normalize(t2).replace(/\s/g, '');
                            };
                            
                            // Calculate average odds from all bookmakers
                            let digitainHomeOdds = null;
                            let digitainAwayOdds = null;
                            let digitainDrawOdds = null;
                            
                            {
                              const homeOddsArray = [];
                              const awayOddsArray = [];
                              const drawOddsArray = [];
                              
                              match.bookmakers?.forEach(bookmaker => {
                                const outcomes = bookmaker.markets?.[0]?.outcomes || [];
                                
                                outcomes.forEach(outcome => {
                                  if (!outcome.name || !outcome.price) return;
                                  
                                  if (teamsMatch(outcome.name, homeTeam)) {
                                    homeOddsArray.push(outcome.price);
                                  } else if (teamsMatch(outcome.name, awayTeam)) {
                                    awayOddsArray.push(outcome.price);
                                  } else if (outcome.name.toLowerCase().includes('draw') || outcome.name.toLowerCase().includes('tie')) {
                                    drawOddsArray.push(outcome.price);
                                  }
                                });
                              });
                              
                              // Calculate averages
                              if (homeOddsArray.length > 0) {
                                const avg = homeOddsArray.reduce((a, b) => a + b, 0) / homeOddsArray.length;
                                digitainHomeOdds = avg.toFixed(2);
                              }
                              if (awayOddsArray.length > 0) {
                                const avg = awayOddsArray.reduce((a, b) => a + b, 0) / awayOddsArray.length;
                                digitainAwayOdds = avg.toFixed(2);
                              }
                              if (drawOddsArray.length > 0) {
                                const avg = drawOddsArray.reduce((a, b) => a + b, 0) / drawOddsArray.length;
                                digitainDrawOdds = avg.toFixed(2);
                              }
                            }
                            
                            // Calculate Boost odds (5% on Favourites & Underdog, Draw as-is)
                            let boostHomeOdds = null;
                            let boostAwayOdds = null;
                            let boostDrawOdds = null;
                            
                            if (digitainHomeOdds && digitainAwayOdds) {
                              const homeVal = parseFloat(digitainHomeOdds);
                              const awayVal = parseFloat(digitainAwayOdds);
                              const drawVal = digitainDrawOdds ? parseFloat(digitainDrawOdds) : null;
                              
                              // Identify favourite (lower odds) and underdog (higher odds)
                              const isFavouriteHome = homeVal < awayVal;
                              const isFavouriteAway = awayVal < homeVal;
                              
                              // Apply 5% boost to favourite and underdog
                              boostHomeOdds = (homeVal * 1.05).toFixed(2);
                              boostAwayOdds = (awayVal * 1.05).toFixed(2);
                              boostDrawOdds = digitainDrawOdds; // Copy draw as-is
                            }
                            
                            return (
                              <>
                                {/* FunBet.ME Boost Row */}
                                <tr className="border-b border-[#FFD700]/40 bg-gradient-to-r from-[#FFD700]/15 to-[#FFD700]/8">
                                  <td className="py-3 px-4">
                                    <a 
                                      href="https://funbet.me" 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                    >
                                      <span className="text-[#FFD700] text-lg">🚀</span>
                                      <span className="text-[#FFD700] font-semibold text-base">FunBet.ME Boost</span>
                                    </a>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <a 
                                      href="https://funbet.me" 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-block"
                                    >
                                      <span className="bg-[#FFD700]/30 text-[#FFD700] px-4 py-1.5 rounded-lg font-bold text-lg hover:bg-[#FFD700]/40 transition-all border border-[#FFD700]/40">
                                        {boostHomeOdds || '-'}
                                      </span>
                                    </a>
                                  </td>
                                  {showThreeOutcomes && (
                                    <td className="py-3 px-4 text-center">
                                      <a 
                                        href="https://funbet.me" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-block"
                                      >
                                        <span className="bg-[#FFD700]/30 text-[#FFD700] px-4 py-1.5 rounded-lg font-bold text-lg hover:bg-[#FFD700]/40 transition-all border border-[#FFD700]/40">
                                          {boostDrawOdds || '-'}
                                        </span>
                                      </a>
                                    </td>
                                  )}
                                  <td className="py-3 px-4 text-center">
                                    <a 
                                      href="https://funbet.me" 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-block"
                                    >
                                      <span className="bg-[#FFD700]/30 text-[#FFD700] px-4 py-1.5 rounded-lg font-bold text-lg hover:bg-[#FFD700]/40 transition-all border border-[#FFD700]/40">
                                        {boostAwayOdds || '-'}
                                      </span>
                                    </a>
                                  </td>
                                </tr>

                                {/* FunBet.ME Standard Row */}
                                <tr className="border-b-2 border-[#FFD700]/30 bg-gradient-to-r from-[#FFD700]/10 to-[#FFD700]/5">
                                  <td className="py-3 px-4">
                                    <a 
                                      href="https://funbet.me" 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                    >
                                      <span className="text-[#FFD700] text-lg">📊</span>
                                      <span className="text-[#FFD700] font-semibold text-base">FunBet.ME Standard</span>
                                      {usingDigitain && (
                                        <span className="text-green-500 text-base ml-1">✓</span>
                                      )}
                                    </a>
                                  </td>
                                <td className="py-3 px-4 text-center">
                                  <a 
                                    href="https://funbet.me" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                  >
                                    <span className="bg-[#FFD700]/20 text-[#FFD700] px-4 py-1.5 rounded-lg font-bold text-lg hover:bg-[#FFD700]/30 transition-all border border-[#FFD700]/30">
                                      {digitainHomeOdds || '-'}
                                    </span>
                                  </a>
                                </td>
                                {showThreeOutcomes && (
                                  <td className="py-3 px-4 text-center">
                                    <a 
                                      href="https://funbet.me" 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-block"
                                    >
                                      <span className="bg-[#FFD700]/20 text-[#FFD700] px-4 py-1.5 rounded-lg font-bold text-lg hover:bg-[#FFD700]/30 transition-all border border-[#FFD700]/30">
                                        {digitainDrawOdds || '-'}
                                      </span>
                                    </a>
                                  </td>
                                )}
                                <td className="py-3 px-4 text-center">
                                  <a 
                                    href="https://funbet.me" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                  >
                                    <span className="bg-[#FFD700]/20 text-[#FFD700] px-4 py-1.5 rounded-lg font-bold text-lg hover:bg-[#FFD700]/30 transition-all border border-[#FFD700]/30">
                                      {digitainAwayOdds || '-'}
                                    </span>
                                  </a>
                                </td>
                                </tr>
                              </>
                            );
                          })()}
                          
                          {/* FunBet.ME row (from backend API) - Render first with special styling */}
                          {(() => {
                            const funbetBookmaker = displayedBookmakers.find(b => b.key === 'funbet');
                            if (!funbetBookmaker) return null;
                            
                            const outcomes = funbetBookmaker.markets?.[0]?.outcomes || [];
                            const homeOutcome = outcomes.find(o => 
                              o.name && homeTeam && 
                              o.name.trim().toLowerCase() === homeTeam.trim().toLowerCase()
                            );
                            const awayOutcome = outcomes.find(o => 
                              o.name && awayTeam && 
                              o.name.trim().toLowerCase() === awayTeam.trim().toLowerCase()
                            );
                            const drawOutcome = outcomes.find(o => 
                              o.name && (
                                o.name.toLowerCase().includes('draw') || 
                                o.name.toLowerCase().includes('tie')
                              )
                            );
                            
                            return (
                              <tr className="border-b-2 border-[#FFD700] bg-gradient-to-r from-[#FFD700]/20 to-[#FFD700]/10">
                                <td className="py-4 px-4">
                                  <a 
                                    href="https://funbet.me" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                  >
                                    <span className="text-[#FFD700] text-2xl">⭐</span>
                                    <span className="text-[#FFD700] font-bold text-lg">{funbetBookmaker.title}</span>
                                  </a>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <a 
                                    href="https://funbet.me" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                  >
                                    <span className="bg-[#FFD700] text-[#2E004F] px-5 py-2 rounded-lg font-black text-2xl hover:bg-[#FFD700]/90 transition-all hover:scale-105 shadow-lg">
                                      {homeOutcome ? homeOutcome.price.toFixed(2) : '-'}
                                    </span>
                                  </a>
                                </td>
                                {showThreeOutcomes && (
                                  <td className="py-4 px-4 text-center">
                                    <a 
                                      href="https://funbet.me" 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-block"
                                    >
                                      <span className="bg-[#FFD700] text-[#2E004F] px-5 py-2 rounded-lg font-black text-2xl hover:bg-[#FFD700]/90 transition-all hover:scale-105 shadow-lg">
                                        {drawOutcome ? drawOutcome.price.toFixed(2) : '-'}
                                      </span>
                                    </a>
                                  </td>
                                )}
                                <td className="py-4 px-4 text-center">
                                  <a 
                                    href="https://funbet.me" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                  >
                                    <span className="bg-[#FFD700] text-[#2E004F] px-5 py-2 rounded-lg font-black text-2xl hover:bg-[#FFD700]/90 transition-all hover:scale-105 shadow-lg">
                                      {awayOutcome ? awayOutcome.price.toFixed(2) : '-'}
                                    </span>
                                  </a>
                                </td>
                              </tr>
                            );
                          })()}
                          
                          {/* Other bookmakers (excluding FunBet) */}
                          {displayedBookmakers.filter(b => b.key !== 'funbet').map((bookmaker) => {
                            const outcomes = bookmaker.markets?.[0]?.outcomes || [];
                            
                            // Match outcomes by team name, not array index
                            const homeOutcome = outcomes.find(o => 
                              o.name && homeTeam && 
                              o.name.trim().toLowerCase() === homeTeam.trim().toLowerCase()
                            );
                            const awayOutcome = outcomes.find(o => 
                              o.name && awayTeam && 
                              o.name.trim().toLowerCase() === awayTeam.trim().toLowerCase()
                            );
                            const drawOutcome = outcomes.find(o => 
                              o.name && (
                                o.name.toLowerCase().includes('draw') || 
                                o.name.toLowerCase().includes('tie')
                              )
                            );
                            
                            const homeOdds = homeOutcome?.price;
                            const awayOdds = awayOutcome?.price;
                            const drawOdds = drawOutcome?.price;

                            // Check if odds match the best odds among DISPLAYED bookmakers
                            const isHomeBest = homeOdds && homeDisplayBest?.odds && homeOdds === homeDisplayBest.odds;
                            const isAwayBest = awayOdds && awayDisplayBest?.odds && awayOdds === awayDisplayBest.odds;
                            const isDrawBest = drawOdds && drawDisplayBest?.odds && drawOdds === drawDisplayBest.odds;

                            return (
                              <tr key={bookmaker.key} className="border-b border-[#2E004F]/10 opacity-75">
                                <td className="py-2 px-4 text-gray-400 text-sm">{bookmaker.title}</td>
                                <td className="py-2 px-4 text-center">
                                  <span className={`text-sm ${
                                    isHomeBest ? 'bg-amber-400/80 text-[#2E004F] px-3 py-1 rounded font-bold shadow-sm' : 'text-gray-300 font-normal'
                                  }`}>
                                    {homeOdds ? homeOdds.toFixed(2) : '-'}
                                  </span>
                                </td>
                                {showThreeOutcomes && (
                                  <td className="py-2 px-4 text-center">
                                    <span className={`text-sm ${
                                      isDrawBest ? 'bg-amber-400/80 text-[#2E004F] px-3 py-1 rounded font-bold shadow-sm' : 'text-gray-300 font-normal'
                                    }`}>
                                      {drawOdds ? drawOdds.toFixed(2) : '-'}
                                    </span>
                                  </td>
                                )}
                                <td className="py-2 px-4 text-center">
                                  <span className={`text-sm ${
                                    isAwayBest ? 'bg-amber-400/80 text-[#2E004F] px-3 py-1 rounded font-bold shadow-sm' : 'text-gray-300 font-normal'
                                  }`}>
                                    {awayOdds ? awayOdds.toFixed(2) : '-'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* No bookmakers message */}
                    {sortedBookmakers.length === 0 && (
                      <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                        <p className="text-orange-600 dark:text-orange-400 text-sm font-semibold">
                          {(() => {
                            const matchScore = findScoreForMatch(match, scores);
                            const hasLiveScore = matchScore && matchScore.scores && matchScore.scores.length > 0;
                            return hasLiveScore 
                              ? "⏱️ Betting closed - Match is currently live"
                              : "📊 Odds not yet available for this match";
                          })()}
                        </p>
                      </div>
                    )}

                    {/* Show More / Show Less Button */}
                    {sortedBookmakers.length > 4 && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => toggleMatchExpansion(matchId)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 text-[#FFD700] rounded-lg transition-colors text-sm font-medium"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Show {sortedBookmakers.length - 4} More Bookmakers
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
                  })
                })()}

              {/* Load More Button */}
              {hasMore && (
                    <div className="mt-8 text-center">
                      <button
                        onClick={() => fetchAllOdds(true)}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-semibold text-lg"
                      >
                        {loadingMore ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Loading More...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-5 h-5" />
                            Load More Matches
                          </>
                        )}
                      </button>
                    </div>
              )}
            </>
            )}
          </div>
        )}

        {/* Individual Sport View - Use OddsTable Component */}
        {filter !== 'all' && (
          <div>
            <OddsTable 
              key={`${filter}-${refreshKey}-${timeFilter}`}
              sportKeys={sportKeysMap[filter]}
              sportTitle={filter.charAt(0).toUpperCase() + filter.slice(1)}
              usePriorityEndpoint={filter === 'football' || filter === 'cricket'}
              isCricket={filter === 'cricket'}
              refreshTrigger={refreshKey}
              timeFilter={timeFilter}
              preloadedOdds={allOdds}
              loading={loading}
            />
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-12 p-6 rounded-lg bg-[#2E004F]/10 border border-[#2E004F]/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-white font-semibold mb-2">Important Notice</h3>
              <p className="text-gray-400 text-sm">
                This is an informational platform only. FunBet.AI does not offer
                betting services or accept any form of monetary transactions. All
                odds information is provided for educational and informational
                purposes. You must be 18+ to view this content. Please gamble
                responsibly. Visit{' '}
                <a
                  href="https://www.begambleaware.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FFD700] hover:underline"
                >
                  BeGambleAware.org
                </a>{' '}
                for help.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveOdds;
