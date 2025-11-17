import React from 'react';
import { Mail, TrendingUp } from 'lucide-react';

const About = () => {
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
              Incorrect ❌. Currently achieving <strong className="text-[#FFD700]">82.9% accuracy</strong> across 
              35 verified predictions. No hidden results, no cherry-picking - complete transparency.
            </p>
          </div>
        </div>

        {/* What We Offer */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">What We Offer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-2">
                🧠 FunBet IQ Predictions
              </h3>
              <p className="text-gray-400 text-sm">
                Our proprietary IQ scoring system analyzes market odds (50%), team statistics (35%), 
                recent momentum (15%), and FunBet.Me AI algorithm (10%) to identify favorites and 
                provide confidence ratings (High/Medium/Low).
              </p>
            </div>
            <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-2">📊 Real-Time Odds Comparison</h3>
              <p className="text-gray-400 text-sm">
                Compare odds from multiple premium bookmakers across football, cricket, and other major sports. 
                Updated every 5 minutes for accuracy.
              </p>
            </div>
            <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-2">⚡ Live Match Tracking</h3>
              <p className="text-gray-400 text-sm">
                Real-time scores, match status, and odds movements for in-play matches. 
                Track your favorite teams and get instant notifications.
              </p>
            </div>
            <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-2">
                📈 Performance Analytics
              </h3>
              <p className="text-gray-400 text-sm">
                Detailed prediction accuracy tracking, team statistics, historical performance, 
                and comprehensive league standings.
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
              <strong className="text-white">FunBet.Me is informational only.</strong>
              {' '}We do not offer betting services, accept deposits, or facilitate
              any form of gambling or money gaming. All predictions, odds comparisons, and data are
              provided for educational, analytical, and comparison purposes only.
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
              FunBet.Me aggregates real-time odds from The Odds API, team statistics from ESPN, 
              and live scores from multiple reputable sources. Our proprietary FunBet IQ algorithm 
              processes this data to calculate market intelligence scores and confidence ratings.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              While we update data every 5 minutes and strive for accuracy, odds change rapidly in live markets. 
              Always verify odds and information directly with bookmakers before placing any bets.
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
          <p className="text-gray-400 text-sm mb-2">Powered by</p>
          <a
            href="https://funbet.me/en"
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="text-[#FFD700] hover:underline font-bold text-lg"
          >
            FunBet.Me
          </a>
        </div>
      </div>
    </div>
  );
};

export default About;