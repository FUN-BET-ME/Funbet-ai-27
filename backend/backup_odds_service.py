"""
Backup Odds Service - Fetches odds from alternative sources
Used when primary ODDS API has no bookmakers for a match
"""

import logging
import httpx
from typing import Dict, List, Optional
import os

logger = logging.getLogger(__name__)

class BackupOddsService:
    """Fetch odds from backup sources when primary API fails"""
    
    def __init__(self):
        self.rapidapi_key = os.getenv('RAPIDAPI_KEY', '')
        
    async def fetch_odds_from_rapidapi(self, match: Dict) -> Optional[List[Dict]]:
        """
        Fetch odds from RapidAPI sports odds endpoints
        """
        try:
            home_team = match.get('home_team', '')
            away_team = match.get('away_team', '')
            sport_key = match.get('sport_key', '')
            
            if not home_team or not away_team:
                return None
            
            # Try RapidAPI Sports Odds
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Search for match by teams
                url = "https://odds.p.rapidapi.com/v4/sports/{sport}/odds"
                
                # Map sport keys
                if 'soccer' in sport_key:
                    sport = 'soccer_epl'  # Default to EPL
                elif 'basketball' in sport_key:
                    sport = 'basketball_nba'
                elif 'cricket' in sport_key:
                    sport = 'cricket_test_match'
                else:
                    return None
                
                headers = {
                    'X-RapidAPI-Key': self.rapidapi_key,
                    'X-RapidAPI-Host': 'odds.p.rapidapi.com'
                }
                
                response = await client.get(url.format(sport=sport), headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Find matching game
                    for game in data:
                        game_home = game.get('home_team', '')
                        game_away = game.get('away_team', '')
                        
                        # Fuzzy match
                        if (home_team.lower() in game_home.lower() or game_home.lower() in home_team.lower()) and \
                           (away_team.lower() in game_away.lower() or game_away.lower() in away_team.lower()):
                            
                            # Found match! Get bookmakers
                            bookmakers = game.get('bookmakers', [])
                            
                            if bookmakers:
                                logger.info(f"✅ Backup odds found for {home_team} vs {away_team}: {len(bookmakers)} bookmakers")
                                return bookmakers
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching backup odds: {e}")
            return None
    
    async def fetch_odds_from_betfair(self, match: Dict) -> Optional[List[Dict]]:
        """
        Fetch odds from Betfair Exchange API (backup source 2)
        """
        # TODO: Implement Betfair integration if RapidAPI fails
        pass
    
    async def get_backup_odds(self, match: Dict) -> Optional[List[Dict]]:
        """
        Try multiple backup sources in sequence
        Returns first successful result
        """
        try:
            # Try RapidAPI first
            odds = await self.fetch_odds_from_rapidapi(match)
            if odds:
                return odds
            
            # Try Betfair if RapidAPI fails
            odds = await self.fetch_odds_from_betfair(match)
            if odds:
                return odds
            
            logger.warning(f"⚠️ No backup odds found for {match.get('home_team')} vs {match.get('away_team')}")
            return None
            
        except Exception as e:
            logger.error(f"Error in backup odds service: {e}")
            return None

# Singleton
backup_odds_service = BackupOddsService()
