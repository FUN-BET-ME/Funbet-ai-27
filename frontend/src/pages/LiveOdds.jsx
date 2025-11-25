import React, { useState, useEffect, useCallback, useMemo, useReducer, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TrendingUp, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Brain, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import OddsTable from '../components/OddsTable';
import { TeamLogo, OddsMovement, CountdownTimer, FollowTeamButton, ShareButton, MatchScore, MatchEvents } from '../components/MatchComponents';
import { MatchCardSkeletonList } from '../components/SkeletonLoaders';
import { useFavorites } from '../contexts/FavoritesContext';
import { getTeamLogo, getCricketFlag } from '../services/teamLogos';
import oddsTracker from '../services/oddsTracker';
import axios from 'axios';

// ============================================
// REDUCER FOR CENTRALIZED STATE MANAGEMENT
// ============================================
const initialState = {
  matches: [],
  loading: false,
  loadingMore: false,
  hasMore: false,
  lastUpdated: null,
  error: null,
  expandedMatches: {},
  oddsSortBy: {},
  expandedBookmakers: {},
  teamLogos: {}
};

const actionTypes = {
  FETCH_START: 'FETCH_START',
  FETCH_SUCCESS: 'FETCH_SUCCESS',
  FETCH_ERROR: 'FETCH_ERROR',
  LOAD_MORE_START: 'LOAD_MORE_START',
  LOAD_MORE_SUCCESS: 'LOAD_MORE_SUCCESS',
  TOGGLE_MATCH: 'TOGGLE_MATCH',
  SET_ODDS_SORT: 'SET_ODDS_SORT',
  TOGGLE_BOOKMAKERS: 'TOGGLE_BOOKMAKERS',
  CLEAR_MATCHES: 'CLEAR_MATCHES'
};

function matchesReducer(state, action) {
  switch (action.type) {
    case actionTypes.FETCH_START:
      return {
        ...state,
        loading: true,
        error: null
      };
    
    case actionTypes.FETCH_SUCCESS:
      return {
        ...state,
        matches: action.payload.matches,
        hasMore: action.payload.hasMore,
        lastUpdated: new Date(),
        loading: false,
        loadingMore: false,
        error: null
      };
    
    case actionTypes.FETCH_ERROR:
      return {
        ...state,
        loading: false,
        loadingMore: false,
        error: action.payload
      };
    
    case actionTypes.LOAD_MORE_START:
      return {
        ...state,
        loadingMore: true
      };
    
    case actionTypes.LOAD_MORE_SUCCESS:
      return {
        ...state,
        matches: [...state.matches, ...action.payload.matches],
        hasMore: action.payload.hasMore,
        loadingMore: false
      };
    
    case actionTypes.TOGGLE_MATCH:
      return {
        ...state,
        expandedMatches: {
          ...state.expandedMatches,
          [action.payload]: !state.expandedMatches[action.payload]
        }
      };
    
    case actionTypes.SET_ODDS_SORT:
      return {
        ...state,
        oddsSortBy: {
          ...state.oddsSortBy,
          [action.payload.matchId]: action.payload.sortBy
        }
      };
    
    case actionTypes.TOGGLE_BOOKMAKERS:
      return {
        ...state,
        expandedBookmakers: {
          ...state.expandedBookmakers,
          [action.payload]: !state.expandedBookmakers[action.payload]
        }
      };
    
    case actionTypes.CLEAR_MATCHES:
      return {
        ...state,
        matches: [],
        hasMore: false
      };
    
    default:
      return state;
  }
}

const LiveOdds = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleFollowTeam, isFollowing, isMatchFollowed} = useFavorites();
  
  // ============================================
  // CENTRALIZED STATE WITH useReducer
  // ============================================
  const [state, dispatch] = useReducer(matchesReducer, initialState);
  
  // ============================================
  // FILTERS STATE (Simple, non-interdependent)
  // ============================================
  const getFilterFromURL = () => {
    const params = new URLSearchParams(location.search);
    return params.get('filter') || 'all';
  };
  
  const getTimeFilterFromURL = () => {
    const params = new URLSearchParams(location.search);
    const timeParam = params.get('time');
    return (timeParam && ['live-upcoming', 'inplay', 'recent-results'].includes(timeParam)) 
      ? timeParam 
      : 'live-upcoming';
  };
  
  const [filter, setFilter] = useState(() => getFilterFromURL());
  const [timeFilter, setTimeFilter] = useState(() => getTimeFilterFromURL());
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // ============================================
  // REQUEST CANCELLATION
  // ============================================
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  
  // Sync filters from URL
  useEffect(() => {
    const urlFilter = getFilterFromURL();
    const urlTimeFilter = getTimeFilterFromURL();
    
    setFilter(urlFilter);
    setTimeFilter(urlTimeFilter);
    setLeagueFilter('all'); // Reset league when URL changes
  }, [location.search]);
  
  // ============================================
  // SIMPLIFIED FILTERING - Backend does the heavy lifting
  // ============================================
  const filteredOddsByLeague = useMemo(() => {
    // Backend already filtered by sport and league
    // Only apply client-side league filter if needed
    if (leagueFilter === 'all') {
      return state.matches;
    }
    
    return state.matches.filter(match => match.sport_key === leagueFilter);
  }, [state.matches, leagueFilter]);

  const sports = ['all', 'football', 'cricket', 'basketball'];
  
  // League definitions for sub-filters (ALL 24 football + 8 cricket leagues)
  const footballLeagues = {
    'all': '🏆 All Football Leagues',
    // World Cup & International
    'soccer_fifa_world_cup': '🌍 FIFA World Cup',
    'soccer_fifa_world_cup_qualifiers_europe': '🌍 World Cup Qualifiers - Europe',
    'soccer_uefa_euro_qualification': '🇪🇺 Euro 2028 Qualification',
    'soccer_uefa_nations_league': '🇪🇺 UEFA Nations League',
    'soccer_conmebol_copa_america': '🏆 Copa América',
    // UEFA Club Competitions
    'soccer_uefa_champs_league': '🏆 Champions League',
    'soccer_uefa_europa_league': '🏆 Europa League',
    'soccer_uefa_europa_conference_league': '🏆 Conference League',
    // Top 5 Leagues
    'soccer_epl': '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League',
    'soccer_spain_la_liga': '🇪🇸 La Liga',
    'soccer_germany_bundesliga': '🇩🇪 Bundesliga',
    'soccer_italy_serie_a': '🇮🇹 Serie A',
    'soccer_france_ligue_one': '🇫🇷 Ligue 1',
    // Second Divisions
    'soccer_efl_champ': '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Championship',
    'soccer_spain_segunda_division': '🇪🇸 Segunda División',
    'soccer_germany_bundesliga2': '🇩🇪 2. Bundesliga',
    'soccer_italy_serie_b': '🇮🇹 Serie B',
    'soccer_france_ligue_two': '🇫🇷 Ligue 2',
    'soccer_england_league1': '🏴󠁧󠁢󠁥󠁮󠁧󠁿 League One',
    'soccer_england_league2': '🏴󠁧󠁢󠁥󠁮󠁧󠁿 League Two',
    // Other Leagues
    'soccer_portugal_primeira_liga': '🇵🇹 Primeira Liga',
    'soccer_netherlands_eredivisie': '🇳🇱 Eredivisie',
    'soccer_brazil_campeonato': '🇧🇷 Brasileirão',
    'soccer_argentina_primera_division': '🇦🇷 Primera División',
    'soccer_mexico_ligamx': '🇲🇽 Liga MX',
    'soccer_usa_mls': '🇺🇸 MLS',
    'soccer_australia_aleague': '🇦🇺 A-League',
    // Turkish Leagues
    'soccer_turkey_super_league': '🇹🇷 Süper Lig',
    'soccer_turkey_1_lig': '🇹🇷 TFF 1. Lig',
    // Continental Cups
    'soccer_conmebol_libertadores': '🏆 Copa Libertadores',
    'soccer_conmebol_copa_sudamericana': '🏆 Copa Sudamericana',
  };
  
  const cricketLeagues = {
    'all': '🏏 All Cricket',
    'cricket_ipl': '🇮🇳 IPL',
    'cricket_international_t20': '🌍 T20 International',
    'cricket_odi': '🌍 ODI',
    'cricket_test_match': '🌍 Test Matches',
    'cricket_big_bash': '🇦🇺 Big Bash League',
    'cricket_caribbean_premier_league': '🏝️ Caribbean Premier League',
    'cricket_psl': '🇵🇰 Pakistan Super League',
    'cricket_icc_world_cup': '🏆 ICC World Cup',
  };
  
  const basketballLeagues = {
    'all': '🏀 All Basketball',
    // Americas - North America
    'basketball_nba': '🇺🇸 NBA',
    'basketball_ncaab': '🎓 NCAA Basketball',
    'basketball_nbl': '🌎 NBL (Australia/Canada)',
    // Americas - South America
    'basketball_brazil_nbb': '🇧🇷 NBB (Brazil)',
    'basketball_argentina_lnb': '🇦🇷 LNB (Argentina)',
    // Europe - Pan-European
    'basketball_euroleague': '🏆 EuroLeague',
    'basketball_eurocup': '🏆 EuroCup',
    // Europe - National Leagues
    'basketball_spain_acb': '🇪🇸 Liga ACB (Spain)',
    'basketball_turkey_bsl': '🇹🇷 BSL (Turkey)',
    'basketball_italy_lega_a': '🇮🇹 Lega Basket Serie A (Italy)',
    'basketball_greece_basket_league': '🇬🇷 Basket League (Greece)',
    'basketball_germany_bbl': '🇩🇪 BBL (Germany)',
    'basketball_france_lnb': '🇫🇷 LNB Pro A (France)',
    'basketball_lithuania_lkl': '🇱🇹 LKL (Lithuania)',
    'basketball_serbia_kls': '🇷🇸 KLS (Serbia)',
  };

  const sportEmojis = {
    all: '🏆',
    football: '⚽',
    cricket: '🏏',
    basketball: '🏀'
  };

  // ============================================
  // UNIFIED FETCH FUNCTION - Single source of truth
  // ============================================
  const fetchMatches = useCallback(async (options = {}) => {
    const {
      loadMore = false,
      sportFilter = filter,
      timeFilterParam = timeFilter,
      leagueFilterParam = leagueFilter,
      silent = false
    } = options;
    
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    // Dispatch loading state
    if (loadMore) {
      dispatch({ type: actionTypes.LOAD_MORE_START });
    } else if (!silent) {
      dispatch({ type: actionTypes.FETCH_START });
    }
    
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const currentSkip = loadMore ? state.matches.length : 0;
      const limit = 50;
      
      // Map sport filter to backend format
      const sportKeyMap = {
        'football': 'soccer',
        'cricket': 'cricket',
        'basketball': 'basketball'
      };
      
      const mappedSport = sportFilter !== 'all' ? sportKeyMap[sportFilter] : null;
      
      // Build API URL based on time filter
      let apiURL;
      
      if (timeFilterParam === 'inplay') {
        // Live matches endpoint
        apiURL = `${BACKEND_URL}/api/odds/inplay?regions=uk,eu,us,au&markets=h2h`;
      } else if (timeFilterParam === 'recent-results') {
        // Recent completed matches
        apiURL = `${BACKEND_URL}/api/odds/all-cached?time_filter=recent&limit=100&include_scores=true`;
      } else {
        // Upcoming matches
        apiURL = `${BACKEND_URL}/api/odds/all-cached?limit=${limit}&skip=${currentSkip}`;
      }
      
      // Add sport filter
      if (mappedSport) {
        const separator = apiURL.includes('?') ? '&' : '?';
        apiURL += `${separator}sport=${mappedSport}`;
      }
      
      // Add league filter (backend does the filtering)
      if (leagueFilterParam && leagueFilterParam !== 'all') {
        apiURL += `&league=${leagueFilterParam}`;
      }
      
      // Cache busting
      apiURL += `&_t=${Date.now()}`;
      
      console.log('🚀 Unified fetch:', { timeFilterParam, sportFilter, leagueFilterParam, apiURL });
      
      const response = await axios.get(apiURL, {
        timeout: 30000,
        signal: abortControllerRef.current.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      const matches = response.data?.matches || response.data || [];
      const hasMore = timeFilterParam === 'live-upcoming' && matches.length >= limit;
      
      console.log('✅ Fetch complete:', matches.length, 'matches');
      
      if (loadMore) {
        dispatch({
          type: actionTypes.LOAD_MORE_SUCCESS,
          payload: { matches, hasMore }
        });
      } else {
        dispatch({
          type: actionTypes.FETCH_SUCCESS,
          payload: { matches, hasMore }
        });
      }
      
    } catch (error) {
      if (error.name === 'CanceledError') {
        console.log('⏹️ Request cancelled');
        return;
      }
      
      console.error('❌ Fetch error:', error);
      dispatch({
        type: actionTypes.FETCH_ERROR,
        payload: error.message
      });
    }
  }, [filter, timeFilter, leagueFilter, state.matches.length]);
  
  // ============================================
  // SIMPLE HELPER FUNCTIONS
  // ============================================
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const toggleMatchExpansion = (matchId) => {
    dispatch({ type: actionTypes.TOGGLE_MATCH, payload: matchId });
  };
  
  // ============================================
  // SIMPLIFIED useEffects - No race conditions
  // ============================================
  
  // Main effect: Fetch when filters change (with debouncing)
  useEffect(() => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce filter changes to prevent rapid successive fetches
    debounceTimerRef.current = setTimeout(() => {
      console.log('🔄 Filters changed, fetching data...');
      dispatch({ type: actionTypes.CLEAR_MATCHES });
      fetchMatches({ loadMore: false, silent: false });
    }, 300);
    
    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filter, timeFilter, leagueFilter]);
  
  // Refresh effect: Handle manual refreshes
  useEffect(() => {
    if (refreshKey > 0) {
      console.log('🔄 Manual refresh triggered');
      fetchMatches({ loadMore: false, silent: refreshKey > 1 });
    }
  }, [refreshKey]);
  
  // Auto-refresh for "all" sports filter
  useEffect(() => {
    if (filter === 'all') {
      const intervalId = setInterval(() => {
        console.log('⏰ Auto-refresh...');
        setRefreshKey(prev => prev + 1);
      }, 300000); // 5 minutes
      
      return () => clearInterval(intervalId);
    }
  }, [filter]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Scroll to specific match if hash is present in URL
  useEffect(() => {
    if (window.location.hash && state.matches.length > 0) {
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
  }, [state.matches]);

  // Sport keys configuration - FOOTBALL, CRICKET & BASKETBALL
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
    ],
    basketball: [
      'basketball_nba', 'basketball_ncaab', 'basketball_nbl',
      'basketball_brazil_nbb', 'basketball_argentina_lnb',
      'basketball_euroleague', 'basketball_eurocup', 'basketball_spain_acb',
      'basketball_turkey_bsl', 'basketball_italy_lega_a', 'basketball_greece_basket_league',
      'basketball_germany_bbl', 'basketball_france_lnb', 'basketball_lithuania_lkl',
      'basketball_serbia_kls'
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
              : 'Compare real-time odds from top bookmakers around the world for upcoming matches in the next 30 days. Auto-refreshes every 5 minutes.'}
          </p>
          
          {/* Time Period Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => {
                setTimeFilter('inplay');
                setFilter('all'); // Show ALL sports when viewing live matches
                setLeagueFilter('all'); // Clear league filter too
              }}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                timeFilter === 'inplay'
                  ? 'bg-[#FFD700] text-[#2E004F]'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-[#2E004F]/30'
              }`}
            >
              🔴 LIVE Now (All Sports)
            </button>
            <button
              onClick={() => setTimeFilter('live-upcoming')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                timeFilter === 'live-upcoming'
                  ? 'bg-[#FFD700] text-[#2E004F]'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-[#2E004F]/30'
              }`}
            >
              📅 Upcoming (30 Days)
            </button>
            <button
              onClick={() => setTimeFilter('recent-results')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                timeFilter === 'recent-results'
                  ? 'bg-[#FFD700] text-[#2E004F]'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-[#2E004F]/30'
              }`}
            >
              📊 Recent Results
            </button>
          </div>
          
          {/* Sport Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="flex flex-wrap gap-2">
              {sports.map((sport) => (
                <button
                  key={sport}
                  onClick={() => {
                    // CRITICAL FIX: Preserve timeFilter when changing sport filter
                    const timeParam = timeFilter !== 'live-upcoming' ? `&time=${timeFilter}` : '';
                    navigate(`/live-odds?filter=${sport}${timeParam}`);
                    setLeagueFilter('all'); // Reset league filter when sport changes
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

          {/* League Sub-Filters */}
          {(filter === 'football' || filter === 'cricket' || filter === 'basketball') && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-400">
                  Filter by League:
                </label>
                <span className="text-xs text-gray-500">
                  {filteredOddsByLeague.length} matches
                </span>
              </div>
              <select
                value={leagueFilter}
                onChange={(e) => setLeagueFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white/5 border border-[#2E004F]/30 text-white focus:border-[#FFD700] focus:outline-none"
              >
                {filter === 'football' 
                  ? Object.entries(footballLeagues).map(([key, name]) => (
                      <option key={key} value={key} className="bg-[#0a0012] text-white">
                        {name}
                      </option>
                    ))
                  : filter === 'cricket'
                  ? Object.entries(cricketLeagues).map(([key, name]) => (
                      <option key={key} value={key} className="bg-[#0a0012] text-white">
                        {name}
                      </option>
                    ))
                  : Object.entries(basketballLeagues).map(([key, name]) => (
                      <option key={key} value={key} className="bg-[#0a0012] text-white">
                        {name}
                      </option>
                    ))
                }
              </select>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button
              onClick={handleRefresh}
              disabled={state.loading}
              className="bg-[#FFD700] text-[#2E004F] hover:bg-[#FFD700]/90"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${state.loading ? 'animate-spin' : ''}`} />
              Refresh Odds
            </Button>
            {state.lastUpdated && filter === 'all' && (
              <span className="text-sm text-gray-400">
                Last updated: {state.lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* All Sports Combined View */}
        {filter === 'all' && (
          <div className="space-y-4">
            {state.loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-[#FFD700] animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading odds...</p>
              </div>
            ) : state.matches.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-8 border border-purple-500/20">
                <div className="text-6xl mb-4">
                  {timeFilter === 'inplay' ? '🔴' : 
                   timeFilter === 'recent-results' ? '✅' : '📅'}
                </div>
                <p className="text-white text-xl font-semibold mb-3">
                  {timeFilter === 'inplay' ? 'No Live Matches at the Moment' :
                   timeFilter === 'recent-results' ? 'No Recent Results' :
                   'No Matches Available'}
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  {timeFilter === 'inplay' 
                    ? 'There are currently no matches being played. Check back soon or view upcoming matches.'
                    : 'Try adjusting your filters or refreshing the page.'}
                </p>
                <button
                  onClick={handleRefresh}
                  className="px-6 py-2 bg-[#FFD700] text-[#2E004F] rounded-lg font-semibold hover:bg-[#FFD700]/90"
                >
                  Refresh Odds
                </button>
              </div>
            ) : (
              <div key={`matches-${leagueFilter}-${filteredOddsByLeague.length}`}>
                {(() => {
                  // Backend already filtered - minimal client-side filtering
                  let filteredMatches = filteredOddsByLeague.filter(match => {
                    // Must have bookmakers
                    if (!match.bookmakers || match.bookmakers.length === 0) {
                      return false;
                    }
                    
                    // CRITICAL: Filter by time section
                    const isLive = match.live_score?.is_live === true;
                    const isCompleted = match.completed === true || match.live_score?.completed === true;
                    
                    if (timeFilter === 'inplay') {
                      // LIVE Now: Only show live matches
                      return isLive && !isCompleted;
                    } else if (timeFilter === 'recent-results') {
                      // Recent Results: Only show completed matches
                      return isCompleted;
                    } else {
                      // Upcoming (30 Days): Only show matches that are NOT completed and NOT live
                      return !isCompleted && !isLive;
                    }
                  });
                  
                  // Show skeleton loaders while loading
                  if (state.loading) {
                    return <MatchCardSkeletonList count={5} />;
                  }
                  
                  // Empty state
                  if (filteredMatches.length === 0) {
                    
                    // Get league name for custom message
                    const getLeagueName = () => {
                      if (filter === 'football' && leagueFilter !== 'all') {
                        return footballLeagues[leagueFilter] || 'this league';
                      }
                      if (filter === 'cricket' && leagueFilter !== 'all') {
                        return cricketLeagues[leagueFilter] || 'this league';
                      }
                      if (filter === 'basketball' && leagueFilter !== 'all') {
                        return basketballLeagues[leagueFilter] || 'this league';
                      }
                      return null;
                    };
                    
                    const leagueName = getLeagueName();
                    const isCricket = filter === 'cricket';
                    const isBasketball = filter === 'basketball';
                    
                    return (
                      <div className="text-center py-12 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-8 border border-purple-500/20">
                        <div className="text-6xl mb-4">
                          {isBasketball ? '🏀' : isCricket ? '🏏' : '⚽'}
                        </div>
                        <p className="text-white text-xl font-semibold mb-3">
                          {timeFilter === 'inplay'
                            ? 'No Live Matches Right Now'
                            : timeFilter === 'recent-results' 
                            ? 'No Recent Results Yet' 
                            : leagueName
                            ? `No Upcoming Matches for ${leagueName}`
                            : 'No Upcoming Matches Available'}
                        </p>
                        {leagueName && timeFilter === 'live-upcoming' && (
                          <div className="space-y-2">
                            <p className="text-gray-400 text-sm">
                              {isBasketball
                                ? '🏀 Basketball schedules are updated as leagues and tournaments are announced.'
                                : isCricket 
                                ? '🏏 Cricket schedules are updated as tournaments and series are announced.'
                                : '⚽ Football matches will appear closer to the season/tournament start date.'}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {isBasketball
                                ? 'Check back for NBA, EuroLeague, NCAA Basketball, and international leagues!'
                                : isCricket
                                ? 'Check back for IPL, T20 Internationals, ODI series, and Test matches!'
                                : 'We track 24+ football leagues worldwide.'}
                            </p>
                          </div>
                        )}
                        {timeFilter === 'inplay' && (
                          <p className="text-gray-400 text-sm mt-2">
                            ⏱️ Live matches will appear here when they start. Check back soon!
                          </p>
                        )}
                        {timeFilter === 'recent-results' && (
                          <p className="text-gray-400 text-sm mt-2">
                            📊 Completed matches appear here 0.5-48 hours after they finish.
                          </p>
                        )}
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
                
                // Check if this sport allows draws (ONLY football/soccer and cricket - NOT basketball or baseball!)
                const sportKey = match.sport_key?.toLowerCase() || '';
                const leagueLower = league?.toLowerCase() || '';
                const isBasketball = sportKey.includes('basketball') || leagueLower.includes('basketball') || leagueLower.includes('nba');
                const isBaseball = leagueLower.includes('baseball') || leagueLower.includes('mlb');
                const sportAllowsDraws = !isBasketball && !isBaseball && (
                  sportKey.includes('soccer') || sportKey.includes('cricket') ||
                  leagueLower.includes('football') || leagueLower.includes('cricket')
                );
                
                // FunBet.ME should show 3 outcomes ONLY for sports that allow draws
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
                const currentSort = state.oddsSortBy[matchId];

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
                const isExpanded = state.expandedMatches[matchId];
                const displayedBookmakers = isExpanded ? sortedBookmakers : sortedBookmakers.slice(0, 4);
                
                // Get best odds from displayed bookmakers EXCLUDING FunBet for highlighting
                // FunBet is always 5% higher, so we highlight the best market odds among real bookmakers
                const displayedNonFunbet = displayedBookmakers.filter(b => b.key !== 'funbet');
                const homeDisplayBest = getBestOdds(displayedNonFunbet, 0, homeTeam, awayTeam);
                const awayDisplayBest = getBestOdds(displayedNonFunbet, 1, homeTeam, awayTeam);
                const drawDisplayBest = showThreeOutcomes
                  ? getBestOdds(displayedNonFunbet, 2, homeTeam, awayTeam) 
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
                        {/* First line: Sport title, LIVE/FINISHED flag */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[#FFD700] text-sm font-medium bg-[#2E004F]/50 px-3 py-1 rounded">
                            {league}
                          </span>
                          {/* Simple LIVE or FINISHED flag from API only */}
                          {match.live_score?.is_live && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-500 border border-red-500/30">
                              🔴 LIVE
                            </span>
                          )}
                          {match.live_score?.completed && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                              ✅ FINAL
                            </span>
                          )}
                        </div>
                        
                        {/* Team names with logos */}
                        <div className="flex items-center gap-2 sm:gap-3 mt-3">
                          <div className="flex-shrink-0">
                            <TeamLogo 
                              logoUrl={match.home_team_logo || match.live_score?.home_team_logo || getTeamLogo(homeTeam)} 
                              teamName={homeTeam}
                              sport={match.sport_key}
                              size="md"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* First Line: Team Names with VS and Live/Final Score */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-white font-semibold text-base sm:text-lg flex-1 overflow-wrap-anywhere leading-tight">{homeTeam}</span>
                              
                              {/* Live/Final Score in the middle */}
                              {/* LIVE games ALWAYS show score (even 0-0), not VS */}
                              {match.live_score?.is_live ? (
                                <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded border border-purple-500/20 flex-shrink-0">
                                  <span className="text-white font-bold text-base">{match.live_score.home_score ?? '0'}</span>
                                  <span className="text-gray-500">-</span>
                                  <span className="text-white font-bold text-base">{match.live_score.away_score ?? '0'}</span>
                                  {/* Show match status for LIVE matches */}
                                  {match.live_score.match_status && (
                                    <span className="ml-1 text-xs font-bold text-red-400">
                                      {match.live_score.match_status}
                                    </span>
                                  )}
                                </div>
                              ) : match.live_score && match.live_score.home_score !== null && match.live_score.home_score !== undefined ? (
                                <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded border border-purple-500/20 flex-shrink-0">
                                  <span className="text-white font-bold text-base">{match.live_score.home_score || '0'}</span>
                                  <span className="text-gray-500">-</span>
                                  <span className="text-white font-bold text-base">{match.live_score.away_score || '0'}</span>
                                </div>
                              ) : (match.live_score?.scores && Array.isArray(match.live_score.scores) && match.live_score.scores.length === 2) || (match.scores && Array.isArray(match.scores) && match.scores.length === 2) ? (
                                /* Show final score from match.live_score.scores or match.scores for completed matches */
                                (() => {
                                  const scoresArray = match.live_score?.scores || match.scores;
                                  // Find scores with flexible team name matching (handles "Estudiantes" vs "Estudiantes de La Plata")
                                  const homeScore = scoresArray.find(s => 
                                    s.name === homeTeam || 
                                    s.name.includes(homeTeam) || 
                                    homeTeam.includes(s.name)
                                  )?.score || scoresArray[0]?.score || '0';
                                  const awayScore = scoresArray.find(s => 
                                    s.name === awayTeam || 
                                    s.name.includes(awayTeam) || 
                                    awayTeam.includes(s.name)
                                  )?.score || scoresArray[1]?.score || '0';
                                  // Format completion time - use completed_at (actual finish time)
                                  const completedTime = match.completed_at || match.commence_time;
                                  let timeAgo = '';
                                  if (completedTime) {
                                    try {
                                      const dt = new Date(completedTime);
                                      const now = new Date();
                                      const diffHours = Math.floor((now - dt) / (1000 * 60 * 60));
                                      const diffDays = Math.floor(diffHours / 24);
                                      
                                      if (diffHours < 1) {
                                        timeAgo = 'Just now';
                                      } else if (diffHours < 24) {
                                        timeAgo = `${diffHours}h ago`;
                                      } else if (diffDays < 7) {
                                        timeAgo = `${diffDays}d ago`;
                                      } else {
                                        timeAgo = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                      }
                                    } catch (e) {
                                      timeAgo = '';
                                    }
                                  }
                                  
                                  return (
                                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                      <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded border border-green-500/20">
                                        <span className="text-white font-bold text-base">{homeScore}</span>
                                        <span className="text-gray-500">-</span>
                                        <span className="text-white font-bold text-base">{awayScore}</span>
                                        <span className="ml-1 text-xs font-bold text-green-400">FINAL</span>
                                      </div>
                                      {timeAgo && (
                                        <span className="text-xs text-gray-500">{timeAgo}</span>
                                      )}
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                  <span className="text-gray-400 text-xs sm:text-sm font-medium px-2">vs</span>
                                  {/* Show date and time for upcoming matches, or status for started matches */}
                                  {(() => {
                                    try {
                                      const matchDate = new Date(match.commence_time);
                                      const now = new Date();
                                      const hoursUntil = (matchDate - now) / (1000 * 60 * 60);
                                      
                                      if (hoursUntil > 0) {
                                        // Future match: Show date and time in USER'S LOCAL TIMEZONE
                                        const dateStr = matchDate.toLocaleDateString(undefined, { 
                                          month: 'short', 
                                          day: 'numeric',
                                          year: matchDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                                        });
                                        const timeStr = matchDate.toLocaleTimeString(undefined, { 
                                          hour: 'numeric', 
                                          minute: '2-digit',
                                          hour12: true 
                                        });
                                        
                                        return (
                                          <div className="flex flex-col items-center gap-0.5 px-2 py-1 bg-[#2E004F]/30 rounded border border-purple-500/20">
                                            <span className="text-[#FFD700] text-xs font-semibold">{dateStr}</span>
                                            <span className="text-gray-400 text-xs">{timeStr}</span>
                                          </div>
                                        );
                                      } else if (hoursUntil > -3) {
                                        // Started within last 3 hours but no live score data: Show "Started" status
                                        const hoursAgo = Math.abs(hoursUntil);
                                        const startedText = hoursAgo < 1 ? 'Just started' : `Started ${Math.floor(hoursAgo)}h ago`;
                                        
                                        return (
                                          <div className="px-2 py-1 bg-orange-500/20 rounded border border-orange-500/30">
                                            <span className="text-orange-400 text-xs font-semibold">⏱️ {startedText}</span>
                                          </div>
                                        );
                                      }
                                    } catch (e) {
                                      return null;
                                    }
                                    return null;
                                  })()}
                                </div>
                              )}
                              
                              <span className="text-white font-semibold text-right text-base sm:text-lg flex-1 overflow-wrap-anywhere leading-tight">{awayTeam}</span>
                            </div>
                            
                            {/* Second Line: FunBet IQ Scores with Draw IQ below VS */}
                            {(() => {
                              const matchIQ = match.funbet_iq;
                              
                              // Log missing predictions for debugging
                              if (!matchIQ || !matchIQ.home_iq || !matchIQ.away_iq) {
                                console.log('⚠️ Missing IQ prediction for:', match.home_team, 'vs', match.away_team, {
                                  has_iq: !!matchIQ,
                                  home_iq: matchIQ?.home_iq,
                                  away_iq: matchIQ?.away_iq
                                });
                              }
                              
                              if (matchIQ && matchIQ.home_iq && matchIQ.away_iq) {
                                // Football/soccer and ALL cricket formats can have draws/ties
                                // Cricket: Test can draw, ODI/T20 can tie (then super over)
                                const isFootball = match.sport_key && (
                                  match.sport_key.includes('soccer') || 
                                  match.sport_key.includes('football')
                                );
                                const isCricket = match.sport_key && match.sport_key.includes('cricket');
                                const canHaveDraw = isFootball || isCricket;
                                const hasDrawIQ = canHaveDraw && matchIQ.draw_iq != null;
                                
                                // DEBUG: Log draw IQ issues
                                if (canHaveDraw && !hasDrawIQ) {
                                  console.log('⚠️ Draw IQ missing for:', match.home_team, 'vs', match.away_team, {
                                    draw_iq: matchIQ.draw_iq,
                                    canHaveDraw,
                                    hasDrawIQ
                                  });
                                }
                                
                                let predictedOutcome = homeTeam;
                                let maxIQ = matchIQ.home_iq;
                                
                                if (hasDrawIQ && matchIQ.draw_iq > maxIQ) {
                                  predictedOutcome = 'Draw';
                                  maxIQ = matchIQ.draw_iq;
                                }
                                if (matchIQ.away_iq > maxIQ) {
                                  predictedOutcome = awayTeam;
                                }
                                
                                // Check if match is completed and has verification result
                                const isCompleted = match.completed || match.live_score?.completed || 
                                  (match.live_score?.scores && Array.isArray(match.live_score.scores) && match.live_score.scores.length === 2) ||
                                  (match.scores && Array.isArray(match.scores) && match.scores.length === 2);
                                const hasVerification = matchIQ.prediction_correct !== null && matchIQ.prediction_correct !== undefined;
                                
                                // DEBUG: Log verification data for Santos match
                                if (match.home_team === 'Santos' || match.away_team === 'Santos') {
                                  console.log('🔍 SANTOS MATCH DEBUG:', {
                                    teams: `${match.home_team} vs ${match.away_team}`,
                                    isCompleted,
                                    hasVerification,
                                    prediction_correct: matchIQ.prediction_correct,
                                    predicted_winner: matchIQ.predicted_winner,
                                    actual_winner: matchIQ.actual_winner
                                  });
                                }
                                
                                // DEBUG: Log Draw IQ rendering
                                console.log('🎨 RENDERING IQ SCORES:', {
                                  match: `${match.home_team} vs ${match.away_team}`,
                                  home_iq: matchIQ.home_iq,
                                  away_iq: matchIQ.away_iq,
                                  draw_iq: matchIQ.draw_iq,
                                  canHaveDraw,
                                  willShowDrawIQ: canHaveDraw && matchIQ.draw_iq != null
                                });
                                
                                return (
                                  <div className="mt-2 space-y-1">
                                    {/* Row 1: Home IQ | Draw IQ (center below VS) | Away IQ - ALL SAME ROW */}
                                    <div className="flex items-center justify-between gap-2">
                                      {/* HOME IQ - LEFT */}
                                      <div className="flex-1 text-left">
                                        <span className="text-purple-400 font-bold text-xs sm:text-sm">{matchIQ.home_iq}</span>
                                      </div>
                                      
                                      {/* DRAW IQ - CENTER - ALWAYS SHOW FOR FOOTBALL & CRICKET */}
                                      {canHaveDraw && (
                                        <div className="flex flex-col items-center min-w-[70px]">
                                          <span className="text-[10px] text-gray-400 mb-0.5">Draw</span>
                                          <span className="text-purple-400 font-bold text-xs sm:text-sm">{matchIQ.draw_iq || '—'}</span>
                                        </div>
                                      )}
                                      
                                      {/* AWAY IQ - RIGHT */}
                                      <div className="flex-1 text-right">
                                        <span className="text-purple-400 font-bold text-xs sm:text-sm">{matchIQ.away_iq}</span>
                                      </div>
                                    </div>
                                    
                                    {/* Row 2: Prediction Verdict OR Verification Result for Completed Matches */}
                                    {isCompleted && hasVerification ? (
                                      <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border ${
                                        matchIQ.prediction_correct 
                                          ? 'bg-gradient-to-r from-green-600/30 to-emerald-600/30 border-green-500/30' 
                                          : 'bg-gradient-to-r from-red-600/30 to-rose-600/30 border-red-500/30'
                                      }`}>
                                        <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-[#FFD700]" />
                                        <span className="text-white text-xs font-medium">
                                          Predicted: <span className="font-bold text-[#FFD700]">{matchIQ.predicted_winner === 'home' ? homeTeam : matchIQ.predicted_winner === 'away' ? awayTeam : 'Draw'}</span>
                                        </span>
                                        <span className={`text-sm font-bold ${matchIQ.prediction_correct ? 'text-green-300' : 'text-red-300'}`}>
                                          {matchIQ.prediction_correct ? '✅ Correct' : '❌ Incorrect'}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-lg border border-purple-500/30">
                                        <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-[#FFD700]" />
                                        <span className="text-[#FFD700] font-bold text-xs truncate max-w-[120px]" title={`${predictedOutcome} (${matchIQ.confidence})`}>
                                          {predictedOutcome}
                                        </span>
                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                          matchIQ.confidence === 'High' ? 'bg-green-500/30 text-green-300' :
                                          matchIQ.confidence === 'Medium' ? 'bg-yellow-500/30 text-yellow-300' :
                                          'bg-gray-500/30 text-gray-300'
                                        }`}>
                                          {matchIQ.confidence}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className="flex-shrink-0">
                            <TeamLogo 
                              logoUrl={match.away_team_logo || match.live_score?.away_team_logo || getTeamLogo(awayTeam)} 
                              teamName={awayTeam}
                              sport={match.sport_key}
                              size="md"
                            />
                          </div>
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
                    <div className="w-full">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#2E004F]/30">
                            <th className="text-left py-1.5 px-1 sm:py-3 sm:px-4 text-gray-400 font-medium text-[10px] sm:text-sm">Bookmaker</th>
                            <th className="text-center py-1.5 px-0.5 sm:py-3 sm:px-4 text-gray-400 font-medium text-[10px] sm:text-sm w-[25%]">
                              {homeTeam}
                            </th>
                            {showThreeOutcomes && (
                              <th className="text-center py-1.5 px-0.5 sm:py-3 sm:px-4 text-gray-400 font-medium text-[10px] sm:text-sm w-[25%]">
                                {league?.toLowerCase().includes('soccer') || 
                                 league?.toLowerCase().includes('football') || 
                                 league?.toLowerCase().includes('serie') ||
                                 league?.toLowerCase().includes('la liga') ||
                                 league?.toLowerCase().includes('bundesliga') ||
                                 league?.toLowerCase().includes('ligue') ||
                                 league?.toLowerCase().includes('epl') ||
                                 league?.toLowerCase().includes('premier') ||
                                 league?.toLowerCase().includes('championship') && !league?.toLowerCase().includes('world') ? 'Draw' : 'Tie/Draw'}
                              </th>
                            )}
                            <th className="text-center py-1.5 px-0.5 sm:py-3 sm:px-4 text-gray-400 font-medium text-[10px] sm:text-sm w-[25%]">
                              {awayTeam}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* FunBet.ME row - Calculated dynamically on frontend (best market odds + 5%) */}
                          {(() => {
                            // Calculate FunBet odds: 5% above best market odds
                            const funbetHomeOdds = homeBest?.odds ? (homeBest.odds * 1.05).toFixed(2) : null;
                            const funbetAwayOdds = awayBest?.odds ? (awayBest.odds * 1.05).toFixed(2) : null;
                            const funbetDrawOdds = showThreeOutcomes && drawBest?.odds ? (drawBest.odds * 1.05).toFixed(2) : null;
                            
                            // Debug logging
                            if (!funbetHomeOdds || !funbetAwayOdds) {
                              console.log('FunBet not showing:', { homeBest, awayBest, funbetHomeOdds, funbetAwayOdds });
                              return null;
                            }
                            
                            return (
                              <tr className="border-b-2 border-[#FFD700] bg-gradient-to-r from-[#FFD700]/20 to-[#FFD700]/10">
                                <td className="py-2 px-1 sm:py-4 sm:px-4">
                                  <div className="flex items-center gap-1 sm:gap-2">
                                    <span className="text-[#FFD700] text-base sm:text-2xl leading-none">⭐</span>
                                    <span className="text-[#FFD700] font-bold text-[10px] sm:text-lg whitespace-nowrap leading-none">FunBet.me</span>
                                  </div>
                                </td>
                                <td className="py-2 px-0.5 sm:py-4 sm:px-4 text-center w-[25%]">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="bg-[#FFD700] text-[#2E004F] px-1.5 py-0.5 sm:px-5 sm:py-2 rounded font-black text-xs sm:text-2xl shadow-lg whitespace-nowrap">
                                      {funbetHomeOdds}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        dispatch({
                                          type: actionTypes.SET_ODDS_SORT,
                                          payload: {
                                            matchId,
                                            sortBy: state.oddsSortBy[matchId] === 'home' ? null : 'home'
                                          }
                                        });
                                      }}
                                      className="hover:opacity-80 transition-opacity"
                                      title="Sort by Home odds (highest to lowest)"
                                    >
                                      {state.oddsSortBy[matchId] === 'home' ? (
                                        <ChevronDown className="w-5 h-5 text-purple-600" />
                                      ) : (
                                        <ChevronUp className="w-5 h-5 text-gray-400 opacity-50" />
                                      )}
                                    </button>
                                  </div>
                                </td>
                                {showThreeOutcomes && (
                                  <td className="py-2 px-0.5 sm:py-4 sm:px-4 text-center w-[25%]">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="bg-[#FFD700] text-[#2E004F] px-1.5 py-0.5 sm:px-5 sm:py-2 rounded font-black text-xs sm:text-2xl shadow-lg whitespace-nowrap">
                                        {funbetDrawOdds || '-'}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          dispatch({
                                            type: actionTypes.SET_ODDS_SORT,
                                            payload: {
                                              matchId,
                                              sortBy: state.oddsSortBy[matchId] === 'draw' ? null : 'draw'
                                            }
                                          });
                                        }}
                                        className="hover:opacity-80 transition-opacity"
                                        title="Sort by Draw odds (highest to lowest)"
                                      >
                                        {state.oddsSortBy[matchId] === 'draw' ? (
                                          <ChevronDown className="w-5 h-5 text-purple-600" />
                                        ) : (
                                          <ChevronUp className="w-5 h-5 text-gray-400 opacity-50" />
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                )}
                                <td className="py-2 px-0.5 sm:py-4 sm:px-4 text-center w-[25%]">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="bg-[#FFD700] text-[#2E004F] px-1.5 py-0.5 sm:px-5 sm:py-2 rounded font-black text-xs sm:text-2xl shadow-lg whitespace-nowrap">
                                      {funbetAwayOdds}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        dispatch({
                                          type: actionTypes.SET_ODDS_SORT,
                                          payload: {
                                            matchId,
                                            sortBy: state.oddsSortBy[matchId] === 'away' ? null : 'away'
                                          }
                                        });
                                      }}
                                      className="hover:opacity-80 transition-opacity"
                                      title="Sort by Away odds (highest to lowest)"
                                    >
                                      {state.oddsSortBy[matchId] === 'away' ? (
                                        <ChevronDown className="w-5 h-5 text-purple-600" />
                                      ) : (
                                        <ChevronUp className="w-5 h-5 text-gray-400 opacity-50" />
                                      )}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })()}
                          
                          {/* Other bookmakers - Show first 4 on mobile, all on desktop or when expanded */}
                          {displayedBookmakers.map((bookmaker, index) => {
                            // On mobile: show first 4 bookmakers, then rest only if expanded
                            // On desktop: show all displayedBookmakers (which respects the existing expand logic)
                            const isMobile = window.innerWidth < 768;
                            if (isMobile && !isExpanded && index >= 4) {
                              return null; // Skip bookmakers after first 4 on mobile when collapsed
                            }
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
                                <td className="py-1.5 px-1 sm:px-4 text-gray-400 text-[10px] sm:text-sm truncate max-w-[70px] sm:max-w-none">{bookmaker.title}</td>
                                <td className="py-1.5 px-0.5 sm:px-4 text-center w-[25%]">
                                  <span className={`text-[10px] sm:text-sm ${
                                    isHomeBest ? 'bg-amber-400/80 text-[#2E004F] px-1.5 sm:px-3 py-0.5 sm:py-1 rounded font-bold shadow-sm' : 'text-gray-300 font-normal'
                                  }`}>
                                    {homeOdds ? homeOdds.toFixed(2) : '-'}
                                  </span>
                                </td>
                                {showThreeOutcomes && (
                                  <td className="py-1.5 px-0.5 sm:px-4 text-center w-[25%]">
                                    <span className={`text-[10px] sm:text-sm ${
                                      isDrawBest ? 'bg-amber-400/80 text-[#2E004F] px-1.5 sm:px-3 py-0.5 sm:py-1 rounded font-bold shadow-sm' : 'text-gray-300 font-normal'
                                    }`}>
                                      {drawOdds ? drawOdds.toFixed(2) : '-'}
                                    </span>
                                  </td>
                                )}
                                <td className="py-1.5 px-0.5 sm:px-4 text-center w-[25%]">
                                  <span className={`text-[10px] sm:text-sm ${
                                    isAwayBest ? 'bg-amber-400/80 text-[#2E004F] px-1.5 sm:px-3 py-0.5 sm:py-1 rounded font-bold shadow-sm' : 'text-gray-300 font-normal'
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
                              Show {sortedBookmakers.length - (window.innerWidth < 768 ? 4 : 4)} More Bookmaker{sortedBookmakers.length - 4 !== 1 ? 's' : ''}
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
                  })
                })()}
              </div>
            )}
          </div>
        )}

        {/* Individual Sport View - Use OddsTable Component */}
        {filter !== 'all' && (() => {
          const oddsTableKey = `${filter}-${refreshKey}-${timeFilter}-${leagueFilter}-${filteredOddsByLeague.length}`;
          console.log('[LiveOdds] Rendering OddsTable with:', {
            key: oddsTableKey,
            filter,
            leagueFilter,
            filteredCount: filteredOddsByLeague.length,
            firstMatch: filteredOddsByLeague[0] ? `${filteredOddsByLeague[0].sport_key} ${filteredOddsByLeague[0].home_team}` : 'none'
          });
          
          return (
            <div>
              <OddsTable 
                key={oddsTableKey}
                sportKeys={sportKeysMap[filter]}
                sportTitle={filter.charAt(0).toUpperCase() + filter.slice(1)}
                usePriorityEndpoint={filter === 'football' || filter === 'cricket'}
                isCricket={filter === 'cricket'}
                refreshTrigger={refreshKey}
                timeFilter={timeFilter}
                preloadedOdds={filteredOddsByLeague}
                loading={state.loading}
                selectedLeague={leagueFilter !== 'all' ? (filter === 'football' ? footballLeagues[leagueFilter] : filter === 'cricket' ? cricketLeagues[leagueFilter] : basketballLeagues[leagueFilter]) : null}
              />
            </div>
          );
        })()}

        {/* Load More Button - Don't show for Live Now or Recent Results (they load all at once) */}
        {state.hasMore && !state.loading && timeFilter !== 'inplay' && timeFilter !== 'recent-results' && (
          <div className="mt-8 text-center">
            <button
              onClick={() => fetchMatches({ loadMore: true })}
              disabled={state.loadingMore}
              className={`px-8 py-3 bg-[#FFD700] text-[#2E004F] rounded-lg font-bold text-lg hover:bg-[#FFD700]/90 transition-all hover:scale-105 shadow-lg flex items-center gap-2 mx-auto ${state.loadingMore ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {state.loadingMore && <RefreshCw className="w-5 h-5 animate-spin" />}
              {state.loadingMore ? 'Loading...' : 'Load More Matches'}
            </button>
            <p className="text-gray-400 text-sm mt-2">
              Showing {filteredOddsByLeague.length} matches
            </p>
          </div>
        )}

        {/* Branding Footer */}
        <div className="mt-12 text-center py-6">
          <p className="text-[#FFD700] font-semibold text-lg mb-2">
            Powered by FunBet.ME
          </p>
          <p className="text-gray-400 text-sm">
            Reach us: <span className="text-[#FFD700]">funbet.me</span>
          </p>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 p-6 rounded-lg bg-[#2E004F]/10 border border-[#2E004F]/30">
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
