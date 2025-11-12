from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
import asyncio
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)
        self.cleanup_interval = 60  # Clean up old entries every 60 seconds
        self.last_cleanup = datetime.now()

    def is_allowed(self, client_id: str) -> bool:
        now = datetime.now()
        
        # Cleanup old entries periodically
        if (now - self.last_cleanup).seconds > self.cleanup_interval:
            self._cleanup()
            self.last_cleanup = now
        
        # Get requests for this client in the last minute
        one_minute_ago = now - timedelta(minutes=1)
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if req_time > one_minute_ago
        ]
        
        # Check if limit exceeded
        if len(self.requests[client_id]) >= self.requests_per_minute:
            return False
        
        # Add current request
        self.requests[client_id].append(now)
        return True

    def _cleanup(self):
        """Remove old entries to prevent memory leak"""
        one_minute_ago = datetime.now() - timedelta(minutes=1)
        clients_to_remove = []
        
        for client_id, timestamps in self.requests.items():
            self.requests[client_id] = [
                ts for ts in timestamps if ts > one_minute_ago
            ]
            if not self.requests[client_id]:
                clients_to_remove.append(client_id)
        
        for client_id in clients_to_remove:
            del self.requests[client_id]

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.limiter = RateLimiter(requests_per_minute)

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health check
        if request.url.path == "/api/health":
            return await call_next(request)
        
        # Get client identifier (IP address)
        client_id = request.client.host
        
        if not self.limiter.is_allowed(client_id):
            logger.warning(f"Rate limit exceeded for client {client_id}")
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )
        
        response = await call_next(request)
        return response
