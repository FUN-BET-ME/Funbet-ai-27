"""
FunBet.ai Background Worker
- Updates odds every 5 minutes
- Fetches 32 leagues (24 football + 8 cricket)
- Comprehensive worldwide coverage
"""
import logging
import asyncio
import re
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# Football leagues to fetch - Comprehensive worldwide coverage
FOOTBALL_LEAGUES = [
    # UEFA Competitions
    'soccer_uefa_champs_league',              # UEFA Champions League
    'soccer_uefa_europa_league',              # UEFA Europa League
    'soccer_uefa_europa_conference_league',   # UEFA Conference League
    
    # FIFA & World Cup Qualifiers
    'soccer_fifa_world_cup',                  # FIFA World Cup
    'soccer_fifa_world_cup_qualifiers_europe', # FIFA World Cup 2026 Qualifiers - Europe (ACTIVE)
    'soccer_uefa_euro_qualification',         # UEFA Euro Qualification
    'soccer_uefa_nations_league',             # UEFA Nations League
    'soccer_conmebol_copa_america',           # Copa América
    
    # England - 4 divisions
    'soccer_epl',                             # Premier League
    'soccer_efl_champ',                       # Championship
    'soccer_england_league1',                 # League One
    'soccer_england_league2',                 # League Two
    
    # Spain - 2 divisions
    'soccer_spain_la_liga',                   # La Liga
    'soccer_spain_segunda_division',          # Segunda División
    
    # Germany - 2 divisions
    'soccer_germany_bundesliga',              # Bundesliga
    'soccer_germany_bundesliga2',             # 2. Bundesliga
    
    # Italy - 2 divisions
    'soccer_italy_serie_a',                   # Serie A
    'soccer_italy_serie_b',                   # Serie B
    
    # France - 2 divisions
    'soccer_france_ligue_one',                # Ligue 1
    'soccer_france_ligue_two',                # Ligue 2
    
    # Portugal
    'soccer_portugal_primeira_liga',          # Primeira Liga
    
    # Netherlands
    'soccer_netherlands_eredivisie',          # Eredivisie
    
    # South America
    'soccer_brazil_campeonato',               # Brasileirão
    'soccer_argentina_primera_division',      # Primera División
    'soccer_conmebol_libertadores',           # Copa Libertadores
    'soccer_conmebol_copa_sudamericana',      # Copa Sudamericana
    'soccer_mexico_ligamx',                   # Liga MX
    
    # Turkey - 2 divisions
    'soccer_turkey_super_league',             # Süper Lig
    'soccer_turkey_1_lig',                    # TFF 1. Lig
    
    # Other Major Leagues
    'soccer_usa_mls',                         # MLS
    'soccer_australia_aleague',               # A-League
    'soccer_japan_j_league',                  # J-League
]

# Cricket competitions - Complete international coverage
CRICKET_LEAGUES = [
    'cricket_test_match',                     # Test Matches
    'cricket_odi',                            # One Day Internationals
    'cricket_international_t20',              # T20 Internationals
    'cricket_ipl',                            # Indian Premier League
    'cricket_big_bash',                       # Big Bash League (Australia)
    'cricket_caribbean_premier_league',       # Caribbean Premier League
    'cricket_icc_world_cup',                  # ICC World Cup
    'cricket_psl',                            # Pakistan Super League
]

BASKETBALL_LEAGUES = [
    # AMERICAS - North America
    'basketball_nba',                         # USA - NBA (30 teams)
    'basketball_ncaab',                       # USA - NCAA College Basketball
    'basketball_nbl',                         # Australia/Canada NBL
    
    # AMERICAS - South America
    'basketball_brazil_nbb',                  # Brazil - Novo Basquete Brasil (NBB)
    'basketball_argentina_lnb',               # Argentina - Liga Nacional de Básquet
    
    # EUROPE - Pan-European
    'basketball_euroleague',                  # EuroLeague (Top 18 clubs)
    'basketball_eurocup',                     # EuroCup (2nd tier)
    
    # EUROPE - Spain
    'basketball_spain_acb',                   # Spain - Liga ACB
    
    # EUROPE - Turkey
    'basketball_turkey_bsl',                  # Turkey - Super League
    
    # EUROPE - Italy
    'basketball_italy_lega_a',                # Italy - Lega Basket Serie A
    
    # EUROPE - Greece
    'basketball_greece_basket_league',        # Greece - Basket League
    
    # EUROPE - Germany
    'basketball_germany_bbl',                 # Germany - Basketball Bundesliga
    
    # EUROPE - France
    'basketball_france_lnb',                  # France - LNB Pro A
    
    # EUROPE - Others
    'basketball_lithuania_lkl',               # Lithuania - LKL
    'basketball_serbia_kls',                  # Serbia - KLS
]

