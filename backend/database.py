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
        await db_instance.db.status_checks.create_index("timestamp", name="timestamp_idx")
        await db_instance.db.status_checks.create_index("client_name", name="client_name_idx")
        await db_instance.db.status_checks.create_index(
            [("timestamp", -1)], 
            name="timestamp_desc_idx"
        )
        
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
