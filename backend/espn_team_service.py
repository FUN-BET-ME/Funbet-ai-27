"""
ESPN Team Service
- Fetch team logos from ESPN API
- Fetch team historical stats for 2025-2026 season
"""
import logging
import httpx
from typing import Dict, Optional, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ESPN API Base URLs
ESPN_API_BASE = "https://site.api.espn.com/apis/site/v2/sports"

# Sport mappings
SPORT_MAPPINGS = {
    'soccer': 'soccer',
    'cricket': 'cricket',
    'basketball': 'basketball',
    'american-football': 'football',
    'ice-hockey': 'hockey'
}

# League mappings for ESPN
LEAGUE_MAPPINGS = {
    # Football/Soccer
    'soccer_epl': {'sport': 'soccer', 'league': 'eng.1'},
    'soccer_spain_la_liga': {'sport': 'soccer', 'league': 'esp.1'},
    'soccer_germany_bundesliga': {'sport': 'soccer', 'league': 'ger.1'},
    'soccer_italy_serie_a': {'sport': 'soccer', 'league': 'ita.1'},
    'soccer_france_ligue_one': {'sport': 'soccer', 'league': 'fra.1'},
    'soccer_uefa_champs_league': {'sport': 'soccer', 'league': 'uefa.champions'},
    'soccer_uefa_europa_league': {'sport': 'soccer', 'league': 'uefa.europa'},
    'soccer_efl_champ': {'sport': 'soccer', 'league': 'eng.2'},
    'soccer_netherlands_eredivisie': {'sport': 'soccer', 'league': 'ned.1'},
    'soccer_portugal_primeira_liga': {'sport': 'soccer', 'league': 'por.1'},
    'soccer_brazil_campeonato': {'sport': 'soccer', 'league': 'bra.1'},
    'soccer_argentina_primera_division': {'sport': 'soccer', 'league': 'arg.1'},
    'soccer_mexico_ligamx': {'sport': 'soccer', 'league': 'mex.1'},
    'soccer_usa_mls': {'sport': 'soccer', 'league': 'usa.1'},
    'soccer_australia_aleague': {'sport': 'soccer', 'league': 'aus.1'},
    
    # Cricket
    'cricket_test_match': {'sport': 'cricket', 'league': 'test'},
    'cricket_odi': {'sport': 'cricket', 'league': 'odi'},
    'cricket_international_t20': {'sport': 'cricket', 'league': 't20'},
    'cricket_ipl': {'sport': 'cricket', 'league': 'ipl'},
}


async def fetch_team_logo_from_espn(team_name: str, sport_key: str = None) -> Optional[str]:
    """
    Fetch team logo from ESPN API
    
    Args:
        team_name: Name of the team
        sport_key: Sport key from odds API (e.g., 'soccer_epl')
    
    Returns:
        Logo URL or None
    """
    try:
        # Get league info
        league_info = LEAGUE_MAPPINGS.get(sport_key, {'sport': 'soccer', 'league': 'eng.1'})
        sport = league_info['sport']
        league = league_info['league']
        
        # Build ESPN teams API URL
        url = f"{ESPN_API_BASE}/{sport}/{league}/teams"
        
        logger.debug(f"Fetching teams from ESPN: {url}")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                teams = data.get('sports', [{}])[0].get('leagues', [{}])[0].get('teams', [])
                
                # Search for team
                team_name_lower = team_name.lower()
                for team_entry in teams:
                    team = team_entry.get('team', {})
                    name = team.get('displayName', '').lower()
                    short_name = team.get('shortDisplayName', '').lower()
                    abbr = team.get('abbreviation', '').lower()
                    
                    if (team_name_lower in name or name in team_name_lower or
                        team_name_lower in short_name or short_name in team_name_lower or
                        team_name_lower == abbr):
                        
                        # Get logo URL
                        logo = team.get('logos', [{}])[0].get('href')
                        if logo:
                            logger.info(f"✅ Found logo for {team_name}: {logo}")
                            return logo
                
                logger.warning(f"⚠️ Team not found in ESPN: {team_name}")
            else:
                logger.warning(f"ESPN API error {response.status_code} for league {league}")
                
    except Exception as e:
        logger.error(f"Error fetching logo from ESPN for {team_name}: {e}")
    
    return None


