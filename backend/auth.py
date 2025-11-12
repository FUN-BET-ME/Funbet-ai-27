"""
Authentication module for FunBet.AI
Handles both email/password and Google OAuth authentication
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import httpx
import os
import logging

logger = logging.getLogger(__name__)

# Security configuration
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# Pydantic Models
class User(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    id: str = Field(alias="_id")
    email: EmailStr
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserInDB(User):
    hashed_password: Optional[str] = None  # Optional for OAuth users


class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


# Password hashing
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# JWT token creation
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# Get user from session token (cookie or header)
async def get_current_user(request: Request, db) -> Optional[User]:
    """
    Get current user from session_token (cookie or Authorization header)
    This is used for authentication
    """
    # Try to get session token from cookie first
    session_token = request.cookies.get("session_token")
    
    # If not in cookie, try Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")
    
    if not session_token:
        return None
    
    try:
        # Find session in database
        session = await db.user_sessions.find_one({"session_token": session_token})
        
        if not session:
            return None
        
        # Check if session is expired
        if session["expires_at"] < datetime.now(timezone.utc):
            # Delete expired session
            await db.user_sessions.delete_one({"session_token": session_token})
            return None
        
        # Get user
        user_doc = await db.user_sessions.find_one({"_id": session["user_id"]})
        if not user_doc:
            return None
        
        return User(**user_doc)
    
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        return None


# Dependency for protected routes
async def require_auth(request: Request, db) -> User:
    """
    Dependency that requires authentication
    Raises 401 if user not authenticated
    """
    user = await get_current_user(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# Google OAuth session validation
async def validate_google_session(session_id: str) -> Optional[dict]:
    """
    Validate session_id with Emergent Auth service
    Returns user data if valid
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Google session validation failed: {response.status_code}")
                return None
    
    except Exception as e:
        logger.error(f"Error validating Google session: {e}")
        return None
