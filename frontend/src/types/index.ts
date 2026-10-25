export interface PeriodForecastItem {
  startTime: string;
  settlementPeriod?: number | null;
  forecast_mw: number;
  forecast_publish_time: string;
  actual_mw?: number | null;
  error_mw?: number | null;
  abs_error_mw?: number | null;
  ape_pct?: number | null;
}

export interface DayAheadSchedule {
  delivery_date: string;
  decision_date: string;
  gate_closure_time: string;
  resolution: 'hourly' | 'half-hourly';
  total_periods: number;
  mae_mw?: number | null;
  rmse_mw?: number | null;
  bias_mw?: number | null;
  nmae_pct?: number | null;
  total_actual_mwh?: number | null;
  total_forecast_mwh?: number | null;
  overforecast_count: number;
  underforecast_count: number;
  periods: PeriodForecastItem[];
}

export interface DailyMetricItem {
  date: string;
  hours: number;
  mae_mw: number;
  rmse_mw: number;
  bias_mw: number;
  nmae_pct: number;
  avg_actual_mw: number;
  avg_forecast_mw: number;
  peak_actual_mw: number;
  peak_forecast_mw: number;
}

export interface SummaryMetrics {
  start_date: string;
  end_date: string;
  gate_closure_hour: number;
  total_eval_days: number;
  total_eval_hours: number;
  total_actual_gwh: number;
  total_forecast_gwh: number;
  aggregate_mae_mw: number;
  aggregate_rmse_mw: number;
  aggregate_bias_mw: number;
  aggregate_nmae_pct: number;
  p10_error_mw: number;
  p50_error_mw: number;
  p90_error_mw: number;
  overforecast_frequency_pct: number;
  underforecast_frequency_pct: number;
  max_overforecast_mw: number;
  max_underforecast_mw: number;
  daily_metrics: DailyMetricItem[];
}

export interface DiurnalHourItem {
  hour: number;
  time_label: string;
  mae_mw: number;
  rmse_mw: number;
  bias_mw: number;
  avg_actual_mw: number;
  avg_forecast_mw: number;
  p10_error_mw: number;
  p50_error_mw: number;
  p90_error_mw: number;
}

export interface DiurnalResponse {
  start_date: string;
  end_date: string;
  gate_closure_hour: number;
  hours: DiurnalHourItem[];
}

export interface VintagePeriod {
  startTime: string;
  forecast_mw: number;
  publishTime: string;
}

export interface VintageSeries {
  vintage_name: string;
  cutoff_time: string;
  periods: VintagePeriod[];
}

export interface VintagesResponse {
  delivery_date: string;
  vintages: VintageSeries[];
}

export interface ProcurementSimRequest {
  delivery_date: string;
  baseline_demand_mw: number;
  confidence_level: 'P50' | 'P80' | 'P90' | 'P95';
  gate_closure_hour: number;
  thermal_cost_per_mwh: number;
  cashout_penalty_multiplier: number;
}

export interface ProcurementPeriodItem {
  startTime: string;
  hour: number;
  demand_mw: number;
  forecast_wind_mw: number;
  actual_wind_mw?: number | null;
  safety_buffer_mw: number;
  risk_adjusted_wind_mw: number;
  naive_thermal_procurement_mw: number;
  hedged_thermal_procurement_mw: number;
  naive_shortfall_mw?: number | null;
  hedged_shortfall_mw?: number | null;
  estimated_imbalance_saving_gbp?: number | null;
}

export interface ProcurementSimResponse {
  delivery_date: string;
  confidence_level: string;
  baseline_demand_mw: number;
  thermal_cost_per_mwh: number;
  cashout_penalty_multiplier: number;
  total_demand_mwh: number;
  total_wind_forecast_mwh: number;
  total_wind_actual_mwh?: number | null;
  naive_thermal_procured_mwh: number;
  hedged_thermal_procured_mwh: number;
  recommended_safety_buffer_avg_mw: number;
  total_imbalance_savings_gbp?: number | null;
  periods: ProcurementPeriodItem[];
}

export interface HealthStatus {
  status: string;
  database: string;
  actuals_count: number;
  earliest_actual: string;
  latest_actual: string;
  forecasts_count: number;
  earliest_forecast: string;
  latest_forecast: string;
}
