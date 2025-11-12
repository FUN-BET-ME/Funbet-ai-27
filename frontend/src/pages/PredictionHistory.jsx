import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, TrendingUp, Brain, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { TeamLogo } from '../components/MatchComponents';
import { PredictionCardSkeletonList } from '../components/SkeletonLoaders';
import axios from 'axios';

const PredictionHistory = () => {
  const [predictions, setPredictions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, correct, incorrect, pending
  const [sortBy, setSortBy] = useState('correct_first'); // recent, correct_first

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchPredictionHistory();
  }, [filter, sortBy]);

  const fetchPredictionHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/funbet-iq/track-record`, {
        params: {
          limit: 100,
          filter: filter,
          sort_by: sortBy,
          _t: Date.now() // Cache-busting timestamp
        }
      });
      
      setPredictions(response.data.track_record || []);
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Error fetching prediction history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResultBadge = (prediction) => {
    if (!prediction.result_verified) {
      return (
        <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm">
          <Clock className="w-4 h-4" />
          <span className="font-semibold">Pending</span>
        </div>
      );
    }

    if (prediction.was_correct) {
      return (
        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm">
          <CheckCircle className="w-5 h-5" />
          <span className="font-bold">Correct ✓</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm">
        <XCircle className="w-5 h-5" />
        <span className="font-semibold">Incorrect ✗</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0033] to-[#0a001a] py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-8 h-8 text-[#FFD700]" />
            <h1 className="text-3xl sm:text-4xl font-bold text-white">FunBet IQ History</h1>
          </div>
          <p className="text-gray-400">Track record of all AI predictions with verified results</p>
        </div>

        {/* Stats Card */}
        {stats && (
          <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-[#2E004F]/50 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#FFD700]" />
              Performance Stats
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-purple-900/30 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Total</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="bg-green-900/30 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Correct ✓</p>
                <p className="text-3xl font-bold text-green-400">{stats.correct}</p>
              </div>
              <div className="bg-red-900/30 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Incorrect ✗</p>
                <p className="text-3xl font-bold text-red-400">{stats.incorrect}</p>
              </div>
              <div className="bg-yellow-900/30 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Accuracy</p>
                <p className="text-3xl font-bold text-[#FFD700]">{stats.accuracy}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-gray-400 text-sm">Filter:</span>
          </div>
          
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            className={filter === 'all' ? 'bg-[#FFD700] text-[#2E004F]' : 'bg-transparent border-gray-600 text-gray-300'}
          >
            All
          </Button>
          
          <Button
            onClick={() => setFilter('correct')}
            variant={filter === 'correct' ? 'default' : 'outline'}
            size="sm"
            className={filter === 'correct' ? 'bg-green-600 text-white' : 'bg-transparent border-gray-600 text-gray-300'}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Correct
          </Button>
          
          <Button
            onClick={() => setFilter('incorrect')}
            variant={filter === 'incorrect' ? 'default' : 'outline'}
            size="sm"
            className={filter === 'incorrect' ? 'bg-red-600 text-white' : 'bg-transparent border-gray-600 text-gray-300'}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Incorrect
          </Button>
          
          <Button
            onClick={() => setFilter('pending')}
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            className={filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-transparent border-gray-600 text-gray-300'}
          >
            <Clock className="w-4 h-4 mr-1" />
            Pending
          </Button>

          <div className="ml-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#2E004F]/50 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="correct_first">✓ Correct First</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>
        </div>

        {/* Predictions List */}
        {loading ? (
          <PredictionCardSkeletonList count={5} />
        ) : predictions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No predictions found for this filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {predictions.map((pred) => (
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
                  {getResultBadge(pred)}
                </div>

                {/* Teams */}
                <div className="grid grid-cols-3 gap-4 items-center mb-4">
                  <div className="text-center">
                    <TeamLogo team={pred.home_team} sport={pred.sport_key} size="md" />
                    <p className="text-white font-semibold mt-2 text-sm">{pred.home_team}</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-gray-500 font-bold text-2xl">VS</p>
                  </div>
                  
                  <div className="text-center">
                    <TeamLogo team={pred.away_team} sport={pred.sport_key} size="md" />
                    <p className="text-white font-semibold mt-2 text-sm">{pred.away_team}</p>
                  </div>
                </div>

                {/* Prediction Details */}
                <div className="bg-gradient-to-r from-[#FFD700]/20 to-[#FFD700]/10 rounded-lg p-4 border border-[#FFD700]/30 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">AI Predicted</p>
                      <p className="text-[#FFD700] font-bold text-lg">{pred.predicted_team}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-1">Confidence</p>
                      <p className="text-white font-bold text-lg">{pred.confidence}%</p>
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
                      <div>
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
                  Predicted: {new Date(pred.archived_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionHistory;
