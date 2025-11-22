import React from 'react';
import { getTeamShortCode, getTeamLogo } from '../services/teamLogos';

/**
 * Team Logo Component with fallback
 * Accepts either logoUrl or team name to fetch logo
 */
export const TeamLogo = ({ logoUrl, teamName, team, sport, size = 'md', className = '' }) => {
  const finalTeamName = teamName || team;
  const [fetchedLogoUrl, setFetchedLogoUrl] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    large: 'w-20 h-20'
  };
  
  // Fetch logo if team name provided but no logoUrl
  React.useEffect(() => {
    let isMounted = true;
    
    // Only fetch if we don't have logoUrl, have finalTeamName, and haven't fetched yet
    if (!logoUrl && finalTeamName && !fetchedLogoUrl) {
      setIsLoading(true);
      console.log('[TeamLogo] Fetching logo for:', finalTeamName, 'Sport:', sport);
      
      getTeamLogo(finalTeamName, sport)
        .then(url => {
          console.log('[TeamLogo] Got URL:', url, 'for team:', finalTeamName);
          if (isMounted) {
            setFetchedLogoUrl(url);
            setIsLoading(false);
          }
        })
        .catch(err => {
          console.error('[TeamLogo] Error fetching team logo:', err);
          if (isMounted) {
            setIsLoading(false);
          }
        });
    }
    
    return () => {
      isMounted = false;
    };
  }, [finalTeamName, sport, logoUrl]);
  
  // For cricket, always try country flag first
  const isCricket = sport && sport.toLowerCase().includes('cricket');
  const displayLogoUrl = logoUrl || fetchedLogoUrl;
  
  if (displayLogoUrl) {
    return (
      <img
        src={displayLogoUrl}
        alt={`${finalTeamName} ${isCricket ? 'flag' : 'logo'}`}
        className={`${sizeClasses[size]} object-contain ${isCricket ? 'rounded-sm' : 'rounded'} ${className}`}
        loading="lazy"
        onError={(e) => {
          e.target.style.display = 'none';
          if (e.target.nextSibling) {
            e.target.nextSibling.style.display = 'flex';
          }
        }}
      />
    );
  }

  // Fallback to sport icon
  const sportIcon = isCricket ? '🏏' : 
                    sport?.includes('football') || sport?.includes('soccer') ? '⚽' : 
                    sport?.includes('basketball') ? '🏀' : 
                    sport?.includes('hockey') ? '🏒' :
                    sport?.includes('baseball') ? '⚾' :
                    '🏆';
  
  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center bg-gradient-to-br from-[#2E004F] to-[#4a0080] rounded text-2xl ${className}`}>
      {sportIcon}
    </div>
  );
};

/**
 * Odds Movement Indicator Component
 */
export const OddsMovement = ({ direction, change }) => {
  if (direction === 'stable' || !change) return null;

  return (
    <span className={`inline-flex items-center text-xs ml-1 ${
      direction === 'up' ? 'text-green-400' : 'text-red-400'
    }`}>
      {direction === 'up' ? '↑' : '↓'}
      {change > 0.01 && <span className="ml-0.5">{change.toFixed(2)}</span>}
    </span>
  );
};

/**
 * Match Countdown Timer Component
 */
