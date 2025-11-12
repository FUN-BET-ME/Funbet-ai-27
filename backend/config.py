from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

class Settings(BaseSettings):
    # Application
    app_name: str = "Status Check API"
    debug: bool = False
    
    # Database
    mongo_url: str = os.environ['MONGO_URL']
    db_name: str = os.environ['DB_NAME']
    
    # CORS
    cors_origins: list = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    # Rate Limiting
    rate_limit_per_minute: int = 60
    
    # Pagination
    default_page_size: int = 20
    max_page_size: int = 100
    
    # Cache
    cache_ttl: int = 300  # 5 minutes
    
    class Config:
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
