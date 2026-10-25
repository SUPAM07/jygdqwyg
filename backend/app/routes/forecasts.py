from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from app.analytics import get_day_ahead_schedule, get_forecast_vintages
from app.schemas import DayAheadScheduleResponse, VintagesResponse
from app.database import get_db_connection

router = APIRouter(prefix="/forecasts", tags=["Forecasts"])

@router.get("/day-ahead", response_model=DayAheadScheduleResponse)
def get_day_ahead(
    delivery_date: Optional[str] = Query(None, description="Target delivery date (YYYY-MM-DD)"),
    date: Optional[str] = Query(None, description="Alias for delivery_date (YYYY-MM-DD)"),
    gate_closure_hour: int = Query(11, ge=0, le=23, description="Day-Ahead market decision gate closure hour (UTC)"),
    resolution: str = Query("hourly", pattern="^(hourly|half-hourly)$", description="Output temporal resolution")
):
    """
    Returns the latest wind forecast available at the specified Day-Ahead decision
    cutoff for each period of the delivery day, aligned with actual outturns.
    """
    target_date = delivery_date or date or "2026-01-16"
    try:
        return get_day_ahead_schedule(
            delivery_date_str=target_date,
            gate_closure_hour=gate_closure_hour,
            resolution=resolution
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate day-ahead schedule: {str(e)}")

@router.get("/vintages", response_model=VintagesResponse)
def get_vintages(
    delivery_date: Optional[str] = Query(None, description="Delivery date for vintage tracking (YYYY-MM-DD)"),
    date: Optional[str] = Query(None, description="Alias for delivery_date (YYYY-MM-DD)")
):
    """
    Returns forecast evolutions across 4 key lead-time milestones:
    48h ahead, 24h ahead (Day-Ahead gate closure), 14h ahead (Evening), and 6h ahead (Dawn).
    """
    target_date = delivery_date or date or "2026-01-16"
    try:
        return get_forecast_vintages(target_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve vintages: {str(e)}")

@router.get("/available-dates")
def get_available_dates():
    """
    Returns the list of delivery dates available in the system.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT settlementDate FROM actuals WHERE (settlementDate LIKE '2026-01%' OR settlementDate = '2026-02-01') ORDER BY settlementDate ASC")
        rows = cursor.fetchall()
        dates = [r[0] for r in rows if r[0]]
        return {
            "dates": dates,
            "default_delivery_date": "2026-01-16",
            "count": len(dates)
        }
