import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, TrendingUp, ExternalLink, Brain } from 'lucide-react';
import axios from 'axios';
import { TeamLogo, CountdownTimer, ShareButton, FollowTeamButton } from '../components/MatchComponents';
import { getTeamLogo, getCricketFlag } from '../services/teamLogos';
import { useFavorites } from '../contexts/FavoritesContext';

const MatchDetail = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamLogos, setTeamLogos] = useState({});
  const { followedTeams, toggleFollowTeam, isFollowing } = useFavorites();

  useEffect(() => {
    fetchMatchDetails();
  }, [matchId]);

  const fetchMatchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      
      // Fetch all matches from unified endpoint
      const response = await axios.get(`${BACKEND_URL}/api/odds/all-cached`, {
        params: {
          limit: 500,
          include_scores: true
        }
      });

      const allMatches = response.data?.matches || [];
      const foundMatch = allMatches.find(m => m.id === matchId);
      
      if (foundMatch) {
        setMatch(foundMatch);
        
        // Load team logos
        const isCricket = foundMatch.sport_key?.includes('cricket');
        if (isCricket) {
          const homeFlag = await getCricketFlag(foundMatch.home_team);
          const awayFlag = await getCricketFlag(foundMatch.away_team);
          setTeamLogos({
            [foundMatch.home_team]: homeFlag,
            [foundMatch.away_team]: awayFlag
          });
        } else {
          const homeLogo = await getTeamLogo(foundMatch.home_team, foundMatch.sport_key);
          const awayLogo = await getTeamLogo(foundMatch.away_team, foundMatch.sport_key);
          setTeamLogos({
            [foundMatch.home_team]: homeLogo,
            [foundMatch.away_team]: awayLogo
          });
        }
      } else {
        setError('Match not found');
      }
    } catch (err) {
      setError('Failed to load match details');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBestOdds = (bookmakers, outcomeIndex, homeTeam, awayTeam) => {
    if (!bookmakers || bookmakers.length === 0) return null;

    let bestOdds = null;
    let bestPrice = 0;

    bookmakers.forEach(bookmaker => {
      const market = bookmaker.markets?.[0];
      if (!market || !market.outcomes || market.outcomes.length === 0) return;

      let outcome;
      
      // Match outcomes by team names to handle any API ordering
      if (market.outcomes.length === 2) {
        // Two-way market (no draw): match by team name
        if (outcomeIndex === 0) {
          outcome = market.outcomes.find(o => o.name === homeTeam);
        } else {
          outcome = market.outcomes.find(o => o.name === awayTeam);
        }
      } else if (market.outcomes.length === 3) {
        // API returns: [Away, Home, Draw] - NOT the standard order!
        // So we need to match by team names, not array position
        if (outcomeIndex === 0) {
          // Requesting Home team odds
          outcome = market.outcomes.find(o => o.name === homeTeam);
        } else if (outcomeIndex === 1) {
          // Requesting Away team odds
          outcome = market.outcomes.find(o => o.name === awayTeam);
        } else {
          // Requesting Draw odds
          outcome = market.outcomes.find(o => 
            o.name.toLowerCase().includes('draw') || 
            o.name.toLowerCase().includes('tie')
          );
        }
      } else {
        // Fallback: try name matching
        if (outcomeIndex === 0) {
          outcome = market.outcomes.find(o => o.name === homeTeam);
        } else if (outcomeIndex === 1) {
          outcome = market.outcomes.find(o => o.name === awayTeam);
        } else {
          outcome = market.outcomes.find(o => 
            o.name.toLowerCase().includes('draw') || 
            o.name.toLowerCase().includes('tie')
          );
        }
      }

      if (outcome && outcome.price > bestPrice) {
        bestPrice = outcome.price;
        bestOdds = outcome.price;
      }
    });

    return bestOdds;
  };

  const getFunBetOdds = (bestOdds) => {
    if (!bestOdds) return null;
    return (bestOdds * 1.05).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading match details...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Match not found'}</p>
          <button
            onClick={() => navigate('/live-odds')}
            className="px-6 py-3 bg-[#FFD700] text-[#2E004F] rounded-lg font-semibold hover:bg-[#FFD700]/90"
          >
            Back to All Odds
          </button>
        </div>
      </div>
    );
  }

  const homeTeam = match.home_team;
  const awayTeam = match.away_team;
  const sortedBookmakers = match.bookmakers ? [...match.bookmakers].sort((a, b) => a.title.localeCompare(b.title)) : [];
  const isCricket = match.sport_key?.includes('cricket');
  const hasDrawOption = !match.sport_key?.includes('baseball');

  const bestHomeOdds = getBestOdds(match.bookmakers, 0, homeTeam, awayTeam);
  const bestAwayOdds = getBestOdds(match.bookmakers, 1, homeTeam, awayTeam);
  const bestDrawOdds = hasDrawOption ? getBestOdds(match.bookmakers, 2, homeTeam, awayTeam) : null;

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          to="/live-odds"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-[#FFD700] mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to All Odds</span>
        </Link>

        {/* Match Header */}
        <div className="bg-gradient-to-r from-[#2E004F]/20 to-transparent border border-[#2E004F]/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-full">
              {match.sport_title}
            </span>
            <div className="flex items-center gap-2">
              {/* FunBet IQ Button */}
              <Link
                to={`/prediction/${matchId}`}
                className="flex items-center gap-2 px-4 py-2 bg-[#FFD700] text-[#2E004F] rounded-lg hover:bg-[#FFD700]/90 transition-all font-bold group"
                title="View AI Prediction"
              >
                <Brain className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">FunBet IQ</span>
              </Link>
              <ShareButton matchTitle={`${homeTeam} vs ${awayTeam}`} />
              <FollowTeamButton
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                isFollowing={isFollowing}
                onToggle={toggleFollowTeam}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Home Team */}
            <div className="text-center">
              <TeamLogo
                logoUrl={teamLogos[homeTeam]}
                teamName={homeTeam}
                sport={match.sport_key}
                size="lg"
              />
              <h2 className="text-xl font-bold mt-3">{homeTeam}</h2>
            </div>

            {/* VS & Timer */}
            <div className="text-center">
              <div className="text-4xl font-bold text-[#FFD700] mb-2">VS</div>
              <CountdownTimer commenceTime={match.commence_time} />
            </div>

            {/* Away Team */}
            <div className="text-center">
              <TeamLogo
                logoUrl={teamLogos[awayTeam]}
                teamName={awayTeam}
                sport={match.sport_key}
                size="lg"
              />
              <h2 className="text-xl font-bold mt-3">{awayTeam}</h2>
            </div>
          </div>
        </div>

        {/* Odds Comparison */}
        <div className="bg-white/5 border border-[#2E004F]/30 rounded-xl overflow-hidden">
          <div className="p-4 bg-[#2E004F]/20 border-b border-[#2E004F]/30">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#FFD700]" />
              Odds Comparison - {sortedBookmakers.length} Bookmakers
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2E004F]/30">
                  <th className="text-left p-4 text-sm font-semibold text-gray-400">Bookmaker</th>
                  <th className="text-center p-4 text-sm font-semibold text-gray-400">{homeTeam}</th>
                  {hasDrawOption && (
                    <th className="text-center p-4 text-sm font-semibold text-gray-400">
                      {isCricket ? 'Tie' : 'Draw'}
                    </th>
                  )}
                  <th className="text-center p-4 text-sm font-semibold text-gray-400">{awayTeam}</th>
                </tr>
              </thead>
              <tbody>
                {/* FunBet.ME Row */}
                <tr className="bg-[#FFD700]/10 border-b border-[#FFD700]/30">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏆</span>
                      <div>
                        <div className="font-bold text-[#FFD700]">FunBet.ME</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center p-4">
                    <a
                      href="https://funbet.me"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <span className="inline-flex items-center gap-1 px-4 py-2 bg-[#FFD700] text-[#2E004F] rounded-lg font-bold hover:bg-[#FFD700]/90 transition-colors">
                        {getFunBetOdds(bestHomeOdds) || '-'}
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </a>
                  </td>
                  {hasDrawOption && (
                    <td className="text-center p-4">
                      <a
                        href="https://funbet.me"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <span className="inline-flex items-center gap-1 px-4 py-2 bg-[#FFD700] text-[#2E004F] rounded-lg font-bold hover:bg-[#FFD700]/90 transition-colors">
                          {getFunBetOdds(bestDrawOdds) || '-'}
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </a>
                    </td>
                  )}
                  <td className="text-center p-4">
                    <a
                      href="https://funbet.me"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <span className="inline-flex items-center gap-1 px-4 py-2 bg-[#FFD700] text-[#2E004F] rounded-lg font-bold hover:bg-[#FFD700]/90 transition-colors">
                        {getFunBetOdds(bestAwayOdds) || '-'}
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </a>
                  </td>
                </tr>

                {/* Bookmaker Rows */}
                {sortedBookmakers.map((bookmaker) => {
                  const market = bookmaker.markets?.[0];
                  if (!market) return null;

                  const homeOutcome = market.outcomes.find(o => o.name === homeTeam);
                  const awayOutcome = market.outcomes.find(o => o.name === awayTeam);
                  const drawOutcome = market.outcomes.find(o => 
                    o.name.toLowerCase().includes('draw') || 
                    o.name.toLowerCase().includes('tie')
                  );

                  const isHomeBest = homeOutcome?.price === bestHomeOdds;
                  const isAwayBest = awayOutcome?.price === bestAwayOdds;
                  const isDrawBest = drawOutcome?.price === bestDrawOdds;

                  return (
                    <tr key={bookmaker.key} className="border-b border-[#2E004F]/20 hover:bg-white/5">
                      <td className="p-4 font-medium">{bookmaker.title}</td>
                      <td className="text-center p-4">
                        <span className={`inline-block px-3 py-1 rounded ${
                          isHomeBest ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-white'
                        }`}>
                          {homeOutcome?.price.toFixed(2) || '-'}
                        </span>
                      </td>
                      {hasDrawOption && (
                        <td className="text-center p-4">
                          <span className={`inline-block px-3 py-1 rounded ${
                            isDrawBest ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-white'
                          }`}>
                            {drawOutcome?.price.toFixed(2) || '-'}
                          </span>
                        </td>
                      )}
                      <td className="text-center p-4">
                        <span className={`inline-block px-3 py-1 rounded ${
                          isAwayBest ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-white'
                        }`}>
                          {awayOutcome?.price.toFixed(2) || '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            to="/live-odds"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFD700] text-[#2E004F] rounded-lg font-semibold hover:bg-[#FFD700]/90 transition-colors"
          >
            View All Matches
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MatchDetail;
