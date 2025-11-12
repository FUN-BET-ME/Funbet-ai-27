"""Configuration management for FunBet.ai"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

class Settings(BaseSettings):
    # Application
    app_name: str = "FunBet.ai API"
    debug: bool = False
    version: str = "2.0.0"
    
    # Database
    mongo_url: str
    db_name: str
    
    # CORS
    cors_origins: str = "*"
    
    # External APIs
    odds_api_key: str = ""
    cricket_api_key: str = ""
    espn_api_key: str = ""
    
    # Rate Limiting
    rate_limit_per_minute: int = 100
    
    # Caching
    cache_duration: int = 300  # 5 minutes
    cricket_cache_duration: int = 1800  # 30 minutes
    scores_cache_duration: int = 60  # 1 minute for live scores
    
    # Pagination
    default_page_size: int = 100
    max_page_size: int = 500
    
    # FunBet Odds Generation
    funbet_odds_markup: float = 5.0  # 5% above market best
    
    class Config:
        case_sensitive = False
        env_file = ".env"
        extra = "allow"  # Allow extra env variables
    
    @property
    def cors_origins_list(self) -> list:
        return self.cors_origins.split(',')

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
