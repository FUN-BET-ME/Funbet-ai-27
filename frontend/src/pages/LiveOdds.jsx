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
    // CRITICAL FIX: Reset league filter when sport filter changes to prevent no matches
    setLeagueFilter('all');
  }, [location.search]);
  const [timeFilter, setTimeFilter] = useState('live-upcoming'); // 'live-upcoming', 'inplay', 'recent-results'
  const [refreshKey, setRefreshKey] = useState(0);
  // CRITICAL FIX: Initialize from localStorage to prevent data loss on refresh
  const [allOdds, setAllOdds] = useState(() => {
    try {
      const cached = localStorage.getItem('liveOdds_cached');
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log('📦 Restored', parsed.length, 'matches from localStorage');
        return parsed;
      }
    } catch (e) {
      console.error('Failed to restore from localStorage:', e);
    }
    return [];
  });
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
  const [leagueFilter, setLeagueFilter] = useState('all'); // League sub-filter
  const [iqScores, setIqScores] = useState({}); // FunBet IQ scores by match_id
  const { toggleFollowTeam, isFollowing, isMatchFollowed} = useFavorites();
  
  // Use useMemo to filter matches by SPORT first, then by league
  const filteredOddsByLeague = useMemo(() => {
    console.log('🔍 Filtering - filter:', filter, 'leagueFilter:', leagueFilter, '| Total matches:', allOdds.length);
    
    let filtered = allOdds;
    
    // FIRST: Filter by sport (football vs cricket) if not "all"
    if (filter !== 'all') {
      const sportPrefix = filter === 'football' ? 'soccer_' : 'cricket_';
      filtered = filtered.filter(match => match.sport_key?.startsWith(sportPrefix));
      console.log('  → After sport filter (', filter, '):', filtered.length, 'matches');
    }
    
    // SECOND: Filter by specific league if selected
    if (leagueFilter !== 'all') {
      const leagueFiltered = filtered.filter(match => match.sport_key === leagueFilter);
      
      // CRITICAL FIX: If league filter results in 0 matches, auto-reset to "all"
      if (leagueFiltered.length === 0 && filtered.length > 0) {
        console.log('  → ⚠️ League filter resulted in 0 matches, auto-resetting to "all"');
        setLeagueFilter('all');
        // Return unfiltered (by league) results
        return filtered;
      }
      
      filtered = leagueFiltered;
      console.log('  → After league filter (', leagueFilter, '):', filtered.length, 'matches');
    }
    
    if (filtered.length > 0) {
      console.log('  → Sample match:', filtered[0].sport_key, filtered[0].home_team);
    } else {
      console.log('  → No matches after filtering!');
    }
    
    return filtered;
  }, [allOdds, filter, leagueFilter]);

  const sports = ['all', 'football', 'cricket'];
  
  // League definitions for sub-filters (ALL 24 football + 8 cricket leagues)
  const footballLeagues = {
    'all': '🏆 All Football Leagues',
    // UEFA
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
      const response = await axios.get(`${BACKEND_URL}/api/odds/historical/recent`, {
        timeout: 30000 // 30 second timeout
      });
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
        params: { regions: 'uk,eu,us,au', markets: 'h2h' },
        timeout: 30000 // 30 second timeout
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
  const fetchAllOdds = async (loadMore = false, currentFilter = filter, showLoading = true) => {
    console.log('🚀 fetchAllOdds called with:', { loadMore, currentFilter, showLoading, allOddsLength: allOdds.length });
    
    if (loadMore) {
      setLoadingMore(true);
    } else if (showLoading) {
      setLoading(true);
    }
    
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      
      // Fetch from database - increased limit for 30-day window with 32 leagues
      const currentSkip = loadMore ? allOdds.length : 0;
      const limit = 500; // Increased for 30 days × 32 leagues

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
      
      // CRITICAL FIX: Add time filter to only get upcoming matches (exclude live)
      if (timeFilter === 'live-upcoming') {
        apiURL += '&time_filter=upcoming';
        console.log('✅ Fetching UPCOMING matches only (excluding live)');
      }
      
      // Add sport filter if specified
      if (sportFilter) {
        apiURL += `&sport=${sportFilter}`;
        console.log('✅ Fetching with sport filter:', sportFilter);
      } else {
        console.log('⚠️  Fetching ALL sports');
      }

      console.log('📡 API URL:', apiURL);
      const response = await axios.get(apiURL, { 
        timeout: 30000, // 30 second timeout
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log('📥 API Response received:', {
        matchesCount: response.data?.matches?.length || 0,
        firstMatchSportKey: response.data?.matches?.[0]?.sport_key || 'NONE',
        firstMatchTeams: response.data?.matches?.[0] ? `${response.data.matches[0].home_team} vs ${response.data.matches[0].away_team}` : 'NO MATCHES'
      });
      
      console.log('🔎 First 3 matches sport_keys:', response.data?.matches?.slice(0,3).map(m => m.sport_key) || []);
      
      const responseData = response.data || {};
      const newMatches = responseData.matches || [];
      
      console.log('💾 Data merge decision:', {
        loadMore,
        currentOddsLength: allOdds.length,
        newMatchesLength: newMatches.length,
        loading,
        willMerge: allOdds.length > 0 && !loading,
        willReplace: !(allOdds.length > 0 && !loading) && !loadMore
      });
      
      // Smart upsert: merge new data with existing without clearing UI
      if (loadMore) {
        // Loading more: append to existing
        setAllOdds(prev => [...prev, ...newMatches]);
        console.log('➕ Appended matches, new total:', allOdds.length + newMatches.length);
      } else if (allOdds.length > 0 && !loading) {
        // Background refresh: intelligently merge without disruption
        console.log('🔄 Smart merge mode: Preserving', allOdds.length, 'existing matches, updating with', newMatches.length, 'new');
        setAllOdds(prev => {
          const merged = [...prev];
          const existingIds = new Set(prev.map(m => m.id));
          
          // Update existing matches and add new ones
          newMatches.forEach(newMatch => {
            const existingIndex = merged.findIndex(m => m.id === newMatch.id);
            if (existingIndex >= 0) {
              // Update existing match (odds may have changed)
              merged[existingIndex] = newMatch;
            } else if (!existingIds.has(newMatch.id)) {
              // Add new match
              merged.push(newMatch);
            }
          });
          
          console.log('✅ Smart merge complete: Updated/added matches, total:', merged.length);
          return merged;
        });
      } else {
        // Initial load or explicit refresh: replace all
        console.log('🔄 Full replace mode: Setting', newMatches.length, 'matches (was:', allOdds.length, ')');
        
        // CRITICAL FIX: Only replace if we have new data OR it's initial load
        if (newMatches.length > 0 || allOdds.length === 0) {
          setAllOdds(newMatches);
          console.log('✅ Replace complete');
        } else {
          console.log('⚠️ API returned no matches, keeping existing', allOdds.length, 'matches');
        }
      }
      
      // Check if there are more matches (if we got full limit, there might be more)
      setHasMore(newMatches.length >= limit);
      setLastUpdated(new Date());
      
      console.log(`✅ SUCCESS: Loaded ${newMatches.length} matches for filter="${currentFilter}"`);
    } catch (error) {
      console.error('❌ ERROR fetching odds:', error);
      // Silently keep existing data - no annoying banners
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

  // Fetch FunBet IQ scores
  const fetchIQScores = useCallback(async () => {
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      console.log('🧠 Fetching IQ scores from:', `${BACKEND_URL}/api/funbet-iq/matches`);
      
      const sportParam = filter === 'football' ? 'football' : filter === 'cricket' ? 'cricket' : null;
      const response = await axios.get(`${BACKEND_URL}/api/funbet-iq/matches`, {
        params: { 
          sport: sportParam,
          limit: 100 
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log('🧠 IQ API Response:', response.data);
      
      // Convert array to map for quick lookup by match_id
      const iqMap = {};
      (response.data?.matches || []).forEach(match => {
        iqMap[match.match_id] = match;
      });
      setIqScores(iqMap);
      console.log('✅ Fetched IQ scores for', Object.keys(iqMap).length, 'matches');
      console.log('📊 Sample IQ data:', iqMap[Object.keys(iqMap)[0]]);
    } catch (error) {
      console.error('❌ Error fetching IQ scores:', error.message);
      console.error('❌ Full error:', error);
      setIqScores({});
    }
  }, [filter]);

  // Check if a match has an AI prediction
  const hasAIPrediction = (matchId) => {
    return aiPredictions.some(pred => pred.match_id === matchId);
  };

  // Load data on mount and when filters change
  // Load data when filter changes
  useEffect(() => {
    console.log('🔥 FILTER or TIME FILTER CHANGED useEffect triggered, filter=', filter, 'timeFilter=', timeFilter);
    
    // Only show loading if we don't have data
    const shouldShowLoading = allOdds.length === 0;
    
    // Fetch data based on time filter (simplified - only inplay vs upcoming)
    if (timeFilter === 'inplay') {
      // Fetch in-play matches
      console.log('Fetching in-play matches...');
      if (shouldShowLoading) setLoading(true);
      fetchInPlayOdds().then(data => {
        console.log('In-play data received:', data.length, 'matches');
        
        // Apply sport filter to in-play data
        let filteredData = data;
        if (filter === 'football') {
          filteredData = data.filter(match => match.sport_key && match.sport_key.startsWith('soccer'));
          console.log('🔎 Filtered to football:', filteredData.length, 'matches');
        } else if (filter === 'cricket') {
          filteredData = data.filter(match => match.sport_key && match.sport_key.startsWith('cricket'));
          console.log('🔎 Filtered to cricket:', filteredData.length, 'matches');
        }
        
        // CRITICAL FIX: Only update if we have data, otherwise keep existing data
        if (filteredData.length > 0) {
          setAllOdds(filteredData);
          console.log('✅ Updated with', filteredData.length, 'in-play matches');
        } else {
          console.log('⚠️ No in-play matches found, keeping existing data');
        }
        setLoading(false);
      }).catch(error => {
        console.error('❌ Error fetching in-play odds:', error);
        setLoading(false);
        // Silently keep existing data
      });
    } else {
      // Fetch upcoming matches (default)
      console.log('Fetching upcoming matches...', 'shouldShowLoading:', shouldShowLoading);
      fetchAllOdds(false, filter, shouldShowLoading);
    }
  }, [filter, timeFilter]);

  // Load data when manually refreshed
  useEffect(() => {
    if (refreshKey > 0) { // Skip initial render
      const isBackgroundRefresh = refreshKey > 1; // First refresh is manual, rest are auto
      
      if (timeFilter === 'inplay') {
        // Refresh in-play matches with sport filter
        fetchInPlayOdds().then(data => {
          let filteredData = data;
          if (filter === 'football') {
            filteredData = data.filter(match => match.sport_key && match.sport_key.startsWith('soccer'));
          } else if (filter === 'cricket') {
            filteredData = data.filter(match => match.sport_key && match.sport_key.startsWith('cricket'));
          }
          
          // CRITICAL FIX: Only update if we have data
          if (filteredData.length > 0) {
            setAllOdds(filteredData);
          } else {
            console.log('⚠️ Refresh returned no matches, keeping existing data');
          }
          if (!isBackgroundRefresh) setLoading(false);
        }).catch(error => {
          console.error('❌ Error refreshing in-play odds:', error);
          if (!isBackgroundRefresh) setLoading(false);
          // Silently keep existing data
        });
      } else {
        // Refresh upcoming matches - silent refresh for background updates
        fetchAllOdds(false, filter, !isBackgroundRefresh);
      }
    }
  }, [refreshKey]);

  // CRITICAL FIX: Save to localStorage whenever data changes (data persistence)
  useEffect(() => {
    if (allOdds.length > 0) {
      try {
        localStorage.setItem('liveOdds_cached', JSON.stringify(allOdds));
        console.log('💾 Saved', allOdds.length, 'matches to localStorage');
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }
    }
  }, [allOdds]);

  // Fetch IQ scores when odds data changes
  useEffect(() => {
    console.log('🔥 IQ useEffect triggered - allOdds.length:', allOdds.length);
    if (allOdds.length > 0) {
      console.log('✅ Calling fetchIQScores because odds data changed...');
      // Add slight delay to ensure odds are rendered first
      const timer = setTimeout(() => {
        fetchIQScores();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      console.log('⚠️  Not calling fetchIQScores - no odds data');
    }
  }, [allOdds.length, fetchIQScores]);

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
              : 'Compare real-time odds from top bookmakers around the world for upcoming matches in the next 30 days. Auto-refreshes every 5 minutes.'}
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
              📅 Upcoming (30 Days)
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
          {(filter === 'football' || filter === 'cricket') && (
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
                  : Object.entries(cricketLeagues).map(([key, name]) => (
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
              <div className="text-center py-12 bg-red-500/10 border border-red-500/30 rounded-xl p-8">
                <p className="text-red-400 text-lg font-semibold mb-2">⚠️ No Odds Loaded</p>
                <p className="text-gray-400 text-sm mb-4">
                  Data failed to load. Backend has 300+ matches but frontend isn't receiving them.
                </p>
                <button
                  onClick={() => {
                    console.log('🔄 Manual refresh triggered');
                    fetchAllOdds(false, filter, true);
                  }}
                  className="px-6 py-2 bg-[#FFD700] text-[#2E004F] rounded-lg font-semibold hover:bg-[#FFD700]/90"
                >
                  Retry Loading
                </button>
                <p className="text-gray-500 text-xs mt-3">
                  Check browser console (F12) for error details
                </p>
              </div>
            ) : (
              <div key={`matches-${leagueFilter}-${filteredOddsByLeague.length}`}>
                {(() => {
                  // CRITICAL FIX: Filter out live matches when showing upcoming
                  let filteredMatches = filteredOddsByLeague.filter(match => {
                    // Must have bookmakers
                    if (!match.bookmakers || match.bookmakers.length === 0) return false;
                    
                    // If showing "LIVE Now", only show matches that have started
                    if (timeFilter === 'inplay') {
                      const commenceTime = new Date(match.commence_time);
                      const now = new Date();
                      const hoursSinceStart = (now - commenceTime) / (1000 * 60 * 60);
                      
                      // CRICKET: Different durations based on format
                      if (match.sport_key && match.sport_key.includes('cricket')) {
                        if (match.sport_key.includes('test')) {
                          // Test matches: 5 days (120 hours)
                          return hoursSinceStart > 0 && hoursSinceStart < 120 && !match.completed;
                        } else {
                          // ODI/T20: 6-8 hours
                          return hoursSinceStart > 0 && hoursSinceStart < 8 && !match.completed;
                        }
                      }
                      
                      // FOOTBALL: 2-3 hours
                      return hoursSinceStart > 0 && hoursSinceStart < 3 && !match.completed;
                    }
                    
                    // If showing "Upcoming", only show matches that haven't started yet
                    if (timeFilter === 'live-upcoming') {
                      const commenceTime = new Date(match.commence_time);
                      const now = new Date();
                      // Only show matches that start in the future (haven't kicked off yet)
                      return commenceTime > now;
                    }
                    
                    return true;
                  });
                  
                  // Show skeleton loaders while loading
                  if (loading) {
                    return <MatchCardSkeletonList count={5} />;
                  }
                  
                  // CRITICAL FIX: If filtering resulted in 0 matches but we have data, show fallback
                  if (filteredMatches.length === 0) {
                    // If we have data in allOdds, this is just a filter mismatch
                    if (allOdds.length > 0) {
                      console.log('⚠️ Filter resulted in 0 matches but we have', allOdds.length, 'total matches');
                      // Don't show empty state, the useMemo will auto-reset league filter
                    }
                    
                    // Get league name for custom message
                    const getLeagueName = () => {
                      if (filter === 'football' && leagueFilter !== 'all') {
                        return footballLeagues[leagueFilter] || 'this league';
                      }
                      if (filter === 'cricket' && leagueFilter !== 'all') {
                        return cricketLeagues[leagueFilter] || 'this league';
                      }
                      return null;
                    };
                    
                    const leagueName = getLeagueName();
                    const isCricket = filter === 'cricket';
                    
                    return (
                      <div className="text-center py-12 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-8 border border-purple-500/20">
                        <div className="text-6xl mb-4">
                          {isCricket ? '🏏' : '⚽'}
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
                              {isCricket 
                                ? '🏏 Cricket schedules are updated as tournaments and series are announced.'
                                : '⚽ Football matches will appear closer to the season/tournament start date.'}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {isCricket
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
                        {/* First line: Sport title, LIVE indicator, Score */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
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
                              // Different time limits for different sports
                              let maxLiveHours = 3; // Default for football
                              if (match.sport_key && match.sport_key.includes('cricket')) {
                                if (match.sport_key.includes('test')) {
                                  maxLiveHours = 120; // Test matches: 5 days
                                } else {
                                  maxLiveHours = 8; // ODI/T20: 6-8 hours
                                }
                              }
                              
                              if (!isCompleted && hoursSinceStart > 0 && hoursSinceStart < maxLiveHours) {
                                // Format elapsed time based on sport and typical match phases
                                if (match.sport_key && match.sport_key.includes('cricket')) {
                                  // Cricket time formatting
                                  if (elapsedMinutes < 60) {
                                    matchStatus = `${elapsedMinutes} min`;
                                  } else {
                                    const hours = Math.floor(elapsedMinutes / 60);
                                    const mins = elapsedMinutes % 60;
                                    matchStatus = `${hours}h ${mins}m`;
                                  }
                                } else {
                                  // Football time formatting
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
                        <div className="flex items-center gap-2 sm:gap-3 mt-3">
                          <div className="flex-shrink-0">
                            <TeamLogo 
                              logoUrl={teamLogos[homeTeam]} 
                              teamName={homeTeam}
                              sport={match.sport_key}
                              size="md"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* First Line: Team Names with VS */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-white font-semibold truncate text-sm sm:text-base flex-1">{homeTeam}</span>
                              <span className="text-gray-400 text-xs sm:text-sm font-medium px-2">vs</span>
                              <span className="text-white font-semibold truncate text-right text-sm sm:text-base flex-1">{awayTeam}</span>
                            </div>
                            
                            {/* Second Line: FunBet IQ Scores and Prediction */}
                            {(() => {
                              const matchIQ = iqScores[match.id];
                              if (matchIQ && matchIQ.home_iq && matchIQ.away_iq) {
                                const predictedTeam = matchIQ.home_iq > matchIQ.away_iq ? homeTeam : awayTeam;
                                return (
                                  <div className="flex items-center justify-between gap-2 mt-2 text-xs sm:text-sm">
                                    {/* Home IQ Score */}
                                    <span className="text-purple-400 font-bold flex-1">{matchIQ.home_iq}</span>
                                    
                                    {/* Center: Prediction with Confidence */}
                                    <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-lg border border-purple-500/30 flex-shrink-0">
                                      <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-[#FFD700]" />
                                      <span className="text-[#FFD700] font-bold truncate max-w-[100px] sm:max-w-[150px]" title={`${predictedTeam} (${matchIQ.confidence})`}>
                                        {predictedTeam}
                                      </span>
                                      <span className={`text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded ${
                                        matchIQ.confidence === 'High' ? 'bg-green-500/30 text-green-300' :
                                        matchIQ.confidence === 'Medium' ? 'bg-yellow-500/30 text-yellow-300' :
                                        'bg-gray-500/30 text-gray-300'
                                      }`}>
                                        {matchIQ.confidence}
                                      </span>
                                    </div>
                                    
                                    {/* Away IQ Score */}
                                    <span className="text-purple-400 font-bold text-right flex-1">{matchIQ.away_iq}</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className="flex-shrink-0">
                            <TeamLogo 
                              logoUrl={teamLogos[awayTeam]} 
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
                                <div className="flex items-center gap-2">
                                  <span>{homeTeam}</span>
                                </div>
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
                                <div className="flex items-center gap-2">
                                  <span>{awayTeam}</span>
                                </div>
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
                                <td className="py-4 px-4">
                                  <a 
                                    href="https://funbet.me" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                  >
                                    <span className="text-[#FFD700] text-2xl">⭐</span>
                                    <span className="text-[#FFD700] font-bold text-lg">FunBet.me</span>
                                  </a>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <a 
                                    href="https://funbet.me" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                  >
                                    <span className="bg-[#FFD700] text-[#2E004F] px-2 sm:px-5 py-1 sm:py-2 rounded-lg font-black text-base sm:text-2xl hover:bg-[#FFD700]/90 transition-all hover:scale-105 shadow-lg whitespace-nowrap">
                                      {funbetHomeOdds}
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
                                      <span className="bg-[#FFD700] text-[#2E004F] px-2 sm:px-5 py-1 sm:py-2 rounded-lg font-black text-base sm:text-2xl hover:bg-[#FFD700]/90 transition-all hover:scale-105 shadow-lg whitespace-nowrap">
                                        {funbetDrawOdds || '-'}
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
                                    <span className="bg-[#FFD700] text-[#2E004F] px-2 sm:px-5 py-1 sm:py-2 rounded-lg font-black text-base sm:text-2xl hover:bg-[#FFD700]/90 transition-all hover:scale-105 shadow-lg whitespace-nowrap">
                                      {funbetAwayOdds}
                                    </span>
                                  </a>
                                </td>
                              </tr>
                            );
                          })()}
                          
                          {/* Other bookmakers */}
                          {displayedBookmakers.map((bookmaker) => {
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
                loading={loading}
                selectedLeague={leagueFilter !== 'all' ? (filter === 'football' ? footballLeagues[leagueFilter] : cricketLeagues[leagueFilter]) : null}
              />
            </div>
          );
        })()}

        {/* Load More Button */}
        {hasMore && !loading && (
          <div className="mt-8 text-center">
            <button
              onClick={() => fetchAllOdds(true, filter, false)}
              className="px-8 py-3 bg-[#FFD700] text-[#2E004F] rounded-lg font-bold text-lg hover:bg-[#FFD700]/90 transition-all hover:scale-105 shadow-lg"
            >
              Load More Matches
            </button>
            <p className="text-gray-400 text-sm mt-2">
              Showing {filteredOddsByLeague.length} matches
            </p>
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
