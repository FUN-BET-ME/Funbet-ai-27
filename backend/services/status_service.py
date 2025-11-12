from models import StatusCheck, StatusCheckCreate, StatusCheckUpdate, PaginatedResponse
from database import get_database
from datetime import datetime
from typing import List, Optional
import math
import logging

logger = logging.getLogger(__name__)

class StatusService:
    @staticmethod
    async def create_status_check(input_data: StatusCheckCreate) -> StatusCheck:
        """Create a new status check"""
        try:
            db = await get_database()
            status_obj = StatusCheck(**input_data.model_dump())
            
            # Convert to dict and serialize datetime
            doc = status_obj.model_dump()
            doc['timestamp'] = doc['timestamp'].isoformat()
            
            await db.status_checks.insert_one(doc)
            logger.info(f"Created status check for client: {status_obj.client_name}")
            return status_obj
        except Exception as e:
            logger.error(f"Error creating status check: {e}")
            raise

    @staticmethod
    async def get_status_checks(
        page: int = 1,
        page_size: int = 20,
        client_name: Optional[str] = None
    ) -> PaginatedResponse:
        """Get paginated status checks with optional filtering"""
        try:
            db = await get_database()
            
            # Build query
            query = {}
            if client_name:
                query['client_name'] = {"$regex": client_name, "$options": "i"}
            
            # Get total count
            total = await db.status_checks.count_documents(query)
            
            # Calculate pagination
            skip = (page - 1) * page_size
            total_pages = math.ceil(total / page_size)
            
            # Fetch paginated data
            cursor = db.status_checks.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(page_size)
            status_checks = await cursor.to_list(length=page_size)
            
            # Convert timestamps
            for check in status_checks:
                if isinstance(check['timestamp'], str):
                    check['timestamp'] = datetime.fromisoformat(check['timestamp'])
            
            logger.info(f"Retrieved {len(status_checks)} status checks (page {page}/{total_pages})")
            
            return PaginatedResponse(
                items=status_checks,
                total=total,
                page=page,
                page_size=page_size,
                total_pages=total_pages
            )
        except Exception as e:
            logger.error(f"Error fetching status checks: {e}")
            raise

    @staticmethod
    async def get_status_check_by_id(status_id: str) -> Optional[StatusCheck]:
        """Get a single status check by ID"""
        try:
            db = await get_database()
            check = await db.status_checks.find_one({"id": status_id}, {"_id": 0})
            
            if check:
                if isinstance(check['timestamp'], str):
                    check['timestamp'] = datetime.fromisoformat(check['timestamp'])
                return StatusCheck(**check)
            return None
        except Exception as e:
            logger.error(f"Error fetching status check {status_id}: {e}")
            raise

    @staticmethod
    async def delete_status_check(status_id: str) -> bool:
        """Delete a status check by ID"""
        try:
            db = await get_database()
            result = await db.status_checks.delete_one({"id": status_id})
            logger.info(f"Deleted status check {status_id}: {result.deleted_count > 0}")
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting status check {status_id}: {e}")
            raise

    @staticmethod
    async def get_stats() -> dict:
        """Get statistics about status checks"""
        try:
            db = await get_database()
            total = await db.status_checks.count_documents({})
            
            # Get unique clients count
            unique_clients = await db.status_checks.distinct("client_name")
            
            return {
                "total_checks": total,
                "unique_clients": len(unique_clients),
                "clients": unique_clients
            }
        except Exception as e:
            logger.error(f"Error fetching stats: {e}")
            raise
