import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, TrendingUp, Sun, Moon, Star } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../contexts/FavoritesContext';
import SearchBar from './SearchBar';

const Layout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme, isDark } = useTheme();
  const { followedTeams } = useFavorites();

  const navigation = [
    { name: '🏠 Home', path: '/', canHighlight: true },
    { name: '⚽ Football', path: '/live-odds?filter=football', canHighlight: false },
    { name: '🏏 Cricket', path: '/live-odds?filter=cricket', canHighlight: false },
    { name: '🏀 Basketball', path: '/live-odds?filter=basketball', canHighlight: false },
    { name: '🧠 FunBet IQ', path: '/funbet-iq', canHighlight: true },
    { name: '📊 Stats', path: '/stats', canHighlight: true },
    { name: 'ℹ️ About', path: '/about', canHighlight: true }
  ];

  const isActive = (item) => {
    // Only highlight if canHighlight is true AND path matches
    return item.canHighlight && location.pathname === item.path;
  };

  return (
    <div className="min-h-screen bg-[#0a0012] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0012]/80 border-b border-[#2E004F]/30">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2E004F] to-[#4a0080] flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-[#FFD700]" />
              </div>
              <span className="text-xl font-bold">
                <span className="text-white">FunBet</span>
                <span className="text-[#FFD700]">.AI</span>
              </span>
            </Link>

            {/* Desktop Navigation & Actions */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(item)
                      ? 'bg-[#2E004F] text-[#FFD700]'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Favorites Counter */}
              {followedTeams.length > 0 && (
                <Link
                  to="/live-odds"
                  className="relative px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-[#FFD700] hover:bg-white/5 transition-all"
                  title={`Following ${followedTeams.length} team${followedTeams.length > 1 ? 's' : ''}`}
                >
                  <Star className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 bg-[#FFD700] text-[#2E004F] text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {followedTeams.length}
                  </span>
                </Link>
              )}
              
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-300 hover:text-[#FFD700] hover:bg-white/5 transition-all"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              {/* Search Bar */}
              <SearchBar />
            </div>

            {/* CTA Button */}
            <div className="hidden lg:flex items-center space-x-3 ml-3">
              <Button
                asChild
                className="bg-[#FFD700] text-[#2E004F] hover:bg-[#FFD700]/90 font-semibold"
              >
                <a
                  href="https://t.me/funbetdotme"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join Telegram
                </a>
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center gap-2">
              {/* Search Bar for Mobile */}
              <SearchBar />
              
              {/* Theme Toggle for Mobile */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              {/* Hamburger Menu */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-4 space-y-1 border-t border-[#2E004F]/30">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive(item)
                      ? 'bg-[#2E004F] text-[#FFD700]'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile Actions Row */}
              <div className="flex items-center justify-between px-4 pt-4 border-t border-[#2E004F]/30 mt-4">
                {/* Favorites */}
                {followedTeams.length > 0 && (
                  <Link
                    to="/live-odds"
                    onClick={() => setMobileMenuOpen(false)}
                    className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-[#FFD700] hover:bg-white/5 transition-all"
                  >
                    <Star className="w-5 h-5" />
                    <span>Teams You Follow ({followedTeams.length})</span>
                  </Link>
                )}
                
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-[#FFD700] hover:bg-white/5 transition-all"
                >
                  {isDark ? (
                    <>
                      <Sun className="w-5 h-5" />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-5 h-5" />
                      <span>Dark Mode</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="pt-4">
                <Button
                  asChild
                  className="w-full bg-[#FFD700] text-[#2E004F] hover:bg-[#FFD700]/90 font-semibold"
                >
                  <a
                    href="https://t.me/funbetdotme"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join Telegram
                  </a>
                </Button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Odds Accuracy Notice */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-amber-500/10 border-t border-b border-amber-500/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-amber-400 font-semibold text-sm mb-1">Odds Accuracy Notice</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Odds can change rapidly and may not be accurate in real-time. The information displayed is for reference and analysis purposes only. Always verify odds directly with bookmakers before placing any bets. FunBet.AI updates data every 5 minutes but cannot guarantee real-time accuracy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0a0012] border-t border-[#2E004F]/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <Link to="/" className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2E004F] to-[#4a0080] flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[#FFD700]" />
                </div>
                <span className="text-xl font-bold">
                  <span className="text-white">FunBet</span>
                  <span className="text-[#FFD700]">.AI</span>
                </span>
              </Link>
              <p className="text-gray-400 text-sm">
                Real-time odds, scores & AI insights. Informational only.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/responsible-play"
                    className="text-gray-400 hover:text-[#FFD700] text-sm transition-colors"
                  >
                    18+ Responsible Play
                  </Link>
                </li>
                <li>
                  <a
                    href="https://t.me/funbetdotme"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-[#FFD700] text-sm transition-colors"
                  >
                    Telegram
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-semibold mb-4">Contact</h3>
              <p className="text-gray-400 text-sm mb-2">
                Email:{' '}
                <a
                  href="mailto:reachus@funbet.me"
                  className="text-[#FFD700] hover:underline"
                >
                  reachus@funbet.me
                </a>
              </p>
              <p className="text-gray-400 text-sm">
                Powered by{' '}
                <a
                  href="https://funbet.me/en"
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="text-[#FFD700] hover:underline"
                >
                  FunBet.Me
                </a>
              </p>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-8 pt-8 border-t border-[#2E004F]/30 text-center">
            <p className="text-gray-500 text-sm">
              © 2025 FunBet.AI. Informational only. FunBet.AI does not offer
              betting or money gaming.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;