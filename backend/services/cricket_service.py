"""Cricket data service using CricketData.org API"""
import logging
from typing import List, Dict, Optional
from cricketdata_api import get_cricket_live_scores, get_cricket_recent_results

logger = logging.getLogger(__name__)

class CricketService:
    @staticmethod
    async def get_live_scores() -> List[Dict]:
        """Get live cricket scores"""
        try:
            scores = await get_cricket_live_scores()
            if scores:
                logger.info(f"✅ Cricket: Fetched {len(scores)} live scores")
            return scores or []
        except Exception as e:
            logger.error(f"Error fetching cricket live scores: {e}")
            return []
    
    @staticmethod
    async def get_recent_results(days: int = 3) -> List[Dict]:
        """Get recent cricket results"""
        try:
            results = await get_cricket_recent_results(days_back=days)
            if results:
                logger.info(f"✅ Cricket: Fetched {len(results)} recent results")
            return results or []
        except Exception as e:
            logger.error(f"Error fetching cricket results: {e}")
            return []
