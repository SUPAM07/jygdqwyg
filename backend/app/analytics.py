import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from app.database import get_db_connection
from app.schemas import (
    DayAheadScheduleResponse, PeriodForecastItem,
    SummaryMetricsResponse, DailyMetricItem,
    DiurnalResponse, DiurnalHourItem,
    VintagesResponse, VintageSeries, VintagePeriod
)

def compute_metrics(errors: pd.Series, actuals: pd.Series) -> Tuple[float, float, float, float]:
    """Calculate MAE, RMSE, Bias, and Normalized MAE (%)"""
    if len(errors) == 0:
        return 0.0, 0.0, 0.0, 0.0
    mae = float(errors.abs().mean())
    rmse = float(np.sqrt((errors**2).mean()))
    bias = float(errors.mean())
    mean_actual = float(actuals.mean()) if len(actuals) > 0 and actuals.mean() > 0 else 1.0
    nmae = float((mae / mean_actual) * 100)
    return round(mae, 2), round(rmse, 2), round(bias, 2), round(nmae, 2)

def get_day_ahead_schedule(
    delivery_date_str: str,
    gate_closure_hour: int = 11,
    resolution: str = "hourly"
) -> DayAheadScheduleResponse:
    """
    Retrieve the latest wind forecast available at the Day-Ahead decision cutoff
    for each period of the specified delivery day, aligned with actual outturns.
    """
    deliv_date = pd.to_datetime(delivery_date_str).tz_localize("UTC") if pd.to_datetime(delivery_date_str).tz is None else pd.to_datetime(delivery_date_str)
    decision_date = deliv_date - timedelta(days=1)
    cutoff_dt = decision_date.replace(hour=gate_closure_hour, minute=0, second=0, microsecond=0)
    
    deliv_start_dt = deliv_date.replace(hour=0, minute=0, second=0, microsecond=0)
    deliv_end_dt = deliv_date.replace(hour=23, minute=59, second=59, microsecond=0)
    
    cutoff_iso = cutoff_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    deliv_start_iso = deliv_start_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    deliv_end_iso = deliv_end_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    
    with get_db_connection() as conn:
        # 1. Fetch latest forecast on or before cutoff for delivery day
        query_fcst = """
        SELECT f.startTime, f.publishTime, f.generation
        FROM forecasts f
        INNER JOIN (
            SELECT startTime, MAX(publishTime) as maxPub
            FROM forecasts
            WHERE publishTime <= ?
              AND startTime >= ?
              AND startTime <= ?
            GROUP BY startTime
        ) latest ON f.startTime = latest.startTime AND f.publishTime = latest.maxPub
        ORDER BY f.startTime ASC
        """
        df_fcst = pd.read_sql_query(query_fcst, conn, params=(cutoff_iso, deliv_start_iso, deliv_end_iso))
        
        # 2. Fetch actuals for delivery day
        query_act = """
        SELECT startTime, settlementDate, settlementPeriod, generation
        FROM actuals
        WHERE startTime >= ? AND startTime <= ?
        ORDER BY startTime ASC
        """
        df_act = pd.read_sql_query(query_act, conn, params=(deliv_start_iso, deliv_end_iso))
    
    if df_fcst.empty:
        return DayAheadScheduleResponse(
            delivery_date=delivery_date_str,
            decision_date=decision_date.strftime("%Y-%m-%d"),
            gate_closure_time=cutoff_iso,
            resolution=resolution,
            total_periods=0,
            periods=[]
        )
    
    df_fcst["startTime_dt"] = pd.to_datetime(df_fcst["startTime"], utc=True)
    df_act["startTime_dt"] = pd.to_datetime(df_act["startTime"], utc=True)
    
    period_items: List[PeriodForecastItem] = []
    
    if resolution == "half-hourly":
        # Expand each hourly forecast to the two corresponding half-hourly settlement periods
        expanded_fcst = []
        for _, row in df_fcst.iterrows():
            st = row["startTime_dt"]
            expanded_fcst.append({
                "startTime_dt": st,
                "forecast_mw": float(row["generation"]),
                "publishTime": row["publishTime"]
            })
            expanded_fcst.append({
                "startTime_dt": st + timedelta(minutes=30),
                "forecast_mw": float(row["generation"]),
                "publishTime": row["publishTime"]
            })
        df_fcst_aligned = pd.DataFrame(expanded_fcst)
        merged = pd.merge(df_fcst_aligned, df_act, on="startTime_dt", how="outer")
        merged = merged.sort_values("startTime_dt")
        
        for _, r in merged.iterrows():
            st_iso = r["startTime_dt"].strftime("%Y-%m-%dT%H:%M:%SZ")
            fcst_val = float(r["forecast_mw"]) if pd.notnull(r["forecast_mw"]) else None
            act_val = float(r["generation"]) if pd.notnull(r["generation"]) else None
            pub_time = str(r["publishTime"]) if pd.notnull(r["publishTime"]) else ""
            sp = int(r["settlementPeriod"]) if pd.notnull(r["settlementPeriod"]) else None
            
            err = round(fcst_val - act_val, 2) if (fcst_val is not None and act_val is not None) else None
            abs_err = round(abs(err), 2) if err is not None else None
            ape = round((abs_err / act_val) * 100, 2) if (abs_err is not None and act_val and act_val > 0) else None
            
            if fcst_val is not None:
                period_items.append(PeriodForecastItem(
                    startTime=st_iso,
                    settlementPeriod=sp,
                    forecast_mw=fcst_val,
                    forecast_publish_time=pub_time,
                    actual_mw=act_val,
                    error_mw=err,
                    abs_error_mw=abs_err,
                    ape_pct=ape
                ))
    else:
        # Default: Hourly resolution (matches WINDFOR native output)
        df_act["hour_bucket"] = df_act["startTime_dt"].dt.floor("h")
        act_hourly = df_act.groupby("hour_bucket").agg({
            "generation": "mean",
            "settlementPeriod": "min"
        }).reset_index().rename(columns={"hour_bucket": "startTime_dt", "generation": "actual_mw"})
        
        merged = pd.merge(df_fcst, act_hourly, on="startTime_dt", how="left")
        merged = merged.sort_values("startTime_dt")
        
        for _, r in merged.iterrows():
            st_iso = r["startTime_dt"].strftime("%Y-%m-%dT%H:%M:%SZ")
            fcst_val = float(r["generation"])
            act_val = float(r["actual_mw"]) if pd.notnull(r["actual_mw"]) else None
            pub_time = str(r["publishTime"])
            
            err = round(fcst_val - act_val, 2) if act_val is not None else None
            abs_err = round(abs(err), 2) if err is not None else None
            ape = round((abs_err / act_val) * 100, 2) if (abs_err is not None and act_val and act_val > 0) else None
            
            period_items.append(PeriodForecastItem(
                startTime=st_iso,
                settlementPeriod=int(r["settlementPeriod"]) if pd.notnull(r["settlementPeriod"]) else None,
                forecast_mw=fcst_val,
                forecast_publish_time=pub_time,
                actual_mw=act_val,
                error_mw=err,
                abs_error_mw=abs_err,
                ape_pct=ape
            ))
            
    # Calculate daily aggregate statistics
    valid_pairs = [p for p in period_items if p.error_mw is not None]
    mae, rmse, bias, nmae = None, None, None, None
    tot_act_mwh, tot_fcst_mwh = None, None
    over_cnt, under_cnt = 0, 0
    
    if valid_pairs:
        errs = pd.Series([p.error_mw for p in valid_pairs])
        acts = pd.Series([p.actual_mw for p in valid_pairs])
        mae, rmse, bias, nmae = compute_metrics(errs, acts)
        mult = 0.5 if resolution == "half-hourly" else 1.0
        tot_act_mwh = round(sum(p.actual_mw for p in valid_pairs) * mult, 1)
        tot_fcst_mwh = round(sum(p.forecast_mw for p in valid_pairs) * mult, 1)
        over_cnt = sum(1 for p in valid_pairs if p.error_mw > 0)
        under_cnt = sum(1 for p in valid_pairs if p.error_mw < 0)
        
    return DayAheadScheduleResponse(
        delivery_date=delivery_date_str,
        decision_date=decision_date.strftime("%Y-%m-%d"),
        gate_closure_time=cutoff_iso,
        resolution=resolution,
        total_periods=len(period_items),
        mae_mw=mae,
        rmse_mw=rmse,
        bias_mw=bias,
        nmae_pct=nmae,
        total_actual_mwh=tot_act_mwh,
        total_forecast_mwh=tot_fcst_mwh,
        overforecast_count=over_cnt,
        underforecast_count=under_cnt,
        periods=period_items
    )

