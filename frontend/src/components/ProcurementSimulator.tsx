import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  Zap,
  ShieldCheck,
  Coins,
  Flame,
  ArrowRight,
  Sliders,
  DollarSign,
  TrendingUp,
  AlertOctagon
} from 'lucide-react';
import { ProcurementSimResponse } from '../types';
import { simulateProcurement } from '../services/api';

ChartJS.register(...registerables);

interface ProcurementSimulatorProps {
  availableDates: string[];
}

export const ProcurementSimulator: React.FC<ProcurementSimulatorProps> = ({ availableDates }) => {
  const [deliveryDate, setDeliveryDate] = useState<string>('2026-01-16');
  const [baselineDemand, setBaselineDemand] = useState<number>(32000);
  const [confidenceLevel, setConfidenceLevel] = useState<'P50' | 'P80' | 'P90' | 'P95'>('P90');
  const [thermalCost, setThermalCost] = useState<number>(85);
  const [cashoutMultiplier, setCashoutMultiplier] = useState<number>(1.8);

  const [simResult, setSimResult] = useState<ProcurementSimResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    simulateProcurement({
      delivery_date: deliveryDate,
      baseline_demand_mw: baselineDemand,
      confidence_level: confidenceLevel,
      gate_closure_hour: 11,
      thermal_cost_per_mwh: thermalCost,
      cashout_penalty_multiplier: cashoutMultiplier,
    })
      .then((res) => {
        if (isMounted) {
          setSimResult(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Simulation failed');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [deliveryDate, baselineDemand, confidenceLevel, thermalCost, cashoutMultiplier]);

  // Chart data
  const chartLabels = simResult?.periods.map((p) => `${p.hour.toString().padStart(2, '0')}:00`) || [];
  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        type: 'line' as const,
        label: 'Consumer Demand (MW)',
        data: simResult?.periods.map((p) => p.demand_mw) || [],
        borderColor: '#94a3b8',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      },
      {
        type: 'line' as const,
        label: 'Recommended Hedged Thermal Procurement (MW)',
        data: simResult?.periods.map((p) => p.hedged_thermal_procurement_mw) || [],
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#a855f7',
      },
      {
        type: 'line' as const,
        label: 'Naive Thermal Procurement (MW)',
        data: simResult?.periods.map((p) => p.naive_thermal_procurement_mw) || [],
        borderColor: '#38bdf8',
        backgroundColor: 'transparent',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2.5,
      },
      {
        type: 'line' as const,
        label: 'Forecast Wind Generation (MW)',
        data: simResult?.periods.map((p) => p.forecast_wind_mw) || [],
        borderColor: '#00f2fe',
        borderDash: [3, 3],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#cbd5e1', font: { family: 'Inter', size: 12 }, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        borderColor: 'rgba(168, 85, 247, 0.3)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 11 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 11 } },
        title: { display: true, text: 'Power (MW)', color: '#94a3b8', font: { family: 'Inter' } },
      },
    },
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Simulation Parameter Controls */}
      <div className="glass-panel" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={18} style={{ color: 'var(--accent-cyan)' }} />
            Wholesale Thermal Procurement Decision Simulator
          </h3>
          <span className="badge badge-cyan">Day-Ahead Market (D-1 11:00 UTC Gate)</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16
        }}>
          {/* 1. Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Target Delivery Date:
            </label>
            <select
              className="form-control mono"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              style={{ width: '100%', fontWeight: 600 }}
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Consumer Demand MW */}
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Baseline Consumer Demand (MW):
            </label>
            <input
              type="number"
              className="form-control mono"
              value={baselineDemand === 0 ? '' : baselineDemand}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setBaselineDemand(isNaN(val) ? 0 : Math.max(0, val));
              }}
              min={1000}
              max={60000}
              step={1000}
              style={{ width: '100%', fontWeight: 600 }}
            />
          </div>

          {/* 3. Hedging Confidence Level */}
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Buffer Confidence Level:
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['P50', 'P80', 'P90', 'P95'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setConfidenceLevel(lvl)}
                  className={`btn ${confidenceLevel === lvl ? 'btn-active' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '7px 4px', fontSize: '0.8rem' }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Thermal Cost */}
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Thermal DA Price (£/MWh):
            </label>
            <input
              type="number"
              className="form-control mono"
              value={thermalCost === 0 ? '' : thermalCost}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setThermalCost(isNaN(val) ? 0 : Math.max(0, val));
              }}
              min={10}
              max={300}
              style={{ width: '100%', fontWeight: 600 }}
            />
          </div>

          {/* 5. Imbalance Penalty Multiplier */}
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Cash-Out Penalty Multiplier:
            </label>
            <input
              type="number"
              className="form-control mono"
              value={cashoutMultiplier === 0 ? '' : cashoutMultiplier}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCashoutMultiplier(isNaN(val) ? 1.0 : Math.max(1.0, val));
              }}
              min={1.0}
              max={5.0}
              step={0.1}
              style={{ width: '100%', fontWeight: 600 }}
            />
          </div>
        </div>
      </div>

      {/* Financial & Procurement KPI Cards */}
      {simResult && (
        <div className="stats-grid">
          {/* KPI 1: Recommended Thermal Hedged */}
          <div className="glass-panel stat-card glow-accent">
            <div className="stat-title">
              <span>Hedged Thermal Buy</span>
              <Flame size={16} style={{ color: 'var(--accent-purple)' }} />
            </div>
            <div className="stat-value mono" style={{ color: '#c084fc' }}>
              {Math.round(simResult.hedged_thermal_procured_mwh / 1000).toLocaleString()}{' '}
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>GWh</span>
            </div>
            <div className="stat-subtitle">
              <span>Naive strategy would procure:</span>
              <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                {Math.round(simResult.naive_thermal_procured_mwh / 1000).toLocaleString()} GWh
              </span>
            </div>
          </div>

          {/* KPI 2: Average Safety Buffer */}
          <div className="glass-panel stat-card">
            <div className="stat-title">
              <span>Average Safety Margin</span>
              <ShieldCheck size={16} style={{ color: 'var(--accent-cyan)' }} />
            </div>
            <div className="stat-value mono" style={{ color: 'var(--accent-cyan)' }}>
              +{Math.round(simResult.recommended_safety_buffer_avg_mw).toLocaleString()}{' '}
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>MW</span>
            </div>
            <div className="stat-subtitle">
              <span>Risk-adjusted wind credit haircut</span>
            </div>
          </div>

          {/* KPI 3: Avoided Cash-Out Penalties */}
          <div className="glass-panel stat-card">
            <div className="stat-title">
              <span>Avoided Imbalance Penalties</span>
              <Coins size={16} style={{ color: 'var(--accent-emerald)' }} />
            </div>
            <div className="stat-value mono" style={{ color: '#34d399' }}>
              {simResult.total_avoided_penalties_gbp !== null && simResult.total_avoided_penalties_gbp !== undefined
                ? `£${Math.round(simResult.total_avoided_penalties_gbp).toLocaleString()}`
                : '£0'}
            </div>
            <div className="stat-subtitle">
              <span>Gross balancing cash-out fines averted</span>
            </div>
          </div>

          {/* KPI 4: Net Strategy Financial Benefit */}
          <div className="glass-panel stat-card">
            <div className="stat-title">
              <span>Net Strategy Financial Savings</span>
              <DollarSign size={16} style={{ color: 'var(--accent-amber)' }} />
            </div>
            <div className="stat-value mono" style={{
              color: (simResult.total_imbalance_savings_gbp ?? 0) >= 0 ? '#38bdf8' : '#fb7185'
            }}>
              {simResult.total_imbalance_savings_gbp !== null && simResult.total_imbalance_savings_gbp !== undefined
                ? `${simResult.total_imbalance_savings_gbp >= 0 ? '+' : ''}£${Math.round(simResult.total_imbalance_savings_gbp).toLocaleString()}`
                : '£0'}
            </div>
            <div className="stat-subtitle">
              <span>Net profit after paying day-ahead thermal hedge</span>
            </div>
          </div>
        </div>
      )}

      {/* Procurement Schedule Chart */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Hourly Power Balance & Thermal Procurement Recommendation
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Purple area shows recommended thermal generation orders in the wholesale market after de-biasing wind forecast by {confidenceLevel} empirical error margins.
            </p>
          </div>
        </div>
        <div style={{ height: 380, width: '100%' }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Calculating Optimal Hedging Strategy...
            </div>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Hourly Decision Table */}
      {simResult && (
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>
            Hourly Dispatch Orders & Risk Haircuts
          </h4>
          <div className="trading-table-container" style={{ maxHeight: 360 }}>
            <table className="trading-table">
              <thead>
                <tr>
                  <th>Hour (UTC)</th>
                  <th>Consumer Demand</th>
                  <th>Raw Wind Forecast</th>
                  <th>Safety Buffer ({confidenceLevel})</th>
                  <th>Risk-Adjusted Wind</th>
                  <th>Recommended Thermal Buy</th>
                  <th>Naive Thermal Buy</th>
                  <th>Cash-Out Savings</th>
                </tr>
              </thead>
              <tbody>
                {simResult.periods.map((p, idx) => (
                  <tr key={idx}>
                    <td className="mono" style={{ fontWeight: 600 }}>{p.hour.toString().padStart(2, '0')}:00</td>
                    <td className="mono">{Math.round(p.demand_mw).toLocaleString()} MW</td>
                    <td className="mono" style={{ color: 'var(--accent-cyan)' }}>
                      {Math.round(p.forecast_wind_mw).toLocaleString()} MW
                    </td>
                    <td className="mono" style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
                      +{Math.round(p.safety_buffer_mw).toLocaleString()} MW
                    </td>
                    <td className="mono" style={{ color: '#38bdf8' }}>
                      {Math.round(p.risk_adjusted_wind_mw).toLocaleString()} MW
                    </td>
                    <td className="mono" style={{ color: '#c084fc', fontWeight: 700 }}>
                      {Math.round(p.hedged_thermal_procurement_mw).toLocaleString()} MW
                    </td>
                    <td className="mono" style={{ color: 'var(--text-muted)' }}>
                      {Math.round(p.naive_thermal_procurement_mw).toLocaleString()} MW
                    </td>
                    <td className="mono" style={{ color: '#34d399', fontWeight: 600 }}>
                      {p.estimated_imbalance_saving_gbp
                        ? `£${Math.round(p.estimated_imbalance_saving_gbp).toLocaleString()}`
                        : '£0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
