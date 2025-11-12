"""Odds fetching and management service"""
import httpx
import logging
from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta
from config import settings
from funbet_odds_generator import add_funbet_odds_to_matches

logger = logging.getLogger(__name__)

class OddsService:
    @staticmethod
    async def fetch_from_odds_api(
        sport: str = "upcoming",
        regions: str = "uk,eu,us,au",
        markets: str = "h2h"
    ) -> List[Dict]:
        """Fetch odds from The Odds API"""
        try:
            if not settings.odds_api_key:
                logger.error("ODDS_API_KEY not configured")
                return []
            
            url = f"https://api.the-odds-api.com/v4/sports/{sport}/odds/"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    params={
                        "regions": regions,
                        "markets": markets,
                        "apiKey": settings.odds_api_key
                    },
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"✅ The Odds API: Fetched {len(data)} matches for {sport}")
                    return data
                else:
                    logger.error(f"The Odds API returned status {response.status_code}")
                    return []
        except Exception as e:
            logger.error(f"Error fetching from Odds API: {e}")
            return []
    
    @staticmethod
    async def fetch_multiple_sports(
        sport_keys: List[str],
        regions: str = "uk,eu,us,au",
        markets: str = "h2h"
    ) -> List[Dict]:
        """Fetch odds from multiple sports"""
        all_matches = []
        
        for sport_key in sport_keys:
            try:
                matches = await OddsService.fetch_from_odds_api(sport_key, regions, markets)
                all_matches.extend(matches)
            except Exception as e:
                logger.warning(f"Error fetching {sport_key}: {e}")
                continue
        
        logger.info(f"Fetched total {len(all_matches)} matches from {len(sport_keys)} sports")
        return all_matches
    
    @staticmethod
    def filter_by_time_window(matches: List[Dict], days: int = 7) -> List[Dict]:
        """Filter matches within specified days from now"""
        now = datetime.now(timezone.utc)
        target_time = now + timedelta(days=days)
        past_time = now - timedelta(hours=2)  # Include live games
        
        filtered = []
        for match in matches:
            try:
                match_time = datetime.fromisoformat(match['commence_time'].replace('Z', '+00:00'))
                if past_time < match_time <= target_time:
                    filtered.append(match)
            except Exception as e:
                logger.warning(f"Error parsing match time: {e}")
                continue
        
        return filtered
    
    @staticmethod
    def enhance_with_funbet_odds(matches: List[Dict]) -> List[Dict]:
        """Add FunBet odds to all matches"""
        return add_funbet_odds_to_matches(matches)
