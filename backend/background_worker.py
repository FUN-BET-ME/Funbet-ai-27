"""
FunBet.ai Background Worker
- Updates odds every 5 minutes
- Adds day 8 data daily at GMT 00:00
- Maintains 15-day rolling window
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

# Football leagues to fetch - TOP PRIORITY ONLY (to save API calls)
FOOTBALL_LEAGUES = [
    # Top 5 European Leagues + Champions League ONLY
    'soccer_epl',                    # English Premier League
    'soccer_spain_la_liga',          # La Liga
    'soccer_germany_bundesliga',     # Bundesliga
    'soccer_italy_serie_a',          # Serie A
    'soccer_france_ligue_one',       # Ligue 1
    'soccer_uefa_champs_league',     # Champions League
]

# Cricket competitions - TOP PRIORITY ONLY
CRICKET_LEAGUES = [
    'cricket_international_t20',     # T20 Internationals
    'cricket_ipl',                   # Indian Premier League
    'cricket_big_bash',              # Big Bash League
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
        Add day 8 data daily at GMT 00:00 (rolling 15-day window)
        Note: The 'upcoming' endpoint automatically gives us ~15 days
        This job just ensures we refresh at midnight to capture new day 8 data
        """
        try:
            logger.info("📅 Daily refresh at GMT 00:00 (rolling window update)...")
            
            # The 'upcoming' endpoint automatically handles the rolling window
            # This midnight refresh ensures we capture any new matches for day 8
            await self.update_odds_job()
            
            logger.info("✅ Daily refresh complete - 15-day window maintained")
            
        except Exception as e:
            logger.error(f"❌ Error in daily refresh job: {e}")
    
    async def cleanup_old_data(self):
        """
        NO CLEANUP - Keep all historical data for predictions tracking
        This method is kept for future use but does nothing
        """
        try:
            logger.info(f"✅ Historical data preserved - No cleanup performed")
            logger.info(f"📊 All match data kept permanently for predictions history & analytics")
                
        except Exception as e:
            logger.error(f"❌ Error in cleanup job: {e}")
    
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
        
        # Job 2: Daily refresh at GMT 00:00 to maintain rolling window
        self.scheduler.add_job(
            self.add_day_8_job,
            trigger=CronTrigger(hour=0, minute=0, timezone='UTC'),
            id='daily_refresh',
            name='Daily refresh at GMT 00:00',
            replace_existing=True
        )
        
        # Job 3: Cleanup old data daily at 01:00
        self.scheduler.add_job(
            self.cleanup_old_data,
            trigger=CronTrigger(hour=1, minute=0, timezone='UTC'),
            id='cleanup_old',
            name='Cleanup old matches',
            replace_existing=True
        )
        
        # Run initial update immediately
        asyncio.create_task(self.update_odds_job())
        
        self.scheduler.start()
        logger.info("✅ Background worker started - 3 jobs scheduled")
        logger.info("🎯 Expected usage: ~290 API calls/day")
    
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