def get_summary_metrics(
    start_date_str: str = "2026-01-01",
    end_date_str: str = "2026-01-31",
    gate_closure_hour: int = 11
) -> SummaryMetricsResponse:
    """
    Evaluate quantitative forecast accuracy across all purchase decisions
    in the selected period.
    """
    dates = pd.date_range(start_date_str, end_date_str, freq="D")
    daily_items: List[DailyMetricItem] = []
    all_errors: List[float] = []
    all_actuals: List[float] = []
    all_forecasts: List[float] = []
    
    for d in dates:
        d_str = d.strftime("%Y-%m-%d")
        sched = get_day_ahead_schedule(d_str, gate_closure_hour=gate_closure_hour, resolution="hourly")
        valid_periods = [p for p in sched.periods if p.error_mw is not None]
        if not valid_periods:
            continue
        
        d_errs = pd.Series([p.error_mw for p in valid_periods])
        d_acts = pd.Series([p.actual_mw for p in valid_periods])
        d_fcsts = pd.Series([p.forecast_mw for p in valid_periods])
        
        all_errors.extend(d_errs.tolist())
        all_actuals.extend(d_acts.tolist())
        all_forecasts.extend(d_fcsts.tolist())
        
        daily_items.append(DailyMetricItem(
            date=d_str,
            hours=len(valid_periods),
            mae_mw=sched.mae_mw or 0.0,
            rmse_mw=sched.rmse_mw or 0.0,
            bias_mw=sched.bias_mw or 0.0,
            nmae_pct=sched.nmae_pct or 0.0,
            avg_actual_mw=round(float(d_acts.mean()), 1),
            avg_forecast_mw=round(float(d_fcsts.mean()), 1),
            peak_actual_mw=round(float(d_acts.max()), 1),
            peak_forecast_mw=round(float(d_fcsts.max()), 1)
        ))
        
    s_errs = pd.Series(all_errors) if all_errors else pd.Series([0.0])
    s_acts = pd.Series(all_actuals) if all_actuals else pd.Series([1.0])
    s_fcsts = pd.Series(all_forecasts) if all_forecasts else pd.Series([0.0])
    
    agg_mae, agg_rmse, agg_bias, agg_nmae = compute_metrics(s_errs, s_acts)
    
    p10 = round(float(np.percentile(s_errs, 10)), 1)
    p50 = round(float(np.percentile(s_errs, 50)), 1)
    p90 = round(float(np.percentile(s_errs, 90)), 1)
    
    over_freq = round(float((s_errs > 0).mean() * 100), 1)
    under_freq = round(float((s_errs < 0).mean() * 100), 1)
    
    tot_act_gwh = round(float(s_acts.sum() / 1000.0), 2)
    tot_fcst_gwh = round(float(s_fcsts.sum() / 1000.0), 2)
    
    return SummaryMetricsResponse(
        start_date=start_date_str,
        end_date=end_date_str,
        gate_closure_hour=gate_closure_hour,
        total_eval_days=len(daily_items),
        total_eval_hours=len(all_errors),
        total_actual_gwh=tot_act_gwh,
        total_forecast_gwh=tot_fcst_gwh,
        aggregate_mae_mw=agg_mae,
        aggregate_rmse_mw=agg_rmse,
        aggregate_bias_mw=agg_bias,
        aggregate_nmae_pct=agg_nmae,
        p10_error_mw=p10,
        p50_error_mw=p50,
        p90_error_mw=p90,
        overforecast_frequency_pct=over_freq,
        underforecast_frequency_pct=under_freq,
        max_overforecast_mw=round(float(s_errs.max()), 1),
        max_underforecast_mw=round(float(s_errs.min()), 1),
        daily_metrics=daily_items
    )

