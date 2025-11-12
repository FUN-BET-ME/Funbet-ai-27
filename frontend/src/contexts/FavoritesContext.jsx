import React, { createContext, useContext, useState, useEffect } from 'react';

const FavoritesContext = createContext();

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
};

export const FavoritesProvider = ({ children }) => {
  const [followedTeams, setFollowedTeams] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('funbet-followed-teams');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    // Save to localStorage whenever followed teams change
    localStorage.setItem('funbet-followed-teams', JSON.stringify(followedTeams));
  }, [followedTeams]);

  const followTeam = (teamName) => {
    setFollowedTeams(prev => {
      if (prev.includes(teamName)) return prev;
      return [...prev, teamName];
    });
  };

  const unfollowTeam = (teamName) => {
    setFollowedTeams(prev => prev.filter(name => name !== teamName));
  };

  const toggleFollowTeam = (teamName) => {
    if (followedTeams.includes(teamName)) {
      unfollowTeam(teamName);
    } else {
      followTeam(teamName);
    }
  };

  const isFollowing = (teamName) => {
    return followedTeams.includes(teamName);
  };
  
  // Check if a match involves any followed teams
  const isMatchFollowed = (homeTeam, awayTeam) => {
    return followedTeams.includes(homeTeam) || followedTeams.includes(awayTeam);
  };

  const value = {
    followedTeams,
    followTeam,
    unfollowTeam,
    toggleFollowTeam,
    isFollowing,
    isMatchFollowed
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export default FavoritesContext;
