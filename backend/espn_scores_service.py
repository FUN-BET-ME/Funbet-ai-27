"""
ESPN Live Scores Service
Fetches live scores from ESPN API for multiple sports
"""
import httpx
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

async def fetch_espn_football_scores() -> List[Dict]:
    """Fetch live football/soccer scores from ESPN API"""
    try:
        logger.info("Fetching live football scores from ESPN API")
        espn_scores = []
        
        # Major football competitions on ESPN (expanded global coverage)
        espn_leagues = [
            # International & World Cup
            {'id': 'fifa.world', 'name': 'FIFA World Cup'},
            {'id': 'fifa.worldq.uefa', 'name': 'World Cup Qualifying - UEFA'},
            {'id': 'fifa.worldq.conmebol', 'name': 'World Cup Qualifying - CONMEBOL'},
            {'id': 'fifa.worldq.concacaf', 'name': 'World Cup Qualifying - CONCACAF'},
            {'id': 'uefa.nations', 'name': 'UEFA Nations League'},
            
            # UEFA Competitions
            {'id': 'uefa.champions', 'name': 'UEFA Champions League'},
            {'id': 'uefa.europa', 'name': 'UEFA Europa League'},
            {'id': 'uefa.europa.conf', 'name': 'UEFA Europa Conference League'},
            
            # England
            {'id': 'eng.1', 'name': 'EPL'},
            {'id': 'eng.2', 'name': 'Championship'},
            {'id': 'eng.3', 'name': 'League One'},
            {'id': 'eng.4', 'name': 'League Two'},
            
            # Spain
            {'id': 'esp.1', 'name': 'La Liga'},
            {'id': 'esp.2', 'name': 'La Liga 2'},
            
            # Germany
            {'id': 'ger.1', 'name': 'Bundesliga'},
            {'id': 'ger.2', 'name': 'Bundesliga 2'},
            
            # Italy
            {'id': 'ita.1', 'name': 'Serie A'},
            {'id': 'ita.2', 'name': 'Serie B'},
            
            # France
            {'id': 'fra.1', 'name': 'Ligue 1'},
            {'id': 'fra.2', 'name': 'Ligue 2'},
            
            # Portugal, Netherlands, Belgium
            {'id': 'por.1', 'name': 'Primeira Liga'},
            {'id': 'ned.1', 'name': 'Eredivisie'},
            {'id': 'bel.1', 'name': 'Belgian Pro League'},
            
            # Scotland, Turkey, Greece
            {'id': 'sco.1', 'name': 'Scottish Premiership'},
            {'id': 'tur.1', 'name': 'Süper Lig'},
            {'id': 'gre.1', 'name': 'Super League Greece'},
            
            # South America
            {'id': 'conmebol.libertadores', 'name': 'Copa Libertadores'},
            {'id': 'conmebol.sudamericana', 'name': 'Copa Sudamericana'},
            {'id': 'bra.1', 'name': 'Brasileirão'},
            {'id': 'arg.1', 'name': 'Liga Profesional Argentina'},
            {'id': 'mex.1', 'name': 'Liga MX'},
            {'id': 'chi.1', 'name': 'Primera División Chile'},
            
            # North America & Others
            {'id': 'usa.1', 'name': 'MLS'},
            {'id': 'aus.1', 'name': 'A-League'},
            {'id': 'jpn.1', 'name': 'J1 League'},
        ]
        
        async with httpx.AsyncClient() as client:
            # Check today + yesterday for live/recent matches
            today = datetime.now(timezone.utc)
            dates_to_check = [(today - timedelta(days=i)).strftime('%Y%m%d') for i in range(2)]
            
            for league in espn_leagues:
                try:
                    all_events = []
                    for date_str in dates_to_check:
                        url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league['id']}/scoreboard?dates={date_str}"
                        response = await client.get(url, timeout=10.0)
                        
                        if response.status_code != 200:
                            continue
                        
                        data = response.json()
                        events = data.get('events', [])
                        all_events.extend(events)
                    
                    if not all_events:
                        continue
                    
                    logger.info(f"ESPN API: Found {len(all_events)} events from {league['name']}")
                    
                    for event in all_events:
                        try:
                            # Extract match details
                            competition = event.get('competitions', [{}])[0]
                            status = competition.get('status', {})
                            competitors = competition.get('competitors', [])
                            
                            if len(competitors) < 2:
                                continue
                            
                            home_team = competitors[0] if competitors[0].get('homeAway') == 'home' else competitors[1]
                            away_team = competitors[1] if competitors[1].get('homeAway') == 'away' else competitors[0]
                            
                            # Get scores
                            home_score = home_team.get('score', '0')
                            away_score = away_team.get('score', '0')
                            
                            # Determine match status
                            status_type = status.get('type', {}).get('name', 'STATUS_SCHEDULED')
                            is_completed = status.get('type', {}).get('completed', False)
                            
                            # Only include matches that have started (live or completed)
                            if status_type not in ['STATUS_IN_PROGRESS', 'STATUS_HALFTIME', 'STATUS_FINAL', 'STATUS_FULL_TIME', 'STATUS_END_PERIOD']:
                                continue
                            
                            # Build score object
                            score_entry = {
                                'id': event.get('id', ''),
                                'sport_key': f'soccer_{league["id"].replace(".", "_")}',
                                'sport_title': league['name'],
                                'commence_time': event.get('date', ''),
                                'completed': is_completed,
                                'home_team': home_team.get('team', {}).get('displayName', ''),
                                'away_team': away_team.get('team', {}).get('displayName', ''),
                                'scores': [
                                    {
                                        'name': home_team.get('team', {}).get('displayName', ''),
                                        'score': str(home_score)
                                    },
                                    {
                                        'name': away_team.get('team', {}).get('displayName', ''),
                                        'score': str(away_score)
                                    }
                                ],
                                'last_update': datetime.now(timezone.utc).isoformat(),
                                'match_status': status.get('displayClock', status.get('type', {}).get('description', '')),
                                'is_live': status_type in ['STATUS_IN_PROGRESS', 'STATUS_HALFTIME', 'STATUS_END_PERIOD']
                            }
                            
                            espn_scores.append(score_entry)
                            
                        except Exception as e:
                            logger.warning(f"Error parsing ESPN event: {e}")
                            continue
                    
                except Exception as e:
                    logger.warning(f"Error fetching ESPN scores for {league['name']}: {e}")
                    continue
        
        logger.info(f"✅ Fetched {len(espn_scores)} football scores from ESPN API ({sum(1 for s in espn_scores if s.get('is_live'))} live)")
        return espn_scores
        
    except Exception as e:
        logger.error(f"Error in ESPN football scores fetch: {e}")
        return []


