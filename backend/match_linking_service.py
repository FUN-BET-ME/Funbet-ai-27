"""
Match Linking Service - Links matches across multiple APIs
- ODDS API (odds/bookmakers)
- API-Football (live scores, stats, predictions)
- API-Basketball (live scores)
- CricketAPI (live scores, 5-day tests)
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, List
import re

logger = logging.getLogger(__name__)

class MatchLinkingService:
    """Service to link matches across different APIs"""
    
    def __init__(self, db):
        self.db = db
        self.match_links_collection = db.match_links
    
    def normalize_team_name(self, team_name: str) -> str:
        """
        Normalize team name for matching across APIs
        - Remove common suffixes (FC, CF, United, City, etc.)
        - Convert to lowercase
        - Remove special characters
        """
        if not team_name:
            return ""
        
        # Convert to lowercase
        normalized = team_name.lower().strip()
        
        # Remove common suffixes
        suffixes_to_remove = [
            ' fc', ' cf', ' afc', ' bfc', ' cfc',
            ' united', ' city', ' town', ' rovers', ' wanderers',
            ' athletic', ' albion', ' hotspur', ' palace',
            ' bulls', ' hawks', ' eagles', ' warriors', ' heat',
            ' lakers', ' celtics', ' knicks', ' nets'
        ]
        
        for suffix in suffixes_to_remove:
            if normalized.endswith(suffix):
                normalized = normalized[:-len(suffix)].strip()
        
        # Remove special characters but keep spaces
        normalized = re.sub(r'[^\w\s]', '', normalized)
        
        # Remove extra spaces
        normalized = ' '.join(normalized.split())
        
        return normalized
    
    def calculate_team_similarity(self, team1: str, team2: str) -> float:
        """
        Calculate similarity score between two team names (0-1)
        1.0 = perfect match, 0.0 = no match
        """
        if not team1 or not team2:
            return 0.0
        
        norm1 = self.normalize_team_name(team1)
        norm2 = self.normalize_team_name(team2)
        
        # Exact match after normalization
        if norm1 == norm2:
            return 1.0
        
        # One contains the other
        if norm1 in norm2 or norm2 in norm1:
            return 0.9
        
        # Check first word match (club name)
        words1 = norm1.split()
        words2 = norm2.split()
        
        if words1 and words2:
            if words1[0] == words2[0]:
                return 0.8
            
            # Check if any significant word matches
            significant_words1 = [w for w in words1 if len(w) > 3]
            significant_words2 = [w for w in words2 if len(w) > 3]
            
            common_words = set(significant_words1) & set(significant_words2)
            if common_words:
                return 0.7
        
        return 0.0
    
    def match_teams(self, home1: str, away1: str, home2: str, away2: str) -> float:
        """
        Calculate match score for two matches (0-1)
        Returns average similarity of home and away teams
        """
        home_sim = self.calculate_team_similarity(home1, home2)
        away_sim = self.calculate_team_similarity(away1, away2)
        
        # Both teams must have reasonable similarity
        if home_sim < 0.7 or away_sim < 0.7:
            return 0.0
        
        return (home_sim + away_sim) / 2
    
    def matches_within_time_window(self, time1: str, time2: str, hours: int = 2) -> bool:
        """
        Check if two match times are within the specified window
        """
        try:
            dt1 = datetime.fromisoformat(time1.replace('Z', '+00:00'))
            dt2 = datetime.fromisoformat(time2.replace('Z', '+00:00'))
            
            diff = abs((dt1 - dt2).total_seconds() / 3600)
            return diff <= hours
        except:
            return False
    
    async def link_match(self, odds_match: Dict, api_fixture: Dict, api_type: str) -> Optional[str]:
        """
        Create/update link between ODDS API match and API-Football/Basketball fixture
        
        Args:
            odds_match: Match from ODDS API (has bookmakers)
            api_fixture: Fixture from API-Football/Basketball (has live scores)
            api_type: 'football', 'basketball', or 'cricket'
        
        Returns:
            link_id if successful, None otherwise
        """
        try:
            odds_match_id = odds_match.get('id')
            
            if api_type == 'football':
                api_fixture_id = str(api_fixture.get('fixture', {}).get('id'))
            elif api_type == 'basketball':
                api_fixture_id = str(api_fixture.get('id'))
            elif api_type == 'cricket':
                api_fixture_id = str(api_fixture.get('id'))
            else:
                return None
            
            if not odds_match_id or not api_fixture_id:
                return None
            
            # Calculate match score
            home1 = odds_match.get('home_team', '')
            away1 = odds_match.get('away_team', '')
            
            if api_type == 'football':
                home2 = api_fixture.get('teams', {}).get('home', {}).get('name', '')
                away2 = api_fixture.get('teams', {}).get('away', {}).get('name', '')
            elif api_type == 'basketball':
                home2 = api_fixture.get('teams', {}).get('home', {}).get('name', '')
                away2 = api_fixture.get('teams', {}).get('away', {}).get('name', '')
            elif api_type == 'cricket':
                teams = api_fixture.get('teams', [])
                home2 = teams[0] if len(teams) > 0 else ''
                away2 = teams[1] if len(teams) > 1 else ''
            else:
                return None
            
            match_score = self.match_teams(home1, away1, home2, away2)
            
            if match_score < 0.7:
                # Not confident enough in the match
                return None
            
            # Create/update link
            link_data = {
                'odds_match_id': odds_match_id,
                f'{api_type}_fixture_id': api_fixture_id,
                'home_team_odds': home1,
                'away_team_odds': away1,
                f'home_team_{api_type}': home2,
                f'away_team_{api_type}': away2,
                'match_score': match_score,
                'linked_at': datetime.now(timezone.utc),
                'api_type': api_type
            }
            
            # Upsert link
            await self.match_links_collection.update_one(
                {
                    'odds_match_id': odds_match_id,
                    'api_type': api_type
                },
                {'$set': link_data},
                upsert=True
            )
            
            logger.debug(f"✅ Linked {api_type}: {home1} vs {away1} → {home2} vs {away2} (score: {match_score:.2f})")
            
            return f"{odds_match_id}_{api_type}_{api_fixture_id}"
            
        except Exception as e:
            logger.error(f"Error linking match: {e}")
            return None
    
    async def get_linked_fixture_id(self, odds_match_id: str, api_type: str) -> Optional[str]:
        """
        Get linked fixture ID for a given ODDS API match
        """
        try:
            link = await self.match_links_collection.find_one({
                'odds_match_id': odds_match_id,
                'api_type': api_type
            })
            
            if link:
                return link.get(f'{api_type}_fixture_id')
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting linked fixture: {e}")
            return None
    
    async def auto_link_all_matches(self, sport_type: str = 'all') -> Dict:
        """
        Automatically link all unlinked matches in the database
        
        Args:
            sport_type: 'football', 'basketball', 'cricket', or 'all'
        
        Returns:
            Statistics about linking process
        """
        try:
            logger.info(f"🔗 Starting auto-linking for {sport_type}...")
            
            # Get all matches from odds_cache that need linking
            query = {}
            if sport_type == 'football':
                query['sport_key'] = {'$regex': 'soccer', '$options': 'i'}
            elif sport_type == 'basketball':
                query['sport_key'] = {'$regex': 'basketball', '$options': 'i'}
            elif sport_type == 'cricket':
                query['sport_key'] = {'$regex': 'cricket', '$options': 'i'}
            
            odds_matches = await self.db.odds_cache.find(query).to_list(length=1000)
            
            linked_count = 0
            total_matches = len(odds_matches)
            
            logger.info(f"📊 Found {total_matches} matches to link")
            
            return {
                'total_matches': total_matches,
                'linked': linked_count,
                'failed': total_matches - linked_count
            }
            
        except Exception as e:
            logger.error(f"Error in auto-linking: {e}")
            return {'error': str(e)}

# Singleton instance
_match_linking_service = None

def get_match_linking_service(db):
    """Get or create match linking service"""
    global _match_linking_service
    if _match_linking_service is None:
        _match_linking_service = MatchLinkingService(db)
    return _match_linking_service
