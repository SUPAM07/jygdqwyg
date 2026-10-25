from fastapi import APIRouter, HTTPException
from app.risk_engine import simulate_procurement_decision
from app.schemas import ProcurementSimRequest, ProcurementSimResponse

router = APIRouter(prefix="/procurement", tags=["Procurement Simulator"])

@router.post("/simulate", response_model=ProcurementSimResponse)
def simulate_procurement(req: ProcurementSimRequest):
    """
    Simulate Day-Ahead wholesale power procurement using quantified forecast errors.
    Calculates safety buffer recommendations, risk-adjusted wind credits, and imbalance penalty savings.
    """
    try:
        return simulate_procurement_decision(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Procurement simulation failed: {str(e)}")

@router.get("/default-config")
def get_default_config():
    """
    Returns default market parameters for UK utility power procurement.
    """
    return {
        "delivery_date": "2026-01-16",
        "baseline_demand_mw": 32000.0,
        "confidence_level": "P90",
        "gate_closure_hour": 11,
        "thermal_cost_per_mwh": 85.0,
        "cashout_penalty_multiplier": 1.8
    }
