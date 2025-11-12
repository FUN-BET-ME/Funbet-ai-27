from fastapi import APIRouter, HTTPException, Query, Path
from models import StatusCheckCreate, StatusCheck, PaginatedResponse
from services.status_service import StatusService
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/status", tags=["Status Checks"])

@router.post("", response_model=StatusCheck, status_code=201)
async def create_status_check(input_data: StatusCheckCreate):
    """Create a new status check"""
    try:
        return await StatusService.create_status_check(input_data)
    except Exception as e:
        logger.error(f"Error in create_status_check: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("", response_model=PaginatedResponse)
async def get_status_checks(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    client_name: Optional[str] = Query(None, description="Filter by client name")
):
    """Get paginated list of status checks"""
    try:
        return await StatusService.get_status_checks(page, page_size, client_name)
    except Exception as e:
        logger.error(f"Error in get_status_checks: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/stats")
async def get_stats():
    """Get statistics about status checks"""
    try:
        return await StatusService.get_stats()
    except Exception as e:
        logger.error(f"Error in get_stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{status_id}", response_model=StatusCheck)
async def get_status_check(
    status_id: str = Path(..., description="Status check ID")
):
    """Get a single status check by ID"""
    try:
        status_check = await StatusService.get_status_check_by_id(status_id)
        if not status_check:
            raise HTTPException(status_code=404, detail="Status check not found")
        return status_check
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_status_check: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{status_id}", status_code=204)
async def delete_status_check(
    status_id: str = Path(..., description="Status check ID")
):
    """Delete a status check by ID"""
    try:
        deleted = await StatusService.delete_status_check(status_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Status check not found")
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_status_check: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
