"""
Cricket Odds + Scores Integration
Combines the-odds-api.com (for ODDS) with CricketData.org (for SCORES)
"""

import os
import httpx
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

ODDS_API_KEY = os.environ.get('ODDS_API_KEY')
ODDS_BASE_URL = "https://api.the-odds-api.com/v4"


async def fetch_cricket_odds(sport_key: str = "cricket_international_t20") -> List[Dict]:
    """
    Fetch cricket odds from the-odds-api.com
    Returns: List of matches with betting odds
    """
    try:
        if not ODDS_API_KEY:
            logger.error("ODDS_API_KEY not configured")
            return []
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{ODDS_BASE_URL}/sports/{sport_key}/odds/",
                params={
                    "apiKey": ODDS_API_KEY,
                    "regions": "us,uk,au,eu",
                    "markets": "h2h",
                    "oddsFormat": "decimal"
                }
            )
            
            if response.status_code == 200:
                matches = response.json()
                logger.info(f"Cricket Odds: Fetched {len(matches)} matches with odds")
                return matches
            else:
                logger.error(f"Cricket Odds: HTTP {response.status_code}")
                return []
                
    except Exception as e:
        logger.error(f"Cricket Odds: Error fetching - {e}")
        return []


def merge_cricket_odds_and_scores(odds_matches: List[Dict], score_matches: List[Dict]) -> List[Dict]:
    """
    Merge cricket odds (from the-odds-api) with scores (from CricketData.org)
    
    This creates COMPLETE cricket match data with:
    - Pre-match odds (for betting)
    - Live/Final scores (for results)
    - Match status
    """
    merged = []
    
    # Create lookup by team names
    scores_lookup = {}
    for score_match in score_matches:
        home = score_match.get('home_team', '').lower()
        away = score_match.get('away_team', '').lower()
        key = f"{home}_{away}"
        scores_lookup[key] = score_match
    
    # Merge odds with scores
    for odds_match in odds_matches:
        home = odds_match.get('home_team', '').lower()
        away = odds_match.get('away_team', '').lower()
        
        # Try to find matching score data
        key1 = f"{home}_{away}"
        key2 = f"{away}_{home}"  # Try reverse
        
        score_data = scores_lookup.get(key1) or scores_lookup.get(key2)
        
        # Build merged match
        merged_match = {
            'id': odds_match.get('id'),
            'sport_key': odds_match.get('sport_key'),
            'sport_title': odds_match.get('sport_title', 'Cricket T20'),
            'commence_time': odds_match.get('commence_time'),
            'home_team': odds_match.get('home_team'),
            'away_team': odds_match.get('away_team'),
            'bookmakers': odds_match.get('bookmakers', []),
            'completed': False,
            'scores': [],
            'match_status': None,
            'venue': None
        }
        
        # Add score data if available
        if score_data:
            merged_match['completed'] = score_data.get('completed', False)
            merged_match['scores'] = score_data.get('scores', [])
            merged_match['match_status'] = score_data.get('match_status')
            merged_match['venue'] = score_data.get('venue')
            merged_match['is_live'] = score_data.get('is_live', False)
        
        merged.append(merged_match)
    
    logger.info(f"Cricket Merge: Created {len(merged)} matches with odds+scores")
    return merged


async def get_complete_cricket_data() -> List[Dict]:
    """
    Get complete cricket data: ODDS + SCORES combined
    This is what a betting platform needs!
    """
    from cricketdata_api import get_cricket_live_scores
    
    # Fetch from both sources
    odds_matches = await fetch_cricket_odds()
    score_matches = await get_cricket_live_scores()
    
    # Merge them
    complete_data = merge_cricket_odds_and_scores(odds_matches, score_matches)
    
    return complete_data
