import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  AlertTriangle,
  TrendingUp,
  Sliders,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { DayAheadSchedule } from '../types';
import { fetchDayAheadSchedule } from '../services/api';

ChartJS.register(...registerables);

interface DayAheadViewerProps {
  availableDates: string[];
}

export const DayAheadViewer: React.FC<DayAheadViewerProps> = ({ availableDates }) => {
  const [deliveryDate, setDeliveryDate] = useState<string>('2026-01-16');
  const [gateClosureHour, setGateClosureHour] = useState<number>(11);
  const [resolution, setResolution] = useState<'hourly' | 'half-hourly'>('hourly');
  const [schedule, setSchedule] = useState<DayAheadSchedule | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchDayAheadSchedule(deliveryDate, gateClosureHour, resolution)
      .then((data) => {
        if (isMounted) {
          setSchedule(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load day-ahead data');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [deliveryDate, gateClosureHour, resolution]);

  const handlePrevDay = () => {
    const idx = availableDates.indexOf(deliveryDate);
    if (idx > 0) {
      setDeliveryDate(availableDates[idx - 1]);
    }
  };

  const handleNextDay = () => {
    const idx = availableDates.indexOf(deliveryDate);
    if (idx >= 0 && idx < availableDates.length - 1) {
      setDeliveryDate(availableDates[idx + 1]);
    }
  };

  const exportCSV = () => {
    if (!schedule || !schedule.periods.length) return;
    const headers = [
      'Target Time (UTC)',
      'Settlement Period',
      'Forecast (MW)',
      'Forecast Publish Time (UTC)',
      'Actual Generation (MW)',
      'Error (Forecast - Actual MW)',
      'Abs Error (MW)',
      'APE (%)'
    ];
    const rows = schedule.periods.map((p) => [
      p.startTime,
      p.settlementPeriod ?? '',
      p.forecast_mw,
      p.forecast_publish_time,
      p.actual_mw ?? '',
      p.error_mw ?? '',
      p.abs_error_mw ?? '',
      p.ape_pct ?? ''
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `aerotrade_day_ahead_${deliveryDate}_gate${gateClosureHour}h_${resolution}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prepare Chart.js dataset
  const chartLabels = schedule?.periods.map((p) => {
    const d = new Date(p.startTime);
    return resolution === 'half-hourly'
      ? `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')} (SP ${p.settlementPeriod ?? ''})`
      : `${d.getUTCHours().toString().padStart(2, '0')}:00`;
  }) || [];

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        type: 'line' as const,
        label: `Day-Ahead Forecast (Cut-off ${gateClosureHour}:00 UTC D-1)`,
        data: schedule?.periods.map((p) => p.forecast_mw) || [],
        borderColor: '#00f2fe',
        backgroundColor: 'rgba(0, 242, 254, 0.08)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: resolution === 'half-hourly' ? 1.5 : 3.5,
        pointBackgroundColor: '#00f2fe',
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: 'Actual Outturn Generation (BMRS FUELHH)',
        data: schedule?.periods.map((p) => p.actual_mw ?? null) || [],
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        borderDash: [4, 4],
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: resolution === 'half-hourly' ? 1.5 : 3.5,
        pointBackgroundColor: '#10b981',
        yAxisID: 'y',
      },
      {
        type: 'bar' as const,
        label: 'Forecast Error (Delta MW)',
        data: schedule?.periods.map((p) => p.error_mw ?? 0) || [],
        backgroundColor: (context: any) => {
          const val = context.raw;
          return val > 0 ? 'rgba(245, 158, 11, 0.55)' : 'rgba(168, 85, 247, 0.55)';
        },
        borderColor: (context: any) => {
          const val = context.raw;
          return val > 0 ? '#f59e0b' : '#a855f7';
        },
        borderWidth: 1,
        borderRadius: 3,
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#cbd5e1',
          font: { family: 'Inter', size: 12 },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 18,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(0, 242, 254, 0.3)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const val = context.parsed.y;
            if (val === null || val === undefined) return `${label}: N/A`;
            return `${label}: ${Math.round(val).toLocaleString()} MW`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 11 }, maxRotation: 45 },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Generation Power (MW)',
          color: '#94a3b8',
          font: { family: 'Inter', size: 12 },
        },
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 11 } },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Forecast Error Delta (MW)',
          color: '#94a3b8',
          font: { family: 'Inter', size: 12 },
        },
        grid: { drawOnChartArea: false },
        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 11 } },
      },
    },
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Filter and Controls Bar */}
      <div className="glass-panel" style={{ padding: '18px 24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}>
          {/* Date Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Calendar size={16} style={{ color: 'var(--accent-cyan)' }} />
              <span>Delivery Day:</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                className="btn btn-secondary"
                onClick={handlePrevDay}
                disabled={availableDates.indexOf(deliveryDate) <= 0}
                style={{ padding: '6px 10px' }}
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>
              <select
                className="form-control mono"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                style={{ fontWeight: 600, minWidth: 140 }}
              >
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-secondary"
                onClick={handleNextDay}
                disabled={availableDates.indexOf(deliveryDate) >= availableDates.length - 1}
                style={{ padding: '6px 10px' }}
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Decision Cut-Off Gate Closure Hour */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Sliders size={16} style={{ color: 'var(--accent-blue)' }} />
              <span>DA Decision Gate:</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[7, 9, 11, 13, 17].map((hour) => (
                <button
                  key={hour}
                  className={`btn ${gateClosureHour === hour ? 'btn-active' : 'btn-secondary'}`}
                  onClick={() => setGateClosureHour(hour)}
                  style={{ padding: '5px 10px', fontSize: '0.785rem' }}
                >
                  {hour.toString().padStart(2, '0')}:00 UTC
                  {hour === 11 && (
                    <span style={{ fontSize: '0.65rem', marginLeft: 4, color: 'var(--accent-cyan)' }}>(Auction)</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="nav-tabs" style={{ padding: 2 }}>
              <button
                className={`nav-tab-btn ${resolution === 'hourly' ? 'active' : ''}`}
                onClick={() => setResolution('hourly')}
                style={{ padding: '5px 12px', fontSize: '0.8rem' }}
              >
                Hourly (24)
              </button>
              <button
                className={`nav-tab-btn ${resolution === 'half-hourly' ? 'active' : ''}`}
                onClick={() => setResolution('half-hourly')}
                style={{ padding: '5px 12px', fontSize: '0.8rem' }}
              >
                Half-Hourly (48 SP)
              </button>
            </div>

            <button
              className="btn btn-secondary"
              onClick={exportCSV}
              style={{ padding: '7px 12px', fontSize: '0.8rem' }}
              title="Download CSV of Day-Ahead Schedule"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards for the Selected Delivery Day */}
      {schedule && (
        <div className="stats-grid">
          {/* Card 1: Day MAE */}
          <div className="glass-panel stat-card glow-accent">
            <div className="stat-title">
              <span>Day MAE (Mean Abs Error)</span>
              <TrendingUp size={16} style={{ color: 'var(--accent-cyan)' }} />
            </div>
            <div className="stat-value mono">
              {schedule.mae_mw ? `${Math.round(schedule.mae_mw).toLocaleString()}` : 'N/A'}{' '}
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>MW</span>
            </div>
            <div className="stat-subtitle">
              <span>NMAE:</span>
              <span className="mono" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                {schedule.nmae_pct ? `${schedule.nmae_pct}%` : 'N/A'}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>of mean generation</span>
            </div>
          </div>

          {/* Card 2: Day RMSE */}
          <div className="glass-panel stat-card">
            <div className="stat-title">
              <span>Day RMSE (Root Mean Sq)</span>
              <TrendingUp size={16} style={{ color: 'var(--accent-blue)' }} />
            </div>
            <div className="stat-value mono">
              {schedule.rmse_mw ? `${Math.round(schedule.rmse_mw).toLocaleString()}` : 'N/A'}{' '}
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>MW</span>
            </div>
            <div className="stat-subtitle">
              <span>Volatility penalty factor:</span>
              <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                {schedule.mae_mw && schedule.rmse_mw
                  ? `+${Math.round(schedule.rmse_mw - schedule.mae_mw)} MW`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* Card 3: Forecast Bias */}
          <div className="glass-panel stat-card">
            <div className="stat-title">
              <span>Forecast Bias (Mean Error)</span>
              {schedule.bias_mw && schedule.bias_mw > 0 ? (
                <AlertTriangle size={16} style={{ color: 'var(--accent-amber)' }} />
              ) : (
                <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)' }} />
              )}
            </div>
            <div className="stat-value mono" style={{
              color: schedule.bias_mw && schedule.bias_mw > 0 ? '#fbbf24' : '#34d399'
            }}>
              {schedule.bias_mw
                ? `${schedule.bias_mw > 0 ? '+' : ''}${Math.round(schedule.bias_mw).toLocaleString()}`
                : '0'}{' '}
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>MW</span>
            </div>
            <div className="stat-subtitle">
              {schedule.bias_mw && schedule.bias_mw > 0 ? (
                <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                  Over-Forecasting Risk (Deficit)
                </span>
              ) : (
                <span className="badge badge-live" style={{ fontSize: '0.7rem' }}>
                  Under-Forecasting (Surplus)
                </span>
              )}
            </div>
          </div>

          {/* Card 4: Total Generation Energy */}
          <div className="glass-panel stat-card">
            <div className="stat-title">
              <span>Total Energy Procured</span>
              <TrendingUp size={16} style={{ color: 'var(--accent-emerald)' }} />
            </div>
            <div className="stat-value mono">
              {schedule.total_actual_mwh
                ? `${Math.round(schedule.total_actual_mwh / 1000).toLocaleString()}`
                : 'N/A'}{' '}
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>GWh</span>
            </div>
            <div className="stat-subtitle">
              <span>Forecast was:</span>
              <span className="mono" style={{ color: 'var(--accent-cyan)' }}>
                {schedule.total_forecast_mwh
                  ? `${Math.round(schedule.total_forecast_mwh / 1000).toLocaleString()} GWh`
                  : 'N/A'}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                ({schedule.overforecast_count} over / {schedule.underforecast_count} under)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Chart */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
              UK National Wind: Latest Day-Ahead Forecast vs Actual Generation
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Target Delivery Date: <strong style={{ color: 'var(--text-primary)' }}>{deliveryDate}</strong> | Decision
              Locked at <strong style={{ color: 'var(--accent-cyan)' }}>{schedule?.gate_closure_time}</strong> (Resolution: {resolution})
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Data Source: Elexon BMRS WINDFOR (Forecast) & FUELHH (Actual)
            </span>
          </div>
        </div>

        <div style={{ height: 420, width: '100%', position: 'relative' }}>
          {loading ? (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}>
              Loading Day-Ahead Schedule...
            </div>
          ) : error ? (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-rose)'
            }}>
              {error}
            </div>
          ) : (
            <Chart type="bar" data={chartData as any} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Detailed Settlement Periods Table */}
      {schedule && (
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16
          }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>
              Settlement Periods Audit Breakdown ({schedule.periods.length} Periods)
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              All timestamps UTC | Resolution: {resolution}
            </span>
          </div>

          <div className="trading-table-container" style={{ maxHeight: 360 }}>
            <table className="trading-table">
              <thead>
                <tr>
                  <th>Target Time (UTC)</th>
                  <th>Settlement Period</th>
                  <th>Forecast Generation</th>
                  <th>Forecast Publish Time</th>
                  <th>Actual Outturn</th>
                  <th>Forecast Error</th>
                  <th>Abs Error</th>
                  <th>APE (%)</th>
                </tr>
              </thead>
              <tbody>
                {schedule.periods.map((p, idx) => {
                  const isOver = (p.error_mw ?? 0) > 0;
                  return (
                    <tr key={idx}>
                      <td className="mono" style={{ fontWeight: 500 }}>
                        {p.startTime.replace('T', ' ').replace('Z', '')}
                      </td>
                      <td className="mono">{p.settlementPeriod ?? `H${idx + 1}`}</td>
                      <td className="mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        {Math.round(p.forecast_mw).toLocaleString()} MW
                      </td>
                      <td className="mono" style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        {p.forecast_publish_time.replace('T', ' ').replace('Z', '')}
                      </td>
                      <td className="mono" style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                        {p.actual_mw ? `${Math.round(p.actual_mw).toLocaleString()} MW` : 'N/A'}
                      </td>
                      <td className="mono" style={{
                        color: isOver ? '#fbbf24' : '#a855f7',
                        fontWeight: 600
                      }}>
                        {p.error_mw !== null && p.error_mw !== undefined
                          ? `${p.error_mw > 0 ? '+' : ''}${Math.round(p.error_mw).toLocaleString()} MW`
                          : 'N/A'}
                      </td>
                      <td className="mono">
                        {p.abs_error_mw !== null && p.abs_error_mw !== undefined
                          ? `${Math.round(p.abs_error_mw).toLocaleString()} MW`
                          : 'N/A'}
                      </td>
                      <td className="mono">
                        {p.ape_pct !== null && p.ape_pct !== undefined ? `${p.ape_pct.toFixed(1)}%` : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
