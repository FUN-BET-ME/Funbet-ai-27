from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    def __init__(self, requests_per_minute: int = 100):
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)
        self.cleanup_interval = 60
        self.last_cleanup = datetime.now()

    def is_allowed(self, client_id: str) -> bool:
        now = datetime.now()
        
        if (now - self.last_cleanup).seconds > self.cleanup_interval:
            self._cleanup()
            self.last_cleanup = now
        
        one_minute_ago = now - timedelta(minutes=1)
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if req_time > one_minute_ago
        ]
        
        if len(self.requests[client_id]) >= self.requests_per_minute:
            return False
        
        self.requests[client_id].append(now)
        return True

    def _cleanup(self):
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
    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.limiter = RateLimiter(requests_per_minute)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in ["/api/health", "/api/"]:
            return await call_next(request)
        
        client_id = request.client.host
        
        if not self.limiter.is_allowed(client_id):
            logger.warning(f"Rate limit exceeded for {client_id}")
            raise HTTPException(status_code=429, detail="Too many requests")
        
        return await call_next(request)
