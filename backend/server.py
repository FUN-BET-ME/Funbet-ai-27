"""FunBet.ai - Complete Optimized Server"""
from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
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
from funbet_iq_engine import calculate_funbet_iq
from espn_api_service import update_team_stats_from_espn
from cricketdata_api import update_cricket_team_stats
from espn_team_service import fetch_team_logo_from_espn, fetch_team_stats_from_espn, batch_fetch_team_logos, batch_fetch_team_stats

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
        thirty_days = now + timedelta(days=30)
        
        query = {
            'commence_time': {
                '$gte': now.isoformat(),
                '$lte': thirty_days.isoformat()
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
        thirty_days = now + timedelta(days=30)
        
        query = {
            'sport_key': {'$regex': '^soccer_', '$options': 'i'},
            'commence_time': {
                '$gte': now.isoformat(),
                '$lte': thirty_days.isoformat()
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
        thirty_days = now + timedelta(days=30)
        
        query = {
            'sport_key': {'$regex': '^cricket_', '$options': 'i'},
            'commence_time': {
                '$gte': now.isoformat(),
                '$lte': thirty_days.isoformat()
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
    include_scores: bool = Query(True),
    time_filter: str = Query(None, description="Filter by time: 'upcoming', 'live', or 'all'")
):
    """Get all cached odds with optional live scores and time filtering"""
    try:
        from live_scores_service import live_scores_service
        
        now = datetime.now(timezone.utc)
        
        query = {}
        
        # CRITICAL FIX: Filter by time status
        # NOTE: commence_time is stored as ISO string, convert to comparable format
        if time_filter == 'upcoming':
            # Only matches that haven't started yet
            now_str = now.isoformat().replace('+00:00', 'Z')
            query['commence_time'] = {'$gt': now_str}
        elif time_filter == 'live':
            # Matches that started in last 3 hours (likely still live)
            three_hours_ago = now - timedelta(hours=3)
            three_hours_ago_str = three_hours_ago.isoformat().replace('+00:00', 'Z')
            now_str = now.isoformat().replace('+00:00', 'Z')
            query['commence_time'] = {'$gte': three_hours_ago_str, '$lte': now_str}
        elif time_filter == 'recent':
            # Recent Results: ONLY completed matches from last 48 hours, EXCLUDE live matches
            forty_eight_hours_ago = now - timedelta(hours=48)
            forty_eight_hours_ago_str = forty_eight_hours_ago.isoformat().replace('+00:00', 'Z')
            now_str = now.isoformat().replace('+00:00', 'Z')
            
            # Query: completed matches that finished in last 48 hours (NOT live)
            query['completed'] = True
            query['live_score.is_live'] = {'$ne': True}  # EXCLUDE live matches
            query['$or'] = [
                {'completed_at': {'$gte': forty_eight_hours_ago_str, '$lte': now_str}},  # New matches with completed_at
                {'completed_at': {'$exists': False}, 'commence_time': {'$gte': forty_eight_hours_ago_str, '$lte': now_str}}  # Old matches without completed_at
            ]
        else:
            # Default behavior (no time_filter or 'all'): exclude OLD matches (>6 hours ago)
            # Show matches from 6 hours ago to future (covers live + upcoming)
            six_hours_ago = now - timedelta(hours=6)
            six_hours_ago_str = six_hours_ago.isoformat().replace('+00:00', 'Z')
            query['commence_time'] = {'$gte': six_hours_ago_str}
        
        # Filter by sport if provided
        if sport:
            if sport == 'soccer':
                query['sport_key'] = {'$regex': '^soccer_', '$options': 'i'}
            elif sport == 'cricket':
                query['sport_key'] = {'$regex': '^cricket_', '$options': 'i'}
            else:
                query['sport_key'] = {'$regex': f'^{sport}_', '$options': 'i'}
        
        # Get all matches with smart sorting
        # For recent results: sort by completed_at (newest first)
        # For others: live matches first, then by start time
        if time_filter == 'recent':
            sort_criteria = [('completed_at', -1), ('commence_time', -1)]  # Newest completed first
        else:
            sort_criteria = [('live_score.is_live', -1), ('commence_time', 1)]  # Live first, then upcoming
        
        matches = await db_instance.db.odds_cache.find(query, {'_id': 0}) \
            .sort(sort_criteria) \
            .skip(skip) \
            .limit(limit) \
            .to_list(length=limit)
        
        # Merge IQ predictions for all matches (always include)
        if matches:
            iq_count = 0
            for match in matches:
                # Fetch IQ prediction for this match
                iq_pred = await db_instance.db.funbet_iq_predictions.find_one(
                    {'match_id': match['id']},
                    {'_id': 0}
                )
                if iq_pred:
                    # Add IQ data directly to match object (including draw_iq for football)
                    match['funbet_iq'] = {
                        'home_iq': iq_pred.get('home_iq'),
                        'away_iq': iq_pred.get('away_iq'),
                        'draw_iq': iq_pred.get('draw_iq'),  # For football matches (1X2)
                        'confidence': iq_pred.get('confidence'),
                        'verdict': iq_pred.get('verdict'),
                        'home_components': iq_pred.get('home_components'),
                        'away_components': iq_pred.get('away_components'),
                        # Add prediction verification results for completed matches
                        'prediction_correct': iq_pred.get('prediction_correct'),
                        'predicted_winner': iq_pred.get('predicted_winner'),
                        'actual_winner': iq_pred.get('actual_winner'),
                        'verified_at': iq_pred.get('verified_at')
                    }
                    iq_count += 1
            
            logger.info(f"✅ all-cached: {len(matches)} matches, {iq_count} with IQ predictions")
        
        # Live scores are already in the database from background worker!
        # NO NEED to merge from service - just use what's in the database
        # The background worker updates live_score field every 10 seconds
        if include_scores and matches:
            # Simply count how many matches have live scores (no merge needed)
            matched_count = sum(1 for m in matches if m.get('live_score'))
            logger.info(f"📊 {matched_count}/{len(matches)} matches have live_score from DB")
        else:
            logger.info(f"✅ all-cached: Returned {len(matches)} matches (scores disabled)")
        
        # Return in format frontend expects: {matches: [...]}
        return {"matches": matches}
        
    except Exception as e:
        logger.error(f"Error fetching all-cached: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/odds/historical/recent")
async def get_recent_historical_odds():
    """Get completed matches from the last 48 hours"""
    try:
        from live_scores_service import live_scores_service
        
        now = datetime.now(timezone.utc)
        forty_eight_hours_ago = now - timedelta(hours=48)
        
        # Query for matches that were scheduled within last 48 hours
        # (completed matches should have commence_time in the past)
        query = {
            'commence_time': {
                '$gte': forty_eight_hours_ago.isoformat(),
                '$lt': now.isoformat()
            }
        }
        
        matches = await db_instance.db.odds_cache.find(query, {'_id': 0}) \
            .sort('commence_time', -1) \
            .limit(100) \
            .to_list(length=100)
        
        # Get live scores to determine which matches are actually completed
        scores_data = await live_scores_service.get_all_live_scores()
        completed_scores = scores_data.get('completed_scores', [])
        
        # Only return matches that have completed scores
        recent_results = []
        for match in matches:
            matched_score = await live_scores_service.match_score_to_match(match, completed_scores)
            if matched_score and matched_score.get('completed'):
                match['live_score'] = {
                    'scores': matched_score.get('scores'),
                    'match_status': matched_score.get('match_status'),
                    'completed': True,
                    'last_update': matched_score.get('last_update')
                }
                recent_results.append(match)
        
        logger.info(f"✅ Recent results: {len(recent_results)} completed matches in last 48h")
        return recent_results
        
    except Exception as e:
        logger.error(f"Error fetching recent historical odds: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/odds/inplay")
async def get_inplay_odds():
    """Get currently in-play (live) matches with ESPN live scores"""
    try:
        from live_scores_service import live_scores_service
        
        now = datetime.now(timezone.utc)
        three_hours_ago = now - timedelta(hours=3)
        
        # Query for matches that started within last 3 hours (likely still live)
        query = {
            'commence_time': {
                '$gte': three_hours_ago.isoformat(),
                '$lte': now.isoformat()
            }
        }
        
        # Fetch matches from database
        cursor = db_instance.db.odds_cache.find(query).sort('commence_time', -1).limit(200)
        matches = await cursor.to_list(length=None)
        
        # Fetch API-Sports live scores (football and basketball)
        from api_football_service import fetch_api_football_live_scores, fetch_api_basketball_live_scores
        api_football_scores = await fetch_api_football_live_scores()
        api_basketball_scores = await fetch_api_basketball_live_scores()
        
        # Combine all live scores
        all_live_scores = api_football_scores + api_basketball_scores
        
        # Match API-Sports live scores with database matches
        for match in matches:
            # Try to find live score from API-Sports (football or basketball)
            matched_score = None
            home_team = match.get('home_team', '').lower()
            away_team = match.get('away_team', '').lower()
            
            for score in all_live_scores:
                score_home = score.get('home_team', '').lower()
                score_away = score.get('away_team', '').lower()
                
                if (home_team in score_home or score_home in home_team) and \
                   (away_team in score_away or score_away in away_team):
                    matched_score = score
                    break
            
            # Add live score data if found
            if matched_score:
                match['live_score'] = {
                    'home_score': matched_score.get('home_score', '0'),
                    'away_score': matched_score.get('away_score', '0'),
                    'match_status': matched_score.get('match_status'),
                    'is_live': matched_score.get('is_live', False),
                    'completed': matched_score.get('completed', False),
                    'last_update': matched_score.get('last_update'),
                    'home_team_logo': matched_score.get('home_team_logo'),
                    'away_team_logo': matched_score.get('away_team_logo'),
                    'league_logo': matched_score.get('league_logo')
                }
            
            # Ensure logos are at root level for frontend convenience
            if match.get('live_score'):
                # Copy logos from live_score to root if they exist
                if match['live_score'].get('home_team_logo'):
                    match['home_team_logo'] = match['live_score']['home_team_logo']
                if match['live_score'].get('away_team_logo'):
                    match['away_team_logo'] = match['live_score']['away_team_logo']
                if match['live_score'].get('league_logo'):
                    match['league_logo'] = match['live_score']['league_logo']
            
            # Remove MongoDB _id for JSON serialization
            if '_id' in match:
                del match['_id']
        
        # Filter to show live matches:
        # 1. Has ESPN live score data and is not completed, OR
        # 2. Started within last 2.5 hours but no ESPN data yet (show as potentially live)
        live_matches = []
        for m in matches:
            if m.get('live_score'):
                # Has ESPN data - check if not completed
                if not m.get('live_score', {}).get('completed'):
                    live_matches.append(m)
            else:
                # No ESPN data yet - check if match started within last 2.5 hours (likely live)
                commence_time = datetime.fromisoformat(m.get('commence_time', '').replace('Z', '+00:00'))
                hours_since_start = (now - commence_time).total_seconds() / 3600
                if 0 < hours_since_start < 2.5:  # Football matches last ~2 hours
                    # Add default live status with 0-0 score (will update when ESPN has data)
                    m['live_score'] = {
                        'home_score': '0',
                        'away_score': '0',
                        'match_status': 'Live',
                        'is_live': True,
                        'completed': False
                    }
                    live_matches.append(m)
        
        logger.info(f"✅ In-play matches: {len(live_matches)} live out of {len(matches)} recent")
        return live_matches
        
    except Exception as e:
        logger.error(f"Error fetching in-play odds: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/match/enhanced/{match_id}")
async def get_enhanced_match_data(match_id: str):
    """Get comprehensive enhanced data for a match including statistics, predictions, and events"""
    try:
        from api_football_enhanced import api_football_enhanced
        
        # Get match from database
        match = await db_instance.db.odds_cache.find_one({'id': match_id})
        
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        
        # Search for fixture ID in API-Football
        fixture_id = await api_football_enhanced.search_fixture_by_teams(
            match.get('home_team'),
            match.get('away_team'),
            match.get('commence_time', '')[:10]
        )
        
        enhanced_data = {
            'match': match,
            'fixture_id': fixture_id,
            'statistics': None,
            'predictions': None,
            'events': [],
            'api_call_count': 0
        }
        
        if fixture_id:
            # Fetch all enhanced data
            import asyncio
            
            stats_task = api_football_enhanced.fetch_fixture_statistics(fixture_id)
            predictions_task = api_football_enhanced.fetch_fixture_predictions(fixture_id)
            events_task = api_football_enhanced.fetch_fixture_events(fixture_id)
            
            stats, predictions, events = await asyncio.gather(
                stats_task, predictions_task, events_task, return_exceptions=True
            )
            
            enhanced_data['statistics'] = stats if not isinstance(stats, Exception) else None
            enhanced_data['predictions'] = predictions if not isinstance(predictions, Exception) else None
            enhanced_data['events'] = events if not isinstance(events, Exception) else []
            enhanced_data['api_call_count'] = 3  # Used 3 API calls
        
        # Remove MongoDB _id
        if '_id' in enhanced_data['match']:
            del enhanced_data['match']['_id']
        
        logger.info(f"✅ Enhanced data for match {match_id}: fixture_id={fixture_id}, {enhanced_data['api_call_count']} API calls")
        return enhanced_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching enhanced match data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/odds/football/priority")
async def get_football_priority_legacy():
    """Legacy endpoint - Get priority football matches"""
    try:
        now = datetime.now(timezone.utc)
        thirty_days = now + timedelta(days=30)
        
        matches = await db_instance.db.odds_cache.find({
            'sport_key': {'$regex': '^soccer_', '$options': 'i'},
            'commence_time': {
                '$gte': now.isoformat(),
                '$lte': thirty_days.isoformat()
            }
        }, {'_id': 0}).sort('commence_time', 1).to_list(length=1000)
        
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
        thirty_days = now + timedelta(days=30)
        
        matches = await db_instance.db.odds_cache.find({
            'sport_key': {'$regex': '^cricket_', '$options': 'i'},
            'commence_time': {
                '$gte': now.isoformat(),
                '$lte': thirty_days.isoformat()
            }
        }, {'_id': 0}).sort('commence_time', 1).to_list(length=1000)
        
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
        thirty_days = now + timedelta(days=30)
        upcoming = await db_instance.db.odds_cache.count_documents({
            'commence_time': {
                '$gte': now.isoformat(),
                '$lte': thirty_days.isoformat()
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
        thirty_days = now + timedelta(days=30)
        
        query = {
            'commence_time': {
                '$gte': now.isoformat(),
                '$lte': thirty_days.isoformat()
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
                "to": thirty_days.isoformat()
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
        thirty_days = now + timedelta(days=30)
        query['commence_time'] = {
            '$gte': now.isoformat(),
            '$lte': thirty_days.isoformat()
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
    """Get sports news from NewsAPI"""
    try:
        import httpx
        import os
        
        news_api_key = os.environ.get('NEWS_API_KEY')
        if not news_api_key:
            raise HTTPException(status_code=500, detail="News API key not configured")
        
        # Build query - default to sports if no specific query
        search_query = q if q else 'sports'
        
        # Add specific keywords for better results
        if q:
            if 'football' in q.lower() or 'soccer' in q.lower():
                search_query = 'football OR soccer OR premier OR "champions league" OR bundesliga'
            elif 'cricket' in q.lower():
                search_query = 'cricket OR IPL OR "world cup cricket" OR T20'
        
        # Fetch from NewsAPI
        url = "https://newsapi.org/v2/everything"
        params = {
            'q': search_query,
            'apiKey': news_api_key,
            'language': 'en',
            'sortBy': 'publishedAt',
            'pageSize': min(pageSize, 100)
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code != 200:
                logger.error(f"NewsAPI error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch news")
            
            data = response.json()
            
            # Filter out articles without description or from removed sources
            articles = []
            for article in data.get('articles', []):
                # Skip articles without basic content
                if not article.get('title') or not article.get('description'):
                    continue
                
                # Skip removed articles
                if '[Removed]' in article.get('title', '') or '[Removed]' in article.get('description', ''):
                    continue
                
                articles.append(article)
            
            return {
                "status": "ok",
                "totalResults": len(articles),
                "articles": articles[:pageSize]
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include router

# ==================== FUNBET IQ V2 ENDPOINTS ====================

@api_router.get("/funbet-iq/matches")
async def get_funbet_iq_matches(
    sport: Optional[str] = None,
    limit: int = Query(default=50, le=200)
):
    """
    Get all matches with FunBet IQ scores
    
    Args:
        sport: Filter by sport (football, cricket, etc.)
        limit: Maximum number of matches
    
    Returns:
        List of matches with IQ scores
    """
    try:
        db = db_instance.db
        iq_scores_collection = db['funbet_iq_predictions']
        
        # Build query - only get unverified predictions (pending)
        query = {
            '$or': [
                {'prediction_correct': {'$exists': False}},
                {'prediction_correct': None}
            ]
        }
        
        if sport:
            sport_pattern = sport.lower()
            if sport_pattern == 'football':
                query['sport_key'] = {'$regex': '^soccer', '$options': 'i'}
            elif sport_pattern == 'cricket':
                query['sport_key'] = {'$regex': '^cricket', '$options': 'i'}
            else:
                query['sport_key'] = {'$regex': sport_pattern, '$options': 'i'}
        
        # Get total count of pending predictions
        total_count = await iq_scores_collection.count_documents(query)
        
        # Fetch IQ scores and sort by confidence (High > Medium > Low)
        # MongoDB can't sort by mapped values, so we fetch and sort in Python
        iq_matches = await iq_scores_collection.find(query).to_list(length=None)
        
        # Sort by confidence level (High=3, Medium=2, Low=1) then by IQ difference
        confidence_order = {'High': 3, 'Medium': 2, 'Low': 1}
        iq_matches.sort(key=lambda m: (
            -confidence_order.get(m.get('confidence', 'Low'), 0),  # Primary: Confidence descending
            -abs(m.get('home_iq', 0) - m.get('away_iq', 0))  # Secondary: IQ diff descending
        ))
        
        # Apply limit after sorting
        limited_matches = iq_matches[:limit]
        
        # Convert ObjectId to string
        for match in limited_matches:
            if '_id' in match:
                match['_id'] = str(match['_id'])
        
        logger.info(f"✅ Fetched {len(limited_matches)}/{total_count} FunBet IQ matches (sport={sport})")
        
        return {
            'success': True,
            'total': total_count,  # Total pending predictions
            'count': len(limited_matches),  # Matches returned in this response
            'matches': limited_matches
        }
        
    except Exception as e:
        logger.error(f"Error fetching FunBet IQ matches: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/funbet-iq/match/{match_id}")
async def get_funbet_iq_match(match_id: str):
    """
    Get detailed FunBet IQ breakdown for a specific match
    
    Args:
        match_id: Match ID
    
    Returns:
        Detailed IQ breakdown with all components
    """
    try:
        db = db_instance.db
        iq_scores_collection = db['funbet_iq_scores']
        
        # Find IQ score
        iq_data = await iq_scores_collection.find_one({'match_id': match_id})
        
        if not iq_data:
            # Try to calculate it if not found
            odds_cache_collection = db['odds_cache']
            match = await odds_cache_collection.find_one({'id': match_id})
            
            if not match:
                raise HTTPException(status_code=404, detail="Match not found")
            
            # CRITICAL: Only calculate for PRE-MATCH games (not started yet)
            from datetime import datetime, timezone
            commence_time = match.get('commence_time', '')
            if commence_time:
                match_time = datetime.fromisoformat(commence_time.replace('Z', '+00:00'))
                now = datetime.now(timezone.utc)
                
                if match_time <= now:
                    # Match has already started or finished - cannot calculate prediction
                    raise HTTPException(
                        status_code=400, 
                        detail="Cannot calculate prediction for match that has already started. Predictions are PRE-MATCH only."
                    )
            
            # Calculate IQ (PRE-MATCH ONLY)
            iq_data = await calculate_funbet_iq(match, db)
            
            if iq_data:
                # Save to database
                await iq_scores_collection.insert_one(iq_data)
                logger.info(f"✅ Calculated and saved PRE-MATCH IQ for match {match_id}")
        
        # Convert ObjectId to string
        if '_id' in iq_data:
            iq_data['_id'] = str(iq_data['_id'])
        
        return {
            'success': True,
            'match': iq_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching FunBet IQ for match {match_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/funbet-iq/accuracy")
async def get_funbet_iq_accuracy():
    """Get FunBet IQ prediction accuracy statistics"""
    try:
        from prediction_verification_service import get_prediction_service
        
        db = db_instance.db
        verification_service = get_prediction_service(db)
        
        stats = await verification_service.get_accuracy_stats()
        
        if stats is None:
            return JSONResponse(
                status_code=500,
                content={"success": False, "error": "Failed to get accuracy stats"}
            )
        
        return {
            "success": True,
            "accuracy": stats
        }
        
    except Exception as e:
        logger.error(f"Error getting accuracy stats: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@api_router.get("/funbet-iq/track-record")
async def get_funbet_iq_track_record(
    limit: int = Query(100, ge=1, le=500),
    sport: str = Query(None, description="Filter by sport: football, basketball, cricket, etc."),
    filter: str = Query('all', regex='^(all|correct|incorrect)$'),
    sort_by: str = Query('recent_first', regex='^(recent_first|correct_first|high_confidence)$')
):
    """
    Get FunBet IQ prediction track record (verified predictions with outcomes)
    
    Args:
        limit: Maximum number of predictions to return
        filter: Filter by result ('all', 'correct', 'incorrect')
        sort_by: Sort order ('recent_first', 'correct_first', 'high_confidence')
    
    Returns:
        Track record and statistics
    """
    try:
        from prediction_verification_service import get_prediction_service
        
        db = db_instance.db
        iq_predictions_collection = db.funbet_iq_predictions  # Use correct collection
        odds_collection = db.odds_cache
        
        # Build query for verified predictions
        query = {
            'prediction_correct': {'$ne': None}  # Only verified predictions
        }
        
        # Apply sport filter (use sport_key, not sport)
        if sport and sport != 'all':
            if sport == 'football':
                query['sport_key'] = {'$regex': 'soccer', '$options': 'i'}
            elif sport == 'basketball':
                query['sport_key'] = {'$regex': 'basketball', '$options': 'i'}
            elif sport == 'cricket':
                query['sport_key'] = {'$regex': 'cricket', '$options': 'i'}
        
        # Apply filter
        if filter == 'correct':
            query['prediction_correct'] = True
        elif filter == 'incorrect':
            query['prediction_correct'] = False
        
        # Determine sort order
        sort_order = []
        if sort_by == 'correct_first':
            sort_order = [('prediction_correct', -1), ('verified_at', -1)]  # Correct first, then recent
        elif sort_by == 'high_confidence':
            # Create custom sort: High=3, Medium=2, Low=1
            sort_order = [('confidence', -1), ('verified_at', -1)]
        else:  # recent_first (default)
            sort_order = [('verified_at', -1)]
        
        # Get verified predictions from correct collection
        verified_predictions = await iq_predictions_collection.find(query).sort(sort_order).limit(limit).to_list(length=limit)
        
        # Enrich with match details and scores
        track_record = []
        for pred in verified_predictions:
            try:
                match_id = pred.get('match_id')
                
                # Get match data for odds and scores
                match_data = await odds_collection.find_one({'id': match_id})
                
                # Map predicted_winner to team name
                predicted_winner = pred.get('predicted_winner', '')
                if predicted_winner == 'home':
                    predicted_team = pred.get('home_team')
                elif predicted_winner == 'away':
                    predicted_team = pred.get('away_team')
                else:
                    predicted_team = 'Draw'
                
                # Map actual_winner to team name  
                actual_winner = pred.get('actual_winner', '')
                if actual_winner == 'home':
                    actual_winner_team = pred.get('home_team')
                elif actual_winner == 'away':
                    actual_winner_team = pred.get('away_team')
                else:
                    actual_winner_team = 'Draw'
                
                # Build track record entry with frontend-expected fields
                entry = {
                    'match_id': match_id,
                    'home_team': pred.get('home_team'),
                    'away_team': pred.get('away_team'),
                    'sport_key': pred.get('sport_key'),
                    'sport_title': pred.get('sport_key', '').replace('_', ' ').title(),
                    # Frontend expected fields
                    'predicted_team': predicted_team,
                    'actual_winner': actual_winner_team,
                    'result_verified': True,  # All entries in track record are verified
                    'was_correct': pred.get('prediction_correct'),
                    'confidence_score': pred.get('confidence'),
                    'archived_at': pred.get('verified_at') or pred.get('calculated_at'),
                    # Backend fields for reference
                    'predicted_winner': pred.get('predicted_winner'),
                    'prediction_correct': pred.get('prediction_correct'),
                    'confidence': pred.get('confidence'),
                    'home_iq': pred.get('home_iq'),
                    'away_iq': pred.get('away_iq'),
                    'draw_iq': pred.get('draw_iq'),
                    'verdict': pred.get('verdict'),
                    'calculated_at': pred.get('calculated_at'),
                    'verified_at': pred.get('verified_at'),
                    'match_status': pred.get('match_status', 'completed')
                }
                
                # Get scores from prediction (saved during verification - no API call needed!)
                scores = pred.get('scores', [])
                
                # Fallback: If not in prediction, get from match_data (backwards compatibility)
                if not scores or len(scores) != 2:
                    if match_data:
                        scores = match_data.get('scores', [])
                        if not scores and match_data.get('live_score'):
                            live_score = match_data.get('live_score')
                            home_score = live_score.get('home_score')
                            away_score = live_score.get('away_score')
                            if home_score is not None and away_score is not None:
                                scores = [
                                    {'name': pred.get('home_team'), 'score': str(home_score)},
                                    {'name': pred.get('away_team'), 'score': str(away_score)}
                                ]
                
                entry['scores'] = scores
                entry['home_score'] = scores[0].get('score') if len(scores) > 0 else None
                entry['away_score'] = scores[1].get('score') if len(scores) > 1 else None
                
                # Add other match data if available
                if match_data:
                    entry['commence_time'] = match_data.get('commence_time')
                    bookmakers = match_data.get('bookmakers', [])
                    entry['bookmaker_count'] = len(bookmakers)
                
                track_record.append(entry)
                
            except Exception as e:
                logger.error(f"Error enriching prediction {pred.get('_id')}: {e}")
                continue
        
        # Get accuracy stats
        verification_service = get_prediction_service(db)
        stats = await verification_service.get_accuracy_stats()
        
        if stats is None:
            stats = {
                'overall': {
                    'total': 0,
                    'correct': 0,
                    'incorrect': 0,
                    'accuracy_percentage': 0
                }
            }
        
        logger.info(f"✅ Returned {len(track_record)} track record entries (filter={filter}, sort_by={sort_by})")
        
        return {
            'success': True,
            'track_record': track_record,
            'stats': {
                'accuracy': stats['overall']['accuracy_percentage'],
                'total': stats['overall']['total'],
                'correct': stats['overall']['correct'],
                'incorrect': stats['overall']['incorrect'],
                'by_confidence': stats.get('by_confidence', {})
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting track record: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@api_router.post("/funbet-iq/verify")
async def verify_predictions(hours_back: int = Query(24, ge=1, le=168)):
    """Manually trigger prediction verification"""
    try:
        from prediction_verification_service import get_prediction_service
        
        db = db_instance.db
        verification_service = get_prediction_service(db)
        
        result = await verification_service.verify_completed_matches(hours_back)
        
        if result is None:
            return JSONResponse(
                status_code=500,
                content={"success": False, "error": "Verification failed"}
            )
        
        return {
            "success": True,
            "verification_result": result
        }
        
    except Exception as e:
        logger.error(f"Error in manual verification: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@api_router.post("/funbet-iq/calculate")
async def trigger_funbet_iq_calculation(sport: Optional[str] = None):
    """
    Manually trigger FunBet IQ calculation for all matches
    (Admin endpoint - will be called by background worker)
    
    Args:
        sport: Optional sport filter
    
    Returns:
        Calculation results
    """
    try:
        db = db_instance.db
        odds_cache_collection = db['odds_cache']
        iq_scores_collection = db['funbet_iq_scores']
        
        # Build query
        query = {}
        if sport:
            sport_pattern = sport.lower()
            if sport_pattern == 'football':
                query['sport_key'] = {'$regex': '^soccer', '$options': 'i'}
            elif sport_pattern == 'cricket':
                query['sport_key'] = {'$regex': '^cricket', '$options': 'i'}
            else:
                query['sport_key'] = {'$regex': sport_pattern, '$options': 'i'}
        
        # Get all matches (increased limit to cover more matches)
        matches = await odds_cache_collection.find(query).limit(500).to_list(length=500)
        
        if not matches:
            return {
                'success': True,
                'message': 'No matches found to calculate IQ',
                'calculated': 0
            }
        
        calculated_count = 0
        errors = []
        
        # CRITICAL: Only process PRE-MATCH games
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        for match in matches:
            try:
                # Check if match has already started
                commence_time = match.get('commence_time', '')
                if commence_time:
                    match_time = datetime.fromisoformat(commence_time.replace('Z', '+00:00'))
                    if match_time <= now:
                        # Skip matches that have already started
                        continue
                
                # Check if prediction already exists (never update existing predictions)
                existing_prediction = await iq_scores_collection.find_one(
                    {'match_id': match.get('id')}
                )
                
                if existing_prediction:
                    # Prediction exists - skip to preserve original pre-match prediction
                    calculated_count += 1
                    continue
                
                # Calculate IQ (PRE-MATCH ONLY, first time only)
                iq_data = await calculate_funbet_iq(match, db)
                
                if iq_data:
                    # Save ONLY if prediction doesn't exist (insert only, never update)
                    await iq_scores_collection.insert_one(iq_data)
                    calculated_count += 1
                    
            except Exception as e:
                error_msg = f"Error calculating IQ for {match.get('id')}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
        
        logger.info(f"✅ FunBet IQ calculation complete: {calculated_count}/{len(matches)} matches")
        
        return {
            'success': True,
            'total_matches': len(matches),
            'calculated': calculated_count,
            'errors': errors[:10] if errors else []  # Return first 10 errors
        }
        
    except Exception as e:
        logger.error(f"Error in FunBet IQ calculation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/funbet-iq/update-stats/{team_name}")
async def update_team_historical_stats(
    team_name: str,
    sport_key: str = Query(..., description="Sport key (e.g., soccer_epl, cricket_ipl)")
):
    """
    Update team historical stats from ESPN or CricketData API
    
    Args:
        team_name: Team name
        sport_key: Sport key
    
    Returns:
        Update status
    """
    try:
        db = db_instance.db
        
        # Determine data source based on sport
        success = False
        if sport_key.startswith('cricket'):
            # Use CricketData API
            success = await update_cricket_team_stats(team_name, sport_key, db)
        else:
            # Use ESPN API
            success = await update_team_stats_from_espn(team_name, sport_key, db)
        
        if success:
            return {
                'success': True,
                'message': f'Successfully updated stats for {team_name}',
                'team': team_name,
                'sport': sport_key
            }
        else:
            return {
                'success': False,
                'message': f'Failed to fetch stats for {team_name}',
                'team': team_name,
                'sport': sport_key
            }
        
    except Exception as e:
        logger.error(f"Error updating team stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== TEAM LOGOS & STATS ENDPOINTS ====================

@api_router.get("/teams/logo/{team_name}")
async def get_team_logo(team_name: str, sport_key: str = Query(None)):
    """
    Get team logo URL from cache or fetch from ESPN
    """
    try:
        db = db_instance.db
        
        # Check cache first
        cached_logo = await db.team_logos.find_one({
            'team_name': team_name
        })
        
        if cached_logo and cached_logo.get('logo_url'):
            return {'logo_url': cached_logo['logo_url'], 'cached': True}
        
        # Fetch from ESPN
        logo_url = await fetch_team_logo_from_espn(team_name, sport_key)
        
        if logo_url:
            # Cache it
            await db.team_logos.update_one(
                {'team_name': team_name},
                {'$set': {
                    'logo_url': logo_url,
                    'sport_key': sport_key,
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            return {'logo_url': logo_url, 'cached': False}
        
        return {'logo_url': None, 'cached': False}
        
    except Exception as e:
        logger.error(f"Error fetching team logo: {e}")
        return {'logo_url': None, 'error': str(e)}


@api_router.post("/teams/logos/batch-fetch")
async def batch_fetch_logos(limit: int = Query(100, description="Max teams to fetch")):
    """
    Batch fetch team logos from ESPN (Admin endpoint)
    """
    try:
        db = db_instance.db
        result = await batch_fetch_team_logos(db, limit)
        return result
    except Exception as e:
        logger.error(f"Error in batch logo fetch: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/teams/stats/batch-fetch")
async def batch_fetch_stats(limit: int = Query(50, description="Max teams to fetch")):
    """
    Batch fetch team stats from ESPN (Admin endpoint)
    """
    try:
        db = db_instance.db
        result = await batch_fetch_team_stats(db, limit)
        return result
    except Exception as e:
        logger.error(f"Error in batch stats fetch: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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


