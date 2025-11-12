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
from funbet_odds_generator import add_funbet_odds_to_matches

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# Football leagues to fetch (top 2 per country + UEFA + FIFA)
FOOTBALL_LEAGUES = [
    # UEFA Competitions
    'soccer_uefa_champs_league',
    'soccer_uefa_europa_league',
    'soccer_uefa_europa_conference_league',
    
    # FIFA
    'soccer_fifa_world_cup',
    
    # England - Top 2
    'soccer_epl',
    'soccer_efl_champ',
    
    # Spain - Top 2
    'soccer_spain_la_liga',
    'soccer_spain_segunda_division',
    
    # Germany - Top 2
    'soccer_germany_bundesliga',
    'soccer_germany_bundesliga2',
    
    # Italy - Top 2
    'soccer_italy_serie_a',
    'soccer_italy_serie_b',
    
    # France - Top 2
    'soccer_france_ligue_one',
    'soccer_france_ligue_two',
    
    # Portugal - Top 2
    'soccer_portugal_primeira_liga',
    'soccer_portugal_liga_portugal_2',
    
    # Netherlands - Top 2
    'soccer_netherlands_eredivisie',
    'soccer_netherlands_eerste_divisie',
    
    # South America
    'soccer_brazil_campeonato',
    'soccer_argentina_primera_division',
    'soccer_conmebol_libertadores',
]

# Cricket competitions
CRICKET_LEAGUES = [
    'cricket_test_match',
    'cricket_odi',
    'cricket_international_t20',
    'cricket_ipl',  # IPL
    'cricket_icc_world_cup',
]

class OddsWorker:
    def __init__(self):
        self.db = None
        self.odds_api_key = os.environ.get('ODDS_API_KEY')
        self.scheduler = AsyncIOScheduler()
        
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
                
                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"✅ Fetched {len(data)} matches for {sport_key}")
                    return data
                else:
                    logger.warning(f"⚠️ {sport_key} returned status {response.status_code}")
                    return []
        except Exception as e:
            logger.error(f"❌ Error fetching {sport_key}: {e}")
            return []
    
    async def update_odds_job(self):
        """
        Update odds every 5 minutes - EFFICIENT VERSION
        Uses ONLY 1 API call to get all upcoming matches across all sports
        """
        try:
            logger.info("🔄 Starting odds update (EFFICIENT - 1 API call)...")
            
            # SINGLE API CALL - Gets ALL upcoming matches across ALL sports
            all_matches = await self.fetch_odds_for_sport('upcoming')
            
            if not all_matches:
                logger.warning("⚠️ No matches fetched from upcoming endpoint")
                return
            
            logger.info(f"✅ Fetched {len(all_matches)} matches in 1 API call")
            
            # Add FunBet odds (5% markup above market best)
            all_matches = add_funbet_odds_to_matches(all_matches)
            
            # Store in database
            # Clear existing cache and insert fresh data
            await self.db.odds_cache.delete_many({})
            
            # Prepare documents with metadata
            for match in all_matches:
                match['updated_at'] = datetime.now(timezone.utc).isoformat()
                match['fetched_at'] = datetime.now(timezone.utc).isoformat()
            
            await self.db.odds_cache.insert_many(all_matches)
            
            logger.info(f"✅ Database updated with {len(all_matches)} matches")
            logger.info(f"📊 API Efficiency: 1 call for {len(all_matches)} matches")
                
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
        """Clean up matches older than 2 days"""
        try:
            two_days_ago = datetime.now(timezone.utc) - timedelta(days=2)
            
            result = await self.db.odds_cache.delete_many({
                'commence_time': {'$lt': two_days_ago.isoformat()}
            })
            
            if result.deleted_count > 0:
                logger.info(f"🗑️ Cleaned up {result.deleted_count} old matches")
                
        except Exception as e:
            logger.error(f"❌ Error cleaning old data: {e}")
    
    def start(self):
        """Start the background worker"""
        logger.info("🚀 Starting FunBet.ai background worker...")
        
        # Job 1: Update odds every 5 minutes
        self.scheduler.add_job(
            self.update_odds_job,
            trigger=IntervalTrigger(minutes=5),
            id='update_odds',
            name='Update odds every 5 minutes',
            replace_existing=True
        )
        
        # Job 2: Add day 8 data daily at GMT 00:00
        self.scheduler.add_job(
            self.add_day_8_job,
            trigger=CronTrigger(hour=0, minute=0, timezone='UTC'),
            id='add_day_8',
            name='Add day 8 data at GMT 00:00',
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
        logger.info("✅ Background worker started with 3 jobs")
    
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