class OddsWorker:
    def __init__(self):
        self.db = None
        self.odds_api_key = os.environ.get('ODDS_API_KEY')
        self.scheduler = AsyncIOScheduler()
        self.api_calls_today = 0
        self.api_calls_total = 0
        
    async def connect_db(self):
        """Connect to MongoDB"""
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        client = AsyncIOMotorClient(mongo_url)
        self.db = client[db_name]
        logger.info("✅ Background worker connected to MongoDB")
    
    async def fetch_odds_for_sport(self, sport_key: str) -> list:
        """Fetch odds from The Odds API for a specific sport"""
        try:
            url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds/"
            
            # Note: The Odds API doesn't support custom date ranges for most endpoints
            # It returns all available matches with odds (typically 1-2 weeks ahead)
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    params={
                        "regions": "uk,eu,us,au",
                        "markets": "h2h",
                        "apiKey": self.odds_api_key
                    },
                    timeout=15.0
                )
                
                # Track API usage
                self.api_calls_today += 1
                self.api_calls_total += 1
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Log remaining quota from response headers
                    remaining = response.headers.get('x-requests-remaining', 'unknown')
                    used = response.headers.get('x-requests-used', 'unknown')
                    
                    logger.info(f"✅ Fetched {len(data)} matches | API calls today: {self.api_calls_today} | Remaining: {remaining}")
                    return data
                else:
                    logger.warning(f"⚠️ {sport_key} returned status {response.status_code}")
                    return []
        except Exception as e:
            logger.error(f"❌ Error fetching {sport_key}: {e}")
            return []
    
    async def update_odds_job(self):
        """
        Update odds every 5 minutes - FOOTBALL & CRICKET ONLY
        Fetches specific football and cricket leagues for focused coverage
        """
        try:
            logger.info("⚽🏏 Starting odds update (Football & Cricket only)...")
            
            all_matches = []
            api_calls = 0
            
            # 1. Fetch Football leagues
            football_fetched = 0
            for league in FOOTBALL_LEAGUES:
                try:
                    league_matches = await self.fetch_odds_for_sport(league)
                    if league_matches:
                        # Deduplicate by match ID
                        existing_ids = {m.get('id') for m in all_matches if m.get('id')}
                        new_matches = [m for m in league_matches if m.get('id') not in existing_ids]
                        if new_matches:
                            all_matches.extend(new_matches)
                            football_fetched += len(new_matches)
                            logger.info(f"  ⚽ {league}: {len(new_matches)} matches")
                    api_calls += 1
                    await asyncio.sleep(0.5)  # Rate limiting
                except Exception as e:
                    logger.warning(f"Error fetching {league}: {e}")
                    continue
            
            logger.info(f"✅ Football: {football_fetched} matches from {len(FOOTBALL_LEAGUES)} leagues")
            
            # 2. Fetch Cricket competitions
            cricket_fetched = 0
            for league in CRICKET_LEAGUES:
                try:
                    league_matches = await self.fetch_odds_for_sport(league)
                    if league_matches:
                        # Deduplicate by match ID
                        existing_ids = {m.get('id') for m in all_matches if m.get('id')}
                        new_matches = [m for m in league_matches if m.get('id') not in existing_ids]
                        if new_matches:
                            all_matches.extend(new_matches)
                            cricket_fetched += len(new_matches)
                            logger.info(f"  🏏 {league}: {len(new_matches)} matches")
                    api_calls += 1
                    await asyncio.sleep(0.5)  # Rate limiting
                except Exception as e:
                    logger.warning(f"Error fetching {league}: {e}")
                    continue
            
            logger.info(f"✅ Cricket: {cricket_fetched} matches from {len(CRICKET_LEAGUES)} leagues")
            
            # 3. Fetch Basketball competitions
            basketball_fetched = 0
            for league in BASKETBALL_LEAGUES:
                try:
                    league_matches = await self.fetch_odds_for_sport(league)
                    if league_matches:
                        # Deduplicate by match ID
                        existing_ids = {m.get('id') for m in all_matches if m.get('id')}
                        new_matches = [m for m in league_matches if m.get('id') not in existing_ids]
                        if new_matches:
                            all_matches.extend(new_matches)
                            basketball_fetched += len(new_matches)
                            logger.info(f"  🏀 {league}: {len(new_matches)} matches")
                    api_calls += 1
                    await asyncio.sleep(0.5)  # Rate limiting
                except Exception as e:
                    logger.warning(f"Error fetching {league}: {e}")
                    continue
            
            logger.info(f"✅ Basketball: {basketball_fetched} matches from {len(BASKETBALL_LEAGUES)} leagues")
            
            if not all_matches:
                logger.warning("⚠️ No matches fetched")
                return
            
            logger.info(f"📊 Total: {len(all_matches)} matches from {api_calls} API calls")
            
            # Store in database using upsert (update or insert)
            # This prevents data loss - old matches stay until successfully replaced
            now = datetime.now(timezone.utc).isoformat()
            
            # Upsert each match (safer than delete-all-then-insert)
            upserted_count = 0
            for match in all_matches:
                match['updated_at'] = now
                match['fetched_at'] = now
                
                # Upsert based on match ID
                await self.db.odds_cache.update_one(
                    {'id': match['id']},
                    {'$set': match},
                    upsert=True
                )
                upserted_count += 1
            
            # No cleanup - keep all historic matches for "Recent Results" feature
            
            logger.info(f"✅ Database updated: {upserted_count} matches upserted")
            logger.info(f"   ⚽ {football_fetched} football + 🏏 {cricket_fetched} cricket")
                
        except Exception as e:
            logger.error(f"❌ Error in odds update job: {e}")
    
    async def add_day_8_job(self):
        """
        Add day 31 data daily at GMT 00:00 (rolling 30-day window)
        Note: The 'upcoming' endpoint automatically gives us ~30 days
        This job ensures we refresh at midnight to capture new day 31 data
        """
        try:
            logger.info("📅 Daily refresh at GMT 00:00 (rolling 30-day window update)...")
            
            # The 'upcoming' endpoint automatically handles the rolling window
            # This midnight refresh ensures we capture any new matches for day 31
            await self.update_odds_job()
            
            logger.info("✅ Daily refresh complete - 30-day window maintained")
            
        except Exception as e:
            logger.error(f"❌ Error in daily refresh job: {e}")
    
    async def fetch_live_scores_job(self):
        """
        Fetch live scores every 5 minutes for football and cricket
        Updates match data with real-time scores
        """
        try:
            logger.info("⚽ Starting live scores fetch job...")
            
            from live_scores_service import live_scores_service
            
            # Fetch all live scores (football + cricket + basketball)
            scores_data = await live_scores_service.get_all_live_scores()
            
            live_count = len(scores_data.get('live_scores', []))
            completed_count = len(scores_data.get('completed_scores', []))
            
            logger.info(f"✅ Live scores fetched: {live_count} live, {completed_count} completed")
            
        except Exception as e:
            logger.error(f"❌ Error in live scores job: {e}")
    
    async def fetch_backup_odds_for_matches_without_bookmakers(self):
        """
        Fetch backup odds for matches that have no bookmakers
        """
        try:
            from backup_odds_service import backup_odds_service
            
            logger.info("🔄 Checking for matches without bookmakers...")
            
            # Find matches with 0 bookmakers
            matches_no_odds = await self.db.odds_cache.find({
                '$or': [
                    {'bookmakers': {'$exists': False}},
                    {'bookmakers': {'$size': 0}}
                ]
            }).limit(20).to_list(length=20)
            
            logger.info(f"📊 Found {len(matches_no_odds)} matches without odds")
            
            updated = 0
            for match in matches_no_odds:
                # Try to get backup odds
                backup_bookmakers = await backup_odds_service.get_backup_odds(match)
                
                if backup_bookmakers:
                    # Update match with backup odds
                    await self.db.odds_cache.update_one(
                        {'id': match['id']},
                        {'$set': {
                            'bookmakers': backup_bookmakers,
                            'odds_source': 'backup'
                        }}
                    )
                    updated += 1
                    logger.info(f"✅ Added backup odds for {match['home_team']} vs {match['away_team']}")
            
            logger.info(f"✅ Backup odds: Updated {updated} matches")
            
        except Exception as e:
            logger.error(f"❌ Error fetching backup odds: {e}")
    
    async def calculate_funbet_iq_job(self):
        """
        Calculate FunBet IQ for all matches every 10 minutes
        Only calculates for matches within 30-day window
        """
        try:
            logger.info("🧠 Starting FunBet IQ calculation job...")
            
            from funbet_iq_engine import calculate_funbet_iq_for_matches
            
            # Calculate for all cached matches (limit increased for 30-day window)
            result = await calculate_funbet_iq_for_matches(self.db, limit=500)
            
            if result:
                logger.info(f"✅ FunBet IQ calculation complete: {result['calculated']}/{result['total_matches']} matches")
                if result['errors']:
                    logger.warning(f"⚠️ Errors: {len(result['errors'])} matches failed")
            else:
                logger.warning("⚠️ FunBet IQ calculation returned no results")
                
        except Exception as e:
            logger.error(f"❌ Error in FunBet IQ job: {e}")
    
    async def fetch_team_logos_job(self):
        """
        Fetch team logos from ESPN every 6 hours
        Only fetches for teams without logos
        """
        try:
            logger.info("🎨 Starting team logos fetch job...")
            
            from espn_team_service import batch_fetch_team_logos
            
            result = await batch_fetch_team_logos(self.db, limit=100)
            
            logger.info(f"✅ Team logos fetch complete: {result['fetched']} new, {result['cached']} cached, {result['errors']} errors")
                
        except Exception as e:
            logger.error(f"❌ Error in team logos job: {e}")
    
    async def update_completed_matches(self):
        """Update recently completed matches with final scores and mark as completed"""
        try:
            logger.info("📊 Updating completed matches with final scores...")
            
            from datetime import datetime, timezone, timedelta
            from api_football_service import fetch_api_football_live_scores, fetch_api_basketball_live_scores
            
            # Get matches from last 24 hours that might be completed
            yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
            
            # Find recent matches that might need final score updates
            matches = await self.db.odds_cache.find({
                'commence_time': {
                    '$gte': yesterday.isoformat(),
                    '$lte': datetime.now(timezone.utc).isoformat()
                }
            }).limit(200).to_list(length=None)
            
            # Fetch completed games from API-Football
            import httpx
            api_key = os.environ.get('API_FOOTBALL_KEY')
            
            async with httpx.AsyncClient() as client:
                # Get yesterday and today's completed fixtures
                for days_ago in [0, 1]:
                    date = (datetime.now(timezone.utc) - timedelta(days=days_ago)).strftime('%Y-%m-%d')
                    
                    # Football completed fixtures
                    url = "https://v3.football.api-sports.io/fixtures"
                    headers = {'x-apisports-key': api_key}
                    params = {'date': date, 'status': 'FT'}
                    
                    response = await client.get(url, headers=headers, params=params, timeout=15.0)
                    
                    if response.status_code == 200:
                        data = response.json()
                        completed_fixtures = data.get('response', [])
                        
                        logger.info(f"📊 Found {len(completed_fixtures)} completed football fixtures on {date}")
                        
                        # Update database with final scores
                        for fixture in completed_fixtures:
                            try:
                                teams = fixture.get('teams', {})
                                goals = fixture.get('goals', {})
                                status = fixture.get('fixture', {}).get('status', {})
                                
                                home_team = teams.get('home', {}).get('name', '').lower()
                                away_team = teams.get('away', {}).get('name', '').lower()
                                
                                # Find matching match in database
                                for match in matches:
                                    match_home = match.get('home_team', '').lower()
                                    match_away = match.get('away_team', '').lower()
                                    
                                    if (home_team in match_home or match_home in home_team) and \
                                       (away_team in match_away or match_away in away_team):
                                        
                                        # Update with final score
                                        await self.db.odds_cache.update_one(
                                            {'id': match['id']},
                                            {'$set': {
                                                'live_score': {
                                                    'home_score': str(goals.get('home', 0)),
                                                    'away_score': str(goals.get('away', 0)),
                                                    'match_status': 'FT',
                                                    'is_live': False,
                                                    'completed': True,
                                                    'last_update': datetime.now(timezone.utc).isoformat(),
                                                    'home_team_logo': teams.get('home', {}).get('logo'),
                                                    'away_team_logo': teams.get('away', {}).get('logo')
                                                },
                                                'completed': True,
                                                'final_score_updated_at': datetime.now(timezone.utc).isoformat()
                                            }}
                                        )
                                        break
                                        
                            except Exception as e:
                                logger.warning(f"Error updating completed fixture: {e}")
                                continue
            
            logger.info(f"📊 Completed matches updated with final scores")
            
        except Exception as e:
            logger.error(f"Error updating completed matches: {e}")
    
    async def enrich_matches_with_logos(self):
        """Enrich all matches in database with team and league logos from API-Football"""
        try:
            logger.info("🎨 Enriching matches with logos from API-Football...")
            
            from api_football_enhanced import api_football_enhanced
            from datetime import datetime, timezone, timedelta
            
            # Get matches from today and next 7 days that don't have logos yet
            today = datetime.now(timezone.utc)
            next_week = today + timedelta(days=7)
            
            # Find matches without logos
            matches = await self.db.odds_cache.find({
                'commence_time': {
                    '$gte': today.isoformat(),
                    '$lte': next_week.isoformat()
                },
                '$or': [
                    {'home_team_logo': {'$exists': False}},
                    {'home_team_logo': None}
                ]
            }).limit(100).to_list(length=None)
            
            logger.info(f"🎨 Found {len(matches)} matches without logos")
            
            enriched_count = 0
            api_calls = 0
            
            for match in matches:
                try:
                    # Search for fixture ID
                    fixture_date = match.get('commence_time', '')[:10]
                    fixture_id = await api_football_enhanced.search_fixture_by_teams(
                        match.get('home_team'),
                        match.get('away_team'),
                        fixture_date
                    )
                    
                    api_calls += 1
                    
                    if fixture_id:
                        # Fetch fixture details to get logos
                        import httpx
                        url = f"https://v3.football.api-sports.io/fixtures"
                        headers = {'x-apisports-key': api_football_enhanced.api_key}
                        params = {'id': fixture_id}
                        
                        async with httpx.AsyncClient() as client:
                            response = await client.get(url, headers=headers, params=params, timeout=10.0)
                            
                            if response.status_code == 200:
                                data = response.json()
                                fixtures = data.get('response', [])
                                
                                if fixtures:
                                    fixture = fixtures[0]
                                    teams = fixture.get('teams', {})
                                    league = fixture.get('league', {})
                                    
                                    # Update match with logos
                                    await self.db.odds_cache.update_one(
                                        {'id': match['id']},
                                        {'$set': {
                                            'home_team_logo': teams.get('home', {}).get('logo'),
                                            'away_team_logo': teams.get('away', {}).get('logo'),
                                            'league_logo': league.get('logo'),
                                            'fixture_id': fixture_id,
                                            'logo_enriched_at': datetime.now(timezone.utc).isoformat()
                                        }}
                                    )
                                    enriched_count += 1
                                    
                        api_calls += 1
                        
                        # Rate limiting - max 30 per minute
                        if api_calls >= 30:
                            logger.info(f"🎨 Rate limit: pausing after {api_calls} API calls")
                            break
                            
                except Exception as e:
                    logger.warning(f"Error enriching match {match.get('id')}: {e}")
                    continue
            
            logger.info(f"🎨 Enriched {enriched_count} matches with logos ({api_calls} API calls)")
            
        except Exception as e:
            logger.error(f"Error enriching matches with logos: {e}")
    
    async def update_live_scores_fast(self):
        """
        Fast live score updates - EVERY 10 SECONDS
        Uses API-Football, API-Basketball, and Cricket API for real-time scores
        Includes match linking across APIs
        """
        try:
            from api_football_service import fetch_api_football_live_scores, fetch_api_basketball_live_scores
            from cricket_api_service import cricket_api_service
            from match_linking_service import get_match_linking_service
            
            logger.info("⚡ Fast live score update starting...")
            
            # Get match linking service
            match_linking = get_match_linking_service(self.db)
            
            # Fetch live scores from all APIs
            football_scores = await fetch_api_football_live_scores()
            basketball_scores = await fetch_api_basketball_live_scores()
            cricket_scores = await cricket_api_service.get_live_cricket_scores()
            
            # Get LIVE games (not completed) AND newly COMPLETED games
            live_football = [s for s in football_scores if s.get('is_live') and not s.get('completed')]
            live_basketball = [s for s in basketball_scores if s.get('is_live') and not s.get('completed')]
            live_cricket = [s for s in cricket_scores if s.get('is_live') and not s.get('completed')]
            
            # Get COMPLETED games to save final scores
            completed_football = [s for s in football_scores if s.get('completed')]
            completed_basketball = [s for s in basketball_scores if s.get('completed')]
            completed_cricket = [s for s in cricket_scores if s.get('completed')]
            
            all_live_scores = live_football + live_basketball + live_cricket
            all_completed_scores = completed_football + completed_basketball + completed_cricket
            
            logger.info(f"⚡ LIVE: {len(live_football)} football + {len(live_basketball)} basketball + {len(live_cricket)} cricket = {len(all_live_scores)} playing")
            logger.info(f"🏁 COMPLETED: {len(completed_football)} football + {len(completed_basketball)} basketball + {len(completed_cricket)} cricket = {len(all_completed_scores)} finished")
            
            # Update database with live scores using match linking
            updated_count = 0
            linked_count = 0
            
            for score in all_live_scores:
                try:
                    # First try: intelligent linking
                    linked_match = await match_linking.link_live_score_to_match(score)
                    
                    # Fallback: if linking fails, try direct team name match (case-insensitive)
                    if not linked_match:
                        home_team = score.get('home_team', '')
                        away_team = score.get('away_team', '')
                        
                        if home_team and away_team:
                            # Try exact match first (case-insensitive)
                            linked_match = await self.db.odds_cache.find_one({
                                'home_team': {'$regex': f'^{re.escape(home_team)}$', '$options': 'i'},
                                'away_team': {'$regex': f'^{re.escape(away_team)}$', '$options': 'i'}
                            })
                            
                            # If still no match, try contains match
                            if not linked_match:
                                # Split team names and try matching on key words
                                home_words = home_team.split()
                                away_words = away_team.split()
                                if home_words and away_words:
                                    linked_match = await self.db.odds_cache.find_one({
                                        'home_team': {'$regex': home_words[0], '$options': 'i'},
                                        'away_team': {'$regex': away_words[0], '$options': 'i'},
                                        'commence_time': {'$gte': (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat()}
                                    })
                    
                    if linked_match:
                        # Update with live score data including logos
                        await self.db.odds_cache.update_one(
                            {'id': linked_match['id']},
                            {'$set': {
                                'live_score': {
                                    'home_score': score.get('home_score'),
                                    'away_score': score.get('away_score'),
                                    'match_status': score.get('match_status'),
                                    'is_live': score.get('is_live'),
                                    'completed': score.get('completed'),
                                    'last_update': score.get('last_update'),
                                    'home_team_logo': score.get('home_team_logo'),
                                    'away_team_logo': score.get('away_team_logo'),
                                    'league_logo': score.get('league_logo'),
                                    'api_source': score.get('api_source', 'unknown')
                                },
                                'updated_at': datetime.now(timezone.utc).isoformat(),
                                'linked_at': datetime.now(timezone.utc).isoformat()
                            }}
                        )
                        updated_count += 1
                        linked_count += 1
                    else:
                        logger.warning(f"❌ Could not link: {score.get('home_team')} vs {score.get('away_team')}")
                        
                except Exception as e:
                    logger.warning(f"Error updating live score: {e}")
                    continue
            
            logger.info(f"⚡ Updated {updated_count} matches with live scores ({linked_count} via match linking, 3 API calls used)")
            
            # Process COMPLETED matches - save final scores permanently
            completed_saved = 0
            for score in all_completed_scores:
                try:
                    linked_match = await match_linking.link_live_score_to_match(score)
                    
                    if linked_match:
                        # Save final score - mark as completed at ROOT level and in live_score
                        await self.db.odds_cache.update_one(
                            {'id': linked_match['id']},
                            {'$set': {
                                'live_score': {
                                    'home_score': score.get('home_score'),
                                    'away_score': score.get('away_score'),
                                    'match_status': 'FT',
                                    'is_live': False,
                                    'completed': True,
                                    'last_update': score.get('last_update'),
                                    'home_team_logo': score.get('home_team_logo'),
                                    'away_team_logo': score.get('away_team_logo'),
                                    'league_logo': score.get('league_logo'),
                                    'api_source': score.get('api_source', 'unknown')
                                },
                                'completed': True,  # CRITICAL: Mark at root level for verification
                                'final_score_saved': True,
                                'updated_at': datetime.now(timezone.utc).isoformat()
                            }}
                        )
                        completed_saved += 1
                except Exception as e:
                    logger.warning(f"Error saving completed match: {e}")
                    continue
            
            if completed_saved > 0:
                logger.info(f"🏁 Saved {completed_saved} completed matches with final scores")
            
        except Exception as e:
            logger.error(f"Error in fast live score update: {e}")
    
    async def fetch_team_stats_job(self):
        """
        Fetch team historical stats from ESPN every 6 hours
        Updates stats for recent performance
        """
        try:
            logger.info("📊 Starting team stats fetch job...")
            
            from espn_team_service import batch_fetch_team_stats
            
            result = await batch_fetch_team_stats(self.db, limit=50)
            
            logger.info(f"✅ Team stats fetch complete: {result['fetched']} updated, {result['cached']} cached, {result['errors']} errors")
                
        except Exception as e:
            logger.error(f"❌ Error in team stats job: {e}")
    
    async def verify_predictions_job(self):
        """
        Verify FunBet IQ predictions against actual match results
        Runs every hour to check completed matches
        """
        try:
            logger.info("🎯 Starting prediction verification job...")
            
            from prediction_verification_service import get_prediction_service
            
            verification_service = get_prediction_service(self.db)
            
            # Verify matches completed in last 24 hours
            result = await verification_service.verify_completed_matches(hours_back=24)
            
            if result:
                logger.info(f"✅ Prediction verification complete: {result['verified']} verified ({result['correct']} correct, {result['incorrect']} incorrect)")
            else:
                logger.warning("⚠️ Prediction verification returned no results")
                
        except Exception as e:
            logger.error(f"❌ Error in prediction verification job: {e}")
    
    async def fetch_final_scores_job(self):
        """
        Fetch and save FINAL SCORES ONCE for completed matches
        Runs every 5 minutes to get results from last 2 days
        """
        try:
            logger.info("🏁 Fetching final scores for completed matches...")
            
            from api_football_service import fetch_api_football_completed_matches
            from match_linking_service import get_match_linking_service
            
            # Get completed matches from last 2 days
            completed_football = await fetch_api_football_completed_matches(days_back=2)
            
            logger.info(f"🏁 Found {len(completed_football)} completed football matches from last 2 days")
            
            # Link and save final scores
            match_linking = get_match_linking_service(self.db)
            updated = 0
            
            # Process completed football matches
            for score in completed_football:
                try:
                    # Use match linking to find the match in our database
                    linked_match = await match_linking.link_live_score_to_match(score)
                    
                    if linked_match:
                        # Save final score permanently in BOTH live_score and scores format
                        home_score_str = str(score.get('home_score', '0'))
                        away_score_str = str(score.get('away_score', '0'))
                        
                        result = await self.db.odds_cache.update_one(
                            {'id': linked_match['id']},
                            {'$set': {
                                'live_score': {
                                    'home_score': home_score_str,
                                    'away_score': away_score_str,
                                    'match_status': 'FT',
                                    'is_live': False,
                                    'completed': True,
                                    'last_update': score.get('last_update'),
                                    'home_team_logo': score.get('home_team_logo'),
                                    'away_team_logo': score.get('away_team_logo'),
                                    'league_logo': score.get('league_logo'),
                                    'api_source': 'api-football'
                                },
                                'scores': [
                                    {
                                        'name': linked_match['home_team'],
                                        'score': home_score_str
                                    },
                                    {
                                        'name': linked_match['away_team'],
                                        'score': away_score_str
                                    }
                                ],
                                'completed': True,
                                'final_score_saved': True,
                                'updated_at': datetime.now(timezone.utc).isoformat()
                            }}
                        )
                        if result.modified_count > 0:
                            updated += 1
                except Exception as e:
                    logger.warning(f"Error saving final score: {e}")
                    continue
            
            logger.info(f"✅ Final scores saved: {updated} matches updated with results")
                
        except Exception as e:
            logger.error(f"❌ Error in final scores job: {e}")
    
    async def cleanup_stuck_matches(self):
        """
        Cleanup old stuck matches that have been marked as live for too long
        Marks matches as completed if they've been is_live=true for more than 4 hours
        """
        try:
            logger.info("🧹 Starting cleanup of stuck matches...")
            
            from datetime import datetime, timezone, timedelta
            
            # Find matches that have been live for more than 4 hours
            four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=4)
            
            stuck_matches = await self.db.odds_cache.find({
                'live_score.is_live': True,
                'linked_at': {'$lt': four_hours_ago.isoformat()}
            }).to_list(length=None)
            
            logger.info(f"🧹 Found {len(stuck_matches)} matches stuck as live for >4 hours")
            
            cleaned_count = 0
            for match in stuck_matches:
                try:
                    # Mark as completed and no longer live
                    await self.db.odds_cache.update_one(
                        {'id': match['id']},
                        {'$set': {
                            'live_score.is_live': False,
                            'live_score.completed': True,
                            'live_score.match_status': 'FT',
                            'completed': True,
                            'cleaned_up_at': datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    cleaned_count += 1
                    logger.info(f"🧹 Cleaned up stuck match: {match.get('home_team')} vs {match.get('away_team')}")
                except Exception as e:
                    logger.warning(f"Error cleaning up match {match.get('id')}: {e}")
                    continue
            
            logger.info(f"✅ Cleanup complete: {cleaned_count} stuck matches marked as completed")
                
        except Exception as e:
            logger.error(f"❌ Error in cleanup stuck matches job: {e}")
    
    def start(self):
        """Start the background worker - EFFICIENT VERSION"""
        logger.info("🚀 Starting FunBet.ai background worker (EFFICIENT MODE)...")
        logger.info("📊 API Efficiency: 1 call per update = 12/hour = 288/day")
        logger.info("💰 100K credits = 347+ days of operation")
        
        # Job 1: Update odds every 5 minutes (12 calls/hour = 288/day)
        self.scheduler.add_job(
            self.update_odds_job,
            trigger=IntervalTrigger(minutes=5),
            id='update_odds',
            name='Update odds every 5 minutes (1 API call)',
            replace_existing=True
        )
        
        # Job 2: Daily refresh at GMT 00:00 to maintain rolling 30-day window
        self.scheduler.add_job(
            self.add_day_8_job,
            trigger=CronTrigger(hour=0, minute=0, timezone='UTC'),
            id='daily_refresh',
            name='Daily refresh at GMT 00:00 (add day 31 data)',
            replace_existing=True
        )
        
        # Job 3: Fetch live scores every 5 minutes (for in-play matches)
        self.scheduler.add_job(
            self.fetch_live_scores_job,
            trigger=IntervalTrigger(minutes=5),
            id='fetch_live_scores',
            name='Fetch live scores every 5 minutes',
            replace_existing=True
        )
        
        # Job 4: Calculate FunBet IQ every 10 minutes
        self.scheduler.add_job(
            self.calculate_funbet_iq_job,
            trigger=IntervalTrigger(minutes=10),
            id='calculate_funbet_iq',
            name='Calculate FunBet IQ scores',
            replace_existing=True
        )
        
        # Job 5: Verify predictions every 15 minutes (check completed matches)
        self.scheduler.add_job(
            self.verify_predictions_job,
            trigger=IntervalTrigger(minutes=15),
            id='verify_predictions',
            name='Verify FunBet IQ predictions every 15 minutes',
            replace_existing=True
        )
        
        # Job 10: Cleanup old stuck matches every hour
        self.scheduler.add_job(
            self.cleanup_stuck_matches,
            trigger=IntervalTrigger(hours=1),
            id='cleanup_stuck_matches',
            name='Cleanup old stuck matches every hour',
            replace_existing=True
        )
        
        # Job 6: Fetch team logos every 6 hours
        self.scheduler.add_job(
            self.fetch_team_logos_job,
            trigger=IntervalTrigger(hours=6),
            id='fetch_team_logos',
            name='Fetch team logos from ESPN every 6 hours',
            replace_existing=True
        )
        
        # Job 7: Fetch team stats every 6 hours
        self.scheduler.add_job(
            self.fetch_team_stats_job,
            trigger=IntervalTrigger(hours=6),
            id='fetch_team_stats',
            name='Fetch team historical stats from ESPN every 6 hours',
            replace_existing=True
        )
        
        # 8. Update LIVE scores every 10 seconds (API-Sports Football & Basketball)
        self.scheduler.add_job(
            self.update_live_scores_fast,
            trigger=IntervalTrigger(seconds=10),
            id='update_live_scores_fast',
            name='Update live football & basketball scores every 10 seconds',
            replace_existing=True
        )
        
        # 9. Enrich matches with logos every 30 minutes (ALL upcoming and completed matches)
        self.scheduler.add_job(
            self.enrich_matches_with_logos,
            trigger=IntervalTrigger(minutes=30),
            id='enrich_matches_logos',
            name='Enrich all matches with team and league logos',
            replace_existing=True
        )
        
        # 10. Fetch and save final scores every 5 minutes
        self.scheduler.add_job(
            self.fetch_final_scores_job,
            trigger=IntervalTrigger(minutes=5),
            id='fetch_final_scores',
            name='Fetch final scores from API-Football every 5 minutes',
            replace_existing=True
        )
        
        # 11. Fetch backup odds for matches without bookmakers (every 6 hours)
        self.scheduler.add_job(
            self.fetch_backup_odds_for_matches_without_bookmakers,
            trigger=IntervalTrigger(hours=6),
            id='fetch_backup_odds',
            name='Fetch backup odds for matches without bookmakers',
            replace_existing=True
        )
        
        # Run initial jobs immediately
        asyncio.create_task(self.update_odds_job())
        asyncio.create_task(self.calculate_funbet_iq_job())
        asyncio.create_task(self.fetch_live_scores_job())
        asyncio.create_task(self.verify_predictions_job())  # Verify predictions immediately
        asyncio.create_task(self.fetch_team_logos_job())  # Fetch logos immediately
        asyncio.create_task(self.fetch_team_stats_job())  # Fetch stats immediately
        asyncio.create_task(self.update_live_scores_fast())  # Start fast live updates immediately
        asyncio.create_task(self.enrich_matches_with_logos())  # Enrich all matches with logos immediately
        
        self.scheduler.start()
        logger.info("✅ Background worker started - 10 jobs scheduled")
        logger.info("🎯 Expected usage: ~290 API calls/day (odds) + ~17,280 calls/day (live scores every 10s) = ~17,570 total")
        logger.info("📊 Historical data: ALL matches preserved permanently (no cleanup)")
        logger.info("🎯 Prediction tracking: Verifying completed matches every 15 minutes")
        logger.info("🎨 Team logos: Fetching from ESPN every 6 hours")
        logger.info("📊 Team stats: Fetching historical data from ESPN every 6 hours")
    
    def stop(self):
        """Stop the background worker"""
        self.scheduler.shutdown()
        logger.info("🛑 Background worker stopped")

# Global worker instance
worker = OddsWorker()

async def start_worker():
    """Initialize and start the worker"""
    await worker.connect_db()
    worker.start()

async def stop_worker():
    """Stop the worker"""
    worker.stop()
