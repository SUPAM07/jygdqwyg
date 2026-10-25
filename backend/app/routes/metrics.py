from fastapi import APIRouter, Query, HTTPException
from app.analytics import get_summary_metrics, get_diurnal_profile
from app.schemas import SummaryMetricsResponse, DiurnalResponse

router = APIRouter(prefix="/metrics", tags=["Metrics"])

@router.get("/summary", response_model=SummaryMetricsResponse)
def get_metrics_summary(
    start_date: str = Query("2026-01-01", description="Start delivery date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-31", description="End delivery date (YYYY-MM-DD)"),
    gate_closure_hour: int = Query(11, ge=0, le=23, description="Day-Ahead gate closure hour (UTC)")
):
    """
    Returns high-level and daily quantitative forecast accuracy evaluation metrics:
    MAE, RMSE, Bias, NMAE, Error Distribution Quantiles (P10, P50, P90), and Over/Under-forecasting frequency.
    """
    try:
        return get_summary_metrics(
            start_date_str=start_date,
            end_date_str=end_date,
            gate_closure_hour=gate_closure_hour
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute summary metrics: {str(e)}")

@router.get("/diurnal", response_model=DiurnalResponse)
def get_diurnal_metrics(
    start_date: str = Query("2026-01-01", description="Start delivery date (YYYY-MM-DD)"),
    end_date: str = Query("2026-01-31", description="End delivery date (YYYY-MM-DD)"),
    gate_closure_hour: int = Query(11, ge=0, le=23, description="Day-Ahead gate closure hour (UTC)")
):
    """
    Returns diurnal (hourly 0-23 UTC) forecast error distributions and metrics
    to identify the periods of day with greatest renewable uncertainty.
    """
    try:
        return get_diurnal_profile(
            start_date_str=start_date,
            end_date_str=end_date,
            gate_closure_hour=gate_closure_hour
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute diurnal metrics: {str(e)}")
