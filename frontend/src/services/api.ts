import {
  DayAheadSchedule,
  SummaryMetrics,
  DiurnalResponse,
  VintagesResponse,
  ProcurementSimRequest,
  ProcurementSimResponse,
  HealthStatus,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

export async function fetchAvailableDates(): Promise<{ dates: string[]; default_delivery_date: string; count: number }> {
  const res = await fetch(`${API_BASE}/forecasts/available-dates`);
  if (!res.ok) throw new Error('Failed to fetch available dates');
  return res.json();
}

export async function fetchDayAheadSchedule(
  deliveryDate: string = '2026-01-16',
  gateClosureHour: number = 11,
  resolution: 'hourly' | 'half-hourly' = 'hourly'
): Promise<DayAheadSchedule> {
  const params = new URLSearchParams({
    delivery_date: deliveryDate,
    gate_closure_hour: gateClosureHour.toString(),
    resolution,
  });
  const res = await fetch(`${API_BASE}/forecasts/day-ahead?${params}`);
  if (!res.ok) throw new Error(`Day-Ahead schedule fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSummaryMetrics(
  startDate: string = '2026-01-01',
  endDate: string = '2026-01-31',
  gateClosureHour: number = 11
): Promise<SummaryMetrics> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    gate_closure_hour: gateClosureHour.toString(),
  });
  const res = await fetch(`${API_BASE}/metrics/summary?${params}`);
  if (!res.ok) throw new Error(`Metrics summary fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchDiurnalMetrics(
  startDate: string = '2026-01-01',
  endDate: string = '2026-01-31',
  gateClosureHour: number = 11
): Promise<DiurnalResponse> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    gate_closure_hour: gateClosureHour.toString(),
  });
  const res = await fetch(`${API_BASE}/metrics/diurnal?${params}`);
  if (!res.ok) throw new Error(`Diurnal metrics fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchVintages(deliveryDate: string = '2026-01-16'): Promise<VintagesResponse> {
  const params = new URLSearchParams({ delivery_date: deliveryDate });
  const res = await fetch(`${API_BASE}/forecasts/vintages?${params}`);
  if (!res.ok) throw new Error(`Forecast vintages fetch failed: ${res.statusText}`);
  return res.json();
}

export async function simulateProcurement(req: ProcurementSimRequest): Promise<ProcurementSimResponse> {
  const res = await fetch(`${API_BASE}/procurement/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Procurement simulation failed: ${res.statusText}`);
  return res.json();
}

export async function triggerSync(
  dateFrom: string = '2026-01-01',
  dateTo: string = '2026-01-02',
  signal?: AbortSignal
): Promise<{ status: string; message: string; actuals_synced?: number; forecasts_synced?: number }> {
  const res = await fetch(`${API_BASE}/sync/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date_from: dateFrom, date_to: dateTo }),
    signal,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Sync trigger failed: ${res.statusText}`);
  }
  return res.json();
}
