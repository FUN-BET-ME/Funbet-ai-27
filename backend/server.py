"""FunBet.ai - Complete Optimized Server"""
from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
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
    # Start background worker asynchronously to not block startup
    asyncio.create_task(start_worker())
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
        }, {'_id': 0}).to_list(length=1000)
        
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

@api_router.get("/scores/live")
async def get_live_scores_realtime(force_refresh: bool = False):
    """Get real-time live scores from all sources (cached, updates every 30s)"""
    try:
        from live_scores_service import live_scores_service
        
        scores_data = await live_scores_service.get_all_live_scores(force_refresh=force_refresh)
        
        logger.info(f"✅ Live Scores: {scores_data['live_count']} live, {scores_data['completed_count']} completed")
        return scores_data
        
    except Exception as e:
        logger.error(f"Error fetching live scores: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/odds/live-with-scores")
async def get_live_matches_with_scores():
    """Get all currently live matches with scores merged from multiple sources"""
    try:
        from live_scores_service import live_scores_service
        
        now = datetime.now(timezone.utc)
        two_hours_ago = now - timedelta(hours=2)
        
        # Fetch live matches from database
        live_matches = await db_instance.db.odds_cache.find({
            'commence_time': {
                '$gte': two_hours_ago.isoformat(),
                '$lte': now.isoformat()
            }
        }, {'_id': 0}).to_list(length=1000)
        
        # Get all live scores
        scores_data = await live_scores_service.get_all_live_scores()
        all_scores = scores_data['live_scores'] + scores_data['completed_scores']
        
        # Merge scores with odds data
        matched_count = 0
        for match in live_matches:
            matched_score = await live_scores_service.match_score_to_match(match, all_scores)
            if matched_score:
                match['live_score'] = {
                    'scores': matched_score.get('scores'),
                    'match_status': matched_score.get('match_status'),
                    'is_live': matched_score.get('is_live', False),
                    'completed': matched_score.get('completed', False),
                    'last_update': matched_score.get('last_update')
                }
                matched_count += 1
        
        logger.info(f"✅ Live with scores: {len(live_matches)} matches, {matched_count} with scores")
        return {
            'matches': live_matches,
            'count': len(live_matches),
            'scores_matched': matched_count,
            'scores_available': len(all_scores)
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
    sport: str = Query(None),
    include_scores: bool = Query(True)
):
    """Get all cached odds with optional live scores"""
    try:
        from live_scores_service import live_scores_service
        
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
        
        # Merge live scores if requested
        if include_scores and matches:
            scores_data = await live_scores_service.get_all_live_scores()
            all_scores = scores_data['live_scores'] + scores_data['completed_scores']
            
            matched_count = 0
            for match in matches:
                matched_score = await live_scores_service.match_score_to_match(match, all_scores)
                if matched_score:
                    match['live_score'] = {
                        'scores': matched_score.get('scores'),
                        'match_status': matched_score.get('match_status'),
                        'is_live': matched_score.get('is_live', False),
                        'completed': matched_score.get('completed', False),
                        'last_update': matched_score.get('last_update')
                    }
                    matched_count += 1
            
            logger.info(f"✅ all-cached: {len(matches)} matches, {matched_count} with live scores")
        else:
            logger.info(f"✅ all-cached: Returned {len(matches)} matches (scores disabled)")
        
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
    """Get overall statistics"""
    try:
        now = datetime.now(timezone.utc)
        
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
        two_hours_ago = now - timedelta(hours=2)
        live = await db_instance.db.odds_cache.count_documents({
            'commence_time': {
                '$gte': two_hours_ago.isoformat(),
                '$lte': now.isoformat()
            }
        })
        
        # Upcoming (next 14 days)
        fourteen_days = now + timedelta(days=14)
        upcoming = await db_instance.db.odds_cache.count_documents({
            'commence_time': {
                '$gte': now.isoformat(),
                '$lte': fourteen_days.isoformat()
            }
        })
        
        # Completed (last 48 hours for display)
        forty_eight_hours_ago = now - timedelta(hours=48)
        completed_recent = await db_instance.db.odds_cache.count_documents({
            'commence_time': {
                '$gte': forty_eight_hours_ago.isoformat(),
                '$lt': now.isoformat()
            }
        })
        
        # Historical (older than 48 hours - kept for predictions)
        historical = await db_instance.db.odds_cache.count_documents({
            'commence_time': {
                '$lt': forty_eight_hours_ago.isoformat()
            }
        })
        
        return {
            "total_matches": total_matches,
            "football_matches": football,
            "cricket_matches": cricket,
            "live_matches": live,
            "upcoming_matches": upcoming,
            "completed_recent": completed_recent,
            "historical_matches": historical,
            "last_updated": now.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/stats/14-days")
async def get_stats_14_days(
    sport: str = Query(None, description="Filter by sport: soccer or cricket"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200)
):
    """Get all matches for next 14 days (for stats page)"""
    try:
        now = datetime.now(timezone.utc)
        fourteen_days = now + timedelta(days=14)
        
        query = {
            'commence_time': {
                '$gte': now.isoformat(),
                '$lte': fourteen_days.isoformat()
            }
        }
        
        # Filter by sport
        if sport:
            if sport == 'soccer':
                query['sport_key'] = {'$regex': '^soccer_', '$options': 'i'}
            elif sport == 'cricket':
                query['sport_key'] = {'$regex': '^cricket_', '$options': 'i'}
        else:
            # Default: only football and cricket
            query['sport_key'] = {'$regex': '^(soccer_|cricket_)', '$options': 'i'}
        
        # Count total
        total = await db_instance.db.odds_cache.count_documents(query)
        
        # Get paginated results
        skip = (page - 1) * page_size
        matches = await db_instance.db.odds_cache.find(query, {'_id': 0}) \
            .sort('commence_time', 1) \
            .skip(skip) \
            .limit(page_size) \
            .to_list(length=page_size)
        
        # Group by league
        leagues = {}
        for match in matches:
            league = match.get('sport_title', 'Unknown')
            if league not in leagues:
                leagues[league] = []
            leagues[league].append(match)
        
        return {
            "matches": matches,
            "leagues": leagues,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size
            },
            "period": {
                "from": now.isoformat(),
                "to": fourteen_days.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching 14-day stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/stats/completed")
async def get_completed_games(
    hours: int = Query(48, ge=1, le=168, description="Hours to look back (default 48)"),
    sport: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200)
):
    """Get completed games (for recent history display, default 48 hours)"""
    try:
        from live_scores_service import live_scores_service
        
        now = datetime.now(timezone.utc)
        hours_ago = now - timedelta(hours=hours)
        
        query = {
            'commence_time': {
                '$gte': hours_ago.isoformat(),
                '$lt': now.isoformat()
            }
        }
        
        # Filter by sport
        if sport:
            if sport == 'soccer':
                query['sport_key'] = {'$regex': '^soccer_', '$options': 'i'}
            elif sport == 'cricket':
                query['sport_key'] = {'$regex': '^cricket_', '$options': 'i'}
        else:
            query['sport_key'] = {'$regex': '^(soccer_|cricket_)', '$options': 'i'}
        
        # Count total
        total = await db_instance.db.odds_cache.count_documents(query)
        
        # Get paginated results
        skip = (page - 1) * page_size
        matches = await db_instance.db.odds_cache.find(query, {'_id': 0}) \
            .sort('commence_time', -1) \
            .skip(skip) \
            .limit(page_size) \
            .to_list(length=page_size)
        
        # Try to get scores for completed matches
        scores_data = await live_scores_service.get_all_live_scores()
        completed_scores = scores_data.get('completed_scores', [])
        
        matched_count = 0
        for match in matches:
            matched_score = await live_scores_service.match_score_to_match(match, completed_scores)
            if matched_score:
                match['final_score'] = {
                    'scores': matched_score.get('scores'),
                    'completed': matched_score.get('completed', True),
                    'last_update': matched_score.get('last_update')
                }
                matched_count += 1
        
        return {
            "matches": matches,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size
            },
            "scores_matched": matched_count,
            "period": {
                "from": hours_ago.isoformat(),
                "to": now.isoformat(),
                "hours": hours
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching completed games: {e}")
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

# ==========================================
# NEWS ENDPOINT (Sample Data)
# ==========================================

@api_router.get("/predictions/all")
async def get_all_predictions(sport: str = Query(None, description="Filter by sport: soccer or cricket")):
    """Generate AI predictions for all football & cricket matches"""
    try:
        from predictions_generator import predictions_generator
        
        # Get all matches
        query = {}
        if sport:
            if sport == 'soccer' or sport == 'football':
                query['sport_key'] = {'$regex': '^soccer_', '$options': 'i'}
            elif sport == 'cricket':
                query['sport_key'] = {'$regex': '^cricket_', '$options': 'i'}
        else:
            # Default: only football and cricket
            query['sport_key'] = {'$regex': '^(soccer_|cricket_)', '$options': 'i'}
        
        # Only get upcoming matches (within next 14 days)
        now = datetime.now(timezone.utc)
        fourteen_days = now + timedelta(days=14)
        query['commence_time'] = {
            '$gte': now.isoformat(),
            '$lte': fourteen_days.isoformat()
        }
        
        matches = await db_instance.db.odds_cache.find(query, {'_id': 0}).to_list(length=500)
        
        # Generate predictions
        predictions_data = predictions_generator.generate_all_predictions(matches)
        
        # Store/update predictions in database for tracking
        for pred in predictions_data['all_predictions']:
            existing = await db_instance.db.predictions_history.find_one({'match_id': pred['match_id']})
            
            if not existing:
                # New prediction - store with pending status
                pred_doc = {
                    **pred,
                    'status': 'pending',
                    'predicted_at': now.isoformat(),
                    'result': None,
                    'is_correct': None
                }
                await db_instance.db.predictions_history.insert_one(pred_doc)
        
        logger.info(f"✅ Generated {predictions_data['total_count']} predictions")
        
        return predictions_data
        
    except Exception as e:
        logger.error(f"Error generating predictions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/predictions/stats")
async def get_predictions_stats():
    """Get prediction accuracy statistics"""
    try:
        # Count by status
        total = await db_instance.db.predictions_history.count_documents({})
        pending = await db_instance.db.predictions_history.count_documents({'status': 'pending'})
        correct = await db_instance.db.predictions_history.count_documents({'status': 'correct'})
        incorrect = await db_instance.db.predictions_history.count_documents({'status': 'incorrect'})
        
        # Calculate accuracy
        completed = correct + incorrect
        accuracy = (correct / completed * 100) if completed > 0 else 0
        
        return {
            'total': total,
            'pending': pending,
            'correct': correct,
            'incorrect': incorrect,
            'completed': completed,
            'accuracy': round(accuracy, 1)
        }
        
    except Exception as e:
        logger.error(f"Error fetching prediction stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/predictions/by-status")
async def get_predictions_by_status(
    status: str = Query(..., description="Status: pending, correct, or incorrect"),
    sport: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """Get predictions filtered by status"""
    try:
        query = {'status': status}
        
        # Filter by sport
        if sport:
            if sport == 'soccer' or sport == 'football':
                query['sport_key'] = {'$regex': '^soccer_', '$options': 'i'}
            elif sport == 'cricket':
                query['sport_key'] = {'$regex': '^cricket_', '$options': 'i'}
        
        # Count total
        total = await db_instance.db.predictions_history.count_documents(query)
        
        # Get paginated results
        skip = (page - 1) * page_size
        predictions = await db_instance.db.predictions_history.find(query, {'_id': 0}) \
            .sort('predicted_at', -1) \
            .skip(skip) \
            .limit(page_size) \
            .to_list(length=page_size)
        
        return {
            'predictions': predictions,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': (total + page_size - 1) // page_size
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching predictions by status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/news")
async def get_news(q: str = Query(None), pageSize: int = Query(20, le=100)):
    """Get sports news - Returns sample data for Football & Cricket"""
    try:
        sample_articles = [
            {
                "title": "EPL: Manchester City defeats Arsenal in thrilling match",
                "description": "Manchester City secured a 2-1 victory over Arsenal in a Premier League clash.",
                "url": "https://example.com/news/1",
                "urlToImage": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800",
                "publishedAt": datetime.now(timezone.utc).isoformat(),
                "source": {"name": "Sports Daily"},
                "content": "Full match report..."
            },
            {
                "title": "Cricket World Cup: India advances to finals",
                "description": "India secured their spot in the ICC Cricket World Cup finals.",
                "url": "https://example.com/news/2",
                "urlToImage": "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800",
                "publishedAt": datetime.now(timezone.utc).isoformat(),
                "source": {"name": "Cricket News"},
                "content": "Match highlights..."
            },
            {
                "title": "La Liga: Real Madrid extends winning streak",
                "description": "Real Madrid continues their impressive form with a 3-0 win.",
                "url": "https://example.com/news/3",
                "urlToImage": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800",
                "publishedAt": datetime.now(timezone.utc).isoformat(),
                "source": {"name": "Football Times"},
                "content": "Match summary..."
            },
            {
                "title": "IPL 2025: Mumbai Indians sign star player",
                "description": "Mumbai Indians make blockbuster signing ahead of IPL 2025.",
                "url": "https://example.com/news/4",
                "urlToImage": "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800",
                "publishedAt": datetime.now(timezone.utc).isoformat(),
                "source": {"name": "IPL News"},
                "content": "Transfer news..."
            },
            {
                "title": "Champions League: Bayern Munich reaches quarter-finals",
                "description": "Bayern Munich advances to Champions League quarter-finals.",
                "url": "https://example.com/news/5",
                "urlToImage": "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800",
                "publishedAt": datetime.now(timezone.utc).isoformat(),
                "source": {"name": "UEFA News"},
                "content": "Match report..."
            }
        ]
        
        # Filter articles based on query
        if q:
            q_lower = q.lower()
            
            # Smart filtering for football/cricket
            if 'football' in q_lower or 'soccer' in q_lower:
                # Include football-related articles (EPL, La Liga, Champions, etc.)
                filtered = [a for a in sample_articles if any(keyword in (a['title'] + ' ' + a['description']).lower() 
                           for keyword in ['epl', 'premier', 'la liga', 'champions', 'madrid', 'barcelona', 'manchester', 'arsenal', 'bayern'])]
            elif 'cricket' in q_lower:
                # Include cricket-related articles
                filtered = [a for a in sample_articles if any(keyword in (a['title'] + ' ' + a['description']).lower() 
                           for keyword in ['cricket', 'ipl', 'india', 'world cup', 'mumbai indians'])]
            else:
                # Default exact match
                filtered = [a for a in sample_articles if q_lower in a['title'].lower() or q_lower in a['description'].lower()]
            
            articles = filtered[:pageSize]
        else:
            articles = sample_articles[:pageSize]
        
        return {"status": "ok", "totalResults": len(articles), "articles": articles}
        
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include router
app.include_router(api_router)

# Middleware
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=settings.cors_origins_list, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=settings.rate_limit_per_minute)
app.add_middleware(GZipMiddleware, minimum_size=1000)

logger.info("✅ FunBet.ai server ready!")

# ==========================================
# PREDICTIONS HISTORY (with pagination)
# ==========================================

@api_router.get("/predictions/history")
async def get_predictions_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str = Query(None, description="Filter by status: correct, incorrect, pending"),
    sport: str = Query(None, description="Filter by sport: soccer, cricket")
):
    """
    Get predictions history with pagination
    Shows all predictions with their outcomes (correct/incorrect/pending)
    This data grows over time and is never deleted
    """
    try:
        # This will use a predictions collection when we implement AI predictions
        # For now, return placeholder structure
        
        query = {}
        
        # Filter by status
        if status:
            query['status'] = status
        
        # Filter by sport
        if sport:
            query['sport'] = sport
        
        # Get from predictions collection (to be created)
        # For now, return empty with proper structure
        total = 0
        predictions = []
        
        return {
            "predictions": predictions,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": 0
            },
            "stats": {
                "total_predictions": total,
                "correct": 0,
                "incorrect": 0,
                "pending": 0,
                "accuracy": 0.0
            },
            "message": "Predictions history will be populated when AI predictions are generated"
        }
        
    except Exception as e:
        logger.error(f"Error fetching predictions history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/predictions/record")
async def record_prediction(prediction: dict):
    """
    Record a prediction for future tracking
    Structure: {
        "match_id": "...",
        "prediction": "home/away/draw",
        "confidence": 0.85,
        "odds": {...},
        "predicted_at": "...",
        "sport": "soccer/cricket"
    }
    """
    try:
        # Add metadata
        prediction['created_at'] = datetime.now(timezone.utc).isoformat()
        prediction['status'] = 'pending'
        prediction['outcome'] = None
        
        # Store in predictions collection
        result = await db_instance.db.predictions.insert_one(prediction)
        
        logger.info(f"✅ Prediction recorded: {result.inserted_id}")
        
        return {
            "success": True,
            "prediction_id": str(result.inserted_id),
            "message": "Prediction recorded for future tracking"
        }
        
    except Exception as e:
        logger.error(f"Error recording prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

