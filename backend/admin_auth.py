"""
Admin Authentication for FunBet IQ
Simple username/password authentication for admin pages
"""
import os
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

# Store admin credentials (MUST be set in environment variables)
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME')
ADMIN_PASSWORD_HASH = os.environ.get('ADMIN_PASSWORD_HASH')

# Validate required credentials
if not ADMIN_USERNAME:
    raise ValueError("ADMIN_USERNAME environment variable is required. Set it in .env file.")
if not ADMIN_PASSWORD_HASH:
    raise ValueError("ADMIN_PASSWORD_HASH environment variable is required. Generate with: python -c \"import hashlib; print(hashlib.sha256('YOUR_PASSWORD'.encode()).hexdigest())\"" )

# Store active sessions (in production, use Redis or database)
active_sessions = {}

def hash_password(password: str) -> str:
    """Hash a password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_credentials(username: str, password: str) -> bool:
    """Verify admin username and password"""
    if username != ADMIN_USERNAME:
        return False
    
    password_hash = hash_password(password)
    return password_hash == ADMIN_PASSWORD_HASH

def create_session(username: str) -> str:
    """Create a new session token"""
    token = secrets.token_urlsafe(32)
    active_sessions[token] = {
        'username': username,
        'created_at': datetime.now(timezone.utc),
        'expires_at': datetime.now(timezone.utc) + timedelta(hours=24)
    }
    return token

def verify_session(token: str) -> Optional[dict]:
    """Verify a session token"""
    if token not in active_sessions:
        return None
    
    session = active_sessions[token]
    
    # Check if expired
    if datetime.now(timezone.utc) > session['expires_at']:
        del active_sessions[token]
        return None
    
    return session

def invalidate_session(token: str) -> bool:
    """Invalidate a session token"""
    if token in active_sessions:
        del active_sessions[token]
        return True
    return False

def cleanup_expired_sessions():
    """Remove expired sessions"""
    now = datetime.now(timezone.utc)
    expired_tokens = [
        token for token, session in active_sessions.items()
        if now > session['expires_at']
    ]
    
    for token in expired_tokens:
        del active_sessions[token]
    
    return len(expired_tokens)
