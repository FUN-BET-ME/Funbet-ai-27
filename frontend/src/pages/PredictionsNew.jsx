import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Brain, TrendingUp, Target, RefreshCw, Clock, Trophy, Zap, Star } from 'lucide-react';
import axios from 'axios';

const PredictionsNew = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('high_confidence');
  const [stats, setStats] = useState({});
  const [accuracyStats, setAccuracyStats] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [viewMode, setViewMode] = useState('upcoming'); // upcoming, correct, incorrect, pending

  useEffect(() => {
    fetchPredictions();
    fetchAccuracyStats();
  }, [filter, viewMode]);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const sportParam = filter === 'football' ? 'soccer' : filter === 'cricket' ? 'cricket' : null;
      
      if (viewMode === 'upcoming') {
        // Fetch upcoming predictions
        const response = await axios.get(`${BACKEND_URL}/api/predictions/all`, {
          params: sportParam ? { sport: sportParam } : {}
        });
        const data = response.data;
        setPredictions(data);
        setStats(data.sports_breakdown);
      } else {
        // Fetch by status (correct/incorrect/pending)
        const response = await axios.get(`${BACKEND_URL}/api/predictions/by-status`, {
          params: {
            status: viewMode,
            sport: sportParam,
            page: 1,
            page_size: 100
          }
        });
        setPredictions({ all_predictions: response.data.predictions });
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccuracyStats = async () => {
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await axios.get(`${BACKEND_URL}/api/predictions/stats`);
      setAccuracyStats(response.data);
    } catch (error) {
      console.error('Error fetching accuracy stats:', error);
    }
  };

  const getCategoryPredictions = () => {
    if (!predictions.all_predictions) return [];
    
    switch(category) {
      case 'high_confidence':
        return predictions.high_confidence || [];
      case 'medium_confidence':
        return predictions.medium_confidence || [];
      case 'value_bets':
        return predictions.value_bets || [];
      default:
        return predictions.all_predictions || [];
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 75) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getConfidenceBg = (confidence) => {
    if (confidence >= 75) return 'bg-green-500/20 border-green-500/30';
    if (confidence >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-orange-500/20 border-orange-500/30';
  };

  const displayPredictions = getCategoryPredictions();

  return (
    <div className="dark min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-12 h-12 text-[#FFD700]" />
            <h1 className="text-5xl font-black bg-gradient-to-r from-[#FFD700] to-yellow-500 bg-clip-text text-transparent">
              FunBet IQ
            </h1>
          </div>
          <p className="text-gray-300 text-lg">AI-Powered Smart Predictions for Football & Cricket</p>
          <p className="text-gray-400 text-sm mt-2">
            {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>

        {/* Accuracy Stats - Clickable Slabs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setViewMode('correct')}
            className={`bg-green-900/40 border-2 rounded-lg p-4 text-left transition-all hover:scale-105 ${
              viewMode === 'correct' ? 'border-green-400 shadow-lg shadow-green-500/20' : 'border-green-500/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">✓</span>
              </div>
              <span className="text-gray-300 text-sm font-medium">Correct</span>
            </div>
            <p className="text-3xl font-bold text-green-400">{accuracyStats.correct || 0}</p>
            <p className="text-xs text-gray-400 mt-1">Winning predictions</p>
          </button>

          <button
            onClick={() => setViewMode('incorrect')}
            className={`bg-red-900/40 border-2 rounded-lg p-4 text-left transition-all hover:scale-105 ${
              viewMode === 'incorrect' ? 'border-red-400 shadow-lg shadow-red-500/20' : 'border-red-500/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">✗</span>
              </div>
              <span className="text-gray-300 text-sm font-medium">Incorrect</span>
            </div>
            <p className="text-3xl font-bold text-red-400">{accuracyStats.incorrect || 0}</p>
            <p className="text-xs text-gray-400 mt-1">Missed predictions</p>
          </button>

          <button
            onClick={() => setViewMode('pending')}
            className={`bg-yellow-900/40 border-2 rounded-lg p-4 text-left transition-all hover:scale-105 ${
              viewMode === 'pending' ? 'border-yellow-400 shadow-lg shadow-yellow-500/20' : 'border-yellow-500/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="text-gray-300 text-sm font-medium">Pending</span>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{accuracyStats.pending || 0}</p>
            <p className="text-xs text-gray-400 mt-1">Awaiting results</p>
          </button>

          <div className="bg-purple-900/40 border-2 border-purple-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-6 h-6 text-[#FFD700]" />
              <span className="text-gray-300 text-sm font-medium">Accuracy</span>
            </div>
            <p className="text-3xl font-bold text-[#FFD700]">{accuracyStats.accuracy || 0}%</p>
            <p className="text-xs text-gray-400 mt-1">
              {accuracyStats.completed || 0} completed games
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        {viewMode === 'upcoming' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-purple-900/30 border border-purple-500/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-[#FFD700]" />
                <span className="text-gray-400 text-xs">Total Predictions</span>
              </div>
              <p className="text-2xl font-bold text-white">{predictions.total_count || 0}</p>
            </div>
            
            <div className="bg-green-900/30 border border-green-500/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-green-400" />
                <span className="text-gray-400 text-xs">High Confidence</span>
              </div>
              <p className="text-2xl font-bold text-white">{predictions.high_confidence?.length || 0}</p>
            </div>

            <div className="bg-blue-900/30 border border-blue-500/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">⚽</span>
                <span className="text-gray-400 text-xs">Football</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.football || 0}</p>
            </div>

            <div className="bg-cyan-900/30 border border-cyan-500/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🏏</span>
                <span className="text-gray-400 text-xs">Cricket</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.cricket || 0}</p>
            </div>
          </div>
        )}

        {/* Sport Filters */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {['all', 'football', 'cricket'].map((sport) => (
            <button
              key={sport}
              onClick={() => setFilter(sport)}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                filter === sport
                  ? 'bg-[#FFD700] text-[#2E004F]'
                  : 'bg-purple-900/40 text-gray-300 hover:bg-purple-800/60'
              }`}
            >
              {sport === 'all' ? '🏆 All' : sport === 'football' ? '⚽ Football' : '🏏 Cricket'}
            </button>
          ))}
          <button
            onClick={fetchPredictions}
            disabled={loading}
            className="px-4 py-2 bg-purple-700/50 text-white rounded-lg hover:bg-purple-600/70 transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* View Mode Indicator */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            {viewMode === 'correct' && '✅ Correct Predictions'}
            {viewMode === 'incorrect' && '❌ Incorrect Predictions'}
            {viewMode === 'pending' && '⏱️ Pending Predictions'}
            {viewMode === 'upcoming' && '🎯 Upcoming Matches'}
          </h2>
          {viewMode !== 'upcoming' && (
            <button
              onClick={() => setViewMode('upcoming')}
              className="mt-2 text-[#FFD700] hover:text-yellow-400 text-sm"
            >
              ← Back to Upcoming Predictions
            </button>
          )}
        </div>

        {/* Category Filters - Only show for upcoming */}
        {viewMode === 'upcoming' && (
          <div className="flex items-center justify-center gap-3 mb-8">
            {[
              { key: 'high_confidence', label: '⭐ High Confidence', icon: Star },
              { key: 'medium_confidence', label: '🎯 Medium Confidence', icon: Target },
              { key: 'value_bets', label: '💎 Value Bets', icon: Zap },
              { key: 'all', label: '📊 All Predictions', icon: TrendingUp }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  category === key
                    ? 'bg-[#FFD700] text-[#2E004F]'
                    : 'bg-purple-900/30 text-gray-300 hover:bg-purple-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-[#FFD700] animate-spin mx-auto mb-4" />
            <p className="text-gray-300">Generating predictions...</p>
          </div>
        )}

        {/* Predictions Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayPredictions.map((pred, index) => (
              <Link
                key={pred.match_id}
                to={`/match/${pred.match_id}`}
                className={`${getConfidenceBg(pred.prediction.confidence)} border rounded-lg p-6 hover:scale-105 transition-all cursor-pointer`}
              >
                {/* Rank Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-[#FFD700] text-[#2E004F] px-3 py-1 rounded-full font-black text-sm">
                    #{index + 1} PICK
                  </div>
                  <div className={`${getConfidenceColor(pred.prediction.confidence)} font-bold`}>
                    {pred.prediction.confidence}%
                  </div>
                </div>

                {/* Match Info */}
                <div className="text-center mb-4">
                  <p className="text-gray-400 text-xs mb-2">{pred.sport_title}</p>
                  <p className="text-white font-semibold text-sm">{pred.home_team}</p>
                  <p className="text-gray-500 text-xs my-1">vs</p>
                  <p className="text-white font-semibold text-sm">{pred.away_team}</p>
                </div>

                {/* Prediction */}
                <div className="bg-black/30 rounded-lg p-4 mb-4">
                  <p className="text-gray-400 text-xs mb-1">Predicted Winner</p>
                  <p className="text-[#FFD700] font-bold text-lg">{pred.prediction.predicted_team}</p>
                </div>

                {/* Odds */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs">FunBet Odds</p>
                    <p className="text-white font-bold">
                      {pred.prediction.predicted_outcome === 'home' 
                        ? pred.odds.home.funbet 
                        : pred.prediction.predicted_outcome === 'away'
                        ? pred.odds.away.funbet
                        : pred.odds.draw?.funbet || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-xs">Market Avg</p>
                    <p className="text-gray-300 text-sm">
                      {pred.prediction.predicted_outcome === 'home' 
                        ? pred.odds.home.average 
                        : pred.prediction.predicted_outcome === 'away'
                        ? pred.odds.away.average
                        : pred.odds.draw?.average || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Consensus */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Consensus</span>
                    <span className={`font-semibold ${
                      pred.analysis.market_consensus === 'Strong' ? 'text-green-400' :
                      pred.analysis.market_consensus === 'Moderate' ? 'text-yellow-400' :
                      'text-orange-400'
                    }`}>
                      {pred.analysis.market_consensus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-gray-400">Bookmakers</span>
                    <span className="text-gray-300">{pred.analysis.bookmakers_count}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && displayPredictions.length === 0 && (
          <div className="text-center py-12">
            <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No predictions available for this category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionsNew;