export const CountdownTimer = ({ commenceTime, completed = false, liveScore = null }) => {
  const [timeLeft, setTimeLeft] = React.useState('');

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const start = new Date(commenceTime);
      const diff = start - now;

      // Show appropriate badge based on match state
      if (diff <= 0) {
        if (!completed) {
          // If we have live score with match status, show that instead of "Live Now"
          if (liveScore && liveScore.match_status && liveScore.is_live) {
            setTimeLeft(liveScore.match_status);
          } else {
            setTimeLeft('Live Now');
          }
        } else {
          setTimeLeft('FINAL'); // Show FINAL for completed matches
        }
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [commenceTime, completed]);

  if (!timeLeft) return null;

  // Different styling for FINAL vs countdown/live
  const isFinal = timeLeft === 'FINAL';
  const isLive = timeLeft === 'Live Now';

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
      isFinal 
        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
        : isLive
        ? 'bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse'
        : 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30'
    }`}>
      {isFinal ? '✅' : isLive ? '🔴' : '⏰'} {timeLeft}
    </span>
  );
};

/**
 * Follow Team Button Component (replaces favorite button)
 */
export const FollowTeamButton = ({ homeTeam, awayTeam, isFollowing, onToggle }) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const isHomeFollowed = isFollowing(homeTeam);
  const isAwayFollowed = isFollowing(awayTeam);
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`p-2 rounded-full transition-all hover:scale-110 ${
          (isHomeFollowed || isAwayFollowed)
            ? 'text-[#FFD700] bg-[#FFD700]/10' 
            : 'text-gray-400 bg-white/5 hover:bg-white/10'
        }`}
        aria-label="Follow team"
      >
        {(isHomeFollowed || isAwayFollowed) ? '⭐' : '☆'}
      </button>
      
      {showMenu && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
          {/* Menu positioned to not overflow */}
          <div className="absolute right-0 mt-2 w-40 bg-[#1a0028] border border-[#2E004F] rounded-lg shadow-xl z-50">
            <div className="p-2 text-xs text-gray-400 border-b border-[#2E004F]">
              Follow Team
            </div>
            <button
              onClick={() => {
                onToggle(homeTeam);
                setShowMenu(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 flex items-center justify-between gap-2 ${
                isHomeFollowed ? 'text-[#FFD700]' : 'text-white'
              }`}
            >
              <span>{isHomeFollowed ? '⭐' : '☆'}</span>
              <span className="font-semibold">{getTeamShortCode(homeTeam)}</span>
            </button>
            <button
              onClick={() => {
                onToggle(awayTeam);
                setShowMenu(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 flex items-center justify-between gap-2 ${
                isAwayFollowed ? 'text-[#FFD700]' : 'text-white'
              }`}
            >
              <span>{isAwayFollowed ? '⭐' : '☆'}</span>
              <span className="font-semibold">{getTeamShortCode(awayTeam)}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Favorite Star Button Component (DEPRECATED - use FollowTeamButton)
 */
export const FavoriteButton = ({ matchId, isFavorite, onToggle }) => {
  return (
    <button
      onClick={() => onToggle(matchId)}
      className={`p-2 rounded-full transition-all hover:scale-110 ${
        isFavorite 
          ? 'text-[#FFD700] bg-[#FFD700]/10' 
          : 'text-gray-400 bg-white/5 hover:bg-white/10'
      }`}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isFavorite ? '⭐' : '☆'}
    </button>
  );
};

/**
 * Share Button Component
 */
export const ShareButton = ({ matchTitle, url }) => {
  const [copied, setCopied] = React.useState(false);
  
  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const shareUrl = url || window.location.href;
    const shareText = `Check out the odds for ${matchTitle} on FunBet.AI`;
    
    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: matchTitle,
          text: shareText,
          url: shareUrl
        });
        return;
      } catch (error) {
        if (error.name === 'AbortError') {
          return; // User cancelled
        }
        // If share fails, fall through to clipboard
      }
    }
    
    // Desktop/fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        alert('Could not copy link. Please try again.');
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`p-2 rounded-full transition-all hover:scale-110 ${
        copied 
          ? 'text-green-400 bg-green-400/10' 
          : 'text-gray-400 bg-white/5 hover:bg-white/10'
      }`}
      aria-label="Share match"
      title={copied ? "Copied!" : "Share this match"}
    >
      {copied ? '✓' : '🔗'}
    </button>
  );
};

/**
 * Live/Final Score Display Component
 * Shows current score for live matches or final score for completed matches
 */
export const MatchScore = ({ liveScore, homeTeam, awayTeam, size = 'md' }) => {
  if (!liveScore || (!liveScore.home_score && !liveScore.away_score)) {
    return null;
  }

  const isLive = liveScore.is_live;
  const isCompleted = liveScore.completed;
  const matchStatus = liveScore.match_status || '';

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  return (
    <div className="flex items-center gap-3">
      {/* Home Score */}
      <div className="flex items-center gap-2">
        <span className={`${sizeClasses[size]} font-bold text-white`}>
          {liveScore.home_score || '0'}
        </span>
      </div>

      {/* Separator */}
      <span className={`${sizeClasses[size]} text-gray-500`}>-</span>

      {/* Away Score */}
      <div className="flex items-center gap-2">
        <span className={`${sizeClasses[size]} font-bold text-white`}>
          {liveScore.away_score || '0'}
        </span>
      </div>

      {/* Match Status Badge */}
      {matchStatus && (
        <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
          isLive
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : isCompleted
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
        }`}>
          {matchStatus}
        </span>
      )}
    </div>
  );
};

/**
 * Match Events Component
 * Displays goal scorers, cards, substitutions for a match
 */
export const MatchEvents = ({ events, homeTeam, awayTeam }) => {
  if (!events || events.length === 0) {
    return (
      <div className="text-center text-gray-500 text-sm py-4">
        No match events available
      </div>
    );
  }

  // Group events by type
  const goals = events.filter(e => e.type === 'Goal');
  const cards = events.filter(e => e.type === 'Card');
  const substitutions = events.filter(e => e.type === 'subst');

  return (
    <div className="space-y-4">
      {/* Goals */}
      {goals.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[#FFD700] mb-2">⚽ Goals</h4>
          <div className="space-y-2">
            {goals.map((event, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm bg-white/5 rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{event.time?.elapsed}'</span>
                  <span className="text-white font-medium">{event.player?.name}</span>
                  {event.assist?.name && (
                    <span className="text-gray-500 text-xs">({event.assist.name})</span>
                  )}
                </div>
                <span className="text-gray-400 text-xs">
                  {event.team?.name === homeTeam ? 'H' : 'A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards */}
      {cards.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[#FFD700] mb-2">🟨 Cards</h4>
          <div className="space-y-2">
            {cards.map((event, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm bg-white/5 rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{event.time?.elapsed}'</span>
                  <span className={event.detail === 'Red Card' ? '🟥' : '🟨'} />
                  <span className="text-white">{event.player?.name}</span>
                </div>
                <span className="text-gray-400 text-xs">
                  {event.team?.name === homeTeam ? 'H' : 'A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default {
  TeamLogo,
  OddsMovement,
  CountdownTimer,
  FollowTeamButton,
  FavoriteButton,
  ShareButton,
  MatchScore,
  MatchEvents
};
