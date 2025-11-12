import React from 'react';
import { Shield, AlertTriangle, Heart, Phone } from 'lucide-react';
import { Button } from '../components/ui/button';

const ResponsiblePlay = () => {
  return (
    <div className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2E004F] to-[#4a0080] flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-[#FFD700]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Responsible <span className="text-[#FFD700]">Play</span>
          </h1>
          <p className="text-gray-400 text-lg">
            We promote safe and responsible gambling practices
          </p>
        </div>

        {/* Important Notice */}
        <div className="mb-12 p-6 rounded-lg bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-white font-semibold mb-2 text-lg">
                FunBet.AI is Informational Only
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                FunBet.AI does not offer betting or accept any form of money
                gaming. We are an informational platform providing odds
                comparison, statistics, and AI-powered insights for educational
                purposes only.
              </p>
            </div>
          </div>
        </div>

        {/* Age Restriction */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Age Restriction</h2>
          <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#FFD700]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-[#FFD700]">18+</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">18+ Only</h3>
                <p className="text-gray-400 text-sm">
                  You must be 18 years or older to use this website. If you are
                  under 18, please exit this site immediately. Gambling can be
                  addictive and should not be accessible to minors.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Guidelines */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">
            Responsible Gambling Guidelines
          </h2>
          <div className="space-y-4">
            <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-2">
                1. Gamble for Entertainment
              </h3>
              <p className="text-gray-400 text-sm">
                Gambling should be viewed as a form of entertainment, not a way
                to make money. Never gamble more than you can afford to lose.
              </p>
            </div>
            <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-2">
                2. Set Limits and Stick to Them
              </h3>
              <p className="text-gray-400 text-sm">
                Before gambling, decide on a budget and time limit. Once you
                reach either limit, stop gambling. Never chase losses.
              </p>
            </div>
            <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-2">
                3. Don't Gamble Under Influence
              </h3>
              <p className="text-gray-400 text-sm">
                Never gamble when under the influence of alcohol or drugs, or
                when feeling depressed or upset. Make decisions with a clear
                mind.
              </p>
            </div>
            <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-2">
                4. Balance Gambling with Other Activities
              </h3>
              <p className="text-gray-400 text-sm">
                Don't let gambling interfere with your work, family time, or
                other important responsibilities and interests.
              </p>
            </div>
          </div>
        </div>

        {/* Warning Signs */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">
            Warning Signs of Problem Gambling
          </h2>
          <div className="bg-white/5 border border-[#2E004F]/30 rounded-lg p-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-400 text-sm">
                <span className="text-[#FFD700] mt-1">•</span>
                <span>Spending more money or time gambling than intended</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400 text-sm">
                <span className="text-[#FFD700] mt-1">•</span>
                <span>Borrowing money to gamble or pay gambling debts</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400 text-sm">
                <span className="text-[#FFD700] mt-1">•</span>
                <span>
                  Lying about gambling habits or hiding them from loved ones
                </span>
              </li>
              <li className="flex items-start gap-3 text-gray-400 text-sm">
                <span className="text-[#FFD700] mt-1">•</span>
                <span>Feeling anxious, depressed, or irritable about gambling</span>
              </li>
              <li className="flex items-start gap-3 text-gray-400 text-sm">
                <span className="text-[#FFD700] mt-1">•</span>
                <span>
                  Neglecting work, relationships, or hobbies because of gambling
                </span>
              </li>
              <li className="flex items-start gap-3 text-gray-400 text-sm">
                <span className="text-[#FFD700] mt-1">•</span>
                <span>
                  Chasing losses by gambling more to recover money lost
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Help Resources */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-white">Get Help</h2>
          <div className="bg-gradient-to-br from-[#2E004F]/30 to-[#4a0080]/20 border border-[#2E004F]/30 rounded-lg p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#2E004F] to-[#4a0080] flex items-center justify-center flex-shrink-0">
                <Heart className="w-6 h-6 text-[#FFD700]" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">
                  If You Need Support
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  If you or someone you know has a gambling problem, help is
                  available. Contact these organizations for free, confidential
                  support:
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <a
                href="https://www.begambleaware.org"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-[#2E004F]/30 hover:border-[#FFD700]/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      BeGambleAware
                    </h4>
                    <p className="text-gray-400 text-xs">www.begambleaware.org</p>
                  </div>
                  <Phone className="w-5 h-5 text-[#FFD700]" />
                </div>
              </a>
              <a
                href="https://www.gamcare.org.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-[#2E004F]/30 hover:border-[#FFD700]/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold mb-1">GamCare</h4>
                    <p className="text-gray-400 text-xs">www.gamcare.org.uk</p>
                  </div>
                  <Phone className="w-5 h-5 text-[#FFD700]" />
                </div>
              </a>
              <a
                href="https://www.gamblingtherapy.org"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-[#2E004F]/30 hover:border-[#FFD700]/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      Gambling Therapy
                    </h4>
                    <p className="text-gray-400 text-xs">
                      www.gamblingtherapy.org
                    </p>
                  </div>
                  <Phone className="w-5 h-5 text-[#FFD700]" />
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResponsiblePlay;