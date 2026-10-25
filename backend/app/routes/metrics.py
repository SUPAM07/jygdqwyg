from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.analytics import get_summary_metrics, get_diurnal_profile
from app.schemas import SummaryMetricsResponse, DiurnalResponse

router = APIRouter(prefix="/metrics", tags=["Metrics"])

@router.get("/summary", response_model=SummaryMetricsResponse)
def get_metrics_summary(
    start_date: Optional[str] = Query(None, description="Start delivery date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End delivery date (YYYY-MM-DD)"),
    from_date: Optional[str] = Query(None, description="Alias for start_date"),
    to_date: Optional[str] = Query(None, description="Alias for end_date"),
    gate_closure_hour: int = Query(11, ge=0, le=23, description="Day-Ahead gate closure hour (UTC)")
):
    """
    Returns high-level and daily quantitative forecast accuracy evaluation metrics:
    MAE, RMSE, Bias, NMAE, Error Distribution Quantiles (P10, P50, P90), and Over/Under-forecasting frequency.
    """
    s_date = start_date or from_date or "2026-01-01"
    e_date = end_date or to_date or "2026-01-31"

    if s_date > e_date:
        raise HTTPException(status_code=400, detail="start_date must be less than or equal to end_date")

    try:
        return get_summary_metrics(
            start_date_str=s_date,
            end_date_str=e_date,
            gate_closure_hour=gate_closure_hour
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute summary metrics: {str(e)}")

@router.get("/diurnal", response_model=DiurnalResponse)
def get_diurnal_metrics(
    start_date: Optional[str] = Query(None, description="Start delivery date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End delivery date (YYYY-MM-DD)"),
    from_date: Optional[str] = Query(None, description="Alias for start_date"),
    to_date: Optional[str] = Query(None, description="Alias for end_date"),
    gate_closure_hour: int = Query(11, ge=0, le=23, description="Day-Ahead gate closure hour (UTC)")
):
    """
    Returns diurnal (hourly 0-23 UTC) forecast error distributions and metrics
    to identify the periods of day with greatest renewable uncertainty.
    """
    s_date = start_date or from_date or "2026-01-01"
    e_date = end_date or to_date or "2026-01-31"

    if s_date > e_date:
        raise HTTPException(status_code=400, detail="start_date must be less than or equal to end_date")

    try:
        return get_diurnal_profile(
            start_date_str=s_date,
            end_date_str=e_date,
            gate_closure_hour=gate_closure_hour
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute diurnal metrics: {str(e)}")
