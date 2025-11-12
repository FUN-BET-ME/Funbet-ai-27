import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import OddsTable from '../components/OddsTable';

const NFLOdds = () => {
  const location = useLocation();

  const sportTabs = [
    { name: 'Football', path: '/football-odds', icon: '⚽' },
    { name: 'Cricket', path: '/cricket-odds', icon: '🏏' },
    { name: 'NFL', path: '/nfl-odds', icon: '🏈' },
    { name: 'Golf', path: '/golf-odds', icon: '⛳' },
    { name: 'Other Sports', path: '/other-sports-odds', icon: '🏀' }
  ];

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            NFL <span className="text-[#FFD700]">Odds</span>
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            Compare real-time NFL odds from top bookmakers around the world for the next 7 days.
            Auto-refreshes every 10 minutes. Informational only.
          </p>
        </div>

        {/* Sport Tabs */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {sportTabs.map((sport) => (
            <Link
              key={sport.path}
              to={sport.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                location.pathname === sport.path
                  ? 'bg-[#FFD700] text-[#2E004F]'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-[#2E004F]/30'
              }`}
            >
              <span className="text-lg">{sport.icon}</span>
              <span>{sport.name}</span>
            </Link>
          ))}
        </div>

        {/* Odds Table */}
        <OddsTable sportKeys={['americanfootball_nfl']} sportTitle="NFL" />

        {/* Disclaimer */}
        <div className="mt-12 p-6 rounded-lg bg-[#2E004F]/10 border border-[#2E004F]/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-white font-semibold mb-2">Important Notice</h3>
              <p className="text-gray-400 text-sm">
                This is an informational platform only. FunBet.AI does not offer
                betting services or accept any form of monetary transactions. All
                odds data is provided for educational and comparison purposes
                only. Users must be 18+ and gamble responsibly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFLOdds;