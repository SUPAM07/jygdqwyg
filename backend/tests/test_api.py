import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/api")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"

    # Also test SPA root serving
    spa_resp = client.get("/")
    assert spa_resp.status_code == 200

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["actuals_count"] > 0
    assert data["forecasts_count"] > 0

def test_get_day_ahead_schedule():
    response = client.get("/api/forecasts/day-ahead?delivery_date=2026-01-16&gate_closure_hour=11&resolution=hourly")
    assert response.status_code == 200
    data = response.json()
    assert data["delivery_date"] == "2026-01-16"
    assert data["total_periods"] == 24
    assert len(data["periods"]) == 24
    assert "mae_mw" in data
    assert "rmse_mw" in data

def test_get_metrics_summary():
    response = client.get("/api/metrics/summary?start_date=2026-01-01&end_date=2026-01-10&gate_closure_hour=11")
    assert response.status_code == 200
    data = response.json()
    assert data["total_eval_days"] == 10
    assert "aggregate_mae_mw" in data
    assert "p90_error_mw" in data

def test_get_diurnal_metrics():
    response = client.get("/api/metrics/diurnal?start_date=2026-01-01&end_date=2026-01-10&gate_closure_hour=11")
    assert response.status_code == 200
    data = response.json()
    assert len(data["hours"]) == 24

def test_procurement_simulation_endpoint():
    payload = {
        "delivery_date": "2026-01-16",
        "baseline_demand_mw": 32000,
        "confidence_level": "P90",
        "gate_closure_hour": 11,
        "thermal_cost_per_mwh": 85.0,
        "cashout_penalty_multiplier": 1.8
    }
    response = client.post("/api/procurement/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["delivery_date"] == "2026-01-16"
    assert len(data["periods"]) == 24
    assert data["naive_thermal_procured_mwh"] > 0
