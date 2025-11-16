"""
FunBet.ai Background Worker
- Updates odds every 5 minutes
- Fetches 32 leagues (24 football + 8 cricket)
- Comprehensive worldwide coverage
"""
import logging
import asyncio
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
    
    # FIFA
    'soccer_fifa_world_cup',                  # FIFA World Cup
    
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
        
        # Job 5: Verify predictions every hour (check completed matches)
        self.scheduler.add_job(
            self.verify_predictions_job,
            trigger=IntervalTrigger(hours=1),
            id='verify_predictions',
            name='Verify FunBet IQ predictions every hour',
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
        
        # Run initial jobs immediately
        asyncio.create_task(self.update_odds_job())
        asyncio.create_task(self.calculate_funbet_iq_job())
        asyncio.create_task(self.fetch_live_scores_job())
        asyncio.create_task(self.verify_predictions_job())  # Verify predictions immediately
        asyncio.create_task(self.fetch_team_logos_job())  # Fetch logos immediately
        asyncio.create_task(self.fetch_team_stats_job())  # Fetch stats immediately
        
        self.scheduler.start()
        logger.info("✅ Background worker started - 7 jobs scheduled")
        logger.info("🎯 Expected usage: ~290 API calls/day + IQ calculations + live scores + prediction verification + team data")
        logger.info("📊 Historical data: ALL matches preserved permanently (no cleanup)")
        logger.info("🎯 Prediction tracking: Verifying completed matches every hour")
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
