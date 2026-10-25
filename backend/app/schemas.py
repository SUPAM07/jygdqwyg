from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str
    db_actuals_count: int
    db_forecasts_count: int
    earliest_actual: Optional[str]
    latest_actual: Optional[str]
    earliest_forecast: Optional[str]
    latest_forecast: Optional[str]

class PeriodForecastItem(BaseModel):
    startTime: str
    settlementPeriod: Optional[int] = None
    forecast_mw: float
    forecast_publish_time: str
    actual_mw: Optional[float] = None
    error_mw: Optional[float] = None       # Forecast - Actual (Positive = Overforecast, Negative = Underforecast)
    abs_error_mw: Optional[float] = None   # |Forecast - Actual|
    ape_pct: Optional[float] = None        # Absolute Percentage Error (%)

class DayAheadScheduleResponse(BaseModel):
    delivery_date: str
    decision_date: str
    gate_closure_time: str
    resolution: str
    total_periods: int
    mae_mw: Optional[float] = None
    rmse_mw: Optional[float] = None
    bias_mw: Optional[float] = None
    nmae_pct: Optional[float] = None
    total_actual_mwh: Optional[float] = None
    total_forecast_mwh: Optional[float] = None
    overforecast_count: int = 0
    underforecast_count: int = 0
    periods: List[PeriodForecastItem]

class DailyMetricItem(BaseModel):
    date: str
    hours: int
    mae_mw: float
    rmse_mw: float
    bias_mw: float
    nmae_pct: float
    avg_actual_mw: float
    avg_forecast_mw: float
    peak_actual_mw: float
    peak_forecast_mw: float

class SummaryMetricsResponse(BaseModel):
    start_date: str
    end_date: str
    gate_closure_hour: int
    total_eval_days: int
    total_eval_hours: int
    total_actual_gwh: float
    total_forecast_gwh: float
    aggregate_mae_mw: float
    aggregate_rmse_mw: float
    aggregate_bias_mw: float
    aggregate_nmae_pct: float
    p10_error_mw: float
    p50_error_mw: float
    p90_error_mw: float
    overforecast_frequency_pct: float
    underforecast_frequency_pct: float
    max_overforecast_mw: float
    max_underforecast_mw: float
    daily_metrics: List[DailyMetricItem]

class DiurnalHourItem(BaseModel):
    hour: int
    time_label: str
    mae_mw: float
    rmse_mw: float
    bias_mw: float
    avg_actual_mw: float
    avg_forecast_mw: float
    p10_error_mw: float
    p50_error_mw: float
    p90_error_mw: float

class DiurnalResponse(BaseModel):
    start_date: str
    end_date: str
    gate_closure_hour: int
    hours: List[DiurnalHourItem]

class VintagePeriod(BaseModel):
    startTime: str
    forecast_mw: float
    publishTime: str

class VintageSeries(BaseModel):
    vintage_name: str
    cutoff_time: str
    mae_mw: Optional[float] = None
    periods: List[VintagePeriod]

class VintagesResponse(BaseModel):
    delivery_date: str
    vintages: List[VintageSeries]

class ProcurementSimRequest(BaseModel):
    delivery_date: str = "2026-01-16"
    baseline_demand_mw: float = Field(default=32000.0, description="Base consumer demand MW")
    confidence_level: str = Field(default="P90", description="Buffer risk level: P50, P80, P90, P95")
    gate_closure_hour: int = Field(default=11, description="Day-Ahead gate closure hour UTC")
    thermal_cost_per_mwh: float = Field(default=85.0, description="Day-Ahead thermal power purchase cost £/MWh")
    cashout_penalty_multiplier: float = Field(default=1.8, description="Imbalance System Buy Price penalty multiplier")

class ProcurementPeriodItem(BaseModel):
    startTime: str
    hour: int
    demand_mw: float
    forecast_wind_mw: float
    actual_wind_mw: Optional[float] = None
    safety_buffer_mw: float
    risk_adjusted_wind_mw: float
    naive_thermal_procurement_mw: float
    hedged_thermal_procurement_mw: float
    naive_shortfall_mw: Optional[float] = None
    hedged_shortfall_mw: Optional[float] = None
    estimated_imbalance_saving_gbp: Optional[float] = None

class ProcurementSimResponse(BaseModel):
    delivery_date: str
    confidence_level: str
    baseline_demand_mw: float
    thermal_cost_per_mwh: float
    cashout_penalty_multiplier: float
    total_demand_mwh: float
    total_wind_forecast_mwh: float
    total_wind_actual_mwh: Optional[float] = None
    naive_thermal_procured_mwh: float
    hedged_thermal_procured_mwh: float
    recommended_safety_buffer_avg_mw: float
    total_imbalance_savings_gbp: Optional[float] = None
    periods: List[ProcurementPeriodItem]

class SyncRequest(BaseModel):
    date_from: str = "2026-01-01"
    date_to: str = "2026-01-31"

class SyncResponse(BaseModel):
    status: str
    message: str
    actuals_synced: int
    forecasts_synced: int
