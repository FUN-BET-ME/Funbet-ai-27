import React, { useState, useEffect } from 'react';
import { Mail, TrendingUp } from 'lucide-react';
import axios from 'axios';

const About = () => {
  const [stats, setStats] = useState({
    total: 0,
    correct: 0,
    accuracy: 0,
    loading: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
        const response = await axios.get(`${BACKEND_URL}/api/funbet-iq/track-record?limit=1`);
        
        const total = response.data.stats?.total || 0;
        const correct = response.data.stats?.correct || 0;
        const accuracy = response.data.stats?.accuracy || 0;
        
        setStats({
          total,
          correct,
          accuracy,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats({ total: 0, correct: 0, accuracy: 0, loading: false });
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2E004F] to-[#4a0080] flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-8 h-8 text-[#FFD700]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            About <span className="text-[#FFD700]">FunBet.AI</span>
          </h1>
        </div>

        {/* Mission */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Our Mission</h2>
          <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
            <p className="text-gray-400 leading-relaxed mb-4">
              FunBet.AI is the world's first AI-powered sports intelligence platform that delivers verified predictions 
              with transparent accuracy tracking. We combine real-time odds comparison across 40+ bookmakers, live scores 
              from Football, Basketball, and Cricket, with our proprietary FunBet IQ prediction engine.
            </p>
            <p className="text-gray-400 leading-relaxed">
              What sets us apart? We verify EVERY prediction we make. When matches complete, we automatically compare 
              our FunBet IQ prediction against the actual result and publicly display whether we were Correct ✅ or 
              Incorrect ❌. {stats.loading ? (
                <span>Loading stats...</span>
              ) : stats.total > 0 ? (
                <>
                  Currently achieving <strong className="text-[#FFD700]">{stats.accuracy}% accuracy</strong> across{' '}
                  <strong className="text-[#FFD700]">{stats.total} verified predictions</strong>.
                </>
              ) : (
                <span>Building our verified prediction track record.</span>
              )} No hidden results, no cherry-picking - complete transparency.
            </p>
          </div>
        </div>

        {/* What We Offer */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">What We Offer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-2">
                🧠 FunBet IQ Predictions + Verification
              </h3>
              <p className="text-gray-400 text-sm">
                Our AI-powered IQ system predicts match outcomes with confidence scores. When matches finish, 
                we automatically verify predictions and display results publicly: ✅ Correct or ❌ Incorrect. 
                View all verified predictions with final scores on our Stats page.{' '}
                {!stats.loading && stats.total > 0 && (
                  <span className="text-[#FFD700] font-semibold">
                    Currently {stats.accuracy}% accurate across {stats.total} predictions.
                  </span>
                )}
              </p>
            </div>
            <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-2">📊 40+ Bookmaker Odds Comparison</h3>
              <p className="text-gray-400 text-sm">
                Real-time odds from 40+ premium bookmakers across Football (Premier League, La Liga, Bundesliga), 
                Basketball (NBA, NCAAB), and Cricket (IPL, T20, ODI, Test). Find the best value instantly.
              </p>
            </div>
            <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-2">⚡ Live Scores + Final Results</h3>
              <p className="text-gray-400 text-sm">
                Live match tracking with real-time scores, match status (Q1, HT, 45', etc.), and automatic 
                final score display. See completed matches with final scores like "130-128 FINAL" and our 
                prediction verification result.
              </p>
            </div>
            <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-2">
                📈 Transparent Accuracy Tracking
              </h3>
              <p className="text-gray-400 text-sm">
                Full transparency: Track our prediction accuracy in real-time. Every completed match shows 
                predicted winner vs actual winner with final score. No hidden stats, no cherry-picking - 
                see our complete track record on the Stats page.
              </p>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">
            Important Notice
          </h2>
          <div className="bg-gradient-to-r from-[#2E004F]/30 to-[#4a0080]/20 border border-[#2E004F]/30 rounded-lg p-6">
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              <strong className="text-white">FunBet.AI is informational only.</strong>
              {' '}We do not offer betting services, accept deposits, or facilitate
              any form of gambling or money gaming. All predictions, odds comparisons, live scores, 
              and verified results are provided for educational, analytical, and comparison purposes only.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Users must be 18 years or older. We promote responsible gambling
              practices and encourage users to seek help if they experience
              gambling-related problems. Always verify odds with bookmakers before making decisions.
            </p>
          </div>
        </div>

        {/* Data Sources */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Data Sources</h2>
          <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              FunBet.AI aggregates real-time odds from The Odds API (40+ bookmakers), live scores from 
              API-Football, API-Basketball, and Cricket APIs, plus team statistics from ESPN. Our FunBet IQ 
              algorithm analyzes this data using AI to generate predictions. When matches complete, we 
              automatically verify predictions against official final scores.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Live scores update every 10 seconds. Odds update every 5 minutes. Prediction verification runs 
              every 15 minutes for completed matches. While we strive for accuracy, always verify odds and 
              information directly with bookmakers before making any decisions.
            </p>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-white">Contact Us</h2>
          <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#2E004F] to-[#4a0080] flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-[#FFD700]" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">
                  Get in Touch
                </h3>
                <p className="text-gray-400 text-sm mb-3">
                  Have questions, feedback, or suggestions? We'd love to hear
                  from you.
                </p>
                <a
                  href="mailto:reachus@funbet.me"
                  className="text-[#FFD700] hover:underline font-semibold"
                >
                  reachus@funbet.me
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Powered By */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm mb-2">
            FunBet.AI - AI-Powered Sports Intelligence with Verified Predictions
          </p>
          <p className="text-[#FFD700] font-semibold text-sm">
            Transparent. Accurate. Verifiable.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;