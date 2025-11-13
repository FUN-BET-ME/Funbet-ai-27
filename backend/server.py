"""FunBet.ai - Complete Optimized Server"""
from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
import math

# Core imports
from config import settings
from database import connect_to_mongo, close_mongo_connection, db_instance
from middleware.rate_limiter import RateLimitMiddleware
from middleware.security import SecurityHeadersMiddleware
from background_worker import start_worker, stop_worker

# Keep existing modules
from auth import (
    User, UserCreate, UserLogin, Token,
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_auth
)
from ai_predictions import generate_ai_predictions
from espn_scores_service import fetch_all_espn_scores, match_score_to_odds

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown"""
    logger.info("🚀 Starting FunBet.ai...")
    await connect_to_mongo()
    await start_worker()  # Start background worker
    logger.info("✅ Application started")
    yield
    logger.info("🛑 Shutting down...")
    await stop_worker()
    await close_mongo_connection()
    logger.info("✅ Shutdown complete")

app = FastAPI(
    title="FunBet.ai",
    version="2.0.0",
    lifespan=lifespan
)

api_router = APIRouter(prefix="/api")

# ==========================================
# CORE ENDPOINTS
# ==========================================

@api_router.get("/")
async def root():
    return {"message": "FunBet.ai", "version": "2.0.0", "status": "operational"}

@api_router.get("/health")
async def health_check():
    db_status = "healthy"
    try:
        if db_instance.client:
            await db_instance.client.admin.command('ping')
        else:
            db_status = "disconnected"
    except:
        db_status = "unhealthy"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ==========================================
# LIVE MATCHES
# ==========================================

@api_router.get("/odds/live")
async def get_live_matches():
    """Get all currently live matches"""
    try:
        now = datetime.now(timezone.utc)
        two_hours_ago = now - timedelta(hours=2)
        
        # Matches that started within last 2 hours
        live_matches = await db_instance.db.odds_cache.find({
            'commence_time': {
                '$gte': two_hours_ago.isoformat(),
                '$lte': now.isoformat()
            }
        }, {'_id': 0}).to_list(length=None)
        
        logger.info(f"✅ Live: {len(live_matches)} matches")
        return live_matches
        
    except Exception as e:
        logger.error(f"Error fetching live: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/espn/scores")
async def get_espn_live_scores():
    """Get live scores from ESPN API"""
    try:
        # Fetch live scores from ESPN
        espn_scores = await fetch_all_espn_scores()
        
        logger.info(f"✅ ESPN Scores: {len(espn_scores)} matches")
        return {
            'scores': espn_scores,
            'count': len(espn_scores),
            'live_count': sum(1 for s in espn_scores if s.get('is_live', False))
        }
        
    except Exception as e:
        logger.error(f"Error fetching ESPN scores: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/odds/live-with-scores")
async def get_live_matches_with_scores():
    """Get all currently live matches with ESPN scores merged"""
    try:
        now = datetime.now(timezone.utc)
        two_hours_ago = now - timedelta(hours=2)
        
        # Fetch live matches from database
        live_matches = await db_instance.db.odds_cache.find({
            'commence_time': {
                '$gte': two_hours_ago.isoformat(),
                '$lte': now.isoformat()
            }
        }, {'_id': 0}).to_list(length=None)
        
        # Fetch ESPN scores
        espn_scores = await fetch_all_espn_scores()
        
        # Merge ESPN scores with odds data
        for match in live_matches:
            matched_score = match_score_to_odds(match, espn_scores)
            if matched_score:
                match['scores'] = matched_score.get('scores')
                match['match_status'] = matched_score.get('match_status')
                match['is_live'] = matched_score.get('is_live')
                match['last_update'] = matched_score.get('last_update')
        
        logger.info(f"✅ Live with scores: {len(live_matches)} matches, {len(espn_scores)} ESPN scores")
        return {
            'matches': live_matches,
            'count': len(live_matches),
            'espn_scores_count': len(espn_scores)
        }
        
    except Exception as e:
        logger.error(f"Error fetching live matches with scores: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# UPCOMING MATCHES (14 days, paginated)
# ==========================================

@api_router.get("/odds/upcoming")
async def get_upcoming_matches(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=100),
    sport: Optional[str] = None
):
    """Get upcoming matches - next 14 days, 100 per page"""
    try:
        now = datetime.now(timezone.utc)
        fourteen_days = now + timedelta(days=14)
        
        query = {
            'commence_time': {
                '$gte': now.isoformat(),
                '$lte': fourteen_days.isoformat()
            }
        }
        
        if sport:
            query['sport_key'] = {'$regex': f'^{sport}', '$options': 'i'}
        
        # Count total
        total = await db_instance.db.odds_cache.count_documents(query)
        total_pages = math.ceil(total / page_size)
        
        # Fetch paginated
        skip = (page - 1) * page_size
        matches = await db_instance.db.odds_cache.find(query, {'_id': 0}) \
            .sort('commence_time', 1) \
            .skip(skip) \
            .limit(page_size) \
            .to_list(length=page_size)
        
        logger.info(f"✅ Upcoming: {len(matches)}/{total} (page {page}/{total_pages})")
        
        return {
            "matches": matches,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching upcoming: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# FOOTBALL SPECIFIC
# ==========================================

@api_router.get("/odds/football")
async def get_football_matches(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=100)
):
    """Get football matches (14 days, paginated)"""
    try:
        now = datetime.now(timezone.utc)
        fourteen_days = now + timedelta(days=14)
        
        query = {
            'sport_key': {'$regex': '^soccer_', '$options': 'i'},
            'commence_time': {
                '$gte': now.isoformat(),
                '$lte': fourteen_days.isoformat()
            }
        }
        
        total = await db_instance.db.odds_cache.count_documents(query)
        total_pages = math.ceil(total / page_size)
        
        skip = (page - 1) * page_size
        matches = await db_instance.db.odds_cache.find(query, {'_id': 0}) \
            .sort('commence_time', 1) \
            .skip(skip) \
            .limit(page_size) \
            .to_list(length=page_size)
        
        return {
            "matches": matches,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching football: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# CRICKET SPECIFIC
# ==========================================

@api_router.get("/odds/cricket")
async def get_cricket_matches(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=100)
):
    """Get cricket matches (14 days, paginated)"""
    try:
        now = datetime.now(timezone.utc)
        fourteen_days = now + timedelta(days=14)
        
        query = {
            'sport_key': {'$regex': '^cricket_', '$options': 'i'},
            'commence_time': {
                '$gte': now.isoformat(),
                '$lte': fourteen_days.isoformat()
            }
        }
        
        total = await db_instance.db.odds_cache.count_documents(query)
        total_pages = math.ceil(total / page_size)
        
        skip = (page - 1) * page_size
        matches = await db_instance.db.odds_cache.find(query, {'_id': 0}) \
            .sort('commence_time', 1) \
            .skip(skip) \
            .limit(page_size) \
            .to_list(length=page_size)
        
        return {
            "matches": matches,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching cricket: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# LEGACY ENDPOINTS (for frontend compatibility)
# ==========================================

@api_router.get("/odds/all-cached")
async def get_all_cached_odds(
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    sport: str = Query(None)
):
    """Legacy endpoint - Get all cached odds (for frontend compatibility)"""
    try:
        now = datetime.now(timezone.utc)
        
        query = {}
        
        # Filter by sport if provided
        if sport:
            if sport == 'soccer':
                query['sport_key'] = {'$regex': '^soccer_', '$options': 'i'}
            elif sport == 'cricket':
                query['sport_key'] = {'$regex': '^cricket_', '$options': 'i'}
            else:
                query['sport_key'] = {'$regex': f'^{sport}_', '$options': 'i'}
        
        # Get all matches
        matches = await db_instance.db.odds_cache.find(query, {'_id': 0}) \
            .sort('commence_time', 1) \
            .skip(skip) \
            .limit(limit) \
            .to_list(length=limit)
        
        logger.info(f"✅ all-cached: Returned {len(matches)} matches")
        
        # Return in format frontend expects: {matches: [...]}
        return {"matches": matches}
        
    except Exception as e:
        logger.error(f"Error fetching all-cached: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/odds/football/priority")
async def get_football_priority_legacy():
    """Legacy endpoint - Get priority football matches"""
    try:
        now = datetime.now(timezone.utc)
        fourteen_days = now + timedelta(days=14)
        
        matches = await db_instance.db.odds_cache.find({
            'sport_key': {'$regex': '^soccer_', '$options': 'i'},
            'commence_time': {
                '$gte': now.isoformat(),
                '$lte': fourteen_days.isoformat()
            }
        }, {'_id': 0}).sort('commence_time', 1).to_list(length=100)
        
        logger.info(f"✅ football/priority: Returned {len(matches)} matches")
        return matches
        
    except Exception as e:
        logger.error(f"Error fetching football priority: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/odds/cricket/priority")
async def get_cricket_priority_legacy():
    """Legacy endpoint - Get priority cricket matches"""
    try:
        now = datetime.now(timezone.utc)
        fourteen_days = now + timedelta(days=14)
        
        matches = await db_instance.db.odds_cache.find({
            'sport_key': {'$regex': '^cricket_', '$options': 'i'},
            'commence_time': {
                '$gte': now.isoformat(),
                '$lte': fourteen_days.isoformat()
            }
        }, {'_id': 0}).sort('commence_time', 1).to_list(length=100)
        
        logger.info(f"✅ cricket/priority: Returned {len(matches)} matches")
        return matches
        
    except Exception as e:
        logger.error(f"Error fetching cricket priority: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# PREDICTIONS & STATS
# ==========================================

@api_router.get("/predictions")
async def get_predictions(limit: int = 20):
    """Get FunBet IQ predictions"""
    try:
        # Get upcoming matches
        now = datetime.now(timezone.utc)
        three_days = now + timedelta(days=3)
        
        matches = await db_instance.db.odds_cache.find({
            'commence_time': {
                '$gte': now.isoformat(),
                '$lte': three_days.isoformat()
            }
        }, {'_id': 0}).limit(limit).to_list(length=limit)
        
        # Generate predictions
        predictions = generate_ai_predictions(matches)
        
        return predictions
        
    except Exception as e:
        logger.error(f"Error generating predictions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/stats")
async def get_stats():
    """Get statistics"""
    try:
        total_matches = await db_instance.db.odds_cache.count_documents({})
        
        # Football count
        football = await db_instance.db.odds_cache.count_documents({
            'sport_key': {'$regex': '^soccer_'}
        })
        
        # Cricket count
        cricket = await db_instance.db.odds_cache.count_documents({
            'sport_key': {'$regex': '^cricket_'}
        })
        
        # Live count
        now = datetime.now(timezone.utc)
        two_hours_ago = now - timedelta(hours=2)
        live = await db_instance.db.odds_cache.count_documents({
            'commence_time': {
                '$gte': two_hours_ago.isoformat(),
                '$lte': now.isoformat()
            }
        })
        
        return {
            "total_matches": total_matches,
            "football_matches": football,
            "cricket_matches": cricket,
            "live_matches": live,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# AUTH ENDPOINTS
# ==========================================

@api_router.post("/auth/register", response_model=Token)
async def register(user: UserCreate):
    existing = await db_instance.db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    await db_instance.db.users.insert_one({
        "email": user.email,
        "hashed_password": hashed_password,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer")

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db_instance.db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": credentials.email})
    return Token(access_token=access_token, token_type="bearer")

# Include router
app.include_router(api_router)

# Middleware
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=settings.cors_origins_list, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=settings.rate_limit_per_minute)
app.add_middleware(GZipMiddleware, minimum_size=1000)

logger.info("✅ FunBet.ai server ready!")
