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

CRICKET_API_KEY = os.environ.get('CRICKET_API_KEY', '737b2e8a-8de8-47d0-b6fd-5593f7da8e84')
CRICKET_BASE_URL = "https://api.cricketdata.org"


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



async def fetch_team_recent_matches(team_name: str, limit: int = 10) -> List[Dict]:
    """
    Fetch recent matches for a specific cricket team
    
    Args:
        team_name: Team name to search for
        limit: Number of recent matches
    
    Returns:
        List of recent match results
    """
    try:
        matches = await fetch_current_matches()
        
        # Filter matches involving the team
        team_matches = []
        for match in matches:
            teams = match.get('teams', [])
            if any(team_name.lower() in team.lower() for team in teams):
                team_matches.append(match)
        
        # Sort by date (most recent first)
        team_matches.sort(
            key=lambda x: x.get('dateTimeGMT', x.get('date', '')),
            reverse=True
        )
        
        logger.info(f"CricketData: Found {len(team_matches[:limit])} matches for {team_name}")
        return team_matches[:limit]
        
    except Exception as e:
        logger.error(f"CricketData: Error fetching team matches: {e}")
        return []


async def update_cricket_team_stats(team_name: str, sport_key: str, db) -> bool:
    """
    Update team historical stats in database from CricketData API
    
    Args:
        team_name: Team name
        sport_key: Sport key (e.g., 'cricket_ipl', 'cricket_international')
        db: MongoDB database
    
    Returns:
        True if successful
    """
    try:
        # Fetch recent matches
        recent_matches = await fetch_team_recent_matches(team_name, limit=20)
        
        if not recent_matches:
            logger.warning(f"No CricketData found for {team_name}")
            return False
        
        # Calculate stats
        total_games = 0
        wins = 0
        draws = 0
        losses = 0
        runs_scored = 0
        runs_conceded = 0
        home_wins = 0
        away_wins = 0
        recent_form = []
        recent_results = []
        
        for match in recent_matches:
            status = match.get('status', '').lower()
            teams = match.get('teams', [])
            scores = match.get('score', [])
            
            # Only count completed matches
            if 'finished' not in status and 'won' not in status:
                continue
            
            # Determine if team won
            is_team_first = teams[0].lower() == team_name.lower() if len(teams) >= 2 else True
            
            # Determine result
            if team_name.lower() in status and 'won' in status:
                result = 'W'
                wins += 1
                # Assume home if not specified
                home_wins += 1
            elif 'won' in status:
                result = 'L'
                losses += 1
            elif 'tie' in status or 'draw' in status:
                result = 'D'
                draws += 1
            else:
                continue  # Skip if result unclear
            
            total_games += 1
            
            # Get scores
            team_runs = 0
            opponent_runs = 0
            
            if len(scores) >= 2:
                if is_team_first:
                    team_runs = scores[0].get('r', 0)
                    opponent_runs = scores[1].get('r', 0)
                else:
                    team_runs = scores[1].get('r', 0)
                    opponent_runs = scores[0].get('r', 0)
            
            runs_scored += team_runs
            runs_conceded += opponent_runs
            
            recent_form.append(result)
            recent_results.append({
                'result': result,
                'venue': 'home',  # CricketData doesn't provide venue easily
                'runs_scored': team_runs,
                'runs_conceded': opponent_runs,
                'date': match.get('dateTimeGMT', match.get('date', ''))
            })
        
        if total_games == 0:
            logger.warning(f"No completed matches found for {team_name}")
            return False
        
        # Save to database
        team_stats_collection = db['team_historical_stats']
        
        await team_stats_collection.update_one(
            {
                'team_name': team_name,
                'sport_key': sport_key
            },
            {
                '$set': {
                    'team_name': team_name,
                    'sport_key': sport_key,
                    'total_games': total_games,
                    'wins': wins,
                    'draws': draws,
                    'losses': losses,
                    'goals_for': runs_scored,  # Using same field name for consistency
                    'goals_against': runs_conceded,
                    'home_wins': home_wins,
                    'away_wins': away_wins,
                    'recent_form': recent_form[-10:],
                    'recent_results': recent_results[-10:],
                    'last_updated': datetime.now(timezone.utc).isoformat(),
                    'data_source': 'CricketData'
                }
            },
            upsert=True
        )
        
        logger.info(f"✅ Updated CricketData stats for {team_name}: {wins}W {draws}D {losses}L")
        
        return True
        
    except Exception as e:
        logger.error(f"Error updating cricket team stats: {e}")
        return False
