"""
ESPN API Service for Historical Football Data

Free public API endpoints:
- Scoreboard: http://site.api.espn.com/apis/site/v2/sports/soccer/:league/scoreboard
- Teams: http://site.api.espn.com/apis/site/v2/sports/soccer/:league/teams
- Team Schedule: http://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/:teamId/schedule
"""

import logging
import httpx
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# ESPN League mappings
ESPN_LEAGUES = {
    'soccer_epl': 'eng.1',  # Premier League
    'soccer_laliga': 'esp.1',  # La Liga
    'soccer_bundesliga': 'ger.1',  # Bundesliga
    'soccer_seriea': 'ita.1',  # Serie A
    'soccer_ligue1': 'fra.1',  # Ligue 1
    'soccer_uefa_champions_league': 'uefa.champions',
    'soccer_uefa_europa_league': 'uefa.europa'
}


async def fetch_espn_scoreboard(league_code: str, date: str = None) -> List[Dict]:
    """
    Fetch scoreboard data from ESPN for a specific league and date
    
    Args:
        league_code: ESPN league code (e.g., 'eng.1' for EPL)
        date: Date in YYYYMMDD format (optional, defaults to today)
    
    Returns:
        List of match data
    """
    try:
        if not date:
            date = datetime.now(timezone.utc).strftime('%Y%m%d')
        
        url = f"http://site.api.espn.com/apis/site/v2/sports/soccer/{league_code}/scoreboard"
        params = {'dates': date}
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            events = data.get('events', [])
            logger.info(f"✅ Fetched {len(events)} matches from ESPN {league_code} for {date}")
            
            return events
            
    except Exception as e:
        logger.error(f"Error fetching ESPN scoreboard for {league_code}: {e}")
        return []


async def fetch_team_recent_results(team_id: str, limit: int = 10) -> List[Dict]:
    """
    Fetch recent results for a specific team
    
    Args:
        team_id: ESPN team ID
        limit: Number of recent matches to fetch
    
    Returns:
        List of match results
    """
    try:
        url = f"http://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/{team_id}/schedule"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            # Get completed events (not fixtures)
            events = data.get('events', [])
            completed_events = [
                event for event in events
                if event.get('competitions', [{}])[0].get('status', {}).get('type', {}).get('completed', False)
            ]
            
            # Sort by date (most recent first) and limit
            completed_events.sort(
                key=lambda x: x.get('date', ''),
                reverse=True
            )
            
            recent_results = completed_events[:limit]
            
            logger.info(f"✅ Fetched {len(recent_results)} recent results for team {team_id}")
            
            return recent_results
            
    except Exception as e:
        logger.error(f"Error fetching team results for {team_id}: {e}")
        return []


async def parse_match_result(event: Dict) -> Optional[Dict]:
    """
    Parse ESPN event data into standardized match result
    
    Returns:
        Dict with team, result, venue, goals_for, goals_against
    """
    try:
        competition = event.get('competitions', [{}])[0]
        competitors = competition.get('competitors', [])
        
        if len(competitors) != 2:
            return None
        
        home_team = next((c for c in competitors if c.get('homeAway') == 'home'), None)
        away_team = next((c for c in competitors if c.get('homeAway') == 'away'), None)
        
        if not home_team or not away_team:
            return None
        
        home_score = int(home_team.get('score', 0))
        away_score = int(away_team.get('score', 0))
        
        # Determine result from home team perspective
        if home_score > away_score:
            result = 'W'
        elif home_score < away_score:
            result = 'L'
        else:
            result = 'D'
        
        return {
            'home_team': home_team.get('team', {}).get('displayName', ''),
            'away_team': away_team.get('team', {}).get('displayName', ''),
            'home_score': home_score,
            'away_score': away_score,
            'result': result,
            'date': event.get('date', ''),
            'league': event.get('league', {}).get('name', '')
        }
        
    except Exception as e:
        logger.error(f"Error parsing match result: {e}")
        return None


