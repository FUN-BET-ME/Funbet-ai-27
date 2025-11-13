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
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchPredictions();
  }, [filter]);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const sportParam = filter === 'football' ? 'soccer' : filter === 'cricket' ? 'cricket' : null;
      
      const response = await axios.get(`${BACKEND_URL}/api/predictions/all`, {
        params: sportParam ? { sport: sportParam } : {}
      });

      const data = response.data;
      setPredictions(data);
      setStats(data.sports_breakdown);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-purple-900/40 border border-purple-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-[#FFD700]" />
              <span className="text-gray-400 text-sm">Total Predictions</span>
            </div>
            <p className="text-3xl font-bold text-white">{predictions.total_count || 0}</p>
          </div>
          
          <div className="bg-green-900/40 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">High Confidence</span>
            </div>
            <p className="text-3xl font-bold text-white">{predictions.high_confidence?.length || 0}</p>
          </div>

          <div className="bg-blue-900/40 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⚽</span>
              <span className="text-gray-400 text-sm">Football</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.football || 0}</p>
          </div>

          <div className="bg-cyan-900/40 border border-cyan-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🏏</span>
              <span className="text-gray-400 text-sm">Cricket</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.cricket || 0}</p>
          </div>
        </div>

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

        {/* Category Filters */}
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
