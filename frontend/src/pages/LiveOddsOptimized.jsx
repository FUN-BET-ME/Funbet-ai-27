import React, { useReducer, useEffect, useCallback, useMemo } from 'react';
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

// ==================== STATE MANAGEMENT ====================
// Unified state reducer for better performance
const initialState = {
  // Filters
  sportFilter: 'all',
  timeFilter: 'live-upcoming',
  leagueFilter: 'all',
  
  // Data
  matches: [],
  
  // Pagination
  page: 0,
  pageSize: 50,
  hasMore: true,
  totalMatches: 0,
  
  // UI State
  loading: false,
  loadingMore: false,
  error: null,
  lastUpdated: null,
  
  // Match-specific state
  expandedMatches: {},
  expandedBookmakers: {},
  oddsSortBy: {},
};

const actionTypes = {
  SET_SPORT_FILTER: 'SET_SPORT_FILTER',
  SET_TIME_FILTER: 'SET_TIME_FILTER',
  SET_LEAGUE_FILTER: 'SET_LEAGUE_FILTER',
  SET_MATCHES: 'SET_MATCHES',
  APPEND_MATCHES: 'APPEND_MATCHES',
  SET_LOADING: 'SET_LOADING',
  SET_LOADING_MORE: 'SET_LOADING_MORE',
  SET_ERROR: 'SET_ERROR',
  SET_LAST_UPDATED: 'SET_LAST_UPDATED',
  TOGGLE_EXPANDED_MATCH: 'TOGGLE_EXPANDED_MATCH',
  TOGGLE_EXPANDED_BOOKMAKERS: 'TOGGLE_EXPANDED_BOOKMAKERS',
  SET_ODDS_SORT: 'SET_ODDS_SORT',
  RESET_PAGINATION: 'RESET_PAGINATION',
  UPDATE_MATCH: 'UPDATE_MATCH',
};

function oddsReducer(state, action) {
  switch (action.type) {
    case actionTypes.SET_SPORT_FILTER:
      return {
        ...state,
        sportFilter: action.payload,
        leagueFilter: 'all', // Reset league when sport changes
        page: 0,
        matches: [],
      };
      
    case actionTypes.SET_TIME_FILTER:
      return {
        ...state,
        timeFilter: action.payload,
        page: 0,
        matches: [],
      };
      
    case actionTypes.SET_LEAGUE_FILTER:
      return {
        ...state,
        leagueFilter: action.payload,
      };
      
    case actionTypes.SET_MATCHES:
      return {
        ...state,
        matches: action.payload.matches,
        totalMatches: action.payload.total || action.payload.matches.length,
        hasMore: action.payload.hasMore,
        page: 0,
        loading: false,
        loadingMore: false,
        lastUpdated: new Date(),
      };
      
    case actionTypes.APPEND_MATCHES:
      return {
        ...state,
        matches: [...state.matches, ...action.payload.matches],
        hasMore: action.payload.hasMore,
        page: state.page + 1,
        loadingMore: false,
        lastUpdated: new Date(),
      };
      
    case actionTypes.UPDATE_MATCH:
      return {
        ...state,
        matches: state.matches.map(m =>
          m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
        ),
      };
      
    case actionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
      
    case actionTypes.SET_LOADING_MORE:
      return { ...state, loadingMore: action.payload };
      
    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload, loading: false, loadingMore: false };
      
    case actionTypes.TOGGLE_EXPANDED_MATCH:
      return {
        ...state,
        expandedMatches: {
          ...state.expandedMatches,
          [action.payload]: !state.expandedMatches[action.payload],
        },
      };
      
    case actionTypes.TOGGLE_EXPANDED_BOOKMAKERS:
      return {
        ...state,
        expandedBookmakers: {
          ...state.expandedBookmakers,
          [action.payload]: !state.expandedBookmakers[action.payload],
        },
      };
      
    case actionTypes.SET_ODDS_SORT:
      return {
        ...state,
        oddsSortBy: {
          ...state.oddsSortBy,
          [action.payload.matchId]: action.payload.sortBy,
        },
      };
      
    case actionTypes.RESET_PAGINATION:
      return {
        ...state,
        page: 0,
        matches: [],
        hasMore: true,
      };
      
    default:
      return state;
  }
}