async def fetch_historical_data_for_team(team_name: str, sport_key: str, days_back: int = 90) -> List[Dict]:
    """
    Fetch historical match data for a team
    
    This is a simplified version - in production, you'd need to:
    1. Map team_name to ESPN team ID
    2. Fetch results using the team ID
    3. Parse and return standardized data
    
    Args:
        team_name: Team name to search for
        sport_key: Sport key (e.g., 'soccer_epl')
        days_back: How many days of history to fetch
    
    Returns:
        List of historical match results
    """
    try:
        # Map sport_key to ESPN league code
        league_code = ESPN_LEAGUES.get(sport_key)
        if not league_code:
            logger.warning(f"No ESPN league mapping for {sport_key}")
            return []
        
        # Fetch recent scoreboards to find team matches
        results = []
        current_date = datetime.now(timezone.utc)
        
        for days_ago in range(0, days_back, 7):  # Check weekly
            check_date = current_date - timedelta(days=days_ago)
            date_str = check_date.strftime('%Y%m%d')
            
            events = await fetch_espn_scoreboard(league_code, date_str)
            
            for event in events:
                parsed = await parse_match_result(event)
                if parsed and (team_name.lower() in parsed['home_team'].lower() or 
                               team_name.lower() in parsed['away_team'].lower()):
                    results.append(parsed)
        
        logger.info(f"✅ Found {len(results)} historical matches for {team_name}")
        
        return results
        
    except Exception as e:
        logger.error(f"Error fetching historical data for {team_name}: {e}")
        return []


async def update_team_stats_from_espn(team_name: str, sport_key: str, db) -> bool:
    """
    Update team historical stats in database from ESPN data
    
    Args:
        team_name: Team name
        sport_key: Sport key
        db: MongoDB database
    
    Returns:
        True if successful
    """
    try:
        # Fetch historical data
        historical_matches = await fetch_historical_data_for_team(team_name, sport_key, days_back=180)
        
        if not historical_matches:
            logger.warning(f"No ESPN data found for {team_name}")
            return False
        
        # Calculate stats
        total_games = 0
        wins = 0
        draws = 0
        losses = 0
        goals_for = 0
        goals_against = 0
        home_wins = 0
        away_wins = 0
        recent_form = []
        recent_results = []
        
        for match in historical_matches:
            # Determine if team was home or away
            is_home = team_name.lower() in match['home_team'].lower()
            
            if is_home:
                result = match['result']
                venue = 'home'
                gf = match['home_score']
                ga = match['away_score']
            else:
                # Reverse result for away team
                if match['result'] == 'W':
                    result = 'L'
                elif match['result'] == 'L':
                    result = 'W'
                else:
                    result = 'D'
                venue = 'away'
                gf = match['away_score']
                ga = match['home_score']
            
            total_games += 1
            goals_for += gf
            goals_against += ga
            
            if result == 'W':
                wins += 1
                if venue == 'home':
                    home_wins += 1
                else:
                    away_wins += 1
            elif result == 'D':
                draws += 1
            else:
                losses += 1
            
            recent_form.append(result)
            recent_results.append({
                'result': result,
                'venue': venue,
                'goals_for': gf,
                'goals_against': ga,
                'date': match['date']
            })
        
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
                    'goals_for': goals_for,
                    'goals_against': goals_against,
                    'home_wins': home_wins,
                    'away_wins': away_wins,
                    'recent_form': recent_form[-10:],  # Last 10 games
                    'recent_results': recent_results[-10:],
                    'last_updated': datetime.now(timezone.utc).isoformat(),
                    'data_source': 'ESPN'
                }
            },
            upsert=True
        )
        
        logger.info(f"✅ Updated ESPN stats for {team_name}: {wins}W {draws}D {losses}L")
        
        return True
        
    except Exception as e:
        logger.error(f"Error updating team stats from ESPN: {e}")
        return False
