"""
Cricket API Service - Fetches live cricket scores
Handles Test matches (5 days), ODI, and T20
"""

import logging
import httpx
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class CricketAPIService:
    """Service for fetching cricket live scores and match data"""
    
    def __init__(self):
        # Using CricketAPI or similar service
        self.api_key = os.getenv('CRICKET_API_KEY', '')
        self.base_url = "https://api.cricapi.com/v1"
        
    async def get_live_cricket_scores(self) -> List[Dict]:
        """
        Fetch live cricket scores for all formats
        Returns list of matches with scores and status
        """
        try:
            logger.info("🏏 Fetching live cricket scores...")
            
            matches = []
            
            async with httpx.AsyncClient(timeout=20.0) as client:
                # Get current matches
                url = f"{self.base_url}/currentMatches"
                params = {'apikey': self.api_key}
                
                response = await client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('status') == 'success':
                        match_list = data.get('data', [])
                        
                        for match in match_list:
                            # Parse match data
                            match_id = match.get('id')
                            match_type = match.get('matchType', '')  # test, odi, t20, etc.
                            status = match.get('status', '')  # Live, Completed, etc.
                            
                            # Get teams
                            teams = match.get('teams', [])
                            home_team = teams[0] if len(teams) > 0 else ''
                            away_team = teams[1] if len(teams) > 1 else ''
                            
                            # Get scores
                            score = match.get('score', [])
                            
                            # Parse score based on format
                            home_score = None
                            away_score = None
                            match_status = status
                            
                            if len(score) >= 2:
                                # For Test matches: Parse all innings and show cumulative
                                if match_type.lower() == 'test':
                                    home_innings = []
                                    away_innings = []
                                    
                                    # Determine batting order from first innings
                                    first_innings_name = score[0].get('inning', '').lower() if score else ''
                                    
                                    # Check if home team batted first
                                    home_batted_first = any(word in first_innings_name for word in home_team.lower().split())
                                    
                                    # Assign innings to teams
                                    for idx, innings in enumerate(score):
                                        runs = innings.get('r', 0)
                                        wickets = innings.get('w', 0)
                                        
                                        # Test cricket alternates: 1st innings, 2nd innings, 1st team again, 2nd team again
                                        if home_batted_first:
                                            # Home team batted first
                                            # Innings 0, 2 = home, Innings 1, 3 = away
                                            if idx % 2 == 0:
                                                home_innings.append(f"{runs}/{wickets}")
                                            else:
                                                away_innings.append(f"{runs}/{wickets}")
                                        else:
                                            # Away team batted first
                                            # Innings 0, 2 = away, Innings 1, 3 = home
                                            if idx % 2 == 0:
                                                away_innings.append(f"{runs}/{wickets}")
                                            else:
                                                home_innings.append(f"{runs}/{wickets}")
                                    
                                    # Format: Show all innings with "&" separator
                                    home_score = " & ".join(home_innings) if home_innings else "0/0"
                                    away_score = " & ".join(away_innings) if away_innings else "0/0"
                                    
                                    match_status = status
                                else:
                                    # For ODI/T20: Just show first two scores
                                    team1_score = score[0]
                                    home_runs = team1_score.get('r', 0)
                                    home_wickets = team1_score.get('w', 0)
                                    home_overs = team1_score.get('o', 0)
                                    
                                    team2_score = score[1]
                                    away_runs = team2_score.get('r', 0)
                                    away_wickets = team2_score.get('w', 0)
                                    away_overs = team2_score.get('o', 0)
                                    
                                    home_score = f"{home_runs}/{home_wickets}"
                                    away_score = f"{away_runs}/{away_wickets}"
                                    match_status = f"{status} - {home_overs} overs"
                            
                            # Check if match is live or completed using API flags
                            match_started = match.get('matchStarted', False)
                            match_ended = match.get('matchEnded', False)
                            
                            # Match is live if it has started but not ended, and not at Stumps
                            # "Stumps" means day's play has ended (Test cricket)
                            is_at_stumps = 'stumps' in status.lower()
                            is_live = match_started and not match_ended and not is_at_stumps
                            is_completed = match_ended or 'won' in status.lower() or 'finished' in status.lower()
                            
                            # For Test matches - track day but don't override live status
                            # Live = playing right now, Ongoing = started but between days (Stumps)
                            if match_type.lower() == 'test':
                                match_date = match.get('date')
                                if match_date:
                                    try:
                                        start_date = datetime.fromisoformat(match_date.replace('Z', '+00:00'))
                                        days_elapsed = (datetime.now(timezone.utc) - start_date).days
                                        
                                        # Keep test matches marked as ongoing even at Stumps
                                        if days_elapsed < 5 and not is_completed and is_at_stumps:
                                            # Not live right now, but ongoing (show as recent/upcoming)
                                            match_status = f"Day {days_elapsed + 1} - {status}"
                                    except:
                                        pass
                            
                            # Create scores array for consistency with other sports
                            scores_array = []
                            if home_score and away_score:
                                scores_array = [
                                    {'name': home_team, 'score': home_score},
                                    {'name': away_team, 'score': away_score}
                                ]
                            
                            matches.append({
                                'match_id': match_id,
                                'home_team': home_team,
                                'away_team': away_team,
                                'home_score': home_score,
                                'away_score': away_score,
                                'scores': scores_array,  # Add scores array for completed matches
                                'is_live': is_live,
                                'completed': is_completed,
                                'match_status': match_status,
                                'match_type': match_type,
                                'venue': match.get('venue', ''),
                                'series': match.get('series', ''),
                                'date': match.get('date'),
                                'last_update': datetime.now(timezone.utc).isoformat()
                            })
                        
                        logger.info(f"✅ Cricket: Found {len(matches)} matches ({sum(1 for m in matches if m['is_live'])} live)")
                    
                else:
                    logger.warning(f"Cricket API returned status {response.status_code}")
            
            return matches
            
        except Exception as e:
            logger.error(f"❌ Error fetching cricket scores: {e}")
            return []
    
    async def get_match_details(self, match_id: str) -> Optional[Dict]:
        """
        Get detailed match information including ball-by-ball
        """
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                url = f"{self.base_url}/match_info"
                params = {
                    'apikey': self.api_key,
                    'id': match_id
                }
                
                response = await client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('status') == 'success':
                        return data.get('data')
                
                return None
                
        except Exception as e:
            logger.error(f"Error fetching match details: {e}")
            return None

# Singleton instance
cricket_api_service = CricketAPIService()
