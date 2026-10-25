import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List
from app.analytics import get_day_ahead_schedule, get_diurnal_profile
from app.schemas import (
    ProcurementSimRequest, ProcurementSimResponse, ProcurementPeriodItem
)

# Standard normalized diurnal UK electricity demand shape (multipliers of daily baseline)
# Profiles based on typical National Grid ESO winter daily shape:
# Trough ~04:00 (0.75x), Morning ramp ~08:30 (1.05x), Afternoon plateau (0.98x), Evening peak ~18:00 (1.22x)
UK_WINTER_HOURLY_DEMAND_SHAPE = [
    0.78, 0.75, 0.73, 0.72, 0.74, 0.81,  # 00:00 - 05:00 Night
    0.92, 1.05, 1.08, 1.04, 1.01, 0.99,  # 06:00 - 11:00 Morning Peak
    0.98, 0.97, 0.98, 1.02, 1.12, 1.22,  # 12:00 - 17:00 Evening Peak Ramp
    1.18, 1.10, 1.02, 0.95, 0.88, 0.82   # 18:00 - 23:00 Night Wind Down
]

def simulate_procurement_decision(req: ProcurementSimRequest) -> ProcurementSimResponse:
    """
    Simulate Day-Ahead wholesale power purchase decisions comparing:
    1. Naive Strategy: Procuring thermal power = Demand - Raw Wind Forecast
    2. Quantified Risk-Adjusted Strategy: De-biasing and hedging with empirical safety buffers
    """
    # 1. Fetch Day-Ahead wind forecast for delivery date
    sched = get_day_ahead_schedule(
        delivery_date_str=req.delivery_date,
        gate_closure_hour=req.gate_closure_hour,
        resolution="hourly"
    )
    
    # 2. Fetch diurnal error statistics for January 2026 to extract hourly quantiles
    diurnal = get_diurnal_profile(gate_closure_hour=req.gate_closure_hour)
    diurnal_by_hour = {h.hour: h for h in diurnal.hours}
    
    # Confidence level mapping to quantile percentile
    confidence_pct_map = {
        "P50": 50,
        "P80": 80,
        "P90": 90,
        "P95": 95
    }
    pct_rank = confidence_pct_map.get(req.confidence_level.upper(), 90)
    
    period_results: List[ProcurementPeriodItem] = []
    tot_naive_thermal_mwh = 0.0
    tot_hedged_thermal_mwh = 0.0
    buffers: List[float] = []
    tot_naive_cost = 0.0
    tot_hedged_cost = 0.0
    tot_avoided_penalties = 0.0
    
    # Balancing Mechanism cash-out price (£/MWh)
    sbp_cashout_price = req.thermal_cost_per_mwh * req.cashout_penalty_multiplier
    
    for idx, p in enumerate(sched.periods):
        hour = idx % 24
        # Calculate hourly consumer demand using profile
        demand_factor = UK_WINTER_HOURLY_DEMAND_SHAPE[hour]
        demand_mw = round(req.baseline_demand_mw * demand_factor, 1)
        
        forecast_wind = p.forecast_mw
        actual_wind = p.actual_mw
        
        # Calculate empirical safety buffer for this hour
        dh = diurnal_by_hour.get(hour)
        if dh:
            if pct_rank == 50:
                buffer_mw = max(0.0, dh.p50_error_mw)
            elif pct_rank <= 80:
                buffer_mw = max(0.0, dh.p50_error_mw + 0.6 * (dh.p90_error_mw - dh.p50_error_mw))
            elif pct_rank == 90:
                buffer_mw = max(0.0, dh.p90_error_mw)
            else:  # P95
                buffer_mw = max(0.0, dh.p90_error_mw * 1.15)
        else:
            buffer_mw = 1000.0  # Conservative fallback
            
        buffer_mw = round(buffer_mw, 1)
        buffers.append(buffer_mw)
        
        # Risk-adjusted wind expectation (forecast minus downside uncertainty)
        risk_adj_wind = round(max(0.0, forecast_wind - buffer_mw), 1)
        
        # 1. Naive procurement: Procures only (Demand - Forecast)
        naive_thermal = round(max(0.0, demand_mw - forecast_wind), 1)
        
        # 2. Hedged procurement: Procures (Demand - Risk-Adjusted Wind)
        hedged_thermal = round(max(0.0, demand_mw - risk_adj_wind), 1)
        
        tot_naive_thermal_mwh += naive_thermal
        tot_hedged_thermal_mwh += hedged_thermal
        
        # Imbalance outcomes when actual wind is known
        naive_shortfall = None
        hedged_shortfall = None
        saving_gbp = None
        
        if actual_wind is not None:
            # Under-delivery = Demand - (Thermal Procured + Actual Wind)
            naive_shortfall = round(max(0.0, demand_mw - (naive_thermal + actual_wind)), 1)
            hedged_shortfall = round(max(0.0, demand_mw - (hedged_thermal + actual_wind)), 1)
            
            # Avoided cash-out penalties on shortfall
            avoided_penalty = (naive_shortfall - hedged_shortfall) * sbp_cashout_price
            tot_avoided_penalties += max(0.0, avoided_penalty)

            # Cashout penalty difference:
            naive_cost = (naive_thermal * req.thermal_cost_per_mwh) + (naive_shortfall * sbp_cashout_price)
            hedged_cost = (hedged_thermal * req.thermal_cost_per_mwh) + (hedged_shortfall * sbp_cashout_price)
            
            tot_naive_cost += naive_cost
            tot_hedged_cost += hedged_cost
            
            saving_gbp = round(naive_cost - hedged_cost, 2)
            
        period_results.append(ProcurementPeriodItem(
            startTime=p.startTime,
            hour=hour,
            demand_mw=demand_mw,
            forecast_wind_mw=forecast_wind,
            actual_wind_mw=actual_wind,
            safety_buffer_mw=buffer_mw,
            risk_adjusted_wind_mw=risk_adj_wind,
            naive_thermal_procurement_mw=naive_thermal,
            hedged_thermal_procurement_mw=hedged_thermal,
            naive_shortfall_mw=naive_shortfall,
            hedged_shortfall_mw=hedged_shortfall,
            estimated_imbalance_saving_gbp=saving_gbp
        ))
        
    avg_buffer = round(float(np.mean(buffers)), 1) if buffers else 0.0
    tot_demand_mwh = round(sum(p.demand_mw for p in period_results), 1)
    tot_wind_fcst_mwh = round(sum(p.forecast_wind_mw for p in period_results), 1)
    tot_wind_act_mwh = round(sum(p.actual_wind_mw for p in period_results if p.actual_wind_mw is not None), 1) if sched.total_actual_mwh is not None else None
    
    net_savings = round(tot_naive_cost - tot_hedged_cost, 2) if sched.total_actual_mwh is not None else None
    gross_avoided = round(tot_avoided_penalties, 2) if sched.total_actual_mwh is not None else None

    return ProcurementSimResponse(
        delivery_date=req.delivery_date,
        confidence_level=req.confidence_level.upper(),
        baseline_demand_mw=req.baseline_demand_mw,
        thermal_cost_per_mwh=req.thermal_cost_per_mwh,
        cashout_penalty_multiplier=req.cashout_penalty_multiplier,
        total_demand_mwh=tot_demand_mwh,
        total_wind_forecast_mwh=tot_wind_fcst_mwh,
        total_wind_actual_mwh=tot_wind_act_mwh,
        naive_thermal_procured_mwh=round(tot_naive_thermal_mwh, 1),
        hedged_thermal_procured_mwh=round(tot_hedged_thermal_mwh, 1),
        recommended_safety_buffer_avg_mw=avg_buffer,
        total_avoided_penalties_gbp=gross_avoided,
        total_imbalance_savings_gbp=net_savings,
        periods=period_results
    )
