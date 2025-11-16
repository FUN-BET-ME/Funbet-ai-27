import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { TeamLogo, CountdownTimer, FollowTeamButton, ShareButton } from './MatchComponents';
import { useFavorites } from '../contexts/FavoritesContext';
import { getTeamLogo, getCricketFlag } from '../services/teamLogos';
import axios from 'axios';

const OddsTable = ({ sportKeys, sportTitle, usePriorityEndpoint = false, refreshTrigger = 0, timeFilter = 'live-upcoming', showAllRows = false, preloadedOdds = null, loading: externalLoading = null, selectedLeague = null }) => {
  const navigate = useNavigate();
  const [oddsData, setOddsData] = useState(preloadedOdds || []);
  const [scores, setScores] = useState([]);
  const [digitainOdds, setDigitainOdds] = useState([]); // Digitain odds for Standard row
  const [loading, setLoading] = useState(externalLoading !== null ? externalLoading : true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedMatches, setExpandedMatches] = useState({});
  const [teamLogos, setTeamLogos] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
  // Removed aiPredictions state - IQ scores now come bundled with odds data
  const [oddsSortBy, setOddsSortBy] = useState({}); // Track sort preference per match: {matchId: 'home'|'draw'|'away'|null}
  const { toggleFollowTeam, isFollowing } = useFavorites();
  
  // Update current time every minute for elapsed time calculation
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);
  
  // Helper function to calculate elapsed time for live matches
  const getElapsedTime = (commenceTime) => {
    try {
      const start = new Date(commenceTime);
      const now = currentTime;
      const diffMs = now - start;
      const diffMinutes = Math.floor(diffMs / 60000);
      
      if (diffMinutes < 0) return null; // Match hasn't started yet
      if (diffMinutes > 150) return null; // Match likely finished (over 2.5 hours)
      
      // Format elapsed time based on typical football match phases
      if (diffMinutes <= 45) {
        return `${diffMinutes}'`; // First half (0-45 min)
      } else if (diffMinutes <= 60) {
        return 'HT'; // Half time break (45-60 min)
      } else if (diffMinutes <= 90) {
        return `${diffMinutes - 15}'`; // Second half (46-90 min, accounting for 15 min HT)
      } else if (diffMinutes <= 105) {
        return `90+${diffMinutes - 90}'`; // Injury time (90+ min)
      } else if (diffMinutes <= 120) {
        return `${diffMinutes - 30}'`; // Extra time (91-120 min total)
      } else {
        return `120+'`; // Penalties or late extra time
      }
    } catch (e) {
      console.error('Error calculating elapsed time:', e);
      return null;
    }
  };

  // Fetch live scores from ESPN
  const fetchScores = async () => {
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await axios.get(`${BACKEND_URL}/api/espn/scores`);
      return response.data?.scores || [];
    } catch (error) {
      console.error('Error fetching ESPN scores:', error);
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

  const fetchOdds = async () => {
    setLoading(true);
    setError(null);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      
      // If showing Recent Results, fetch historical odds
      if (timeFilter === 'recent-results') {
        let historicalData = [];
        
        // For Cricket, use dedicated cricket API
        if (sportTitle && sportTitle.toLowerCase() === 'cricket') {
          console.log('[OddsTable] Fetching cricket recent results...');
          const response = await axios.get(`${BACKEND_URL}/api/cricket/recent`);
          console.log('[OddsTable] Cricket API response:', response.data);
          const cricketData = response.data?.data || response.data || [];
          console.log('[OddsTable] Cricket matches found:', cricketData.length);
          historicalData = cricketData;
        } else {
          // For other sports, use general historical endpoint
          const response = await axios.get(`${BACKEND_URL}/api/odds/historical/recent`);
          historicalData = response.data || [];
          
          // Filter by sport if needed
          if (sportTitle && sportTitle.toLowerCase() !== 'all') {
            historicalData = historicalData.filter(match => {
              const matchSport = match.sport_title?.toLowerCase() || '';
              const filterSport = sportTitle.toLowerCase();
              // Match sport (football matches multiple leagues)
              if (filterSport === 'football') {
                return matchSport.includes('football') || matchSport.includes('liga') || 
                       matchSport.includes('premier') || matchSport.includes('champions') || 
                       matchSport.includes('série') || matchSport.includes('bundesliga');
              } else if (filterSport === 'basketball') {
                return matchSport.includes('basketball') || matchSport.includes('nba');
              } else if (filterSport === 'hockey') {
                return matchSport.includes('hockey') || matchSport.includes('nhl');
              } else if (filterSport === 'baseball') {
                return matchSport.includes('baseball') || matchSport.includes('mlb');
              }
              return matchSport.includes(filterSport);
            });
          }
        }
        
        console.log('[OddsTable] Setting oddsData with', historicalData.length, 'matches');
        setOddsData(historicalData);
        setScores([]); // Scores already in historical data
        setLastUpdated(new Date());
        setLoading(false);
        console.log('[OddsTable] State updated, loading=false');
        return;
      }
      
      // Fetch scores, odds, and Digitain in parallel for live/upcoming
      const [scoresData, oddsResults, digitainLiveData, digitainPrematchData] = await Promise.all([
        fetchScores(),
        (async () => {
          let allMatches = [];

          // Use cached endpoint with sport filter for ALL sports
          if (usePriorityEndpoint && sportTitle === 'Cricket') {
            const apiURL = `${BACKEND_URL}/api/odds/all-cached?sport=cricket&limit=100&skip=0`;
            console.log('[OddsTable CRICKET] Fetching from:', apiURL);
            const response = await axios.get(apiURL);
            allMatches = response.data?.matches || [];
          } else if (usePriorityEndpoint && sportTitle === 'Football') {
            const apiURL = `${BACKEND_URL}/api/odds/all-cached?sport=soccer&limit=100&skip=0`;
            console.log('[OddsTable FOOTBALL] Fetching from:', apiURL);
            const response = await axios.get(apiURL);
            allMatches = response.data?.matches || [];
          } else {
            // Extract generic sport name from specific sport keys (e.g., 'soccer_epl' -> 'soccer')
            let sportFilter = null;
            if (sportKeys && sportKeys.length > 0 && sportKeys[0] !== 'all') {
              const firstKey = sportKeys[0];
              // Extract sport prefix before underscore
              sportFilter = firstKey.split('_')[0];
            }
            
            const apiURL = sportFilter 
              ? `${BACKEND_URL}/api/odds/all-cached?sport=${sportFilter}&limit=100&skip=0`
              : `${BACKEND_URL}/api/odds/all-cached?limit=100&skip=0`;
            
            console.log('[OddsTable] Fetching from:', apiURL, 'sportKeys:', sportKeys, 'extracted sportFilter:', sportFilter);
            
            try {
              const response = await axios.get(apiURL);
              allMatches = response.data?.matches || [];
            } catch (err) {
              console.error(`Error fetching odds:`, err);
            }
          }
      
      return allMatches;
        })(),
        // Fetch Digitain LIVE odds
        axios.get(`${BACKEND_URL}/api/digitain/live`).catch(err => {
          console.warn('Digitain Live API unavailable:', err);
          return { data: { data: [] } };
        }),
        // Fetch Digitain PREMATCH odds for upcoming matches
        axios.get(`${BACKEND_URL}/api/digitain/prematch`).catch(err => {
          console.warn('Digitain Prematch API unavailable:', err);
          return { data: { data: [] } };
        })
      ]);
      
      // Sort by date (soonest first)
      oddsResults.sort((a, b) => {
        return new Date(a.commence_time) - new Date(b.commence_time);
      });
      
      setScores(scoresData);
      setOddsData(oddsResults);
      
      // Merge Digitain LIVE and PREMATCH odds for Standard row
      const digitainLiveMatches = digitainLiveData?.data?.data || [];
      const digitainPrematchMatches = digitainPrematchData?.data?.data || [];
      const allDigitainMatches = [...digitainLiveMatches, ...digitainPrematchMatches];
      setDigitainOdds(allDigitainMatches);
      console.log('[OddsTable] Digitain matches loaded:', allDigitainMatches.length, '(Live:', digitainLiveMatches.length, '+ Prematch:', digitainPrematchMatches.length, ')');
      
      setLastUpdated(new Date());
      
      // Fetch team logos for all matches
      fetchTeamLogos(oddsResults);
    } catch (err) {
      setError('Failed to load odds data. Please try again.');
      console.error('Error fetching odds:', err);
    } finally {
      setLoading(false);
    }
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

  const toggleMatchExpansion = (matchId) => {
    setExpandedMatches(prev => ({
      ...prev,
      [matchId]: !prev[matchId]
    }));
  };

  // Fetch team logos for matches
  const fetchTeamLogos = async (matches) => {
    const logos = {};
    const promises = [];
    
    matches.forEach(match => {
      const isCricket = match.sport_key && match.sport_key.includes('cricket');
      
      if (match.home_team && !teamLogos[match.home_team]) {
        promises.push(
          (isCricket ? 
            getCricketFlag(match.home_team) : 
            getTeamLogo(match.home_team, match.sport_key)
          ).then(url => {
            if (url) logos[match.home_team] = url;
          })
        );
      }
      if (match.away_team && !teamLogos[match.away_team]) {
        promises.push(
          (isCricket ? 
            getCricketFlag(match.away_team) : 
            getTeamLogo(match.away_team, match.sport_key)
          ).then(url => {
            if (url) logos[match.away_team] = url;
          })
        );
      }
    });
    
    await Promise.allSettled(promises);
    setTeamLogos(prev => ({ ...prev, ...logos }));
  };


  // Removed fetchAIPredictions - IQ scores now come bundled with odds data

  // Update oddsData when preloadedOdds changes (including when it becomes empty!)
  useEffect(() => {
    if (preloadedOdds !== null) {
      console.log('[OddsTable] Preloaded odds changed:', preloadedOdds.length, 'matches');
      if (preloadedOdds.length > 0) {
        console.log('[OddsTable] First match sport:', preloadedOdds[0].sport_key, preloadedOdds[0].home_team);
      }
      setOddsData(preloadedOdds);
      setLoading(false);
    }
  }, [preloadedOdds]);

  // Update loading state when external loading changes
  useEffect(() => {
    if (externalLoading !== null) {
      setLoading(externalLoading);
    }
  }, [externalLoading]);

  useEffect(() => {
    // Skip fetching if we have preloaded data (even if empty array)
    if (preloadedOdds !== null) {
      console.log('[OddsTable] Skipping fetch - using preloaded data:', preloadedOdds.length, 'matches');
      return;
    }
    
    console.log('[OddsTable] Fetching own data - no preloaded data');
    fetchOdds();
    // Auto-refresh every 2 minutes for live odds and scores
    const interval = setInterval(() => {
      fetchOdds();
    }, 120000); // 2 minutes
    return () => clearInterval(interval);
  }, [refreshTrigger, preloadedOdds]); // Re-fetch when refreshTrigger OR preloadedOdds changes

  return (
    <div>
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
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-32 bg-white/5 border border-[#2E004F]/30 rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Odds Data */}
      {!loading && !error && oddsData.length > 0 && (
        <div className="space-y-6">
          {oddsData
            .filter(match => {
              // For Recent Results, show matches even without odds (scores only)
              if (timeFilter === 'recent-results') {
                return true; // Show all completed matches with scores
              }
              // For live/upcoming, only show matches with odds
              return match.bookmakers && match.bookmakers.length > 0;
            })
            .map((match) => (
            <Link 
              key={match.id}
              to={`/match/${match.id}`}
              className="block bg-white/5 border border-[#2E004F]/30 rounded-lg overflow-hidden hover:border-[#FFD700]/50 hover:shadow-lg hover:shadow-[#FFD700]/20 transition-all cursor-pointer"
            >
              {/* Match Header */}
              <div className="bg-[#2E004F]/50 px-6 py-4 border-b border-[#2E004F]/30">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    {/* First line: AI Icon (PROMINENT), Sport title, LIVE indicator, Score, Countdown */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {/* FunBet IQ - PROMINENT HEADER POSITION */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/prediction/${match.id}`);
                        }}
                        className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded sm:rounded-lg transition-all duration-200 shadow-sm sm:shadow-lg shadow-purple-500/30 group"
                        title="View FunBet IQ Smart Pick"
                      >
                        <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-[#FFD700] group-hover:scale-110 transition-transform" />
                        <span className="text-white text-[10px] sm:text-xs font-bold">IQ</span>
                      </button>
                      <span className="text-xs font-semibold text-[#FFD700] bg-[#FFD700]/10 px-2 py-1 rounded">
                        {match.sport_title}
                      </span>
                      <CountdownTimer commenceTime={match.commence_time} completed={match.live_score?.completed} />
                      {new Date(match.commence_time) < new Date() && (() => {
                        // For recent results, scores are in match.scores
                        // For live/upcoming, scores are in separate scores array
                        const matchScore = match.scores ? match : findScoreForMatch(match, scores);
                        const isCompleted = match.completed || false;
                        
                        // Debug logging for Recent Results
                        if (timeFilter === 'recent-results' && match.home_team?.includes('Bragantino')) {
                          console.log('[DEBUG Bragantino]', {
                            completed: isCompleted,
                            hasScores: !!matchScore?.scores,
                            scores: matchScore?.scores,
                            matchScores: match.scores
                          });
                        }
                        
                        // ALWAYS show FINAL badge for completed matches, even without scores
                        if (isCompleted || matchScore?.scores) {
                          let homeScore = null;
                          let awayScore = null;
                          let hasScores = false;
                          
                          // Try to get scores from match.scores first (for historical/completed matches)
                          if (match.scores && Array.isArray(match.scores)) {
                            match.scores.forEach(scoreData => {
                              if (scoreData.name === match.home_team) {
                                homeScore = scoreData.score;
                                hasScores = true;
                              } else if (scoreData.name === match.away_team) {
                                awayScore = scoreData.score;
                                hasScores = true;
                              }
                            });
                            
                            // Debug for Bragantino
                            if (match.home_team?.includes('Bragantino')) {
                              console.log('[DEBUG Scores]', {
                                match: `${match.home_team} vs ${match.away_team}`,
                                scores: match.scores,
                                homeScore,
                                awayScore,
                                hasScores
                              });
                            }
                          }
                          
                          // Fallback to matchScore.scores (for live matches from ESPN)
                          if (!hasScores && matchScore?.scores) {
                            matchScore.scores.forEach(scoreData => {
                              if (scoreData.name === match.home_team) {
                                homeScore = scoreData.score;
                                hasScores = true;
                              } else if (scoreData.name === match.away_team) {
                                awayScore = scoreData.score;
                                hasScores = true;
                              }
                            });
                          }
                          
                          // Calculate elapsed time for live matches
                          const elapsedTime = !isCompleted ? getElapsedTime(match.commence_time) : null;
                          
                          return (
                            <>
                              {/* Only show scores - LIVE/FINAL badges are handled by CountdownTimer */}
                              {hasScores && homeScore && awayScore && (
                                <span className="text-white text-xs font-bold bg-blue-600/20 px-2 py-1 rounded border border-blue-500/30">
                                  {homeScore} - {awayScore}
                                </span>
                              )}
                              {matchScore?.match_status && !isCompleted && !elapsedTime && (
                                <span className="text-yellow-400 text-xs font-medium bg-yellow-400/10 px-2 py-1 rounded border border-yellow-400/30">
                                  {matchScore.match_status}
                                </span>
                              )}
                            </>
                          );
                        }
                        
                        // Don't show anything if no score data available
                        return null;
                      })()}
                    </div>
                    
                    {/* Team names with logos */}
                    <div className="flex items-center gap-2 sm:gap-3 mt-3">
                      <div className="flex-shrink-0">
                        <TeamLogo 
                          logoUrl={teamLogos[match.home_team]} 
                          teamName={match.home_team}
                          sport={match.sport_key}
                          size="md"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* First Line: Team Names with VS */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white font-semibold truncate text-sm sm:text-base flex-1">{match.home_team}</span>
                          <span className="text-gray-400 text-xs sm:text-sm font-medium px-2">vs</span>
                          <span className="text-white font-semibold truncate text-right text-sm sm:text-base flex-1">{match.away_team}</span>
                        </div>
                        
                        {/* Second Line: FunBet IQ Scores and Prediction */}
                        {(() => {
                          const matchIQ = match.funbet_iq; // IQ data comes with odds now!
                          if (matchIQ && matchIQ.home_iq && matchIQ.away_iq) {
                            const predictedTeam = matchIQ.home_iq > matchIQ.away_iq ? match.home_team : match.away_team;
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
                          logoUrl={teamLogos[match.away_team]} 
                          teamName={match.away_team}
                          sport={match.sport_key}
                          size="md"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <FollowTeamButton 
                      homeTeam={match.home_team}
                      awayTeam={match.away_team}
                      isFollowing={isFollowing}
                      onToggle={toggleFollowTeam}
                    />
                    <ShareButton 
                      matchTitle={`${match.home_team} vs ${match.away_team}`}
                      url={window.location.href}
                    />
                    <span className="text-sm text-gray-400 ml-2">
                      {new Set(match.bookmakers?.map(b => b.title) || []).size} bookmakers
                    </span>
                  </div>
                </div>
              </div>

              {/* Odds Comparison Table */}
              <div className="p-6">
                {match.bookmakers && match.bookmakers.length > 0 ? (
                  <div className="overflow-x-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#2E004F]/30">
                          <th className="text-left py-1.5 px-1 sm:py-3 sm:px-4 text-[10px] sm:text-sm font-semibold text-gray-400">
                            Bookmaker
                          </th>
                          {(() => {
                            const outcomes = match.bookmakers[0].markets[0].outcomes;
                            const isFootball = sportTitle?.toLowerCase() === 'football' || 
                                             match.sport_title?.toLowerCase().includes('soccer') || 
                                             match.sport_title?.toLowerCase().includes('football');
                            
                            // Check if sport allows draws (only football/soccer and cricket have draws)
                            const sportKey = match.sport_key?.toLowerCase() || '';
                            const sportTitle = match.sport_title?.toLowerCase() || '';
                            const sportAllowsDraws = (sportKey.includes('soccer') || sportKey.includes('cricket')) ||
                                                    (sportTitle.includes('football') || sportTitle.includes('cricket'));
                            
                            // Only show 3 columns (Home-Draw-Away) for sports that allow draws
                            const shouldShow3Outcomes = sportAllowsDraws;
                            const actualOutcomeCount = outcomes.length;
                            
                            // Build headers with actual team names
                            const headers = [];
                            
                            // First column: Home team
                            headers.push(
                              <th key="home" className="text-center py-1.5 px-0.5 sm:py-3 sm:px-4 text-[10px] sm:text-sm font-semibold text-gray-400 w-[25%]">
                                <button
                                  onClick={() => {
                                    setOddsSortBy(prev => ({
                                      ...prev,
                                      [match.id]: prev[match.id] === 'home' ? null : 'home'
                                    }));
                                  }}
                                  className="flex items-center justify-center gap-1 mx-auto hover:text-[#FFD700] transition-colors"
                                  title="Sort by Home odds (highest to lowest)"
                                >
                                  <span>{match.home_team}</span>
                                  {oddsSortBy[match.id] === 'home' ? (
                                    <ChevronDown className="w-4 h-4 text-[#FFD700]" />
                                  ) : (
                                    <ChevronUp className="w-4 h-4 opacity-30" />
                                  )}
                                </button>
                              </th>
                            );
                            
                            // Middle column: Draw/Tie-Draw (only for non-baseball sports)
                            if (shouldShow3Outcomes) {
                              headers.push(
                                <th key="draw" className="text-center py-1.5 px-0.5 sm:py-3 sm:px-4 text-[10px] sm:text-sm font-semibold text-gray-400 w-[25%]">
                                  <button
                                    onClick={() => {
                                      setOddsSortBy(prev => ({
                                        ...prev,
                                        [match.id]: prev[match.id] === 'draw' ? null : 'draw'
                                      }));
                                    }}
                                    className="flex items-center justify-center gap-1 mx-auto hover:text-[#FFD700] transition-colors"
                                    title="Sort by Draw odds (highest to lowest)"
                                  >
                                    <span>{isFootball ? 'Draw' : 'Tie/Draw'}</span>
                                    {oddsSortBy[match.id] === 'draw' ? (
                                      <ChevronDown className="w-4 h-4 text-[#FFD700]" />
                                    ) : (
                                      <ChevronUp className="w-4 h-4 opacity-30" />
                                    )}
                                  </button>
                                </th>
                              );
                            }
                            
                            // Last column: Away team
                            headers.push(
                              <th key="away" className="text-center py-1.5 px-0.5 sm:py-3 sm:px-4 text-[10px] sm:text-sm font-semibold text-gray-400 w-[25%]">
                                <button
                                  onClick={() => {
                                    setOddsSortBy(prev => ({
                                      ...prev,
                                      [match.id]: prev[match.id] === 'away' ? null : 'away'
                                    }));
                                  }}
                                  className="flex items-center justify-center gap-1 mx-auto hover:text-[#FFD700] transition-colors"
                                  title="Sort by Away odds (highest to lowest)"
                                >
                                  <span>{match.away_team}</span>
                                  {oddsSortBy[match.id] === 'away' ? (
                                    <ChevronDown className="w-4 h-4 text-[#FFD700]" />
                                  ) : (
                                    <ChevronUp className="w-4 h-4 opacity-30" />
                                  )}
                                </button>
                              </th>
                            );
                            
                            return headers;
                          })()}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Remove duplicate bookmakers by TITLE (not key)
                          // Keep the one with best total odds for each title
                          const bookmakersByTitle = {};
                          (match.bookmakers || []).forEach(bookmaker => {
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

                          // Get match ID
                          const matchId = match.id || `${match.home_team}_${match.away_team}_${match.commence_time}`;
                          const currentSort = oddsSortBy[matchId];

                          // SORTING LOGIC: User can sort by Home, Draw, or Away odds
                          const sortedBookmakers = [...uniqueBookmakers].sort((a, b) => {
                            // If user selected a specific outcome to sort by
                            if (currentSort) {
                              const aOutcomes = a.markets[0]?.outcomes || [];
                              const bOutcomes = b.markets[0]?.outcomes || [];
                              
                              if (currentSort === 'home') {
                                const aHome = aOutcomes.find(o => o.name === match.home_team)?.price || 0;
                                const bHome = bOutcomes.find(o => o.name === match.home_team)?.price || 0;
                                return bHome - aHome; // Highest first
                              } else if (currentSort === 'draw') {
                                const aDraw = aOutcomes.find(o => o.name?.toLowerCase().includes('draw'))?.price || 0;
                                const bDraw = bOutcomes.find(o => o.name?.toLowerCase().includes('draw'))?.price || 0;
                                return bDraw - aDraw; // Highest first
                              } else if (currentSort === 'away') {
                                const aAway = aOutcomes.find(o => o.name === match.away_team)?.price || 0;
                                const bAway = bOutcomes.find(o => o.name === match.away_team)?.price || 0;
                                return bAway - aAway; // Highest first
                              }
                            }
                            
                            // Default: Sort by best total odds
                            return b.totalOdds - a.totalOdds;
                          });

                          // Priority bookmakers to always show in top 4
                          const priorityBookmakers = ['funbet', 'onexbet', 'betfair_sb_uk', 'betfair_ex_uk', 'bet365', 'williamhill', 'pinnacle'];
                          
                          // Sort bookmakers: Priority first, then by best odds
                          const prioritySorted = sortedBookmakers.sort((a, b) => {
                            const aPriority = priorityBookmakers.indexOf(a.key);
                            const bPriority = priorityBookmakers.indexOf(b.key);
                            
                            // If both are priority, sort by position in priority list
                            if (aPriority !== -1 && bPriority !== -1) {
                              return aPriority - bPriority;
                            }
                            
                            // Priority bookmakers come first
                            if (aPriority !== -1) return -1;
                            if (bPriority !== -1) return 1;
                            
                            // Otherwise sort by total odds
                            return b.totalOdds - a.totalOdds;
                          });
                          
                          // Check if expanded
                          const isExpanded = expandedMatches[matchId];
                          const displayedBookmakers = isExpanded ? prioritySorted : prioritySorted.slice(0, 4);
                          
                          // Separate FunBet to always show first with special styling
                          const funbetBookmaker = displayedBookmakers.find(b => b && b.key === 'funbet');
                          
                          // CRITICAL: Filter out FunBet from other bookmakers to prevent duplicate display
                          const otherBookmakers = displayedBookmakers.filter(b => b && b.key && b.key !== 'funbet');
                          
                          // Determine if sport allows draws (only football/soccer and cricket)
                          const sportKey = match.sport_key?.toLowerCase() || '';
                          const sportTitle = match.sport_title?.toLowerCase() || '';
                          const sportAllowsDraws = (sportKey.includes('soccer') || sportKey.includes('cricket')) ||
                                                  (sportTitle.includes('football') || sportTitle.includes('cricket'));
                          
                          // Calculate best odds from ALL unique bookmakers by matching team names
                          const bestOdds = {};
                          const outcomeNames = [];
                          
                          // Build outcomeNames array from home/away teams
                          outcomeNames.push(match.home_team);
                          if (sportAllowsDraws) {
                            outcomeNames.push('Draw'); // or 'Tie/Draw' - we'll search for it
                          }
                          outcomeNames.push(match.away_team);
                          
                          // Calculate best odds for each outcome by matching team names
                          // EXCLUDE FunBet from best odds calculation (FunBet is always 5% higher)
                          outcomeNames.forEach(targetName => {
                            let maxOdds = 0;
                            uniqueBookmakers.forEach(bookmaker => {
                              // Skip FunBet when calculating best market odds
                              if (bookmaker.key === 'funbet') return;
                              
                              const outcomes = bookmaker.markets?.[0]?.outcomes || [];
                              
                              // Find outcome by matching name
                              let matchingOutcome = null;
                              if (targetName === match.home_team) {
                                matchingOutcome = outcomes.find(o => 
                                  o.name && match.home_team && 
                                  o.name.trim().toLowerCase() === match.home_team.trim().toLowerCase()
                                );
                              } else if (targetName === match.away_team) {
                                matchingOutcome = outcomes.find(o => 
                                  o.name && match.away_team && 
                                  o.name.trim().toLowerCase() === match.away_team.trim().toLowerCase()
                                );
                              } else if (targetName === 'Draw') {
                                matchingOutcome = outcomes.find(o => 
                                  o.name && (
                                    o.name.toLowerCase().includes('draw') ||
                                    o.name.toLowerCase().includes('tie')
                                  )
                                );
                              }
                              
                              if (matchingOutcome && matchingOutcome.price > maxOdds) {
                                maxOdds = matchingOutcome.price;
                              }
                            });
                            
                            if (maxOdds > 0) {
                              bestOdds[targetName] = maxOdds;
                            }
                          });
                          
                          // DEBUG: Log for Tottenham match
                          if (match.home_team?.includes('Tottenham')) {
                            console.log('[DEBUG Tottenham] Best Odds:', bestOdds);
                            console.log('[DEBUG Tottenham] Outcome Names:', outcomeNames);
                          }
                          
                          // For non-baseball sports, ensure we have 3 outcomes even if bookmakers don't provide draw
                          if (sportAllowsDraws && outcomeNames.length === 2) {
                            // Calculate implied draw odds
                            const homeOdds = bestOdds[outcomeNames[0]];
                            const awayOdds = bestOdds[outcomeNames[1]];
                            
                            if (homeOdds && awayOdds) {
                              const homeProb = 1 / homeOdds;
                              const awayProb = 1 / awayOdds;
                              const drawProb = Math.max(0.1, 1 - homeProb - awayProb);
                              const impliedDrawOdds = 1 / drawProb;
                              
                              // Insert Draw in the middle
                              outcomeNames.splice(1, 0, 'Draw');
                              bestOdds['Draw'] = impliedDrawOdds;
                            }
                          } else if (sportAllowsDraws && outcomeNames.length > 2) {
                            // Check if we need to find draw odds from any bookmaker
                            let drawOddsFound = false;
                            uniqueBookmakers.forEach(bookmaker => {
                              const outcomes = bookmaker.markets?.[0]?.outcomes;
                              if (outcomes && outcomes.length > 2 && outcomes[2]?.price) {
                                const drawPrice = outcomes[2].price;
                                if (!bestOdds['Draw'] || drawPrice > bestOdds['Draw']) {
                                  bestOdds['Draw'] = drawPrice;
                                  drawOddsFound = true;
                                }
                              }
                            });
                            
                            // If still no draw odds, calculate implied
                            if (!drawOddsFound || !bestOdds['Draw']) {
                              const homeOdds = bestOdds[outcomeNames[0]];
                              const awayOdds = bestOdds[outcomeNames[outcomeNames.length - 1]];
                              
                              if (homeOdds && awayOdds) {
                                const homeProb = 1 / homeOdds;
                                const awayProb = 1 / awayOdds;
                                const drawProb = Math.max(0.1, 1 - homeProb - awayProb);
                                bestOdds['Draw'] = 1 / drawProb;
                              }
                            }
                          }

                          // Calculate FunBet.ME odds (5% better than market best)
                          const funbetSuperBoostOdds = {};
                          outcomeNames.forEach(name => {
                            if (bestOdds[name]) {
                              funbetSuperBoostOdds[name] = (bestOdds[name] * 1.05).toFixed(2);
                            }
                          });

                          // FunBet.ME row first
                          const funbetSuperBoostRow = (
                            <tr key="funbet-super-boost" className="border-b-2 border-[#FFD700] bg-gradient-to-r from-[#FFD700]/20 to-[#FFD700]/10">
                              <td className="py-2 px-1 sm:py-3 sm:px-4 text-sm font-semibold text-white">
                                <a 
                                  href="https://funbet.me" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 sm:gap-2 hover:text-[#FFD700] transition-colors"
                                >
                                  <span className="text-[#FFD700] text-base sm:text-sm font-semibold leading-none">⭐</span>
                                  <span className="text-[#FFD700] text-[10px] sm:text-sm font-semibold whitespace-nowrap leading-none">FunBet.me</span>
                                </a>
                              </td>
                              {outcomeNames.map((name) => (
                                <td key={name} className="py-2 px-0.5 sm:py-3 sm:px-4 text-center w-[25%]">
                                  <a 
                                    href="https://funbet.me" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                  >
                                    <span className="inline-block px-1.5 py-0.5 sm:px-3 sm:py-1.5 rounded font-black text-xs sm:text-base bg-[#FFD700] text-[#2E004F] hover:bg-[#FFD700]/90 transition-all hover:scale-105 shadow-sm">
                                      {funbetSuperBoostOdds[name] || '-'}
                                    </span>
                                  </a>
                                </td>
                              ))}
                            </tr>
                          );

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
                          
                          // Find matching Digitain odds for FunBet.ME Standard row
                          const digitainMatch = digitainOdds.find(dm => {
                            const homeMatch = teamsMatch(dm.home_team, match.home_team);
                            const awayMatch = teamsMatch(dm.away_team, match.away_team);
                            return homeMatch && awayMatch;
                          });

                          // FunBet.ME Standard row (HYBRID: Try Digitain first, fallback to average)
                          const digitainStandardOdds = {};
                          let usingDigitain = false;
                          
                          // Try Digitain first
                          if (digitainMatch && digitainMatch.bookmakers && digitainMatch.bookmakers.length > 0) {
                            const digitainBookmaker = digitainMatch.bookmakers[0];
                            const digitainOutcomes = digitainBookmaker?.markets?.[0]?.outcomes || [];
                            
                            outcomeNames.forEach(name => {
                              const outcome = digitainOutcomes.find(o => 
                                o.name && (
                                  teamsMatch(o.name, name) ||
                                  (name === 'Draw' && (o.name.toLowerCase().includes('draw') || o.name.toLowerCase().includes('tie')))
                                )
                              );
                              if (outcome) {
                                digitainStandardOdds[name] = outcome.price?.toFixed(2);
                                usingDigitain = true;
                              }
                            });
                          }
                          
                          // Fallback: Calculate average from all bookmakers if Digitain not available
                          if (!usingDigitain) {
                            outcomeNames.forEach(name => {
                              const oddsForOutcome = [];
                              match.bookmakers?.forEach(bookmaker => {
                                const outcomes = bookmaker.markets?.[0]?.outcomes || [];
                                const outcome = outcomes.find(o => 
                                  o.name && (
                                    teamsMatch(o.name, name) ||
                                    (name === 'Draw' && (o.name.toLowerCase().includes('draw') || o.name.toLowerCase().includes('tie')))
                                  )
                                );
                                if (outcome?.price) {
                                  oddsForOutcome.push(outcome.price);
                                }
                              });
                              
                              // Calculate average
                              if (oddsForOutcome.length > 0) {
                                const average = oddsForOutcome.reduce((a, b) => a + b, 0) / oddsForOutcome.length;
                                digitainStandardOdds[name] = average.toFixed(2);
                              }
                            });
                          }

                          // FunBet.ME Boost row (5% on Digitain Favourites & Underdog, Draw as-is)
                          const funbetBoostOdds = {};
                          if (Object.keys(digitainStandardOdds).length > 0) {
                            // Get odds values to identify favourite and underdog
                            const oddsValues = Object.entries(digitainStandardOdds).map(([name, odds]) => ({
                              name,
                              value: parseFloat(odds)
                            }));
                            
                            // Sort by odds value (lower odds = favourite, higher odds = underdog)
                            oddsValues.sort((a, b) => a.value - b.value);
                            
                            outcomeNames.forEach(name => {
                              if (digitainStandardOdds[name]) {
                                const odds = parseFloat(digitainStandardOdds[name]);
                                
                                // Identify if this is favourite, underdog, or draw
                                const isFavourite = oddsValues.length > 0 && oddsValues[0].name === name;
                                const isUnderdog = oddsValues.length > 0 && oddsValues[oddsValues.length - 1].name === name;
                                const isDraw = name.toLowerCase().includes('draw') || (oddsValues.length === 3 && oddsValues[1].name === name);
                                
                                if (isFavourite || isUnderdog) {
                                  // Apply 5% boost to favourite and underdog
                                  funbetBoostOdds[name] = (odds * 1.05).toFixed(2);
                                } else {
                                  // Copy draw as-is
                                  funbetBoostOdds[name] = digitainStandardOdds[name];
                                }
                              }
                            });
                          }

                          const funbetBoostRow = (
                            <tr key="funbet-boost" className="border-b border-[#FFD700]/40 bg-gradient-to-r from-[#FFD700]/15 to-[#FFD700]/8">
                              <td className="py-3 px-4 text-sm font-semibold text-white">
                                <a 
                                  href="https://funbet.me" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 hover:text-[#FFD700] transition-colors"
                                >
                                  <span className="text-[#FFD700] text-base">🚀</span>
                                  <span className="text-[#FFD700] font-semibold">FunBet.ME Boost</span>
                                </a>
                              </td>
                              {outcomeNames.map((name) => (
                                <td key={name} className="py-3 px-4 text-center">
                                  <a 
                                    href="https://funbet.me" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                  >
                                    <span className="inline-block px-3 py-1.5 rounded-lg font-bold text-base bg-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/40 transition-all border border-[#FFD700]/40">
                                      {funbetBoostOdds[name] || '-'}
                                    </span>
                                  </a>
                                </td>
                              ))}
                            </tr>
                          );

                          const funbetStandardRow = (
                            <tr key="funbet-standard" className="border-b-2 border-[#FFD700]/30 bg-gradient-to-r from-[#FFD700]/10 to-[#FFD700]/5">
                              <td className="py-3 px-4 text-sm font-semibold text-white">
                                <a 
                                  href="https://funbet.me" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 hover:text-[#FFD700] transition-colors"
                                >
                                  <span className="text-[#FFD700] text-base">📊</span>
                                  <span className="text-[#FFD700] font-semibold">FunBet.ME Standard</span>
                                  {usingDigitain && (
                                    <span className="text-green-500 text-sm ml-1">✓</span>
                                  )}
                                </a>
                              </td>
                              {outcomeNames.map((name) => (
                                <td key={name} className="py-3 px-4 text-center">
                                  <a 
                                    href="https://funbet.me" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                  >
                                    <span className="inline-block px-3 py-1.5 rounded-lg font-bold text-base bg-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/30 transition-all border border-[#FFD700]/30">
                                      {digitainStandardOdds[name] || '-'}
                                    </span>
                                  </a>
                                </td>
                              ))}
                            </tr>
                          );

                          // Render all bookmakers (no need to separate funbet since it's calculated dynamically)
                          const bookmakerRows = otherBookmakers.map((bookmaker, idx) => (
                            <tr
                              key={bookmaker.key}
                              className={`${
                                idx !== otherBookmakers.length - 1
                                  ? 'border-b border-[#2E004F]/20'
                                  : ''
                              } hover:bg-white/5 transition-colors`}
                            >
                              <td className="py-1.5 px-1 sm:py-3 sm:px-4 text-[10px] sm:text-sm font-medium text-white truncate max-w-[70px] sm:max-w-none">
                                {bookmaker.title}
                              </td>
                              {outcomeNames.map((name) => {
                                // Find the matching outcome from bookmaker by team name ONLY
                                let outcome = null;
                                
                                if (name === match.home_team) {
                                  // Match home team by name
                                  outcome = bookmaker.markets[0].outcomes.find(o => 
                                    o.name && match.home_team && 
                                    o.name.trim().toLowerCase() === match.home_team.trim().toLowerCase()
                                  );
                                } else if (name === match.away_team) {
                                  // Match away team by name
                                  outcome = bookmaker.markets[0].outcomes.find(o => 
                                    o.name && match.away_team && 
                                    o.name.trim().toLowerCase() === match.away_team.trim().toLowerCase()
                                  );
                                } else if (name === 'Draw') {
                                  // Match draw/tie by keyword
                                  outcome = bookmaker.markets[0].outcomes.find(o => 
                                    o.name && (
                                      o.name.toLowerCase().includes('draw') ||
                                      o.name.toLowerCase().includes('tie')
                                    )
                                  );
                                }
                                
                                if (!outcome) {
                                  // If bookmaker doesn't have this outcome, show '-'
                                  return (
                                    <td key={name} className="py-1.5 px-0.5 sm:py-3 sm:px-4 text-center w-[25%]">
                                      <span className="inline-block px-1.5 py-0.5 sm:px-3 sm:py-1.5 rounded font-bold text-[10px] sm:text-sm text-gray-500">
                                        -
                                      </span>
                                    </td>
                                  );
                                }
                                
                                const isBest = outcome.price === bestOdds[name];
                                
                                return (
                                  <td
                                    key={name}
                                    className="py-1.5 px-0.5 sm:py-3 sm:px-4 text-center w-[25%]"
                                  >
                                    <span
                                      className={`inline-block px-1.5 py-0.5 sm:px-3 sm:py-1.5 rounded font-bold text-[10px] sm:text-base ${
                                        isBest
                                          ? 'bg-amber-400/80 text-[#2E004F] shadow-sm'
                                          : 'text-white'
                                      }`}
                                    >
                                      {outcome.price.toFixed(2)}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          ));

                          // Return FunBet.ME (dynamically calculated) first, then all other bookmakers
                          return [funbetSuperBoostRow, ...bookmakerRows];
                        })()}
                      </tbody>
                    </table>

                    {/* Show More / Show Less Button */}
                    {(() => {
                      // Calculate unique bookmakers count by title
                      const uniqueTitles = new Set(match.bookmakers?.map(b => b.title) || []);
                      const uniqueCount = uniqueTitles.size;
                      const matchId = match.id || `${match.home_team}_${match.away_team}_${match.commence_time}`;
                      const isExpanded = expandedMatches[matchId];
                      
                      if (uniqueCount > 4) {
                        return (
                          <div className="mt-4 text-center">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleMatchExpansion(matchId);
                              }}
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
                                  Show {uniqueCount - 4} More Bookmakers
                                </>
                              )}
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No odds available</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* No Data */}
      {!loading && !error && oddsData.length === 0 && (
        <div className="text-center py-16 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-12 border border-purple-500/20">
          <div className="text-7xl mb-6">
            {sportTitle === 'Basketball' ? '🏀' : sportTitle === 'Cricket' ? '🏏' : '⚽'}
          </div>
          <p className="text-white text-2xl font-semibold mb-4">
            No Upcoming Matches for {selectedLeague || sportTitle}
          </p>
          <div className="space-y-3 max-w-md mx-auto">
            <p className="text-gray-400">
              {sportTitle === 'Basketball'
                ? '🏀 Basketball schedules are updated as leagues and tournaments are announced.'
                : sportTitle === 'Cricket' 
                ? '🏏 Cricket schedules are updated as tournaments and series are announced.'
                : '⚽ Football matches will appear closer to the season start date.'}
            </p>
            <p className="text-[#FFD700] font-medium text-lg">
              ⏰ We will update close to the season/tournament start
            </p>
            <p className="text-gray-500 text-sm">
              {sportTitle === 'Basketball'
                ? 'Check back for NBA, EuroLeague, NCAA Basketball, and international leagues!'
                : sportTitle === 'Cricket'
                ? 'Check back for IPL, T20 Internationals, ODI series, and Test matches!'
                : 'We track 24+ football leagues from around the world.'}
            </p>
          </div>
          {console.log('[OddsTable RENDER] No data - loading:', loading, 'error:', error, 'oddsData.length:', oddsData.length)}
        </div>
      )}
      
      {/* Debug: Always show data length */}
      {console.log('[OddsTable RENDER] Rendering with oddsData.length=', oddsData.length, 'loading=', loading, 'error=', error)}
    </div>
  );
};

export default OddsTable;