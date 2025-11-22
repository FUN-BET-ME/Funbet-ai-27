"""
Historical Data Builder for FunBet IQ
Fetches and stores historical data from:
- API-Football: Team stats, H2H records, historical odds
- API-Basketball: Team stats, H2H records
- Cricket API: Team stats, H2H records
- The Odds API: Historical odds for movement analysis
"""
import httpx
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Dict, List
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)


class HistoricalDataBuilder:
    def __init__(self):
        self.api_football_key = os.environ.get('API_FOOTBALL_KEY')
        self.odds_api_key = os.environ.get('ODDS_API_KEY')
        self.cricket_api_key = os.environ.get('CRICKET_API_KEY')
        self.db = None
        
    async def connect_db(self):
        """Connect to MongoDB"""
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        client = AsyncIOMotorClient(mongo_url)
        self.db = client[db_name]
        logger.info("✅ Connected to MongoDB for historical data")
    
    # ==================== FOOTBALL HISTORICAL DATA ====================
    
    async def fetch_football_team_stats(self, team_name: str, league_id: int, season: int) -> Dict:
        """Fetch team statistics from API-Football"""
        try:
            if not self.api_football_key:
                return None
            
            async with httpx.AsyncClient() as client:
                # Search for team
                url = "https://v3.football.api-sports.io/teams"
                headers = {'x-apisports-key': self.api_football_key}
                params = {'search': team_name}
                
                response = await client.get(url, headers=headers, params=params, timeout=10.0)
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                teams = data.get('response', [])
                
                if not teams:
                    logger.warning(f"Team not found: {team_name}")
                    return None
                
                team_id = teams[0]['team']['id']
                
                # Fetch team statistics
                url = "https://v3.football.api-sports.io/teams/statistics"
                params = {'team': team_id, 'league': league_id, 'season': season}
                
                response = await client.get(url, headers=headers, params=params, timeout=10.0)
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                stats = data.get('response', {})
                
                if not stats:
                    return None
                
                # Extract relevant statistics
                fixtures = stats.get('fixtures', {})
                goals = stats.get('goals', {})
                
                team_stats = {
                    'team_name': team_name,
                    'team_id': team_id,
                    'sport_key': f'soccer_{league_id}',
                    'total_games': fixtures.get('played', {}).get('total', 0),
                    'wins': fixtures.get('wins', {}).get('total', 0),
                    'draws': fixtures.get('draws', {}).get('total', 0),
                    'losses': fixtures.get('loses', {}).get('total', 0),
                    'home_wins': fixtures.get('wins', {}).get('home', 0),
                    'away_wins': fixtures.get('wins', {}).get('away', 0),
                    'goals_for': goals.get('for', {}).get('total', {}).get('total', 0),
                    'goals_against': goals.get('against', {}).get('total', {}).get('total', 0),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                
                logger.info(f"✅ Fetched stats for {team_name}: {team_stats['wins']}W-{team_stats['draws']}D-{team_stats['losses']}L")
                
                return team_stats
                
        except Exception as e:
            logger.error(f"Error fetching football stats for {team_name}: {e}")
            return None
    
    async def fetch_football_h2h(self, team1_id: int, team2_id: int, team1_name: str, team2_name: str) -> Dict:
        """Fetch head-to-head record from API-Football"""
        try:
            if not self.api_football_key:
                return None
            
            async with httpx.AsyncClient() as client:
                url = "https://v3.football.api-sports.io/fixtures/headtohead"
                headers = {'x-apisports-key': self.api_football_key}
                params = {'h2h': f'{team1_id}-{team2_id}', 'last': 20}  # Last 20 H2H matches
                
                response = await client.get(url, headers=headers, params=params, timeout=10.0)
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                fixtures = data.get('response', [])
                
                if not fixtures:
                    return None
                
                # Analyze H2H record
                team1_wins = 0
                team2_wins = 0
                draws = 0
                recent_results = []
                
                for fixture in fixtures:
                    teams = fixture.get('teams', {})
                    goals = fixture.get('goals', {})
                    
                    home_id = teams.get('home', {}).get('id')
                    away_id = teams.get('away', {}).get('id')
                    home_goals = goals.get('home')
                    away_goals = goals.get('away')
                    
                    if home_goals is None or away_goals is None:
                        continue
                    
                    # Determine winner
                    if home_goals > away_goals:
                        winner = 'team1' if home_id == team1_id else 'team2'
                    elif away_goals > home_goals:
                        winner = 'team2' if away_id == team2_id else 'team1'
                    else:
                        winner = 'draw'
                    
                    if winner == 'team1':
                        team1_wins += 1
                    elif winner == 'team2':
                        team2_wins += 1
                    else:
                        draws += 1
                    
                    recent_results.append({
                        'date': fixture.get('fixture', {}).get('date'),
                        'winner': winner,
                        'score': f"{home_goals}-{away_goals}"
                    })
                
                h2h_record = {
                    'team1': team1_name,
                    'team2': team2_name,
                    'team1_id': team1_id,
                    'team2_id': team2_id,
                    'sport_key': 'soccer',
                    'total_matches': len(fixtures),
                    'team1_wins': team1_wins,
                    'team2_wins': team2_wins,
                    'draws': draws,
                    'recent_results': recent_results[-10:],  # Last 10 matches
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                
                logger.info(f"✅ Fetched H2H for {team1_name} vs {team2_name}: {team1_wins}-{draws}-{team2_wins}")
                
                return h2h_record
                
        except Exception as e:
            logger.error(f"Error fetching H2H for {team1_name} vs {team2_name}: {e}")
            return None
    
    # ==================== BASKETBALL HISTORICAL DATA ====================
    
    async def fetch_basketball_team_stats(self, team_name: str, league_id: int, season: str) -> Dict:
        """Fetch basketball team statistics from API-Basketball"""
        try:
            if not self.api_football_key:  # Same key for API-Sports
                return None
            
            async with httpx.AsyncClient() as client:
                # Search for team
                url = "https://v1.basketball.api-sports.io/teams"
                headers = {'x-apisports-key': self.api_football_key}
                params = {'search': team_name}
                
                response = await client.get(url, headers=headers, params=params, timeout=10.0)
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                teams = data.get('response', [])
                
                if not teams:
                    logger.warning(f"Basketball team not found: {team_name}")
                    return None
                
                team_id = teams[0]['id']
                
                # Fetch team statistics
                url = "https://v1.basketball.api-sports.io/teams/statistics"
                params = {'id': team_id, 'league': league_id, 'season': season}
                
                response = await client.get(url, headers=headers, params=params, timeout=10.0)
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                stats = data.get('response', {})
                
                if not stats:
                    return None
                
                # Extract statistics
                games = stats.get('games', {})
                
                team_stats = {
                    'team_name': team_name,
                    'team_id': team_id,
                    'sport_key': f'basketball_{league_id}',
                    'total_games': games.get('played', {}).get('all', 0),
                    'wins': games.get('wins', {}).get('all', {}).get('total', 0),
                    'losses': games.get('loses', {}).get('all', {}).get('total', 0),
                    'draws': 0,  # Basketball doesn't have draws
                    'home_wins': games.get('wins', {}).get('home', {}).get('total', 0),
                    'away_wins': games.get('wins', {}).get('away', {}).get('total', 0),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                
                logger.info(f"✅ Fetched basketball stats for {team_name}: {team_stats['wins']}W-{team_stats['losses']}L")
                
                return team_stats
                
        except Exception as e:
            logger.error(f"Error fetching basketball stats for {team_name}: {e}")
            return None
    
    # ==================== HISTORICAL ODDS ====================
    
    async def fetch_historical_odds(self, sport_key: str, match_date: str) -> List[Dict]:
        """Fetch historical odds from The Odds API"""
        try:
            if not self.odds_api_key:
                return []
            
            # Format date for API (ISO 8601)
            # The Odds API historical endpoint format: YYYY-MM-DDTHH:MM:SSZ
            
            async with httpx.AsyncClient() as client:
                url = f"https://api.the-odds-api.com/v4/historical/sports/{sport_key}/odds"
                params = {
                    'apiKey': self.odds_api_key,
                    'regions': 'uk,eu,us,au',
                    'markets': 'h2h',
                    'date': match_date
                }
                
                response = await client.get(url, params=params, timeout=30.0)
                
                if response.status_code != 200:
                    logger.warning(f"Historical odds API returned {response.status_code}")
                    return []
                
                data = response.json()
                matches = data.get('data', [])
                
                logger.info(f"✅ Fetched {len(matches)} historical matches for {sport_key} at {match_date}")
                
                return matches
                
        except Exception as e:
            logger.error(f"Error fetching historical odds: {e}")
            return []
    
    # ==================== DATABASE POPULATION ====================
    
    async def populate_team_stats_for_upcoming_matches(self, limit: int = 50):
        """Populate team stats for upcoming matches"""
        try:
            logger.info("📊 Populating team historical stats for upcoming matches...")
            
            # Get upcoming matches without stats
            now = datetime.now(timezone.utc)
            matches = await self.db.odds_cache.find({
                'commence_time': {'$gt': now.isoformat()}
            }).limit(limit).to_list(length=limit)
            
            logger.info(f"Found {len(matches)} upcoming matches")
            
            teams_processed = set()
            stats_added = 0
            
            for match in matches:
                home_team = match.get('home_team')
                away_team = match.get('away_team')
                sport_key = match.get('sport_key', '')
                
                # Process home team
                if home_team and home_team not in teams_processed:
                    # Check if stats already exist
                    existing = await self.db.team_historical_stats.find_one({
                        'team_name': {'$regex': f'^{home_team}$', '$options': 'i'},
                        'sport_key': sport_key
                    })
                    
                    if not existing:
                        # Fetch and store stats
                        if 'soccer' in sport_key:
                            # Extract league ID from sport_key (simplified - needs proper mapping)
                            season = datetime.now().year
                            stats = await self.fetch_football_team_stats(home_team, 39, season)  # 39 = Premier League (example)
                        elif 'basketball' in sport_key:
                            stats = await self.fetch_basketball_team_stats(home_team, 12, "2024-2025")  # 12 = NBA
                        else:
                            stats = None
                        
                        if stats:
                            await self.db.team_historical_stats.insert_one(stats)
                            stats_added += 1
                            logger.info(f"  ✓ Added stats for {home_team}")
                    
                    teams_processed.add(home_team)
                
                # Process away team
                if away_team and away_team not in teams_processed:
                    existing = await self.db.team_historical_stats.find_one({
                        'team_name': {'$regex': f'^{away_team}$', '$options': 'i'},
                        'sport_key': sport_key
                    })
                    
                    if not existing:
                        if 'soccer' in sport_key:
                            season = datetime.now().year
                            stats = await self.fetch_football_team_stats(away_team, 39, season)
                        elif 'basketball' in sport_key:
                            stats = await self.fetch_basketball_team_stats(away_team, 12, "2024-2025")
                        else:
                            stats = None
                        
                        if stats:
                            await self.db.team_historical_stats.insert_one(stats)
                            stats_added += 1
                            logger.info(f"  ✓ Added stats for {away_team}")
                    
                    teams_processed.add(away_team)
            
            logger.info(f"✅ Populated {stats_added} team stats")
            
            return {'teams_processed': len(teams_processed), 'stats_added': stats_added}
            
        except Exception as e:
            logger.error(f"Error populating team stats: {e}")
            return {'teams_processed': 0, 'stats_added': 0}
    
    async def populate_h2h_for_upcoming_matches(self, limit: int = 50):
        """Populate H2H records for upcoming matches"""
        try:
            logger.info("🤝 Populating H2H records for upcoming matches...")
            
            # Get upcoming matches without H2H
            now = datetime.now(timezone.utc)
            matches = await self.db.odds_cache.find({
                'commence_time': {'$gt': now.isoformat()}
            }).limit(limit).to_list(length=limit)
            
            logger.info(f"Found {len(matches)} upcoming matches")
            
            h2h_added = 0
            
            for match in matches:
                home_team = match.get('home_team')
                away_team = match.get('away_team')
                sport_key = match.get('sport_key', '')
                
                if not home_team or not away_team:
                    continue
                
                # Check if H2H already exists
                existing = await self.db.head_to_head_stats.find_one({
                    '$or': [
                        {'team1': {'$regex': f'^{home_team}$', '$options': 'i'}, 
                         'team2': {'$regex': f'^{away_team}$', '$options': 'i'}},
                        {'team1': {'$regex': f'^{away_team}$', '$options': 'i'}, 
                         'team2': {'$regex': f'^{home_team}$', '$options': 'i'}}
                    ],
                    'sport_key': sport_key
                })
                
                if existing:
                    continue
                
                # Fetch H2H (football only for now)
                if 'soccer' in sport_key:
                    # This is simplified - would need proper team ID lookup
                    # For now, skip as it requires team IDs
                    pass
                
            logger.info(f"✅ Populated {h2h_added} H2H records")
            
            return {'h2h_added': h2h_added}
            
        except Exception as e:
            logger.error(f"Error populating H2H: {e}")
            return {'h2h_added': 0}


# Standalone function for background job
async def build_historical_data_job(db):
    """Background job to build historical data"""
    try:
        builder = HistoricalDataBuilder()
        builder.db = db
        
        # Populate team stats
        result1 = await builder.populate_team_stats_for_upcoming_matches(limit=20)
        logger.info(f"Historical data job: {result1['stats_added']} team stats added")
        
        # Populate H2H
        result2 = await builder.populate_h2h_for_upcoming_matches(limit=20)
        logger.info(f"Historical data job: {result2['h2h_added']} H2H records added")
        
    except Exception as e:
        logger.error(f"Error in historical data job: {e}")
