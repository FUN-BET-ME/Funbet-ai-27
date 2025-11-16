"""
API-Sports Live Scores Service
Fetches live scores from API-Sports.io for comprehensive football and basketball coverage
"""
import httpx
import logging
import os
from datetime import datetime, timezone
from typing import List, Dict

logger = logging.getLogger(__name__)

async def fetch_api_football_live_scores() -> List[Dict]:
    """Fetch all live football matches from API-Football"""
    try:
        api_key = os.environ.get('API_FOOTBALL_KEY')
        if not api_key:
            logger.warning("API_FOOTBALL_KEY not found in environment")
            return []
        
        logger.info("Fetching live football scores from API-Football")
        
        async with httpx.AsyncClient() as client:
            # Fetch all live matches
            url = "https://v3.football.api-sports.io/fixtures"
            headers = {'x-apisports-key': api_key}
            params = {'live': 'all'}
            
            response = await client.get(url, headers=headers, params=params, timeout=15.0)
            
            if response.status_code != 200:
                logger.error(f"API-Football returned status {response.status_code}")
                return []
            
            data = response.json()
            fixtures = data.get('response', [])
            
            logger.info(f"✅ API-Football: Found {len(fixtures)} live matches")
            
            # Transform to our format
            live_scores = []
            for fixture in fixtures:
                try:
                    # Extract match data
                    fixture_data = fixture.get('fixture', {})
                    teams = fixture.get('teams', {})
                    goals = fixture.get('goals', {})
                    league = fixture.get('league', {})
                    status = fixture_data.get('status', {})
                    
                    home_team = teams.get('home', {}).get('name', '')
                    away_team = teams.get('away', {}).get('name', '')
                    home_score = goals.get('home', 0)
                    away_score = goals.get('away', 0)
                    
                    # Get match status
                    status_short = status.get('short', 'LIVE')
                    status_elapsed = status.get('elapsed', 0)
                    
                    # Determine if match is completed
                    is_completed = status_short in ['FT', 'AET', 'PEN']
                    is_live = status_short in ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE']
                    
                    # Format match status
                    if status_short == 'HT':
                        match_status = 'HT'
                    elif status_short == 'FT':
                        match_status = 'FT'
                    elif status_elapsed:
                        match_status = f"{status_elapsed}'"
                    else:
                        match_status = 'Live'
                    
                    # Determine sport_key based on league
                    league_name = league.get('name', '')
                    if 'World Cup' in league_name and 'Qualification' in league_name:
                        if 'Europe' in league_name:
                            sport_key = 'soccer_fifa_world_cup_qualifiers_europe'
                        else:
                            sport_key = 'soccer_fifa_world_cup_qualifiers'
                    elif 'Champions League' in league_name:
                        sport_key = 'soccer_uefa_champs_league'
                    elif 'Europa League' in league_name:
                        sport_key = 'soccer_uefa_europa_league'
                    else:
                        # Default to a generic soccer key
                        sport_key = f"soccer_{league.get('country', {}).get('name', 'unknown').lower().replace(' ', '_')}"
                    
                    score_entry = {
                        'id': str(fixture_data.get('id', '')),
                        'sport_key': sport_key,
                        'sport_title': league_name,
                        'commence_time': fixture_data.get('date', ''),
                        'completed': is_completed,
                        'home_team': home_team,
                        'away_team': away_team,
                        'home_score': str(home_score) if home_score is not None else '0',
                        'away_score': str(away_score) if away_score is not None else '0',
                        'scores': [
                            {
                                'name': home_team,
                                'score': str(home_score) if home_score is not None else '0'
                            },
                            {
                                'name': away_team,
                                'score': str(away_score) if away_score is not None else '0'
                            }
                        ],
                        'last_update': datetime.now(timezone.utc).isoformat(),
                        'match_status': match_status,
                        'is_live': is_live
                    }
                    
                    live_scores.append(score_entry)
                    
                except Exception as e:
                    logger.warning(f"Error parsing fixture: {e}")
                    continue
            
            logger.info(f"✅ API-Football: Processed {len(live_scores)} live scores")
            return live_scores
            
    except Exception as e:
        logger.error(f"Error fetching API-Football live scores: {e}")
        return []
