"""Database connection and management"""
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def get_database():
    return db_instance.db

async def connect_to_mongo():
    """Connect to MongoDB and create indexes"""
    try:
        logger.info(f"Connecting to MongoDB at {settings.mongo_url}")
        db_instance.client = AsyncIOMotorClient(settings.mongo_url)
        db_instance.db = db_instance.client[settings.db_name]
        
        # Create indexes for performance
        # Users
        await db_instance.db.users.create_index("email", unique=True, name="email_idx")
        
        # Odds cache
        await db_instance.db.odds_cache.create_index("commence_time", name="commence_time_idx")
        await db_instance.db.odds_cache.create_index("sport_key", name="sport_key_idx")
        await db_instance.db.odds_cache.create_index(
            [("commence_time", 1), ("sport_key", 1)], 
            name="commence_sport_idx"
        )
        
        # Historical odds
        await db_instance.db.historical_odds.create_index("match_id", unique=True, name="match_id_idx")
        await db_instance.db.historical_odds.create_index("commence_time", name="hist_commence_idx")
        
        # Predictions
        await db_instance.db.funbet_predictions.create_index("match_id", name="pred_match_idx")
        await db_instance.db.funbet_predictions.create_index("prediction_timestamp", name="pred_time_idx")
        
        # Prediction archive
        await db_instance.db.prediction_archive.create_index("match_id", unique=True, name="arch_match_idx")
        await db_instance.db.prediction_archive.create_index("result_verified", name="arch_verified_idx")
        
        logger.info("Successfully connected to MongoDB and created indexes")
    except Exception as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close MongoDB connection"""
    try:
        if db_instance.client:
            db_instance.client.close()
            logger.info("MongoDB connection closed")
    except Exception as e:
        logger.error(f"Error closing MongoDB connection: {e}")
