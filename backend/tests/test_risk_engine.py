import pytest
from app.risk_engine import simulate_procurement_decision
from app.schemas import ProcurementSimRequest

def test_procurement_simulation_basic():
    req = ProcurementSimRequest(
        delivery_date="2026-01-16",
        baseline_demand_mw=30000.0,
        confidence_level="P90",
        gate_closure_hour=11,
        thermal_cost_per_mwh=85.0,
        cashout_penalty_multiplier=1.8
    )
    res = simulate_procurement_decision(req)
    assert res.delivery_date == "2026-01-16"
    assert res.confidence_level == "P90"
    assert len(res.periods) == 24
    assert res.recommended_safety_buffer_avg_mw > 0
    # Hedged thermal procurement should be higher than or equal to naive procurement to protect against wind drop
    assert res.hedged_thermal_procured_mwh >= res.naive_thermal_procured_mwh
    for p in res.periods:
        assert p.risk_adjusted_wind_mw <= p.forecast_wind_mw
        assert p.hedged_thermal_procurement_mw >= p.naive_thermal_procurement_mw