def get_diurnal_profile(
    start_date_str: str = "2026-01-01",
    end_date_str: str = "2026-01-31",
    gate_closure_hour: int = 11
) -> DiurnalResponse:
    """
    Compute forecast error characteristics grouped by hour of the day (0-23 UTC).
    Identifies diurnal error patterns (e.g. morning ramp vs evening peak).
    """
    summary = get_summary_metrics(start_date_str, end_date_str, gate_closure_hour)
    dates = [d.date for d in summary.daily_metrics]
    
    hour_buckets: Dict[int, List[Dict[str, float]]] = {h: [] for h in range(24)}
    
    for d_str in dates:
        sched = get_day_ahead_schedule(d_str, gate_closure_hour=gate_closure_hour, resolution="hourly")
        for p in sched.periods:
            if p.error_mw is not None:
                dt = pd.to_datetime(p.startTime)
                hour_buckets[dt.hour].append({
                    "error": p.error_mw,
                    "actual": p.actual_mw or 0.0,
                    "forecast": p.forecast_mw
                })
                
    diurnal_items: List[DiurnalHourItem] = []
    for h in range(24):
        rows = hour_buckets[h]
        if rows:
            df_h = pd.DataFrame(rows)
            mae = round(float(df_h["error"].abs().mean()), 1)
            rmse = round(float(np.sqrt((df_h["error"]**2).mean())), 1)
            bias = round(float(df_h["error"].mean()), 1)
            p10 = round(float(np.percentile(df_h["error"], 10)), 1)
            p50 = round(float(np.percentile(df_h["error"], 50)), 1)
            p90 = round(float(np.percentile(df_h["error"], 90)), 1)
            avg_act = round(float(df_h["actual"].mean()), 1)
            avg_fcst = round(float(df_h["forecast"].mean()), 1)
        else:
            mae, rmse, bias, p10, p50, p90, avg_act, avg_fcst = 0, 0, 0, 0, 0, 0, 0, 0
            
        diurnal_items.append(DiurnalHourItem(
            hour=h,
            time_label=f"{h:02d}:00",
            mae_mw=mae,
            rmse_mw=rmse,
            bias_mw=bias,
            avg_actual_mw=avg_act,
            avg_forecast_mw=avg_fcst,
            p10_error_mw=p10,
            p50_error_mw=p50,
            p90_error_mw=p90
        ))
        
    return DiurnalResponse(
        start_date=start_date_str,
        end_date=end_date_str,
        gate_closure_hour=gate_closure_hour,
        hours=diurnal_items
    )

