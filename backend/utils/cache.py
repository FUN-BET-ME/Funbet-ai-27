"""In-memory caching utility"""
import time
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# In-memory cache store
cache_store = {}

# Cache durations
CACHE_DURATION = 300  # 5 minutes
CRICKET_CACHE_DURATION = 1800  # 30 minutes
SCORES_CACHE_DURATION = 60  # 1 minute for live scores

def get_from_cache(key: str, is_scores: bool = False, is_cricket: bool = False) -> Optional[Any]:
    """Get data from cache if not expired"""
    if key in cache_store:
        data, timestamp = cache_store[key]
        
        if is_scores:
            cache_duration = SCORES_CACHE_DURATION
        elif is_cricket:
            cache_duration = CRICKET_CACHE_DURATION
        else:
            cache_duration = CACHE_DURATION
            
        if time.time() - timestamp < cache_duration:
            return data
        else:
            # Remove expired cache
            del cache_store[key]
    return None

def set_cache(key: str, data: Any) -> None:
    """Store data in cache with current timestamp"""
    cache_store[key] = (data, time.time())
    
def clear_cache(pattern: Optional[str] = None) -> int:
    """Clear cache entries matching pattern, or all if pattern is None"""
    if pattern is None:
        count = len(cache_store)
        cache_store.clear()
        logger.info(f"Cleared all {count} cache entries")
        return count
    
    keys_to_delete = [k for k in cache_store.keys() if pattern in k]
    for key in keys_to_delete:
        del cache_store[key]
    
    logger.info(f"Cleared {len(keys_to_delete)} cache entries matching '{pattern}'")
    return len(keys_to_delete)
