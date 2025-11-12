from fastapi import FastAPI, APIRouter
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

# Import configurations and utilities
from config import settings
from utils.logger import setup_logging
from database import connect_to_mongo, close_mongo_connection
from middleware.rate_limiter import RateLimitMiddleware
from middleware.security import SecurityHeadersMiddleware
from routes import status_routes
from models import HealthCheckResponse
from datetime import datetime, timezone

# Setup logging
logger = setup_logging(logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting application...")
    await connect_to_mongo()
    logger.info("Application started successfully")
    yield
    # Shutdown
    logger.info("Shutting down application...")
    await close_mongo_connection()
    logger.info("Application shutdown complete")

# Create the main app
app = FastAPI(
    title=settings.app_name,
    description="Optimized Status Check API with performance, security, and monitoring",
    version="2.0.0",
    lifespan=lifespan
)

# Create API router
api_router = APIRouter(prefix="/api")

# Root endpoint
@api_router.get("/")
async def root():
    return {
        "message": "Hello World",
        "version": "2.0.0",
        "status": "operational"
    }

# Health check endpoint
@api_router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint for monitoring"""
    from database import db_instance
    
    db_status = "healthy"
    try:
        # Ping database
        if db_instance.client:
            await db_instance.client.admin.command('ping')
        else:
            db_status = "disconnected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    return HealthCheckResponse(
        status="healthy" if db_status == "healthy" else "degraded",
        database=db_status,
        timestamp=datetime.now(timezone.utc)
    )

# Include routers
api_router.include_router(status_routes.router)
app.include_router(api_router)

# Add middleware (order matters - first added is last executed)
# 1. CORS (should be last in chain to add headers to all responses)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.cors_origins,
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
