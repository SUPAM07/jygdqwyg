import pytest
import pandas as pd
import numpy as np
from app.analytics import compute_metrics, get_day_ahead_schedule, get_summary_metrics

def test_compute_metrics_basic():
    # Test with known errors: 10, -10, 20, -20
    # Mean actual = 100
    # MAE should be (10+10+20+20)/4 = 15.0
    # RMSE should be sqrt((100+100+400+400)/4) = sqrt(250) = 15.81
    # Bias should be (10-10+20-20)/4 = 0.0
    # NMAE should be (15 / 100) * 100 = 15.0%
    errors = pd.Series([10.0, -10.0, 20.0, -20.0])
    actuals = pd.Series([100.0, 100.0, 100.0, 100.0])
    
    mae, rmse, bias, nmae = compute_metrics(errors, actuals)
    assert mae == 15.0
    assert rmse == 15.81
    assert bias == 0.0
    assert nmae == 15.0

def test_compute_metrics_positive_bias():
    # Systematic over-forecasting: errors all positive
    errors = pd.Series([100.0, 200.0, 300.0])
    actuals = pd.Series([1000.0, 1000.0, 1000.0])
    
    mae, rmse, bias, nmae = compute_metrics(errors, actuals)
    assert mae == 200.0
    assert bias == 200.0
    assert nmae == 20.0

def test_day_ahead_schedule_retrieval():
    # Retrieve Day-Ahead schedule for Jan 16, 2026
    sched = get_day_ahead_schedule("2026-01-16", gate_closure_hour=11, resolution="hourly")
    assert sched.delivery_date == "2026-01-16"
    assert sched.decision_date == "2026-01-15"
    assert sched.total_periods == 24
    assert len(sched.periods) == 24
    assert sched.mae_mw is not None
    assert sched.mae_mw > 0
    assert sched.rmse_mw is not None
    assert sched.rmse_mw >= sched.mae_mw  # Mathematical guarantee: RMSE >= MAE

def test_day_ahead_schedule_half_hourly():
    # Retrieve Half-Hourly schedule for Jan 16, 2026
    sched_hh = get_day_ahead_schedule("2026-01-16", gate_closure_hour=11, resolution="half-hourly")
    assert sched_hh.resolution == "half-hourly"
    assert sched_hh.total_periods == 48
    assert len(sched_hh.periods) == 48

def test_summary_metrics_january():
    # Summary across first 7 days
    summary = get_summary_metrics("2026-01-01", "2026-01-07", gate_closure_hour=11)
    assert summary.total_eval_days == 7
    assert summary.aggregate_mae_mw > 0
    assert summary.aggregate_rmse_mw > 0
    assert summary.p90_error_mw >= summary.p50_error_mw
    assert summary.p50_error_mw >= summary.p10_error_mw
    assert len(summary.daily_metrics) == 7