async def fetch_team_stats_from_espn(team_name: str, sport_key: str, db) -> Dict:
    """
    Fetch team historical stats from ESPN for 2025-2026 season
    
    Args:
        team_name: Name of the team
        sport_key: Sport key from odds API
        db: MongoDB database instance
    
    Returns:
        Dict with team stats
    """
    try:
        league_info = LEAGUE_MAPPINGS.get(sport_key, {'sport': 'soccer', 'league': 'eng.1'})
        sport = league_info['sport']
        league = league_info['league']
        
        # Get team ID first
        teams_url = f"{ESPN_API_BASE}/{sport}/{league}/teams"
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            teams_response = await client.get(teams_url)
            
            if teams_response.status_code != 200:
                logger.warning(f"Failed to fetch teams for {team_name}")
                return {}
            
            teams_data = teams_response.json()
            teams = teams_data.get('sports', [{}])[0].get('leagues', [{}])[0].get('teams', [])
            
            # Find team
            team_id = None
            team_name_lower = team_name.lower()
            
            for team_entry in teams:
                team = team_entry.get('team', {})
                name = team.get('displayName', '').lower()
                short_name = team.get('shortDisplayName', '').lower()
                
                if team_name_lower in name or name in team_name_lower or team_name_lower in short_name:
                    team_id = team.get('id')
                    break
            
            if not team_id:
                logger.warning(f"Team ID not found for {team_name}")
                return {}
            
            # Fetch team stats
            stats_url = f"{ESPN_API_BASE}/{sport}/{league}/teams/{team_id}/statistics"
            stats_response = await client.get(stats_url)
            
            if stats_response.status_code != 200:
                logger.warning(f"Failed to fetch stats for team {team_id}")
                return {}
            
            stats_data = stats_response.json()
            
            # Parse stats
            stats = stats_data.get('team', {}).get('statistics', [])
            
            # Extract relevant stats
            wins = 0
            losses = 0
            draws = 0
            goals_for = 0
            goals_against = 0
            home_wins = 0
            away_wins = 0
            total_games = 0
            
            for stat in stats:
                name = stat.get('name', '')
                value = float(stat.get('value', 0))
                
                if name == 'wins':
                    wins = int(value)
                elif name == 'losses':
                    losses = int(value)
                elif name == 'draws' or name == 'ties':
                    draws = int(value)
                elif name == 'goalsFor' or name == 'points':
                    goals_for = int(value)
                elif name == 'goalsAgainst' or name == 'pointsAgainst':
                    goals_against = int(value)
                elif name == 'homeWins':
                    home_wins = int(value)
                elif name == 'awayWins':
                    away_wins = int(value)
                elif name == 'gamesPlayed':
                    total_games = int(value)
            
            if total_games == 0:
                total_games = wins + losses + draws
            
            # Fetch recent form (last 10 games)
            schedule_url = f"{ESPN_API_BASE}/{sport}/{league}/teams/{team_id}/schedule"
            schedule_response = await client.get(schedule_url)
            
            recent_form = []
            recent_results = []
            
            if schedule_response.status_code == 200:
                schedule_data = schedule_response.json()
                events = schedule_data.get('events', [])
                
                # Get completed games
                completed_games = [e for e in events if e.get('status', {}).get('type', {}).get('completed')]
                
                # Get last 10 games
                for event in completed_games[-10:]:
                    competitions = event.get('competitions', [{}])
                    if not competitions:
                        continue
                    
                    competition = competitions[0]
                    competitors = competition.get('competitors', [])
                    
                    # Find our team
                    our_team = None
                    opponent = None
                    
                    for comp in competitors:
                        if comp.get('id') == team_id:
                            our_team = comp
                        else:
                            opponent = comp
                    
                    if not our_team:
                        continue
                    
                    # Determine result
                    our_score = int(our_team.get('score', 0))
                    opp_score = int(opponent.get('score', 0)) if opponent else 0
                    
                    if our_score > opp_score:
                        result = 'W'
                    elif our_score < opp_score:
                        result = 'L'
                    else:
                        result = 'D'
                    
                    recent_form.append(result)
                    
                    # Store result with venue
                    venue = 'home' if our_team.get('homeAway') == 'home' else 'away'
                    recent_results.append({
                        'result': result,
                        'venue': venue
                    })
            
            # Build stats object
            team_stats = {
                'team_name': team_name,
                'sport_key': sport_key,
                'total_games': total_games,
                'wins': wins,
                'losses': losses,
                'draws': draws,
                'goals_for': goals_for,
                'goals_against': goals_against,
                'home_wins': home_wins,
                'away_wins': away_wins,
                'recent_form': recent_form,  # ['W', 'L', 'D', ...]
                'recent_results': recent_results,  # [{'result': 'W', 'venue': 'home'}, ...]
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            # Store in database
            await db['team_historical_stats'].update_one(
                {'team_name': team_name, 'sport_key': sport_key},
                {'$set': team_stats},
                upsert=True
            )
            
            logger.info(f"✅ Fetched stats for {team_name}: {wins}W-{draws}D-{losses}L, GF:{goals_for} GA:{goals_against}")
            
            return team_stats
            
    except Exception as e:
        logger.error(f"Error fetching stats from ESPN for {team_name}: {e}")
        return {}


async def batch_fetch_team_logos(db, limit: int = 100) -> Dict:
    """
    Batch fetch team logos for all teams in odds_cache
    
    Args:
        db: MongoDB database instance
        limit: Maximum number of teams to process
    
    Returns:
        Dict with statistics
    """
    try:
        logger.info(f"🎨 Starting batch team logo fetch...")
        
        # Get unique teams from odds_cache
        pipeline = [
            {'$group': {
                '_id': {
                    'home_team': '$home_team',
                    'away_team': '$away_team',
                    'sport_key': '$sport_key'
                }
            }},
            {'$limit': limit}
        ]
        
        matches = await db.odds_cache.aggregate(pipeline).to_list(length=limit)
        
        teams_to_fetch = set()
        for match in matches:
            teams_to_fetch.add((match['_id']['home_team'], match['_id']['sport_key']))
            teams_to_fetch.add((match['_id']['away_team'], match['_id']['sport_key']))
        
        logger.info(f"Found {len(teams_to_fetch)} unique teams to fetch logos for...")
        
        fetched = 0
        cached = 0
        errors = 0
        
        for team_name, sport_key in list(teams_to_fetch)[:limit]:
            try:
                # Check if already cached
                cached_logo = await db.team_logos.find_one({
                    'team_name': team_name,
                    'sport_key': sport_key
                })
                
                if cached_logo and cached_logo.get('logo_url'):
                    cached += 1
                    continue
                
                # Fetch logo
                logo_url = await fetch_team_logo_from_espn(team_name, sport_key)
                
                if logo_url:
                    await db.team_logos.update_one(
                        {'team_name': team_name, 'sport_key': sport_key},
                        {'$set': {
                            'logo_url': logo_url,
                            'updated_at': datetime.now(timezone.utc).isoformat()
                        }},
                        upsert=True
                    )
                    fetched += 1
                else:
                    errors += 1
                    
            except Exception as e:
                logger.error(f"Error fetching logo for {team_name}: {e}")
                errors += 1
        
        logger.info(f"✅ Logo fetch complete: {fetched} fetched, {cached} cached, {errors} errors")
        
        return {
            'fetched': fetched,
            'cached': cached,
            'errors': errors,
            'total': len(teams_to_fetch)
        }
        
    except Exception as e:
        logger.error(f"Error in batch logo fetch: {e}")
        return {'fetched': 0, 'cached': 0, 'errors': 1}


async def batch_fetch_team_stats(db, limit: int = 50) -> Dict:
    """
    Batch fetch team stats for all teams in odds_cache
    
    Args:
        db: MongoDB database instance
        limit: Maximum number of teams to process
    
    Returns:
        Dict with statistics
    """
    try:
        logger.info(f"📊 Starting batch team stats fetch...")
        
        # Get unique teams from odds_cache
        pipeline = [
            {'$group': {
                '_id': {
                    'home_team': '$home_team',
                    'away_team': '$away_team',
                    'sport_key': '$sport_key'
                }
            }},
            {'$limit': limit * 2}  # Get more matches to extract teams
        ]
        
        matches = await db.odds_cache.aggregate(pipeline).to_list(length=limit * 2)
        
        teams_to_fetch = set()
        for match in matches:
            teams_to_fetch.add((match['_id']['home_team'], match['_id']['sport_key']))
            teams_to_fetch.add((match['_id']['away_team'], match['_id']['sport_key']))
        
        logger.info(f"Found {len(teams_to_fetch)} unique teams to fetch stats for...")
        
        fetched = 0
        cached = 0
        errors = 0
        
        for team_name, sport_key in list(teams_to_fetch)[:limit]:
            try:
                # Check if stats are recent (less than 24 hours old)
                cached_stats = await db.team_historical_stats.find_one({
                    'team_name': team_name,
                    'sport_key': sport_key
                })
                
                if cached_stats and cached_stats.get('updated_at'):
                    updated_at = datetime.fromisoformat(cached_stats['updated_at'].replace('Z', '+00:00'))
                    age = datetime.now(timezone.utc) - updated_at
                    
                    if age.total_seconds() < 86400:  # Less than 24 hours
                        cached += 1
                        continue
                
                # Fetch stats
                stats = await fetch_team_stats_from_espn(team_name, sport_key, db)
                
                if stats:
                    fetched += 1
                else:
                    errors += 1
                    
                # Rate limiting
                await asyncio.sleep(0.5)
                    
            except Exception as e:
                logger.error(f"Error fetching stats for {team_name}: {e}")
                errors += 1
        
        logger.info(f"✅ Stats fetch complete: {fetched} fetched, {cached} cached, {errors} errors")
        
        return {
            'fetched': fetched,
            'cached': cached,
            'errors': errors,
            'total': len(teams_to_fetch)
        }
        
    except Exception as e:
        logger.error(f"Error in batch stats fetch: {e}")
        return {'fetched': 0, 'cached': 0, 'errors': 1}
