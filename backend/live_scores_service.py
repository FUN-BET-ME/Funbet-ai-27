"""
Live Scores Service - Real-time score updates for Football & Cricket
Fetches scores from multiple sources and caches them
"""
import httpx
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os

logger = logging.getLogger(__name__)

class LiveScoresService:
    def __init__(self):
        self.espn_scores_cache = []
        self.odds_api_scores_cache = []
        self.last_espn_update = None
        self.last_odds_api_update = None
        self.update_interval = 30  # seconds
        
    async def fetch_espn_live_scores(self) -> List[Dict]:
        """Fetch live scores from ESPN API for football and basketball"""
        try:
            from espn_scores_service import fetch_all_espn_scores
            
            scores = await fetch_all_espn_scores()
            
            # Filter only live matches
            live_scores = [s for s in scores if s.get('is_live', False)]
            
            self.espn_scores_cache = scores
            self.last_espn_update = datetime.now(timezone.utc)
            
            logger.info(f"✅ ESPN Live Scores: {len(live_scores)} live out of {len(scores)} total")
            return scores
            
        except Exception as e:
            logger.error(f"Error fetching ESPN live scores: {e}")
            return []
    
    async def fetch_odds_api_scores(self, sport_keys: List[str]) -> List[Dict]:
        """Fetch scores from The Odds API"""
        try:
            odds_api_key = os.environ.get('ODDS_API_KEY')
            if not odds_api_key:
                return []
            
            all_scores = []
            
            async with httpx.AsyncClient() as client:
                for sport_key in sport_keys[:5]:  # Limit to top 5 to save API calls
                    try:
                        url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/scores/"
                        params = {
                            'apiKey': odds_api_key,
                            'daysFrom': 1  # Last 24 hours
                        }
                        
                        response = await client.get(url, params=params, timeout=10.0)
                        if response.status_code == 200:
                            scores = response.json()
                            # Filter only matches with actual scores
                            scored_matches = [s for s in scores if s.get('scores')]
                            all_scores.extend(scored_matches)
                        
                        await asyncio.sleep(0.3)  # Rate limiting
                    except Exception as e:
                        logger.warning(f"Error fetching {sport_key} scores: {e}")
                        continue
            
            self.odds_api_scores_cache = all_scores
            self.last_odds_api_update = datetime.now(timezone.utc)
            
            logger.info(f"✅ Odds API Scores: {len(all_scores)} matches with scores")
            return all_scores
            
        except Exception as e:
            logger.error(f"Error in Odds API scores fetch: {e}")
            return []
    
    async def get_all_live_scores(self, force_refresh: bool = False) -> Dict:
        """Get combined live scores from all sources"""
        try:
            now = datetime.now(timezone.utc)
            
            # Check if we need to refresh ESPN scores
            espn_needs_refresh = (
                force_refresh or 
                not self.last_espn_update or 
                (now - self.last_espn_update).total_seconds() > self.update_interval
            )
            
            if espn_needs_refresh:
                await self.fetch_espn_live_scores()
            
            # Combine scores from all sources
            all_scores = []
            
            # Add ESPN scores
            all_scores.extend(self.espn_scores_cache)
            
            # Add Odds API scores (if available and not duplicates)
            espn_match_ids = {s.get('id') for s in self.espn_scores_cache}
            for score in self.odds_api_scores_cache:
                if score.get('id') not in espn_match_ids:
                    all_scores.append(score)
            
            # Separate live and recent
            live_scores = [s for s in all_scores if s.get('is_live', False)]
            completed_scores = [s for s in all_scores if s.get('completed', False)]
            
            return {
                'live_scores': live_scores,
                'completed_scores': completed_scores,
                'total': len(all_scores),
                'live_count': len(live_scores),
                'completed_count': len(completed_scores),
                'last_update': now.isoformat(),
                'sources': {
                    'espn': len(self.espn_scores_cache),
                    'odds_api': len(self.odds_api_scores_cache)
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting all live scores: {e}")
            return {
                'live_scores': [],
                'completed_scores': [],
                'total': 0,
                'live_count': 0,
                'completed_count': 0,
                'last_update': datetime.now(timezone.utc).isoformat(),
                'error': str(e)
            }
    
    def normalize_team_name(self, name: str) -> str:
        """Normalize team name for matching"""
        if not name:
            return ""
        return name.lower().strip().replace("  ", " ")
    
    async def match_score_to_match(self, match: Dict, scores: List[Dict]) -> Optional[Dict]:
        """Match a score to an odds match"""
        if not scores:
            return None
        
        match_home = self.normalize_team_name(match.get('home_team', ''))
        match_away = self.normalize_team_name(match.get('away_team', ''))
        
        for score in scores:
            if not score.get('scores'):
                continue
            
            score_home = self.normalize_team_name(score.get('home_team', ''))
            score_away = self.normalize_team_name(score.get('away_team', ''))
            
            # Check for match (allow partial matches)
            home_match = (
                score_home in match_home or 
                match_home in score_home or 
                score_home == match_home
            )
            away_match = (
                score_away in match_away or 
                match_away in score_away or 
                score_away == match_away
            )
            
            if home_match and away_match:
                return score
        
        return None

# Global instance
live_scores_service = LiveScoresService()
