"""
FunBet.ai - Optimized Sports Betting Odds Platform
Clean rebuild with modular architecture
"""
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os
from datetime import datetime, timezone

# Import our optimized modules
from config import settings
from database import connect_to_mongo, close_mongo_connection
from middleware.rate_limiter import RateLimitMiddleware
from middleware.security import SecurityHeadersMiddleware
from utils.cache import get_from_cache, set_cache

# Import auth module (keep existing)
from auth import (
    User, UserInDB, UserCreate, UserLogin, Token, UserSession,
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_auth, validate_google_session
)

# Import AI predictions module (keep existing)
from ai_predictions import generate_ai_predictions

# Import Cricket integration (keep existing)
from cricketdata_api import get_cricket_live_scores, get_cricket_recent_results
from cricket_odds_integration import get_complete_cricket_data, fetch_cricket_odds

# Import services
from services.odds_service import OddsService
from services.cricket_service import CricketService

# Import FunBet odds generator
from funbet_odds_generator import add_funbet_odds_to_matches

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown"""
    logger.info("🚀 Starting FunBet.ai...")
    await connect_to_mongo()
    logger.info("✅ Application started successfully")
    yield
    logger.info("🛑 Shutting down FunBet.ai...")
    await close_mongo_connection()
    logger.info("✅ Shutdown complete")

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Sports Betting Odds Aggregation with AI Predictions",
    version=settings.version,
    lifespan=lifespan
)

# Create API router
api_router = APIRouter(prefix="/api")

# ==========================================
# CORE ENDPOINTS
# ==========================================

@api_router.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "FunBet.ai API",
        "version": settings.version,
        "status": "operational"
    }

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    from database import db_instance
    
    db_status = "healthy"
    try:
        if db_instance.client:
            await db_instance.client.admin.command('ping')
        else:
            db_status = "disconnected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.version
    }

# ==========================================
# ODDS ENDPOINTS - THE ODDS API + FUNBET
# ==========================================

@api_router.get("/odds/upcoming")
async def get_upcoming_odds(
    sport: str = None,
    days_ahead: int = 7,
    min_matches: int = 20
):
    """
    Get upcoming odds from The Odds API with FunBet odds (5% above market best)
    """
    try:
        cache_key = f"upcoming_{sport or 'all'}_{days_ahead}"
        
        # Check cache
        cached = get_from_cache(cache_key)
        if cached:
            logger.info(f"✅ Cache hit: {cache_key}")
            return cached
        
        # Fetch from The Odds API
        if sport:
            matches = await OddsService.fetch_from_odds_api(sport)
        else:
            # Fetch multiple popular sports
            sports = ['soccer_epl', 'soccer_uefa_champs_league', 'soccer_spain_la_liga',
                     'basketball_nba', 'cricket_odi', 'cricket_international_t20']
            matches = await OddsService.fetch_multiple_sports(sports)
        
        # Filter by time window
        filtered = OddsService.filter_by_time_window(matches, days=days_ahead)
        
        # Add FunBet odds (5% above market best)
        with_funbet = add_funbet_odds_to_matches(filtered)
        
        # Cache and return
        set_cache(cache_key, with_funbet)
        logger.info(f"✅ Fetched {len(with_funbet)} upcoming matches with FunBet odds")
        
        return with_funbet
        
    except Exception as e:
        logger.error(f"Error fetching upcoming odds: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/odds/football/priority")
async def get_football_odds():
    """
    Get priority football matches (Champions League, EPL, La Liga, etc.)
    with FunBet odds
    """
    try:
        cache_key = "football_priority"
        
        cached = get_from_cache(cache_key)
        if cached:
            return cached
        
        # Football leagues priority
        football_leagues = [
            'soccer_uefa_champs_league',
            'soccer_uefa_europa_league',
            'soccer_epl',
            'soccer_spain_la_liga',
            'soccer_germany_bundesliga',
            'soccer_italy_serie_a',
            'soccer_france_ligue_one'
        ]
        
        matches = await OddsService.fetch_multiple_sports(football_leagues)
        filtered = OddsService.filter_by_time_window(matches, days=14)
        with_funbet = add_funbet_odds_to_matches(filtered)
        
        # Sort by commence_time
        with_funbet.sort(key=lambda x: x.get('commence_time', ''))
        
        set_cache(cache_key, with_funbet)
        logger.info(f"✅ Football: {len(with_funbet)} matches")
        
        return with_funbet
        
    except Exception as e:
        logger.error(f"Error fetching football odds: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/odds/cricket/priority")
async def get_cricket_odds():
    """
    Get cricket matches with odds from The Odds API + live scores from Cricket API
    with FunBet odds
    """
    try:
        cache_key = "cricket_priority"
        
        cached = get_from_cache(cache_key, is_cricket=True)
        if cached:
            return cached
        
        # Fetch cricket odds from The Odds API
        cricket_sports = [
            'cricket_odi',
            'cricket_international_t20',
            'cricket_test_match'
        ]
        
        odds_matches = await OddsService.fetch_multiple_sports(cricket_sports)
        
        # Fetch live cricket scores from paid API
        live_scores = await CricketService.get_live_scores()
        
        # Combine odds with live scores
        # Add FunBet odds
        with_funbet = add_funbet_odds_to_matches(odds_matches)
        
        result = {
            "odds_matches": with_funbet,
            "live_scores": live_scores,
            "total_matches": len(with_funbet) + len(live_scores)
        }
        
        set_cache(cache_key, result, is_cricket=True)
        logger.info(f"✅ Cricket: {len(with_funbet)} odds + {len(live_scores)} live")
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching cricket data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# AUTH ENDPOINTS (Keep existing from auth.py)
# ==========================================

@api_router.post("/auth/register", response_model=Token)
async def register(user: UserCreate):
    """Register new user"""
    from database import db_instance
    
    # Check if user exists
    existing = await db_instance.db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = get_password_hash(user.password)
    user_dict = {
        "email": user.email,
        "hashed_password": hashed_password,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db_instance.db.users.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer")

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login user"""
    from database import db_instance
    
    # Find user
    user = await db_instance.db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    access_token = create_access_token(data={"sub": credentials.email})
    return Token(access_token=access_token, token_type="bearer")

# ==========================================
# PREDICTIONS ENDPOINTS (Keep AI system)
# ==========================================

@api_router.get("/predictions")
async def get_predictions(sport: str = None):
    """Get AI predictions for upcoming matches"""
    try:
        # This will use the existing ai_predictions.py module
        matches = await get_upcoming_odds(sport=sport)
        
        # Generate predictions using existing AI system
        predictions = generate_ai_predictions(matches[:20])  # Top 20 matches
        
        return predictions
        
    except Exception as e:
        logger.error(f"Error generating predictions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# INCLUDE ROUTER & MIDDLEWARE
# ==========================================

# Include API router
app.include_router(api_router)

# Add middleware (order matters!)
# 1. CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Security headers
app.add_middleware(SecurityHeadersMiddleware)

# 3. Rate limiting
app.add_middleware(RateLimitMiddleware, requests_per_minute=settings.rate_limit_per_minute)

# 4. Gzip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

logger.info("🎯 FunBet.ai server configured and ready!")
