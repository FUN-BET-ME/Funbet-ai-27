import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const SearchBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allMatches, setAllMatches] = useState([]);
  const searchRef = useRef(null);

  const sports = [
    { value: 'all', label: 'All Sports' },
    { value: 'football', label: 'Football ⚽' },
    { value: 'cricket', label: 'Cricket 🏏' }
  ];

  // Fetch all matches when search opens - with caching
  useEffect(() => {
    if (isOpen && allMatches.length === 0) {
      fetchMatches();
    }
  }, [isOpen]);

  // Debounced search - wait 300ms after typing stops
  useEffect(() => {
    if (!searchQuery.trim() && selectedSport === 'all') {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedSport, allMatches]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      console.log('[Search] Fetching matches from:', BACKEND_URL);
      
      // Fetch only football and cricket priority (most common searches)
      const [footballRes, cricketRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/odds/football/priority`)
          .catch((err) => {
            console.error('[Search] Football API error:', err.message, err.response?.status);
            return { data: [] };
          }),
        axios.get(`${BACKEND_URL}/api/odds/cricket/priority`)
          .catch((err) => {
            console.error('[Search] Cricket API error:', err.message, err.response?.status);
            return { data: [] };
          })
      ]);

      console.log('[Search] Football matches:', footballRes.data?.length || 0);
      console.log('[Search] Cricket matches:', cricketRes.data?.length || 0);

      const combined = [
        ...footballRes.data,
        ...cricketRes.data
      ];

      // Remove duplicates and filter out matches without bookmakers
      const unique = combined.filter((match, index, self) =>
        match.bookmakers && match.bookmakers.length > 0 &&
        index === self.findIndex(m => m.id === match.id)
      );

      console.log('[Search] Total unique matches:', unique.length);
      setAllMatches(unique);
    } catch (error) {
      console.error('[Search] Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = () => {
    if (!searchQuery.trim() && selectedSport === 'all') {
      setResults([]);
      return;
    }

    let filtered = [...allMatches];

    // Filter by sport first (faster)
    if (selectedSport !== 'all') {
      filtered = filtered.filter(match => {
        const sport = match.sport_title?.toLowerCase() || '';
        return sport.includes(selectedSport);
      });
    }

    // Filter by search query (case-insensitive)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(match => {
        const homeTeam = match.home_team?.toLowerCase() || '';
        const awayTeam = match.away_team?.toLowerCase() || '';
        return homeTeam.includes(query) || awayTeam.includes(query);
      });
    }

    // Sort by date (upcoming first) and limit results
    filtered.sort((a, b) => new Date(a.commence_time) - new Date(b.commence_time));
    setResults(filtered.slice(0, 15)); // Reduced to 15 for faster rendering
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffHours < 0) return 'Live Now';
    if (diffHours < 24) return `In ${diffHours}h`;
    if (diffDays < 7) return `In ${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getSportEmoji = (sport) => {
    const s = sport.toLowerCase();
    if (s.includes('football') || s.includes('soccer')) return '⚽';
    if (s.includes('cricket')) return '🏏';
    if (s.includes('basketball')) return '🏀';
    if (s.includes('baseball')) return '⚾';
    if (s.includes('hockey')) return '🏒';
    if (s.includes('tennis')) return '🎾';
    return '🏆';
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedSport('all');
    setResults([]);
  };

  return (
    <div className="relative" ref={searchRef}>
      {/* Search Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 dark:bg-white/5 hover:bg-white/10 dark:hover:bg-white/10 transition-colors border border-gray-300 dark:border-[#2E004F]/30"
        aria-label="Search matches"
      >
        <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400">Search matches...</span>
      </button>

      {/* Search Dropdown */}
      {isOpen && (
        <div className="fixed sm:absolute top-16 sm:top-full left-0 right-0 sm:left-auto sm:right-0 mt-0 sm:mt-2 w-full sm:w-[500px] bg-white dark:bg-[#1a0028] border-t sm:border border-gray-300 dark:border-[#2E004F] sm:rounded-lg shadow-2xl z-50 max-h-[calc(100vh-4rem)] sm:max-h-[80vh] overflow-hidden flex flex-col">
          {/* Search Header */}
          <div className="p-4 border-b border-gray-200 dark:border-[#2E004F]/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search teams or matches..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-[#2E004F]/30 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                  autoFocus
                />
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Sport Filter with Clear Button */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-[#2E004F]/30 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
              >
                {sports.map(sport => (
                  <option key={sport.value} value={sport.value}>
                    {sport.label}
                  </option>
                ))}
              </select>
              {(searchQuery || selectedSport !== 'all') && (
                <button
                  onClick={clearSearch}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/30"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {/* Active Filters Indicator */}
            {!loading && results.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-[#2E004F]/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">
                    {results.length} {results.length === 1 ? 'match' : 'matches'} found
                    {selectedSport !== 'all' && (
                      <span className="ml-1">
                        in <span className="font-semibold text-[#FFD700]">
                          {sports.find(s => s.value === selectedSport)?.label}
                        </span>
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
            
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full mx-auto mb-2"></div>
                Loading matches...
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-[#2E004F]/30">
                {results.map((match) => (
                  <Link
                    key={match.id}
                    to={`/match/${match.id}`}
                    onClick={() => setIsOpen(false)}
                    className="block p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getSportEmoji(match.sport_title)}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {match.sport_title}
                          </span>
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                          {match.home_team} <span className="text-gray-400">vs</span> {match.away_team}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatDate(match.commence_time)}</span>
                          <span>•</span>
                          <span>{match.bookmakers?.length || 0} bookmakers</span>
                        </div>
                      </div>
                      <div className="text-amber-600 dark:text-[#FFD700]">
                        <span className="text-xs font-semibold">View Odds</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : searchQuery.trim() || selectedSport !== 'all' ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="font-medium mb-1">No matches found</p>
                <p className="text-sm">Try different keywords or filters</p>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="font-medium mb-1">Start searching</p>
                <p className="text-sm">Enter team names or select a sport</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