// ==================== MAIN COMPONENT ====================
const LiveOddsOptimized = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleFollowTeam, isFollowing, isMatchFollowed } = useFavorites();
  
  // Initialize state from URL
  const getInitialStateFromURL = () => {
    const params = new URLSearchParams(location.search);
    return {
      ...initialState,
      sportFilter: params.get('filter') || 'all',
      timeFilter: params.get('time') || 'live-upcoming',
    };
  };
  
  const [state, dispatch] = useReducer(oddsReducer, getInitialStateFromURL());
  
  // ==================== DATA FETCHING ====================
  const fetchMatches = useCallback(async (loadMore = false) => {
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
    
    if (loadMore) {
      dispatch({ type: actionTypes.SET_LOADING_MORE, payload: true });
    } else {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
    }
    
    try {
      // Build API URL with filters
      const sportMap = {
        'football': 'soccer',
        'cricket': 'cricket',
        'basketball': 'basketball'
      };
      
      const skip = loadMore ? state.page * state.pageSize : 0;
      let apiURL = `${BACKEND_URL}/api/odds/all-cached?limit=${state.pageSize}&skip=${skip}`;
      
      // Add sport filter
      if (state.sportFilter !== 'all') {
        const sportKey = sportMap[state.sportFilter];
        if (sportKey) apiURL += `&sport=${sportKey}`;
      }
      
      // Add time filter
      if (state.timeFilter === 'recent-results') {
        apiURL += '&time_filter=recent';
      } else if (state.timeFilter === 'inplay') {
        apiURL += '&time_filter=live';
      }
      
      // Cache busting
      apiURL += `&_t=${Date.now()}`;
      
      console.log('📡 Fetching:', apiURL);
      
      const response = await axios.get(apiURL, {
        timeout: 30000,
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      const newMatches = response.data?.matches || [];
      const hasMore = newMatches.length === state.pageSize;
      
      console.log(`✅ Received ${newMatches.length} matches, hasMore: ${hasMore}`);
      
      if (loadMore) {
        dispatch({
          type: actionTypes.APPEND_MATCHES,
          payload: { matches: newMatches, hasMore }
        });
      } else {
        dispatch({
          type: actionTypes.SET_MATCHES,
          payload: { matches: newMatches, hasMore, total: response.data?.total }
        });
      }
      
    } catch (error) {
      console.error('❌ Fetch error:', error);
      dispatch({
        type: actionTypes.SET_ERROR,
        payload: error.message
      });
    }
  }, [state.sportFilter, state.timeFilter, state.page, state.pageSize]);
  
  // ==================== EFFECTS ====================
  // Sync with URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlSport = params.get('filter') || 'all';
    const urlTime = params.get('time') || 'live-upcoming';
    
    if (urlSport !== state.sportFilter) {
      dispatch({ type: actionTypes.SET_SPORT_FILTER, payload: urlSport });
    }
    if (urlTime !== state.timeFilter) {
      dispatch({ type: actionTypes.SET_TIME_FILTER, payload: urlTime });
    }
  }, [location.search]);
  
  // Fetch on filter change
  useEffect(() => {
    fetchMatches(false);
  }, [state.sportFilter, state.timeFilter]);
  
  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!state.loading && !state.loadingMore) {
        console.log('🔄 Auto-refresh');
        fetchMatches(false);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [state.loading, state.loadingMore, fetchMatches]);
  
  // ==================== FILTERED & SORTED MATCHES ====================
  const filteredMatches = useMemo(() => {
    let filtered = state.matches;
    
    // Apply league filter (client-side for now)
    if (state.leagueFilter !== 'all') {
      filtered = filtered.filter(m => m.sport_key === state.leagueFilter);
    }
    
    // Apply time-based filtering
    filtered = filtered.filter(match => {
      if (!match.bookmakers || match.bookmakers.length === 0) return false;
      
      const isCompleted = match.completed || match.live_score?.completed;
      
      if (state.timeFilter === 'inplay') {
        return match.live_score?.is_live && !isCompleted;
      }
      
      if (state.timeFilter === 'live-upcoming') {
        return !isCompleted;
      }
      
      if (state.timeFilter === 'recent-results') {
        return isCompleted;
      }
      
      return true;
    });
    
    return filtered;
  }, [state.matches, state.leagueFilter, state.timeFilter]);
  
  // ==================== HANDLERS ====================
  const handleSportChange = useCallback((sport) => {
    dispatch({ type: actionTypes.SET_SPORT_FILTER, payload: sport });
    navigate(`/live-odds?filter=${sport}&time=${state.timeFilter}`);
  }, [state.timeFilter, navigate]);
  
  const handleTimeFilterChange = useCallback((time) => {
    dispatch({ type: actionTypes.SET_TIME_FILTER, payload: time });
    navigate(`/live-odds?filter=${state.sportFilter}&time=${time}`);
  }, [state.sportFilter, navigate]);
  
  const handleLoadMore = useCallback(() => {
    if (!state.loadingMore && state.hasMore) {
      fetchMatches(true);
    }
  }, [state.loadingMore, state.hasMore, fetchMatches]);
  
  const handleRefresh = useCallback(() => {
    dispatch({ type: actionTypes.RESET_PAGINATION });
    fetchMatches(false);
  }, [fetchMatches]);
  
  // ==================== RENDER ====================
  const sports = ['all', 'football', 'cricket', 'basketball'];
  const timeFilters = [
    { key: 'live-upcoming', label: 'Live & Upcoming' },
    { key: 'inplay', label: 'Live Now' },
    { key: 'recent-results', label: 'Recent Results' }
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0033] via-[#2E004F] to-[#1a0033] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#1a0033]/95 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Live Odds</h1>
            <Button
              onClick={handleRefresh}
              disabled={state.loading}
              className="bg-[#FFD700] text-[#2E004F] hover:bg-[#FFD700]/90"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${state.loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {/* Sport Filters */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {sports.map(sport => (
              <button
                key={sport}
                onClick={() => handleSportChange(sport)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                  state.sportFilter === sport
                    ? 'bg-[#FFD700] text-[#2E004F] font-bold'
                    : 'bg-purple-900/30 hover:bg-purple-900/50'
                }`}
              >
                {sport === 'all' ? '🌍 All' : 
                 sport === 'football' ? '⚽ Football' :
                 sport === 'cricket' ? '🏏 Cricket' : '🏀 Basketball'}
              </button>
            ))}
          </div>
          
          {/* Time Filters */}
          <div className="flex gap-2 overflow-x-auto">
            {timeFilters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleTimeFilterChange(key)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                  state.timeFilter === key
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-purple-900/30 hover:bg-purple-900/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          
          {/* Stats */}
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
            <span>{filteredMatches.length} matches</span>
            {state.lastUpdated && (
              <span>Updated {state.lastUpdated.toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {state.loading && state.matches.length === 0 ? (
          <MatchCardSkeletonList count={5} />
        ) : state.error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p className="text-xl text-red-400">{state.error}</p>
            <Button onClick={handleRefresh} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-8 border border-purple-500/20">
            <div className="text-6xl mb-4">
              {state.sportFilter === 'basketball' ? '🏀' : 
               state.sportFilter === 'cricket' ? '🏏' : '⚽'}
            </div>
            <p className="text-white text-xl font-semibold mb-3">
              No matches available
            </p>
            <p className="text-gray-400 text-sm">
              Try a different sport or time filter
            </p>
          </div>
        ) : (
          <>
            {/* Matches Display */}
            <OddsTable 
              sportKeys={[state.sportFilter]}
              sportTitle={state.sportFilter}
              matches={filteredMatches}
              expandedMatches={state.expandedMatches}
              expandedBookmakers={state.expandedBookmakers}
              oddsSortBy={state.oddsSortBy}
              onToggleExpand={(id) => dispatch({ type: actionTypes.TOGGLE_EXPANDED_MATCH, payload: id })}
              onToggleBookmakers={(id) => dispatch({ type: actionTypes.TOGGLE_EXPANDED_BOOKMAKERS, payload: id })}
              onSetSort={(matchId, sortBy) => dispatch({ type: actionTypes.SET_ODDS_SORT, payload: { matchId, sortBy } })}
            />
            
            {/* Load More Button */}
            {state.hasMore && (
              <div className="text-center mt-8">
                <Button
                  onClick={handleLoadMore}
                  disabled={state.loadingMore}
                  className="bg-purple-600 hover:bg-purple-700 px-8 py-3 text-lg"
                >
                  {state.loadingMore ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load More Matches`
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LiveOddsOptimized;
