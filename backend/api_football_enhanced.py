"""
Enhanced API-Football Service
Comprehensive service for statistics, predictions, events, and standings
"""
import httpx
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class APIFootballEnhanced:
    """Enhanced API-Football service with all endpoints"""
    
    def __init__(self):
        self.api_key = os.environ.get('API_FOOTBALL_KEY')
        self.base_url = "https://v3.football.api-sports.io"
        self.headers = {'x-apisports-key': self.api_key}
    
    async def fetch_fixture_statistics(self, fixture_id: int) -> Optional[Dict]:
        """Fetch detailed statistics for a specific fixture"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/fixtures/statistics"
                params = {'fixture': fixture_id}
                
                response = await client.get(url, headers=self.headers, params=params, timeout=10.0)
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get('response', [])
                else:
                    logger.warning(f"Statistics fetch failed for fixture {fixture_id}: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching statistics for fixture {fixture_id}: {e}")
            return None
    
    async def fetch_fixture_predictions(self, fixture_id: int) -> Optional[Dict]:
        """Fetch AI predictions from API-Football for comparison"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/predictions"
                params = {'fixture': fixture_id}
                
                response = await client.get(url, headers=self.headers, params=params, timeout=10.0)
                
                if response.status_code == 200:
                    data = response.json()
                    predictions = data.get('response', [])
                    if predictions:
                        return predictions[0]  # First prediction
                    return None
                else:
                    logger.warning(f"Predictions fetch failed for fixture {fixture_id}: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching predictions for fixture {fixture_id}: {e}")
            return None
    
    async def fetch_fixture_events(self, fixture_id: int) -> List[Dict]:
        """Fetch live events (goals, cards, substitutions) for a fixture"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/fixtures/events"
                params = {'fixture': fixture_id}
                
                response = await client.get(url, headers=self.headers, params=params, timeout=10.0)
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get('response', [])
                else:
                    logger.warning(f"Events fetch failed for fixture {fixture_id}: {response.status_code}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error fetching events for fixture {fixture_id}: {e}")
            return []
    
    async def fetch_league_standings(self, league_id: int, season: int = 2025) -> Optional[Dict]:
        """Fetch current league standings"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/standings"
                params = {'league': league_id, 'season': season}
                
                response = await client.get(url, headers=self.headers, params=params, timeout=10.0)
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get('response', [])
                else:
                    logger.warning(f"Standings fetch failed for league {league_id}: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching standings for league {league_id}: {e}")
            return None
    
    async def fetch_head_to_head(self, team1_id: int, team2_id: int, last: int = 10) -> List[Dict]:
        """Fetch head-to-head history between two teams"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/fixtures/headtohead"
                params = {'h2h': f"{team1_id}-{team2_id}", 'last': last}
                
                response = await client.get(url, headers=self.headers, params=params, timeout=10.0)
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get('response', [])
                else:
                    logger.warning(f"H2H fetch failed: {response.status_code}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error fetching H2H: {e}")
            return []
    
    async def fetch_team_statistics(self, team_id: int, league_id: int, season: int = 2025) -> Optional[Dict]:
        """Fetch team statistics for a specific season"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/teams/statistics"
                params = {'team': team_id, 'league': league_id, 'season': season}
                
                response = await client.get(url, headers=self.headers, params=params, timeout=10.0)
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get('response', {})
                else:
                    logger.warning(f"Team stats fetch failed for team {team_id}: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching team statistics: {e}")
            return None
    
    async def search_fixture_by_teams(self, home_team: str, away_team: str, date: str = None) -> Optional[int]:
        """Search for fixture ID by team names"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/fixtures"
                
                # Use today's date if not provided
                if not date:
                    date = datetime.now(timezone.utc).strftime('%Y-%m-%d')
                
                params = {'date': date}
                
                response = await client.get(url, headers=self.headers, params=params, timeout=15.0)
                
                if response.status_code == 200:
                    data = response.json()
                    fixtures = data.get('response', [])
                    
                    # Search for matching teams
                    for fixture in fixtures:
                        teams = fixture.get('teams', {})
                        home = teams.get('home', {}).get('name', '').lower()
                        away = teams.get('away', {}).get('name', '').lower()
                        
                        if (home_team.lower() in home or home in home_team.lower()) and \
                           (away_team.lower() in away or away in away_team.lower()):
                            return fixture.get('fixture', {}).get('id')
                    
                    return None
                else:
                    logger.warning(f"Fixture search failed: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error searching for fixture: {e}")
            return None


# Global instance
api_football_enhanced = APIFootballEnhanced()