async def fetch_espn_basketball_scores() -> List[Dict]:
    """Fetch live basketball scores from ESPN API (NBA, NCAA)"""
    try:
        logger.info("Fetching live basketball scores from ESPN API")
        basketball_scores = []
        
        # Major basketball leagues on ESPN
        espn_basketball_leagues = [
            {'id': 'nba', 'name': 'NBA', 'odds_api_key': 'basketball_nba'},
            {'id': 'mens-college-basketball', 'name': 'NCAA Basketball', 'odds_api_key': 'basketball_ncaab'},
        ]
        
        async with httpx.AsyncClient() as client:
            today = datetime.now(timezone.utc)
            dates_to_check = [(today - timedelta(days=i)).strftime('%Y%m%d') for i in range(2)]
            
            for league in espn_basketball_leagues:
                try:
                    all_events = []
                    for date_str in dates_to_check:
                        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/{league['id']}/scoreboard?dates={date_str}"
                        response = await client.get(url, timeout=10.0)
                        
                        if response.status_code != 200:
                            continue
                        
                        data = response.json()
                        events = data.get('events', [])
                        all_events.extend(events)
                    
                    if not all_events:
                        continue
                    
                    for event in all_events:
                        try:
                            competition = event.get('competitions', [{}])[0]
                            status = competition.get('status', {})
                            competitors = competition.get('competitors', [])
                            
                            if len(competitors) < 2:
                                continue
                            
                            home_team = competitors[0] if competitors[0].get('homeAway') == 'home' else competitors[1]
                            away_team = competitors[1] if competitors[1].get('homeAway') == 'away' else competitors[0]
                            
                            home_score = home_team.get('score', '0')
                            away_score = away_team.get('score', '0')
                            
                            status_type = status.get('type', {}).get('name', 'STATUS_SCHEDULED')
                            is_completed = status.get('type', {}).get('completed', False)
                            
                            # Only include matches that have started
                            if status_type not in ['STATUS_IN_PROGRESS', 'STATUS_HALFTIME', 'STATUS_FINAL', 'STATUS_END_PERIOD']:
                                continue
                            
                            score_entry = {
                                'id': event.get('id', ''),
                                'sport_key': league['odds_api_key'],
                                'sport_title': league['name'],
                                'commence_time': event.get('date', ''),
                                'completed': is_completed,
                                'home_team': home_team.get('team', {}).get('displayName', ''),
                                'away_team': away_team.get('team', {}).get('displayName', ''),
                                'scores': [
                                    {
                                        'name': home_team.get('team', {}).get('displayName', ''),
                                        'score': str(home_score)
                                    },
                                    {
                                        'name': away_team.get('team', {}).get('displayName', ''),
                                        'score': str(away_score)
                                    }
                                ],
                                'last_update': datetime.now(timezone.utc).isoformat(),
                                'match_status': status.get('displayClock', status.get('type', {}).get('description', '')),
                                'is_live': status_type in ['STATUS_IN_PROGRESS', 'STATUS_HALFTIME', 'STATUS_END_PERIOD']
                            }
                            
                            basketball_scores.append(score_entry)
                            
                        except Exception as e:
                            logger.warning(f"Error parsing ESPN basketball event: {e}")
                            continue
                    
                except Exception as e:
                    logger.warning(f"Error fetching ESPN basketball scores for {league['name']}: {e}")
                    continue
        
        logger.info(f"✅ Fetched {len(basketball_scores)} basketball scores from ESPN API")
        return basketball_scores
        
    except Exception as e:
        logger.error(f"Error in ESPN basketball scores fetch: {e}")
        return []


