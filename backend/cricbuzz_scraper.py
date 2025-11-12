"""
Cricbuzz Live Scores Scraper (Fallback for Cricket)
Uses unofficial Cricbuzz API for live cricket scores
"""
import httpx
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

async def fetch_cricbuzz_live_scores() -> List[Dict]:
    """
    Fetch live cricket scores from Cricbuzz unofficial API
    Returns list of matches with scores
    """
    try:
        # Try the unofficial API endpoint
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Cricbuzz mobile site API endpoint (commonly used by scrapers)
            response = await client.get(
                "https://m.cricbuzz.com/api/cricket-match/live-scores",
                headers={
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Cricbuzz: Fetched live cricket scores")
                return parse_cricbuzz_scores(data)
            else:
                logger.warning(f"Cricbuzz: Failed to fetch scores. Status: {response.status_code}")
                return []
                
    except Exception as e:
        logger.error(f"Cricbuzz: Error fetching live scores: {e}")
        return []


def parse_cricbuzz_scores(data: Dict) -> List[Dict]:
    """Parse Cricbuzz API response to standard format"""
    matches = []
    
    try:
        # Cricbuzz API structure: matches in 'typeMatches' array
        if 'typeMatches' in data:
            for type_match in data['typeMatches']:
                if 'seriesMatches' in type_match:
                    for series in type_match['seriesMatches']:
                        if 'seriesAdWrapper' in series and 'matches' in series['seriesAdWrapper']:
                            for match_info in series['seriesAdWrapper']['matches']:
                                if 'matchInfo' in match_info:
                                    match = match_info['matchInfo']
                                    match_score = match_info.get('matchScore', {})
                                    
                                    # Extract team names
                                    team1 = match.get('team1', {}).get('teamName', 'Unknown')
                                    team2 = match.get('team2', {}).get('teamName', 'Unknown')
                                    
                                    # Extract scores
                                    team1_score = None
                                    team2_score = None
                                    
                                    if 'team1Score' in match_score:
                                        t1_score = match_score['team1Score']
                                        team1_score = f"{t1_score.get('inngs1', {}).get('runs', 0)}/{t1_score.get('inngs1', {}).get('wickets', 0)}"
                                    
                                    if 'team2Score' in match_score:
                                        t2_score = match_score['team2Score']
                                        team2_score = f"{t2_score.get('inngs1', {}).get('runs', 0)}/{t2_score.get('inngs1', {}).get('wickets', 0)}"
                                    
                                    # Check if live
                                    state = match.get('state', '')
                                    is_live = state == 'In Progress'
                                    
                                    if is_live or team1_score or team2_score:
                                        matches.append({
                                            'home_team': team1,
                                            'away_team': team2,
                                            'home_score': team1_score or '0/0',
                                            'away_score': team2_score or '0/0',
                                            'status': match.get('status', ''),
                                            'state': state,
                                            'is_live': is_live
                                        })
        
        logger.info(f"Cricbuzz: Parsed {len(matches)} cricket matches")
        return matches
        
    except Exception as e:
        logger.error(f"Cricbuzz: Error parsing scores: {e}")
        return []