def get_forecast_vintages(delivery_date_str: str) -> VintagesResponse:
    """
    Fetch forecast vintages for a given delivery day at key milestone lead times:
    - 48h Ahead (D-2 11:00 UTC)
    - 24h Ahead (D-1 11:00 UTC - Standard Day-Ahead Gate Closure)
    - 14h Ahead (D-1 21:00 UTC - Intraday Evening)
    - 6h Ahead  (D-0 05:00 UTC - Dawn of Delivery)
    """
    deliv_dt = pd.to_datetime(delivery_date_str).tz_localize("UTC") if pd.to_datetime(delivery_date_str).tz is None else pd.to_datetime(delivery_date_str)
    
    milestones = [
        {"name": "48h Ahead (D-2 11:00)", "cutoff": (deliv_dt - timedelta(days=2)).replace(hour=11, minute=0, second=0)},
        {"name": "24h Ahead (D-1 11:00 Day-Ahead Gate)", "cutoff": (deliv_dt - timedelta(days=1)).replace(hour=11, minute=0, second=0)},
        {"name": "14h Ahead (D-1 21:00 Evening)", "cutoff": (deliv_dt - timedelta(days=1)).replace(hour=21, minute=0, second=0)},
        {"name": "6h Ahead (D-0 05:00 Dawn)", "cutoff": deliv_dt.replace(hour=5, minute=0, second=0)},
    ]
    
    deliv_start_iso = deliv_dt.replace(hour=0, minute=0, second=0).strftime("%Y-%m-%dT%H:%M:%SZ")
    deliv_end_iso = deliv_dt.replace(hour=23, minute=59, second=59).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    vintages: List[VintageSeries] = []
    with get_db_connection() as conn:
        for m in milestones:
            cutoff_iso = m["cutoff"].strftime("%Y-%m-%dT%H:%M:%SZ")
            query = """
            SELECT f.startTime, f.publishTime, f.generation
            FROM forecasts f
            INNER JOIN (
                SELECT startTime, MAX(publishTime) as maxPub
                FROM forecasts
                WHERE publishTime <= ?
                  AND startTime >= ?
                  AND startTime <= ?
                GROUP BY startTime
            ) latest ON f.startTime = latest.startTime AND f.publishTime = latest.maxPub
            ORDER BY f.startTime ASC
            """
            df = pd.read_sql_query(query, conn, params=(cutoff_iso, deliv_start_iso, deliv_end_iso))
            periods = [
                VintagePeriod(
                    startTime=r["startTime"],
                    forecast_mw=float(r["generation"]),
                    publishTime=r["publishTime"]
                )
                for _, r in df.iterrows()
            ]
            vintages.append(VintageSeries(
                vintage_name=m["name"],
                cutoff_time=cutoff_iso,
                periods=periods
            ))
            
    return VintagesResponse(
        delivery_date=delivery_date_str,
        vintages=vintages
    )
