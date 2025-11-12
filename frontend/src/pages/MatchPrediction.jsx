import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Brain, TrendingUp, Target, Users, Home as HomeIcon, AlertCircle, Loader2, ExternalLink, Share2, Send, Instagram, Copy, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { TeamLogo } from '../components/MatchComponents';
import axios from 'axios';

const MatchPrediction = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPrediction();
  }, [matchId]);

  // Update Open Graph meta tags for social sharing
  useEffect(() => {
    if (prediction) {
      const match = prediction.match;
      const pred = prediction.prediction;
      
      // Update page title
      document.title = `FunBet IQ: ${match.home_team} vs ${match.away_team} - ${pred.predicted_team} to win`;
      
      // Create or update meta tags
      const updateMetaTag = (property, content) => {
        let element = document.querySelector(`meta[property="${property}"]`);
        if (!element) {
          element = document.createElement('meta');
          element.setAttribute('property', property);
          document.head.appendChild(element);
        }
        element.setAttribute('content', content);
      };
      
      // Open Graph tags for Facebook
      updateMetaTag('og:title', `FunBet IQ: ${match.home_team} vs ${match.away_team}`);
      updateMetaTag('og:description', `🧠 AI predicts ${pred.predicted_team} to win with ${pred.confidence}% confidence! FunBet.ME odds: ${pred.predicted_outcome === 'home' ? prediction.odds.home.funbet : pred.predicted_outcome === 'away' ? prediction.odds.away.funbet : prediction.odds.draw?.funbet}`);
      updateMetaTag('og:url', window.location.href);
      updateMetaTag('og:type', 'website');
      
      // Twitter Card tags
      updateMetaTag('twitter:card', 'summary_large_image');
      updateMetaTag('twitter:title', `FunBet IQ: ${match.home_team} vs ${match.away_team}`);
      updateMetaTag('twitter:description', `AI predicts ${pred.predicted_team} to win with ${pred.confidence}% confidence!`);
    }
  }, [prediction]);

  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await axios.get(`${BACKEND_URL}/api/prediction/${matchId}`);
      setPrediction(response.data);
    } catch (err) {
      console.error('Error fetching prediction:', err);
      setError(err.response?.data?.detail || 'Unable to load prediction. This match may not have an AI prediction available.');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 90) return { label: 'Exceptional', color: 'text-green-400', bg: 'bg-green-500/20', stars: '⭐⭐⭐⭐⭐' };
    if (confidence >= 75) return { label: 'High', color: 'text-green-400', bg: 'bg-green-500/20', stars: '⭐⭐⭐⭐' };
    if (confidence >= 60) return { label: 'Good', color: 'text-yellow-400', bg: 'bg-yellow-500/20', stars: '⭐⭐⭐' };
    if (confidence >= 45) return { label: 'Moderate', color: 'text-orange-400', bg: 'bg-orange-500/20', stars: '⭐⭐' };
    return { label: 'Low', color: 'text-red-400', bg: 'bg-red-500/20', stars: '⭐' };
  };

  const getProgressBarColor = (value) => {
    if (value >= 90) return 'bg-green-500';
    if (value >= 75) return 'bg-green-400';
    if (value >= 60) return 'bg-yellow-500';
    if (value >= 45) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const shareUrl = window.location.href;
  const shareText = prediction ? 
    `🧠 FunBet IQ predicts ${prediction.prediction.predicted_team} to win! ${prediction.match.home_team} vs ${prediction.match.away_team} - ${prediction.prediction.confidence}% confidence. FunBet.ME odds: ${prediction.prediction.predicted_outcome === 'home' ? prediction.odds.home.funbet : prediction.prediction.predicted_outcome === 'away' ? prediction.odds.away.funbet : prediction.odds.draw?.funbet}. Check it out:` : 
    'Check out this FunBet IQ prediction!';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTelegram = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, '_blank', 'width=600,height=400');
  };

  const handleShareInstagram = () => {
    // Instagram doesn't support direct link sharing via URL
    // Copy link to clipboard and open Instagram
    navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    
    // Open Instagram app or web
    const instagramUrl = 'https://www.instagram.com/';
    window.open(instagramUrl, '_blank');
    
    // Show a helpful message
    alert('Link copied! Paste it into your Instagram story or post.');
  };

  const handleShareWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="dark min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 p-4">
        <div className="max-w-6xl mx-auto pt-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin mx-auto mb-4" />
              <p className="text-gray-300">Loading AI prediction...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dark min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 p-4">
        <div className="max-w-6xl mx-auto pt-8">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="mb-6 text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">FunBet IQ Not Available</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <Link to="/predictions">
              <Button className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90">
                View All Predictions
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const confidenceLevel = getConfidenceLevel(prediction.prediction.confidence);
  const match = prediction.match;
  const pred = prediction.prediction;
  const probs = prediction.probabilities;
  const odds = prediction.odds;
  const breakdown = prediction.confidence_breakdown;

  return (
    <div className="dark min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 p-4">
      <div className="max-w-6xl mx-auto pt-8 pb-16">
        {/* Back Button */}
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-6 text-gray-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="bg-purple-900/30 border border-[#2E004F]/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-[#FFD700]" />
            <h1 className="text-xl sm:text-3xl font-bold text-white">FunBet IQ Analysis</h1>
          </div>
          <div className="text-gray-300 space-y-1">
            <p className="text-lg font-medium text-[#FFD700]">{match.league}</p>
            <p className="text-sm">
              {new Date(match.commence_time).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {/* Match Teams */}
        <div className="bg-purple-900/30 border border-[#2E004F]/50 rounded-xl p-4 sm:p-8 mb-4 sm:mb-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
            {/* Home Team */}
            <div className="text-center">
              <TeamLogo team={match.home_team} sport={match.sport_title} size="md" className="mx-auto mb-2 sm:mb-3 hidden sm:block" />
              <TeamLogo team={match.home_team} sport={match.sport_title} size="sm" className="mx-auto mb-1 sm:hidden" />
              <h2 className="text-sm sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">{match.home_team}</h2>
              <span className="text-xs sm:text-sm text-gray-400">Home</span>
            </div>

            {/* VS */}
            <div className="text-center">
              <span className="text-xl sm:text-4xl font-bold text-gray-500">VS</span>
            </div>

            {/* Away Team */}
            <div className="text-center">
              <TeamLogo team={match.away_team} sport={match.sport_title} size="md" className="mx-auto mb-2 sm:mb-3 hidden sm:block" />
              <TeamLogo team={match.away_team} sport={match.sport_title} size="sm" className="mx-auto mb-1 sm:hidden" />
              <h2 className="text-sm sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">{match.away_team}</h2>
              <span className="text-xs sm:text-sm text-gray-400">Away</span>
            </div>
          </div>
        </div>

        {/* FunBet IQ Result (Hero Section) */}
        <div className={`bg-gradient-to-r ${prediction.match_status === 'completed' ? 'from-blue-900/30 to-indigo-900/30 border-blue-500/30' : 'from-green-900/30 to-emerald-900/30 border-green-500/30'} border rounded-xl p-4 sm:p-8 mb-4 sm:mb-6`}>
          <div className="text-center">
            <div className={`inline-flex items-center gap-1.5 sm:gap-2 ${prediction.match_status === 'completed' ? 'bg-blue-500/20' : 'bg-green-500/20'} px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-3 sm:mb-4`}>
              <Target className={`w-4 h-4 sm:w-5 sm:h-5 ${prediction.match_status === 'completed' ? 'text-blue-400' : 'text-green-400'}`} />
              <span className={`${prediction.match_status === 'completed' ? 'text-blue-400' : 'text-green-400'} font-semibold text-sm sm:text-base`}>
                {prediction.match_status === 'completed' ? 'FunBet IQ Predicted' : 'FunBet IQ Pick'}
              </span>
            </div>
            <h2 className="text-xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">
              {pred.predicted_team}
              {pred.predicted_outcome === 'home' && <span className="text-sm sm:text-2xl ml-1 sm:ml-2 text-gray-400">(Home)</span>}
              {pred.predicted_outcome === 'away' && <span className="text-sm sm:text-2xl ml-1 sm:ml-2 text-gray-400">(Away)</span>}
              {pred.predicted_outcome === 'draw' && <span className="text-sm sm:text-2xl ml-1 sm:ml-2 text-gray-400">(Draw)</span>}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
              <div className="bg-purple-900/30 rounded-lg p-3 sm:p-4">
                <p className="text-gray-400 text-xs sm:text-sm mb-1">FunBet.ME</p>
                <p className="text-2xl sm:text-3xl font-bold text-[#FFD700]">
                  {pred.predicted_outcome === 'home' && odds.home.funbet}
                  {pred.predicted_outcome === 'away' && odds.away.funbet}
                  {pred.predicted_outcome === 'draw' && odds.draw.funbet}
                </p>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-3 sm:p-4">
                <p className="text-gray-400 text-xs sm:text-sm mb-1">Win Probability</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{pred.win_probability.toFixed(1)}%</p>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-3 sm:p-4">
                <p className="text-gray-400 text-xs sm:text-sm mb-1">Confidence</p>
                <p className={`text-2xl sm:text-3xl font-bold ${confidenceLevel.color}`}>
                  {pred.confidence}% {confidenceLevel.stars}
                </p>
              </div>
            </div>
          </div>
        </div>



        {/* Share Section */}
        <div className="bg-purple-900/30 border border-[#2E004F]/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#FFD700]" />
            Share This Prediction
          </h3>
          <p className="text-gray-400 text-sm mb-4">Share FunBet IQ's prediction with your friends!</p>
          
          {/* Shareable Link Display */}
          <div className="bg-purple-950/50 rounded-lg p-3 mb-4 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-[#FFD700] flex-shrink-0" />
            <input 
              type="text" 
              value={shareUrl} 
              readOnly 
              className="bg-transparent text-gray-300 text-xs sm:text-sm flex-1 outline-none"
              onClick={(e) => e.target.select()}
            />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={handleShareTelegram}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg transition-all font-semibold"
            >
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">Telegram</span>
            </button>
            <button
              onClick={handleShareInstagram}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white rounded-lg transition-all font-semibold"
            >
              <Instagram className="w-5 h-5" />
              <span className="hidden sm:inline">Instagram</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg transition-all font-semibold"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all font-semibold"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  <span className="hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span className="hidden sm:inline">Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result Verification (for completed matches) */}
        {prediction.match_status === 'completed' && prediction.actual_scores && (
          <div className="bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border border-yellow-500/30 rounded-xl p-6 mb-6">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Target className="w-6 h-6 text-[#FFD700]" />
              Prediction Result
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-purple-900/20 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">FunBet IQ Predicted:</p>
                <p className="text-2xl font-bold text-white">
                  {pred.predicted_team} to Win
                </p>
                <p className="text-[#FFD700] text-lg mt-1">
                  Confidence: {pred.confidence}%
                </p>
              </div>
              <div className="bg-purple-900/20 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">Actual Result:</p>
                <p className="text-2xl font-bold text-white">
                  {prediction.actual_scores && prediction.actual_scores.length > 0
                    ? `${prediction.actual_scores[0]?.name || 'Unknown'} ${prediction.actual_scores[0]?.score || '?'} - ${prediction.actual_scores[1]?.score || '?'} ${prediction.actual_scores[1]?.name || 'Unknown'}`
                    : 'Waiting for final score...'}
                </p>
                {prediction.actual_scores && prediction.actual_scores.length > 0 && (
                  <div className="mt-3">
                    {(() => {
                      const score1 = parseInt(prediction.actual_scores[0]?.score || 0);
                      const score2 = parseInt(prediction.actual_scores[1]?.score || 0);
                      const actualWinner = score1 > score2 ? prediction.actual_scores[0]?.name : 
                                          score2 > score1 ? prediction.actual_scores[1]?.name : 'Draw';
                      const predictedCorrect = actualWinner === pred.predicted_team;
                      
                      return predictedCorrect ? (
                        <div className="bg-green-500/20 border border-green-500/40 rounded-lg px-4 py-2">
                          <span className="text-green-400 font-bold text-lg">✅ FunBet IQ WAS CORRECT!</span>
                        </div>
                      ) : (
                        <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-4 py-2">
                          <span className="text-red-400 font-bold text-lg">❌ FunBet IQ Was Wrong</span>
                          <p className="text-gray-400 text-sm mt-1">Learning from this to improve future predictions</p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confidence Breakdown */}
        <div className="bg-purple-900/30 border border-[#2E004F]/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFD700]" />
            Confidence Breakdown
          </h3>
          <div className="space-y-6">
            {/* Base Probability */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-medium">Base Probability</span>
                <span className="text-white font-bold">{breakdown.base_probability.toFixed(1)}% ⭐⭐⭐</span>
              </div>
              <div className="w-full bg-purple-950/50 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${getProgressBarColor(breakdown.base_probability)} transition-all duration-500`}
                  style={{ width: `${breakdown.base_probability}%` }}
                />
              </div>
            </div>

            {/* Market Consensus */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-medium">
                  Market Consensus ({breakdown.bookmakers_agree}/{breakdown.total_bookmakers} bookmakers)
                </span>
                <span className="text-white font-bold">{breakdown.market_consensus.toFixed(1)}% ⭐⭐⭐</span>
              </div>
              <div className="w-full bg-purple-950/50 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${getProgressBarColor(breakdown.market_consensus)} transition-all duration-500`}
                  style={{ width: `${breakdown.market_consensus}%` }}
                />
              </div>
            </div>

            {/* Home/Away Factor */}
            {breakdown.home_away_factor !== 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium">
                    {breakdown.home_away_factor > 0 ? 'Home Advantage' : 'Away Disadvantage'}
                  </span>
                  <span className="text-white font-bold">
                    {breakdown.home_away_factor > 0 ? '+' : ''}{breakdown.home_away_factor}% ⭐⭐
                  </span>
                </div>
                <div className="w-full bg-purple-950/50 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${breakdown.home_away_factor > 0 ? 'bg-blue-500' : 'bg-orange-500'} transition-all duration-500`}
                    style={{ width: `${Math.abs(breakdown.home_away_factor) * 10}%` }}
                  />
                </div>
              </div>
            )}

            {/* Total Confidence */}
            <div className={`border-t border-purple-700 pt-4 ${confidenceLevel.bg} rounded-lg p-4`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-bold text-lg">Total Confidence</span>
                <span className={`${confidenceLevel.color} font-bold text-xl`}>
                  {pred.confidence}% {confidenceLevel.stars}
                </span>
              </div>
              <div className="w-full bg-purple-950/50 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full ${getProgressBarColor(pred.confidence)} transition-all duration-500`}
                  style={{ width: `${pred.confidence}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* FunBet IQ Reasoning */}
        <div className="bg-purple-900/30 border border-[#2E004F]/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-2xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFD700]" />
            FunBet IQ Reasoning
          </h3>
          <div className="space-y-3">
            {prediction.reasoning.map((reason, index) => {
              const emoji = reason.split(' ')[0];
              const text = reason.substring(reason.indexOf(' ') + 1);
              // Replace "FunBet.ME" with styled version
              const styledText = text.split(/(FunBet\.ME)/g).map((part, i) => 
                part === 'FunBet.ME' ? (
                  <span key={i} className="text-[#FFD700] font-extrabold">FunBet.ME</span>
                ) : part
              );
              
              return (
                <div key={index} className="flex items-start gap-3 bg-purple-900/20 rounded-lg p-4">
                  <div className="text-2xl">{emoji}</div>
                  <p className="text-gray-300 flex-1">{styledText}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Outcome Probabilities */}
        <div className="bg-purple-900/30 border border-[#2E004F]/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFD700]" />
            Outcome Probabilities
          </h3>
          <div className="space-y-6">
            {/* Home Win */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <HomeIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-white font-medium">{match.home_team} Win</span>
                </div>
                <span className="text-white font-bold">{probs.home.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-purple-950/50 rounded-full h-3 overflow-hidden mb-2">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${probs.home}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>Market Best: {odds.home.market_best} ({odds.home.best_bookmaker})</span>
                <span className="text-[#FFD700]">FunBet.ME: {odds.home.funbet}</span>
              </div>
            </div>

            {/* Draw */}
            {odds.draw && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚖️</span>
                    <span className="text-white font-medium">Draw</span>
                  </div>
                  <span className="text-white font-bold">{probs.draw.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-purple-950/50 rounded-full h-3 overflow-hidden mb-2">
                  <div
                    className="h-full bg-gray-500 transition-all duration-500"
                    style={{ width: `${probs.draw}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Market Best: {odds.draw.market_best} ({odds.draw.best_bookmaker})</span>
                  <span className="text-[#FFD700]">FunBet.ME: {odds.draw.funbet}</span>
                </div>
              </div>
            )}

            {/* Away Win */}
            <div className={pred.predicted_outcome === 'away' ? 'bg-green-500/10 rounded-lg p-4 -m-4' : ''}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✈️</span>
                  <span className="text-white font-medium">{match.away_team} Win</span>
                  {pred.predicted_outcome === 'away' && <span className="text-green-400 text-sm">✅ AI Pick</span>}
                </div>
                <span className="text-white font-bold">{probs.away.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-purple-950/50 rounded-full h-3 overflow-hidden mb-2">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${probs.away}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>Market Best: {odds.away.market_best} ({odds.away.best_bookmaker})</span>
                <span className="text-[#FFD700]">FunBet.ME: {odds.away.funbet}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bookmaker Odds Comparison */}
        <div className="bg-purple-900/30 border border-[#2E004F]/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-2xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFD700]" />
            Bookmaker Odds
          </h3>
          <p className="text-gray-400 mb-4">
            {prediction.bookmakers_analyzed} bookmakers analyzed
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-700">
                  <th className="text-left text-gray-400 pb-3 font-medium">Bookmaker</th>
                  <th className="text-center text-gray-400 pb-3 font-medium">{match.home_team}</th>
                  {odds.draw && <th className="text-center text-gray-400 pb-3 font-medium">Draw</th>}
                  <th className="text-center text-gray-400 pb-3 font-medium">{match.away_team}</th>
                </tr>
              </thead>
              <tbody>
                {prediction.bookmaker_odds && prediction.bookmaker_odds.slice(0, 5).map((bookmaker, index) => (
                  <tr key={index} className="border-b border-purple-800/30">
                    <td className="py-3 text-white font-medium">
                      {bookmaker.name === 'FunBet.ME' && <span className="text-[#FFD700]">⭐ </span>}
                      {bookmaker.name}
                    </td>
                    <td className="py-3 text-center text-white">{bookmaker.home}</td>
                    {odds.draw && <td className="py-3 text-center text-white">{bookmaker.draw || '-'}</td>}
                    <td className="py-3 text-center text-white">{bookmaker.away}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link to="/live-odds">
            <Button variant="outline" className="mt-4 w-full border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700]/10">
              View All Odds <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/live-odds">
            <Button className="w-full bg-[#FFD700] text-black hover:bg-[#FFD700]/90">
              📊 View Live Odds
            </Button>
          </Link>
          <Link to="/predictions">
            <Button variant="outline" className="w-full border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700]/10">
              🧠 View All FunBet IQ Picks
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MatchPrediction;