async def fetch_all_espn_scores() -> List[Dict]:
    """Fetch live scores from all sports on ESPN"""
    try:
        all_scores = []
        
        # Fetch football scores
        football_scores = await fetch_espn_football_scores()
        all_scores.extend(football_scores)
        
        # Fetch basketball scores
        basketball_scores = await fetch_espn_basketball_scores()
        all_scores.extend(basketball_scores)
        
        logger.info(f"✅ Total ESPN scores fetched: {len(all_scores)}")
        return all_scores
        
    except Exception as e:
        logger.error(f"Error fetching all ESPN scores: {e}")
        return []


def normalize_team_name(name: str) -> str:
    """Normalize team name for matching"""
    if not name:
        return ""
    return name.lower().strip().replace("  ", " ")


def match_score_to_odds(odds_match: Dict, espn_scores: List[Dict]) -> Optional[Dict]:
    """Match an odds match to an ESPN score"""
    if not espn_scores:
        return None
    
    odds_home = normalize_team_name(odds_match.get('home_team', ''))
    odds_away = normalize_team_name(odds_match.get('away_team', ''))
    
    for score in espn_scores:
        if not score.get('scores'):
            continue
        
        espn_home = normalize_team_name(score.get('home_team', ''))
        espn_away = normalize_team_name(score.get('away_team', ''))
        
        # Check for match
        home_match = espn_home in odds_home or odds_home in espn_home or espn_home == odds_home
        away_match = espn_away in odds_away or odds_away in espn_away or espn_away == odds_away
        
        if home_match and away_match:
            return score
    
    return None
