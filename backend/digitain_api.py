"""
Digitain Affiliate Feed API Integration
Provides unified odds and live scores for all sports
"""
import os
from dotenv import load_dotenv
import httpx
import msgpack
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import logging

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Digitain API Configuration
DIGITAIN_BASE_URL = os.environ.get('DIGITAIN_BASE_URL', 'https://affiliatefeedapi.tst-digi.com')
DIGITAIN_CLIENT_ID = os.environ.get('DIGITAIN_CLIENT_ID')
DIGITAIN_CLIENT_SECRET = os.environ.get('DIGITAIN_CLIENT_SECRET')

# Token cache
_token_cache = {
    'access_token': None,
    'expires_at': None,
    'refresh_token': None
}


def get_basic_auth():
    """Get Basic Auth credentials for Digitain API"""
    # Digitain uses Basic Auth, not OAuth
    return (DIGITAIN_CLIENT_ID, DIGITAIN_CLIENT_SECRET)


async def fetch_live_events() -> List[Dict]:
    """Fetch live events with scores and odds from Digitain"""
    try:
        auth = get_basic_auth()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{DIGITAIN_BASE_URL}/api/v1/AffiliateFeed/GetLiveEvents",
                auth=auth,
                headers={
                    "Content-Type": "application/json"
                },
                json={
                    "SportIds": [1, 3, 4, 6, 10, 11, 12, 36],  # 1=Football, 3=Tennis, 4=Basketball, 6=American Football, 10=Ice Hockey, 11=Baseball, 12=Rugby, 36=Cricket
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                # Response format: [EventsData, ErrorData, IsSuccessful, Flag]
                data = msgpack.unpackb(response.content, raw=False, strict_map_key=False)
                
                if isinstance(data, list) and len(data) >= 3:
                    is_successful = data[2]  # Third element is IsSuccessful
                    events_data = data[0]  # First element is the events array
                    
                    if is_successful and events_data:
                        logger.info(f"Digitain: Fetched {len(events_data)} live events")
                        return events_data if isinstance(events_data, list) else []
                    else:
                        error_info = data[1] if len(data) > 1 and data[1] else "Unknown error"
                        logger.error(f"Digitain: API returned error: {error_info}")
                        return []
                
                return []
            else:
                logger.error(f"Digitain: Failed to fetch live events. Status: {response.status_code}")
                return []
                
    except Exception as e:
        logger.error(f"Digitain: Error fetching live events: {e}")
        return []


async def fetch_prematch_events(days_ahead: int = 7) -> List[Dict]:
    """Fetch pre-match events with odds from Digitain
    
    Args:
        days_ahead: Number of days ahead to fetch (default 7)
    """
    try:
        auth = get_basic_auth()
        
        # Calculate date range (API expects Unix timestamps in seconds as integers)
        now = datetime.now(timezone.utc)
        start_timestamp = int(now.timestamp())
        end_timestamp = int((now + timedelta(days=days_ahead)).timestamp())
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{DIGITAIN_BASE_URL}/api/v1/AffiliateFeed/GetPrematchEvents",
                auth=auth,
                headers={
                    "Content-Type": "application/json"
                },
                json={
                    "SportIds": [1, 3, 4, 6, 10, 11, 12, 36],  # 1=Football, 3=Tennis, 4=Basketball, 6=American Football, 10=Ice Hockey, 11=Baseball, 12=Rugby, 36=Cricket
                    "StartDate": start_timestamp,
                    "EndDate": end_timestamp
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                # Response format: [EventsData, ErrorData, IsSuccessful, Flag]
                data = msgpack.unpackb(response.content, raw=False, strict_map_key=False)
                
                if isinstance(data, list) and len(data) >= 3:
                    is_successful = data[2]  # Third element is IsSuccessful
                    events_data = data[0]  # First element is the events array
                    
                    if is_successful and events_data:
                        logger.info(f"Digitain: Fetched {len(events_data)} pre-match events")
                        return events_data if isinstance(events_data, list) else []
                    else:
                        error_info = data[1] if len(data) > 1 and data[1] else "Unknown error"
                        logger.error(f"Digitain: API returned error: {error_info}")
                        return []
                
                return []
            else:
                logger.error(f"Digitain: Failed to fetch pre-match events. Status: {response.status_code}")
                return []
                
    except Exception as e:
        logger.error(f"Digitain: Error fetching pre-match events: {e}")
        return []


# Sport ID to name mapping (based on common sports)
SPORT_ID_MAP = {
    1: 'Football',
    3: 'Tennis', 
    4: 'Basketball',
    6: 'American Football',
    10: 'Ice Hockey',
    36: 'Cricket'
}

def convert_to_odds_api_format(digitain_events: List) -> List[Dict]:
    """Convert Digitain event format to match the-odds-api.com format for compatibility
    
    Digitain event structure (array-based) - FROM API v1.8:
    [0]: Event ID (int)
    [1]: Event Name (dict) - {2: "Team1 - Team2"}
    [2]: Home Team (dict) - {2: "Home Team Name"}
    [3]: Away Team (dict) - {2: "Away Team Name"}
    [4]: MatchType (int) - Pre-match=0, Live=1, Both=2
    [5]: TournamentId (int)
    [7]: Event Date (ticks from Unix epoch)
    [11]: Stakes/Odds array - [[StakeID, StakeTypeId, Argument, Name, Factor, ...], ...]
    [29]: HomeTeamScore (int?)
    [30]: AwayTeamScore (int?)
    [32]: LiveMatchStatus (dict) - {2: "Status in English"}
    [33]: TournamentName (dict)
    [34]: ChampionshipName (dict)
    [35]: SportId (int)
    """
    converted = []
    
    for event in digitain_events:
        try:
            # Event is an array, not a dict
            if not isinstance(event, list) or len(event) < 12:
                logger.warning(f"Digitain: Invalid event structure, length: {len(event) if isinstance(event, list) else 'not a list'}")
                continue
            
            # Extract basic info using CORRECT array indices from API v1.8
            event_id = event[0] if len(event) > 0 else None
            event_name_dict = event[1] if len(event) > 1 else {}
            home_team_dict = event[2] if len(event) > 2 else {}
            away_team_dict = event[3] if len(event) > 3 else {}
            match_type = event[4] if len(event) > 4 else 0
            tournament_id = event[5] if len(event) > 5 else 0
            event_date_ticks = event[7] if len(event) > 7 else 0
            
            # Extract scores from CORRECT positions (indices 29 and 30)
            home_score = event[29] if len(event) > 29 else None
            away_score = event[30] if len(event) > 30 else None
            
            # Extract LiveMatchStatus from index 32
            live_match_status_dict = event[32] if len(event) > 32 else {}
            
            # Extract tournament/league names from indices 33 and 34
            tournament_name_dict = event[33] if len(event) > 33 else {}
            championship_name_dict = event[34] if len(event) > 34 else {}
            
            # Extract SportId from index 35 (correct position)
            sport_id = event[35] if len(event) > 35 else 0
            
            # Extract team names (language ID 2 = English, 1 = Russian)
            home_team = home_team_dict.get(2, home_team_dict.get(1, 'Unknown')) if isinstance(home_team_dict, dict) else 'Unknown'
            away_team = away_team_dict.get(2, away_team_dict.get(1, 'Unknown')) if isinstance(away_team_dict, dict) else 'Unknown'
            
            # Clean team names (remove leading/trailing spaces)
            home_team = home_team.strip() if isinstance(home_team, str) else str(home_team)
            away_team = away_team.strip() if isinstance(away_team, str) else str(away_team)
            
            # Team logos - Let frontend handle logos using our teamLogos service
            # Digitain doesn't provide logo URLs directly in the event array
            # Frontend will use teamLogos.js service to fetch logos based on team names
            home_team_logo = None  # Frontend will populate
            away_team_logo = None  # Frontend will populate
            
            # Get stakes/odds (at index 11)
            stakes = event[11] if len(event) > 11 and isinstance(event[11], list) else []
            
            # Build bookmaker data from stakes
            bookmakers = []
            if stakes:
                bookmaker_data = {
                    'key': 'digitain',
                    'title': 'Digitain',
                    'markets': [{
                        'key': 'h2h',
                        'outcomes': []
                    }]
                }
                
                # Each stake: [StakeID, StakeTypeId, Argument, Name, Factor(odds), ...]
                # Argument: 1=Home, 2=Draw, 3=Away
                for stake in stakes:
                    if not isinstance(stake, list) or len(stake) < 5:
                        continue
                    
                    stake_type = stake[1] if len(stake) > 1 else None
                    argument = stake[2] if len(stake) > 2 else None
                    stake_name_dict = stake[3] if len(stake) > 3 else {}
                    factor = stake[4] if len(stake) > 4 else None
                    
                    # Only process Result (1X2) stakes (StakeTypeId = 1)
                    if stake_type != 1 or factor is None:
                        continue
                    
                    # Map argument to outcome name
                    if argument == 1:
                        outcome_name = home_team
                    elif argument == 2:
                        outcome_name = 'Draw'
                    elif argument == 3:
                        outcome_name = away_team
                    else:
                        continue
                    
                    outcome = {
                        'name': outcome_name,
                        'price': float(factor)
                    }
                    bookmaker_data['markets'][0]['outcomes'].append(outcome)
                
                if bookmaker_data['markets'][0]['outcomes']:
                    bookmakers.append(bookmaker_data)
            
            # Convert timestamp (milliseconds since Unix epoch)
            try:
                # Digitain appears to use milliseconds since Unix epoch
                unix_timestamp = event_date_ticks / 1000  # Convert to seconds
                commence_time = datetime.fromtimestamp(unix_timestamp, tz=timezone.utc).isoformat()
            except Exception as e:
                logger.warning(f"Digitain: Error converting timestamp {event_date_ticks}: {e}")
                commence_time = datetime.now(timezone.utc).isoformat()
            
            # Get sport name from mapping
            sport_key = f"digitain_{sport_id}"
            sport_name = SPORT_ID_MAP.get(sport_id, f'Sport_{sport_id}')
            
            # Get league/tournament name - combine championship (region) + tournament (competition)
            # Language ID 2 = English
            championship_name = ""
            tournament_name = ""
            
            if isinstance(championship_name_dict, dict) and championship_name_dict:
                championship_name = championship_name_dict.get(2, championship_name_dict.get(1, ""))
            
            if isinstance(tournament_name_dict, dict) and tournament_name_dict:
                tournament_name = tournament_name_dict.get(2, tournament_name_dict.get(1, ""))
            
            # Build league display name - prefer tournament (more specific), fall back to championship (region)
            if tournament_name and championship_name:
                sport_title_display = f"{tournament_name}"  # e.g., "Champions League"
            elif tournament_name:
                sport_title_display = tournament_name
            elif championship_name:
                sport_title_display = championship_name
            else:
                sport_title_display = sport_name
            
            # Determine if match is completed by checking LiveMatchStatus
            # Language ID 2 = English
            match_status = ""
            if isinstance(live_match_status_dict, dict):
                match_status = live_match_status_dict.get(2, live_match_status_dict.get(1, "")).lower()
            
            # Match is completed if status contains these keywords
            is_completed = any(keyword in match_status for keyword in [
                'finished', 'ended', 'completed', 'final', 'полный', 'завершен'
            ]) if match_status else False
            
            # If no explicit status but match has scores and is not live type, might be completed
            if not is_completed and home_score is not None and away_score is not None and match_type != 1:
                is_completed = True
            
            # Build converted event with logos
            converted_event = {
                'id': str(event_id),
                'sport_key': sport_key,
                'sport_title': sport_title_display,
                'commence_time': commence_time,
                'home_team': home_team,
                'away_team': away_team,
                'home_team_logo': home_team_logo,  # ✅ DIGITAIN LOGO
                'away_team_logo': away_team_logo,  # ✅ DIGITAIN LOGO
                'bookmakers': bookmakers,
                'completed': is_completed,
                'scores': [],
                'match_status': match_status if match_status else 'upcoming'
            }
            
            # Add scores for matches with score data
            if home_score is not None and away_score is not None:
                converted_event['scores'] = [
                    {'name': home_team, 'score': str(home_score)},
                    {'name': away_team, 'score': str(away_score)}
                ]
                converted_event['last_update'] = datetime.now(timezone.utc).isoformat()
            
            converted.append(converted_event)
            
        except Exception as e:
            logger.warning(f"Digitain: Error converting event: {e}")
            import traceback
            logger.warning(traceback.format_exc())
            continue
    
    return converted


async def get_sports_list() -> List[Dict]:
    """Fetch list of all sports from Digitain"""
    try:
        auth = get_basic_auth()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{DIGITAIN_BASE_URL}/api/v1/AffiliateFeed/GetSports",
                auth=auth,
                headers={
                    "Content-Type": "application/json"
                },
                json={},
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = msgpack.unpackb(response.content, raw=False, strict_map_key=False)
                if isinstance(data, list) and len(data) > 1:
                    is_successful = data[2] if len(data) > 2 else False
                    if is_successful and data[1]:
                        sports = data[1]
                        logger.info(f"Digitain: Fetched {len(sports)} sports")
                        return sports if isinstance(sports, list) else []
                return []
            else:
                return []
                
    except Exception as e:
        logger.error(f"Digitain: Error fetching sports: {e}")
        return []
