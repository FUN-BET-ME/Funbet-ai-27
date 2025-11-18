import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Brain, RefreshCw, AlertCircle, TrendingUp, ExternalLink, CheckCircle, XCircle, Clock, History } from 'lucide-react';
import { Button } from '../components/ui/button';
import { TeamLogo, CountdownTimer, FollowTeamButton, ShareButton } from '../components/MatchComponents';
import { PredictionCardSkeletonList } from '../components/SkeletonLoaders';
import { useFavorites } from '../contexts/FavoritesContext';
import { getTeamLogo, getCricketFlag } from '../services/teamLogos';
import axios from 'axios';

const FunBetIQ = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const sportParam = queryParams.get('sport') || 'all';
  
  const [filter, setFilter] = useState(sportParam);
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'history'
  const [refreshKey, setRefreshKey] = useState(0);
  const [allMatches, setAllMatches] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [teamLogos, setTeamLogos] = useState({});
  const [aiPredictions, setAiPredictions] = useState([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [totalPendingCount, setTotalPendingCount] = useState(0);
  
  // History tab states
  const [historyPredictions, setHistoryPredictions] = useState([]);
  const [historyStats, setHistoryStats] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historySortBy, setHistorySortBy] = useState('correct_first');
  
  // Stats for current predictions tab
  const [accuracyStats, setAccuracyStats] = useState(null);
  
  const { toggleFollowTeam, isFollowing } = useFavorites();

  // Update filter when URL changes
  useEffect(() => {
    const sport = queryParams.get('sport') || 'all';
    setFilter(sport);
  }, [location.search]);

  const sports = ['all', 'football', 'cricket', 'basketball'];

  const sportEmojis = {
    all: '🏆',
    football: '⚽',
    cricket: '🏏',
    basketball: '🏀'
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Fetch data when switching tabs
  useEffect(() => {
    if (activeTab === 'history') {
      fetchPredictionHistory();
    } else {
      // Fetch accuracy stats for current predictions tab
      fetchAccuracyStats();
    }
  }, [activeTab, historyFilter, historySortBy]);

  // Fetch FunBet IQ predictions from new API
  const fetchAIPredictions = async () => {
    setLoadingPredictions(true);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      
      // Determine sport filter - don't send sport param if "all"
      const params = {};  // NO LIMIT - fetch ALL predictions
      if (filter !== 'all') {
        params.sport = filter === 'football' ? 'football' : filter === 'cricket' ? 'cricket' : 'basketball';
      }
      
      console.log('🔍 Fetching IQ with params:', params);
      
      const response = await axios.get(`${BACKEND_URL}/api/funbet-iq/matches`, {
        params,
        timeout: 10000
      });
      
      console.log('📦 IQ API Response:', response.data);
      
      // Store total count for pending stats (use 'total' field for all pending predictions)
      setTotalPendingCount(response.data?.total || response.data?.count || 0);
      
      // Transform IQ data to match card format
      const iqMatches = (response.data?.matches || []).map(match => ({
        match_id: match.match_id,
        home_team: match.home_team,
        away_team: match.away_team,
        sport_key: match.sport_key,
        sport_title: match.sport_key?.replace(/_/g, ' ').toUpperCase() || 'Unknown',
        home_iq: match.home_iq,
        away_iq: match.away_iq,
        confidence: match.confidence,
        verdict: match.verdict,
        home_components: match.home_components,
        away_components: match.away_components,
        home_trend: match.home_trend,
        away_trend: match.away_trend,
        predicted_team: match.home_iq > match.away_iq ? match.home_team : match.away_team,
        win_probability: Math.round(Math.max(match.home_iq, match.away_iq)),
        funbet_odds: (100 / Math.max(match.home_iq, match.away_iq) * 1.05).toFixed(2),
        // Needed for the cards to display
        prediction: match.verdict,
        recommended_bet: match.home_iq > match.away_iq ? 'home' : 'away'
      }));
      
      setAiPredictions(iqMatches);
      console.log('✅ Fetched & transformed', iqMatches.length, 'FunBet IQ matches (Total pending:', response.data?.total || response.data?.count, ')');
      
      // Log confidence distribution for debugging
      const confidenceCounts = iqMatches.reduce((acc, m) => {
        acc[m.confidence] = (acc[m.confidence] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 Confidence distribution:', confidenceCounts);
    } catch (error) {
      console.error('❌ Error fetching FunBet IQ:', error);
      setAiPredictions([]);
      setTotalPendingCount(0);
    } finally {
      setLoadingPredictions(false);
    }
  };

  // Fetch accuracy stats for current predictions tab
  const fetchAccuracyStats = async () => {
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      
      // Fetch accuracy stats
      const accuracyResponse = await axios.get(`${BACKEND_URL}/api/funbet-iq/accuracy`);
      if (accuracyResponse.data.success) {
        setAccuracyStats(accuracyResponse.data.accuracy);
      }
      
      // Fetch total pending count (all sports, not filtered)
      const pendingResponse = await axios.get(`${BACKEND_URL}/api/funbet-iq/matches`, {
        params: { limit: 1 }  // We only need the total count, not the matches
      });
      if (pendingResponse.data.success) {
        setTotalPendingCount(pendingResponse.data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching accuracy stats:', error);
    }
  };

  // Fetch prediction history
  const fetchPredictionHistory = async () => {
    setHistoryLoading(true);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await axios.get(`${BACKEND_URL}/api/funbet-iq/track-record`, {
        params: {},  // NO LIMIT - fetch ALL history
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      setHistoryPredictions(response.data.track_record || []);
      setHistoryStats(response.data.stats || {});
    } catch (error) {
      console.error('Error fetching prediction history:', error);
      setHistoryPredictions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch live scores
  const fetchScores = async () => {
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await axios.get(`${BACKEND_URL}/api/scores`, {
        params: { daysFrom: 1 } // Only fetch recent scores
      });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching scores:', error);
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

  // Fetch all matches when component mounts or refresh is triggered
  useEffect(() => {
    window.scrollTo(0, 0); // Scroll to top on load
    fetchAllMatches();
  }, [refreshKey]);

  // Auto-refresh every 5 minutes for live scores and predictions
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing predictions and scores...');
      setRefreshKey(prev => prev + 1);
    }, 300000); // 5 minutes

    return () => clearInterval(intervalId);
  }, []);

  // Fetch AI predictions on component mount and when refreshKey changes
  useEffect(() => {
    fetchAIPredictions();
  }, [refreshKey]);

  // Fetch AI predictions when filter changes
  useEffect(() => {
    fetchAIPredictions();
  }, [filter]);

  const fetchAllMatches = async () => {
    setLoading(true);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      
      // FAST: Fetch from database instead of 9 slow API calls
      const response = await axios.get(`${BACKEND_URL}/api/odds/all-cached`, {
        params: {
          limit: 200, // Increased to include all sports
          skip: 0
        }
      });
      
      const allMatches = response.data.matches || [];
      
      // Sort by commence_time (earliest first)
      allMatches.sort((a, b) => {
        return new Date(a.commence_time) - new Date(b.commence_time);
      });

      setAllMatches(allMatches);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Logo fetching removed for speed - using sport icons instead

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
          bestBookmaker = bookmaker.title;
        }
      }
    });
    
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

  // Generate AI prediction based on odds
  const sportAllowsDraws = (sportTitle) => {
    const sport = sportTitle?.toLowerCase() || '';
    
    // Baseball is the ONLY sport that doesn't allow draws (extra innings always decide)
    // All other sports can have draws/ties in certain situations:
    // - Football/Soccer: Common
    // - Cricket: Test matches
    // - Rugby: Can happen
    // - MMA: Rare but possible (no decision/draw)
    // - Boxing: Can be scored a draw
    // - Hockey: Possible in regular time (before OT/shootout)
    // - Basketball: Can happen in regular time (before OT)
    // - Tennis: No (but not in our odds)
    
    // Exclude only baseball
    if (sport.includes('baseball') || sport.includes('mlb')) {
      return false;
    }
    
    // All other sports can have draws
    return true;
  };

  const generateAIPrediction = (match) => {
    const bookmakers = match.bookmakers || [];
    if (bookmakers.length === 0) return null;

    const homeBest = getBestOdds(bookmakers, 0, match.home_team, match.away_team);
    const awayBest = getBestOdds(bookmakers, 1, match.home_team, match.away_team);
    
    if (!homeBest || !awayBest) return null;

    // Check if sport allows draws (all sports except baseball)
    const sportHasDraws = sportAllowsDraws(match.sport_title);
    
    // Try to get draw odds from ALL bookmakers (not just first one)
    let drawBest = null;
    if (sportHasDraws) {
      drawBest = getBestOdds(bookmakers, 2, match.home_team, match.away_team);
      
      // If no bookmaker provides draw odds, calculate an implied draw odd
      if (!drawBest && homeBest && awayBest) {
        const homeProb = 1 / homeBest.odds;
        const awayProb = 1 / awayBest.odds;
        const drawProb = Math.max(0.1, 1 - homeProb - awayProb); // Ensure at least 10% probability
        const impliedDrawOdds = 1 / drawProb;
        drawBest = { odds: impliedDrawOdds, bookmaker: 'Calculated' };
      }
    }

    // Calculate FunBet.ME odds (5% better than market best)
    const homeAIOdds = (homeBest.odds * 1.05).toFixed(2);
    const awayAIOdds = (awayBest.odds * 1.05).toFixed(2);
    const drawAIOdds = sportHasDraws && drawBest ? (drawBest.odds * 1.05).toFixed(2) : null;

    // Determine predicted winner (lower odds = higher probability)
    const homeProb = 1 / homeBest.odds;
    const awayProb = 1 / awayBest.odds;
    const drawProb = drawBest ? 1 / drawBest.odds : 0;
    const totalProb = homeProb + awayProb + drawProb;
    
    const homeConfidence = ((homeProb / totalProb) * 100).toFixed(0);
    const awayConfidence = ((awayProb / totalProb) * 100).toFixed(0);
    const drawConfidence = drawProb > 0 ? ((drawProb / totalProb) * 100).toFixed(0) : null;

    const predictedWinner = homeProb > awayProb ? match.home_team : match.away_team;
    const winnerConfidence = Math.max(homeConfidence, awayConfidence);

    // Generate AI analysis
    const analysis = generateAnalysis(match, homeProb > awayProb, winnerConfidence);

    return {
      predictedWinner,
      winnerConfidence,
      homeConfidence,
      awayConfidence,
      drawConfidence,
      homeAIOdds,
      awayAIOdds,
      drawAIOdds,
      homeBestOdds: homeBest.odds,
      awayBestOdds: awayBest.odds,
      drawBestOdds: drawBest?.odds || null,
      homeBestBookmaker: homeBest.bookmaker,
      awayBestBookmaker: awayBest.bookmaker,
      drawBestBookmaker: drawBest?.bookmaker || null,
      sportHasDraws,  // Updated to use sportHasDraws instead of hasDrawOdds
      analysis
    };
  };

  const generateAnalysis = (match, homeWins, confidence) => {
    const analyses = [
      `Based on current market trends, ${homeWins ? match.home_team : match.away_team} shows strong form heading into this matchup.`,
      `FunBet IQ predicts ${homeWins ? match.home_team : match.away_team} will secure a victory with ${confidence}% confidence.`,
      `Market analysis suggests ${homeWins ? match.home_team : match.away_team} has the edge in this contest.`,
      `Statistical indicators favor ${homeWins ? match.home_team : match.away_team} for this upcoming fixture.`
    ];
    
    return analyses[Math.floor(Math.random() * analyses.length)];
  };

  // Filter matches by sport
  const getFilteredMatches = () => {
    if (filter === 'all') return allMatches;
    
    return allMatches.filter(match => {
      const sport = match.sport_title?.toLowerCase() || '';
      
      if (filter === 'football') {
        return sport.includes('soccer') || sport.includes('football') || 
               sport.includes('la liga') || sport.includes('epl') || 
               sport.includes('serie a') || sport.includes('bundesliga') ||
               sport.includes('ligue') || sport.includes('eredivisie');
      }
      
      if (filter === 'cricket') {
        return sport.includes('cricket') || sport.includes('ipl') || 
               sport.includes('twenty20') || sport.includes('t20') || 
               sport.includes('odi') || sport.includes('test') || 
               sport.includes('international');
      }
      
      if (filter === 'basketball') {
        return sport.includes('basketball') || sport.includes('nba') || sport.includes('ncaab');
      }
      
      if (filter === 'hockey') {
        return sport.includes('hockey') || sport.includes('nhl') || sport.includes('ahl');
      }
      
      if (filter === 'baseball') {
        return sport.includes('baseball') || sport.includes('mlb');
      }
      
      if (filter === 'tennis') {
        return sport.includes('tennis') || sport.includes('atp') || sport.includes('wta') || 
               sport.includes('wimbledon') || sport.includes('open');
      }
      
      if (filter === 'boxing') {
        return sport.includes('boxing');
      }
      
      if (filter === 'mma') {
        return sport.includes('mma') || sport.includes('ufc') || sport.includes('mixed martial');
      }
      
      if (filter === 'rugby') {
        return sport.includes('rugby');
      }
      
      return false;
    });
  };

  const filteredMatches = getFilteredMatches();

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-8 h-8 text-[#FFD700]" />
            <h1 className="text-3xl sm:text-4xl font-bold">
              <span className="text-[#FFD700]">FunBet IQ</span>
            </h1>
          </div>
          <p className="text-gray-400 text-lg mb-6">
            Advanced FunBet IQ predictions with confidence ratings, market odds comparison, and match analysis for the next 48 hours.
          </p>
          
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-[#2E004F]/50">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-6 py-3 font-semibold transition-all relative ${
                activeTab === 'current'
                  ? 'text-[#FFD700] border-b-2 border-[#FFD700]'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Current Predictions
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-semibold transition-all relative flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'text-[#FFD700] border-b-2 border-[#FFD700]'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <History className="w-4 h-4" />
              History
            </button>
          </div>
        </div>
        
        {/* Tab Content Wrapper */}
        <div>
          {/* Current Tab Content */}
          {activeTab === 'current' && (
          <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="flex flex-wrap gap-2">
              {sports.map((sport) => (
                <button
                  key={sport}
                  onClick={() => setFilter(sport)}
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

          {/* Performance Stats Section */}
          {accuracyStats && (
            <div className="mb-8 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-2xl p-6 border border-[#FFD700]/20">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-[#FFD700]" />
                <h3 className="text-xl font-bold text-white">Performance Stats</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Total */}
                <div className="bg-purple-900/40 rounded-xl p-4 border border-purple-500/30">
                  <p className="text-gray-400 text-sm mb-1">Total</p>
                  <p className="text-3xl font-bold text-white">{accuracyStats.overall?.total || 0}</p>
                </div>
                
                {/* Correct */}
                <div className="bg-green-900/40 rounded-xl p-4 border border-green-500/30">
                  <p className="text-gray-400 text-sm mb-1">Correct ✓</p>
                  <p className="text-3xl font-bold text-green-400">{accuracyStats.overall?.correct || 0}</p>
                </div>
                
                {/* Incorrect */}
                <div className="bg-red-900/40 rounded-xl p-4 border border-red-500/30">
                  <p className="text-gray-400 text-sm mb-1">Incorrect ✗</p>
                  <p className="text-3xl font-bold text-red-400">{accuracyStats.overall?.incorrect || 0}</p>
                </div>
                
                {/* Pending */}
                <div className="bg-yellow-900/40 rounded-xl p-4 border border-yellow-500/30">
                  <p className="text-gray-400 text-sm mb-1">Pending ⏳</p>
                  <p className="text-3xl font-bold text-yellow-400">{totalPendingCount || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">To be completed</p>
                </div>
                
                {/* Accuracy */}
                <div className="bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/10 rounded-xl p-4 border border-[#FFD700]/40">
                  <p className="text-gray-400 text-sm mb-1">Accuracy</p>
                  <p className="text-3xl font-bold text-[#FFD700]">{accuracyStats.overall?.accuracy_percentage || 0}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Current Tab Content */}
          <div>
          <div className="mb-8 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-[#FFD700]/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-[#FFD700]" />
                <h2 className="text-2xl font-bold text-white">🧠 <span className="text-[#FFD700]">FunBet IQ</span> Predictions</h2>
              </div>
              <span className="text-sm text-gray-400">Updated every 5 minutes</span>
            </div>
            
            {loadingPredictions ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 text-[#FFD700] animate-spin mx-auto mb-2" />
                <p className="text-gray-400">FunBet IQ analyzing matches...</p>
              </div>
            ) : aiPredictions.length === 0 && filteredMatches.length > 0 ? (
              // Show matches with basic predictions when AI predictions not available
              <div>
                <div className="text-center py-4 mb-6 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-400 text-sm">Showing smart predictions based on market odds</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredMatches.slice(0, 20).map((match, index) => {
                    // Calculate basic prediction from odds
                    const getBestOddsForMatch = (match) => {
                      if (!match.bookmakers || match.bookmakers.length === 0) return null;
                      
                      let homeMin = 999, awayMin = 999, drawMin = 999;
                      
                      match.bookmakers.forEach(bookmaker => {
                        const outcomes = bookmaker.markets?.[0]?.outcomes || [];
                        outcomes.forEach(outcome => {
                          const name = outcome.name.toLowerCase();
                          const homeTeam = match.home_team.toLowerCase();
                          const awayTeam = match.away_team.toLowerCase();
                          
                          if (name === homeTeam) homeMin = Math.min(homeMin, outcome.price);
                          else if (name === awayTeam) awayMin = Math.min(awayMin, outcome.price);
                          else if (name.includes('draw') || name.includes('tie')) drawMin = Math.min(drawMin, outcome.price);
                        });
                      });
                      
                      return { homeMin, awayMin, drawMin };
                    };
                    
                    const odds = getBestOddsForMatch(match);
                    if (!odds) return null;
                    
                    // Predict favorite (lowest odds)
                    let predicted = match.home_team;
                    let predictedOdds = odds.homeMin;
                    if (odds.awayMin < predictedOdds) {
                      predicted = match.away_team;
                      predictedOdds = odds.awayMin;
                    }
                    
                    // Calculate confidence (lower odds = higher confidence)
                    const confidence = Math.min(95, Math.round((2 / predictedOdds) * 100));
                    const funbetOdds = (predictedOdds * 1.05).toFixed(2);
                    
                    return (
                      <div 
                        key={match.id || index}
                        className="bg-[#2E004F]/50 rounded-lg p-4 border border-[#FFD700]/10 hover:border-[#FFD700]/50 hover:shadow-lg hover:shadow-[#FFD700]/20 transition-all"
                      >
                        {/* Match Header */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-[#FFD700] bg-[#FFD700]/10 px-2 py-1 rounded">
                            #{index + 1} PICK
                          </span>
                          <span className="text-xs text-gray-400">{match.sport_title}</span>
                        </div>
                        
                        {/* Teams */}
                        <div className="mb-3">
                          <p className="text-sm text-gray-400 mb-1">Match</p>
                          <p className="text-white font-medium">{match.home_team} vs {match.away_team}</p>
                        </div>
                        
                        {/* Prediction */}
                        <div className="mb-3 bg-gradient-to-r from-[#FFD700]/20 to-[#FFD700]/10 rounded-lg p-4 border-2 border-[#FFD700]/50">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">⭐</span>
                            <p className="text-sm font-bold text-[#FFD700]">Smart Pick</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Predicted Winner</p>
                              <p className="text-[#FFD700] font-bold text-lg">{predicted}</p>
                            </div>
                            <div className="bg-[#FFD700] text-[#2E004F] px-4 py-2 rounded-lg">
                              <p className="font-black text-3xl">{funbetOdds}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Confidence */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Confidence</span>
                          <span className="text-[#FFD700] font-bold">{confidence}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : aiPredictions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400">No matches available for predictions right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[...aiPredictions]
                  .sort((a, b) => {
                    // Primary sort: Confidence level (High > Medium > Low)
                    const confidenceOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
                    const aConfidence = confidenceOrder[a.confidence] || 0;
                    const bConfidence = confidenceOrder[b.confidence] || 0;
                    
                    // If confidence levels differ, sort by confidence (descending)
                    if (bConfidence !== aConfidence) {
                      return bConfidence - aConfidence;
                    }
                    
                    // Secondary sort: IQ difference (higher difference = more confident pick)
                    const aIqDiff = Math.abs((a.home_iq || 0) - (a.away_iq || 0));
                    const bIqDiff = Math.abs((b.home_iq || 0) - (b.away_iq || 0));
                    return bIqDiff - aIqDiff;
                  })
                  .map((prediction, index) => {
                  // Determine the sport filter for navigation
                  const sportFilter = prediction.sport_key?.includes('soccer') ? 'football' : 
                                     prediction.sport_key?.includes('cricket') ? 'cricket' : 'all';
                  
                  return (
                  <Link 
                    key={prediction.match_id || index} 
                    to={`/live-odds?filter=${sportFilter}#match-${prediction.match_id}`}
                    className="bg-[#2E004F]/50 rounded-lg p-4 border border-[#FFD700]/10 hover:border-[#FFD700]/50 hover:shadow-lg hover:shadow-[#FFD700]/20 transition-all cursor-pointer block group"
                  >
                    {/* Match Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#FFD700] bg-[#FFD700]/10 px-2 py-1 rounded">
                          #{index + 1} PICK
                        </span>
                        
                        {/* Result Badge */}
                        {prediction.result_verified && prediction.was_correct && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            <span>✓</span>
                          </div>
                        )}
                        {prediction.result_verified && !prediction.was_correct && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold">
                            <XCircle className="w-3 h-3" />
                            <span>✗</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{prediction.sport_title}</span>
                        <TrendingUp className="w-3 h-3 text-[#FFD700] group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                    
                    {/* Teams */}
                    <div className="mb-3">
                      <p className="text-sm text-gray-400 mb-1">Match</p>
                      <p className="text-white font-medium">{prediction.home_team} vs {prediction.away_team}</p>
                    </div>
                    
                    {/* Prediction */}
                    <div className="mb-3 bg-gradient-to-r from-[#FFD700]/20 to-[#FFD700]/10 rounded-lg p-4 border-2 border-[#FFD700]/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">⭐</span>
                        <p className="text-sm font-bold text-[#FFD700]">FunBet.ME</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">FunBet IQ Prediction</p>
                          <p className="text-[#FFD700] font-bold text-lg">{prediction.predicted_team}</p>
                        </div>
                        <div className="bg-[#FFD700] text-[#2E004F] px-4 py-2 rounded-lg">
                          <p className="font-black text-3xl">{prediction.funbet_odds}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <p className="text-xs text-gray-400">Win Probability</p>
                        <p className="text-green-400 font-semibold text-lg">{prediction.win_probability}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">FunBet IQ Confidence</p>
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                (prediction.confidence_score || prediction.confidence) >= 75 ? 'bg-green-500' : 
                                (prediction.confidence_score || prediction.confidence) >= 60 ? 'bg-yellow-500' : 'bg-orange-500'
                              }`}
                              style={{ width: `${prediction.confidence_score || prediction.confidence || 0}%` }}
                            />
                          </div>
                          <span className="text-white font-semibold text-sm">{prediction.confidence_score || prediction.confidence || 'N/A'}%</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Market Consensus */}
                    <div className="mb-3">
                      <p className="text-xs text-gray-400">Market Consensus</p>
                      <p className="text-[#FFD700] font-medium text-sm">{prediction.market_consensus}% of bookmakers agree</p>
                    </div>
                    
                    {/* Reasoning */}
                    <div className="border-t border-[#FFD700]/10 pt-3">
                      <p className="text-xs text-gray-400 mb-2">FunBet IQ Reasoning</p>
                      <div className="space-y-1">
                        {prediction.reasoning?.slice(0, 2).map((reason, i) => (
                          <p key={i} className="text-xs text-gray-300">• {reason}</p>
                        ))}
                      </div>
                    </div>
                  </Link>
                  );
                })}
              </div>
            )}
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-400">
                🤖 FunBet IQ analyzes 100+ matches to find the best value opportunities • 📊 Updated every 5 minutes
              </p>
            </div>
          </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-6">
            <Button
              onClick={handleRefresh}
              disabled={loading}
              className="bg-[#FFD700] text-[#2E004F] hover:bg-[#FFD700]/90"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Predictions
            </Button>
            {lastUpdated && (
              <span className="text-sm text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
        </div>

        {/* Predictions List */}
          <div className="space-y-4">
            {loading ? (
              <PredictionCardSkeletonList count={4} />
            ) : filteredMatches.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No predictions available for this category.</p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">
                {filteredMatches.length} FunBet IQ predictions available. Analyzing odds and trends...
              </p>
            )}
          </div>
        </div>
        </div>
        )}

          {/* History Tab Content */}
          {activeTab === 'history' && (
            <div>
              {/* Stats Card */}
              {historyStats && (
                <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-[#2E004F]/50 rounded-xl p-6 mb-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-[#FFD700]" />
                    Performance Stats
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-purple-900/40 rounded-xl p-4 border border-purple-500/30">
                      <p className="text-gray-400 text-sm mb-1">Total</p>
                      <p className="text-3xl font-bold text-white">{historyStats.total || 0}</p>
                    </div>
                    <div className="bg-green-900/40 rounded-xl p-4 border border-green-500/30">
                      <p className="text-gray-400 text-sm mb-1">Correct ✓</p>
                      <p className="text-3xl font-bold text-green-400">{historyStats.correct || 0}</p>
                    </div>
                    <div className="bg-red-900/40 rounded-xl p-4 border border-red-500/30">
                      <p className="text-gray-400 text-sm mb-1">Incorrect ✗</p>
                      <p className="text-3xl font-bold text-red-400">{historyStats.incorrect || 0}</p>
                    </div>
                    <div className="bg-yellow-900/40 rounded-xl p-4 border border-yellow-500/30">
                      <p className="text-gray-400 text-sm mb-1">Pending ⏳</p>
                      <p className="text-3xl font-bold text-yellow-400">{totalPendingCount || 0}</p>
                      <p className="text-xs text-gray-500 mt-1">To be completed</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/10 rounded-xl p-4 border border-[#FFD700]/40">
                      <p className="text-gray-400 text-sm mb-1">Accuracy</p>
                      <p className="text-3xl font-bold text-[#FFD700]">{historyStats.accuracy || 0}%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Button
                  onClick={() => setHistoryFilter('all')}
                  variant={historyFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className={historyFilter === 'all' ? 'bg-[#FFD700] text-[#2E004F]' : 'bg-transparent border-gray-600 text-gray-300'}
                >
                  All
                </Button>
                
                <Button
                  onClick={() => setHistoryFilter('correct')}
                  variant={historyFilter === 'correct' ? 'default' : 'outline'}
                  size="sm"
                  className={historyFilter === 'correct' ? 'bg-green-600 text-white' : 'bg-transparent border-gray-600 text-gray-300'}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Correct
                </Button>
                
                <Button
                  onClick={() => setHistoryFilter('incorrect')}
                  variant={historyFilter === 'incorrect' ? 'default' : 'outline'}
                  size="sm"
                  className={historyFilter === 'incorrect' ? 'bg-red-600 text-white' : 'bg-transparent border-gray-600 text-gray-300'}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Incorrect
                </Button>
                
                <Button
                  onClick={() => setHistoryFilter('pending')}
                  variant={historyFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  className={historyFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-transparent border-gray-600 text-gray-300'}
                >
                  <Clock className="w-4 h-4 mr-1" />
                  Pending
                </Button>

                <div className="ml-auto">
                  <select
                    value={historySortBy}
                    onChange={(e) => setHistorySortBy(e.target.value)}
                    className="bg-[#2E004F]/50 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="correct_first">✓ Correct First</option>
                    <option value="recent">Most Recent</option>
                  </select>
                </div>
              </div>

              {/* History Predictions List */}
              {historyLoading ? (
                <PredictionCardSkeletonList count={5} />
              ) : historyPredictions.length === 0 ? (
                <div className="text-center py-12 bg-[#2E004F]/30 rounded-xl">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No predictions found for this filter.</p>
                  <p className="text-gray-500 text-sm mt-2">Predictions will appear here once matches are completed and results verified.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyPredictions.map((pred) => (
                    <div
                      key={pred._id || pred.match_id}
                      className="bg-[#2E004F]/30 border border-[#2E004F]/50 rounded-xl p-4 sm:p-6 hover:border-[#FFD700]/30 transition-all"
                    >
                      {/* Header with Result Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Brain className="w-5 h-5 text-[#FFD700]" />
                          <span className="text-gray-400 text-sm">{pred.sport_title || 'Match'}</span>
                        </div>
                        {!pred.result_verified ? (
                          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm">
                            <Clock className="w-4 h-4" />
                            <span className="font-semibold">Pending</span>
                          </div>
                        ) : pred.was_correct ? (
                          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-bold">Correct</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm">
                            <XCircle className="w-5 h-5" />
                            <span className="font-semibold">Incorrect</span>
                          </div>
                        )}
                      </div>

                      {/* Teams */}
                      <div className="grid grid-cols-3 gap-4 items-center mb-4">
                        <div className="text-center relative">
                          <TeamLogo team={pred.home_team} sport={pred.sport_key} size="md" />
                          <p className="text-white font-semibold mt-2 text-sm">{pred.home_team}</p>
                          {/* Yellow badge if this team was predicted */}
                          {pred.predicted_team === pred.home_team && (
                            <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-[#FFD700] text-[#2E004F] rounded-full text-xs font-bold">
                              <TrendingUp className="w-3 h-3" />
                              Our Pick
                            </div>
                          )}
                        </div>
                        
                        <div className="text-center">
                          {pred.scores && pred.scores.length === 2 ? (
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600/30 to-emerald-600/30 rounded-lg border border-green-500/30">
                                <span className="text-white font-bold text-2xl">{pred.scores[0].score}</span>
                                <span className="text-gray-400 font-bold text-xl">-</span>
                                <span className="text-white font-bold text-2xl">{pred.scores[1].score}</span>
                              </div>
                              <span className="text-xs text-green-400 font-semibold">FINAL</span>
                            </div>
                          ) : (
                            <p className="text-gray-500 font-bold text-2xl">VS</p>
                          )}
                        </div>
                        
                        <div className="text-center relative">
                          <TeamLogo team={pred.away_team} sport={pred.sport_key} size="md" />
                          <p className="text-white font-semibold mt-2 text-sm">{pred.away_team}</p>
                          {/* Yellow badge if this team was predicted */}
                          {pred.predicted_team === pred.away_team && (
                            <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-[#FFD700] text-[#2E004F] rounded-full text-xs font-bold">
                              <TrendingUp className="w-3 h-3" />
                              Our Pick
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Prediction Details */}
                      <div className="bg-gradient-to-r from-[#FFD700]/20 to-[#FFD700]/10 rounded-lg p-4 border border-[#FFD700]/30 mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">FunBet IQ Predicted</p>
                            <p className="text-[#FFD700] font-bold text-lg">{pred.predicted_team}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400 mb-1">Confidence</p>
                            <p className="text-white font-bold text-lg">{pred.confidence_score || pred.confidence || 'N/A'}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Actual Result (if verified) */}
                      {pred.result_verified && (
                        <div className={`rounded-lg p-4 border-2 ${
                          pred.was_correct 
                            ? 'bg-green-900/20 border-green-500/50' 
                            : 'bg-red-900/20 border-red-500/50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-xs text-gray-400 mb-1">Actual Winner</p>
                              <p className={`font-bold text-lg ${
                                pred.was_correct ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {pred.actual_winner || 'Unknown'}
                              </p>
                            </div>
                            <div>
                              {pred.was_correct ? (
                                <CheckCircle className="w-8 h-8 text-green-400" />
                              ) : (
                                <XCircle className="w-8 h-8 text-red-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Date */}
                      <div className="mt-4 text-xs text-gray-500">
                        Predicted: {new Date(pred.archived_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })} at {new Date(pred.archived_at).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </div>
                      {pred.verified_at && (
                        <div className="text-xs text-gray-500">
                          Verified: {new Date(pred.verified_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })} at {new Date(pred.verified_at).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-4 sm:p-6 rounded-lg bg-[#2E004F]/10 border border-[#2E004F]/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-white font-semibold mb-2">Important Notice</h3>
              <p className="text-gray-400 text-sm">
                FunBet IQ predictions are for informational purposes only and do not guarantee outcomes. 
                This is an informational platform only. FunBet.AI does not offer betting services 
                or accept any form of monetary transactions. Please gamble responsibly. Visit{' '}
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

export default FunBetIQ;
