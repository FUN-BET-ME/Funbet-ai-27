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
            About <span className="text-[#FFD700]">FunBet.Me IQ</span>
          </h1>
        </div>

        {/* Mission */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Our Mission</h2>
          <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
            <p className="text-gray-400 leading-relaxed mb-4">
              FunBet.Me IQ is an advanced sports intelligence platform that combines real-time odds comparison, 
              live scores, and our proprietary FunBet IQ prediction system to deliver actionable insights for 
              sports enthusiasts.
            </p>
            <p className="text-gray-400 leading-relaxed">
              Our FunBet IQ algorithm analyzes market odds, team statistics, recent form, and momentum to 
              calculate confidence scores for every match. We present complex data in an intuitive format, 
              giving you the analytical edge you need to understand betting markets better.
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
                and recent momentum (15%) to identify favorites and provide confidence ratings (High/Medium/Low).
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
              <strong className="text-white">FunBet.AI is informational only.</strong>
              {' '}We do not offer betting services, accept deposits, or facilitate
              any form of gambling or money gaming. All data and predictions are
              provided for educational and comparison purposes.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Users must be 18 years or older. We promote responsible gambling
              practices and encourage users to seek help if they experience
              gambling-related problems.
            </p>
          </div>
        </div>

        {/* Data Sources */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Data Sources</h2>
          <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              FunBet.AI aggregates publicly available data from reputable sports
              data providers and bookmakers. We use advanced data processing and
              machine learning algorithms to analyze this information and provide
              meaningful insights.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              While we strive for accuracy, we cannot guarantee the completeness
              or absolute accuracy of all data. Users should verify critical
              information independently.
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