"""
CricketData.org API Integration
API Documentation: https://cricketdata.org/documentation
"""

import os
import httpx
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

CRICKET_API_KEY = os.environ.get('CRICKET_API_KEY')
CRICKET_BASE_URL = "https://api.cricapi.com/v1"


async def fetch_current_matches() -> List[Dict]:
    """
    Fetch currently live and recent cricket matches
    Endpoint: /currentMatches
    """
    try:
        if not CRICKET_API_KEY:
            logger.error("CricketData: No API key configured")
            return []
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{CRICKET_BASE_URL}/currentMatches",
                params={
                    "apikey": CRICKET_API_KEY,
                    "offset": 0
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('status') == 'success':
                    matches = data.get('data', [])
                    logger.info(f"CricketData: Fetched {len(matches)} current matches")
                    return matches
                else:
                    reason = data.get('reason', 'Unknown error')
                    logger.error(f"CricketData: API error - {reason}")
                    
                    # Log API usage info
                    if 'info' in data:
                        info = data['info']
                        logger.warning(f"CricketData: Hits today: {info.get('hitsToday')}/{info.get('hitsLimit')}")
                    
                    return []
            else:
                logger.error(f"CricketData: HTTP error {response.status_code}")
                return []
                
    except Exception as e:
        logger.error(f"CricketData: Error fetching current matches: {e}")
        return []


async def fetch_match_info(match_id: str) -> Optional[Dict]:
    """
    Fetch detailed information for a specific match
    Endpoint: /match_info
    """
    try:
        if not CRICKET_API_KEY:
            logger.error("CricketData: No API key configured")
            return None
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{CRICKET_BASE_URL}/match_info",
                params={
                    "apikey": CRICKET_API_KEY,
                    "id": match_id
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('status') == 'success':
                    match_data = data.get('data', {})
                    logger.info(f"CricketData: Fetched match info for {match_id}")
                    return match_data
                else:
                    logger.error(f"CricketData: Failed to fetch match {match_id}")
                    return None
            else:
                logger.error(f"CricketData: HTTP error {response.status_code}")
                return None
                
    except Exception as e:
        logger.error(f"CricketData: Error fetching match info: {e}")
        return None


async def fetch_match_scorecard(match_id: str) -> Optional[Dict]:
    """
    Fetch detailed scorecard for a specific match
    Endpoint: /match_scorecard
    """
    try:
        if not CRICKET_API_KEY:
            logger.error("CricketData: No API key configured")
            return None
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{CRICKET_BASE_URL}/match_scorecard",
                params={
                    "apikey": CRICKET_API_KEY,
                    "id": match_id
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('status') == 'success':
                    scorecard = data.get('data', {})
                    logger.info(f"CricketData: Fetched scorecard for {match_id}")
                    return scorecard
                else:
                    logger.error(f"CricketData: Failed to fetch scorecard {match_id}")
                    return None
            else:
                logger.error(f"CricketData: HTTP error {response.status_code}")
                return None
                
    except Exception as e:
        logger.error(f"CricketData: Error fetching scorecard: {e}")
        return None


def convert_to_odds_api_format(cricket_matches: List[Dict]) -> List[Dict]:
    """
    Convert CricketData.org format to match our odds-api format
    
    CricketData.org match structure:
    {
        "id": "match-id",
        "name": "Team1 vs Team2",
        "matchType": "t20/odi/test",
        "status": "Match in progress/Match finished",
        "venue": "Stadium name",
        "date": "2025-11-06T10:00:00.000Z",
        "dateTimeGMT": "2025-11-06T10:00:00.000Z",
        "teams": ["Team1", "Team2"],
        "score": [
            {"r": 167, "w": 8, "o": 20, "inning": "Team1 Inning 1"},
            {"r": 119, "w": 10, "o": 17.2, "inning": "Team2 Inning 1"}
        ],
        "teamInfo": [
            {"name": "Team1", "shortname": "T1", "img": "url"},
            {"name": "Team2", "shortname": "T2", "img": "url"}
        ]
    }
    """
    converted = []
    
    for match in cricket_matches:
        try:
            # Extract basic info
            match_id = match.get('id', '')
            match_name = match.get('name', '')
            match_type = match.get('matchType', 'cricket').upper()
            status = match.get('status', '')
            venue = match.get('venue', '')
            date_str = match.get('dateTimeGMT', match.get('date', ''))
            
            # Get team info
            teams = match.get('teams', [])
            team_info = match.get('teamInfo', [])
            
            if len(teams) < 2:
                logger.warning(f"CricketData: Match {match_id} has insufficient team data")
                continue
            
            home_team = teams[0]
            away_team = teams[1]
            
            # Determine if match is completed
            is_completed = 'finished' in status.lower() or 'won' in status.lower()
            is_live = 'progress' in status.lower() or 'live' in status.lower()
            
            # Get scores
            scores_data = match.get('score', [])
            scores_list = []
            
            if scores_data:
                # Parse scores for both teams
                for i, team_name in enumerate(teams):
                    team_score = None
                    # Find score for this team
                    for score in scores_data:
                        if team_name.lower() in score.get('inning', '').lower():
                            runs = score.get('r', 0)
                            wickets = score.get('w', 0)
                            team_score = f"{runs}/{wickets}" if wickets < 10 else str(runs)
                            break
                    
                    if team_score:
                        scores_list.append({
                            'name': team_name,
                            'score': team_score
                        })
            
            # Parse commence time
            try:
                if date_str:
                    commence_time = datetime.fromisoformat(date_str.replace('Z', '+00:00')).isoformat()
                else:
                    commence_time = datetime.now(timezone.utc).isoformat()
            except:
                commence_time = datetime.now(timezone.utc).isoformat()
            
            # Build converted match object
            converted_match = {
                'id': match_id,
                'sport_key': 'cricket',
                'sport_title': f'Cricket {match_type}',
                'commence_time': commence_time,
                'home_team': home_team,
                'away_team': away_team,
                'completed': is_completed,
                'scores': scores_list,
                'bookmakers': [],  # CricketData doesn't provide odds
                'match_status': status,
                'venue': venue,
                'is_live': is_live
            }
            
            # Add last_update for live matches
            if is_live or scores_list:
                converted_match['last_update'] = datetime.now(timezone.utc).isoformat()
            
            converted.append(converted_match)
            
        except Exception as e:
            logger.warning(f"CricketData: Error converting match: {e}")
            continue
    
    return converted


async def get_cricket_live_scores() -> List[Dict]:
    """
    Get all live and recent cricket matches in odds-api format
    """
    matches = await fetch_current_matches()
    converted = convert_to_odds_api_format(matches)
    return converted


async def get_cricket_recent_results() -> List[Dict]:
    """
    Get recent completed cricket matches (last 48 hours)
    """
    matches = await fetch_current_matches()
    converted = convert_to_odds_api_format(matches)
    
    # Filter for completed matches only
    completed = [m for m in converted if m.get('completed', False)]
    
    logger.info(f"CricketData: {len(completed)} completed matches found")
    return completed
