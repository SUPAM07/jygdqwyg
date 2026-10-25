import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Wind, Clock, Info, Layers, RefreshCw } from 'lucide-react';
import { VintagesResponse } from '../types';
import { fetchVintages } from '../services/api';

ChartJS.register(...registerables);

interface ForecastVintagesProps {
  availableDates: string[];
}

export const ForecastVintages: React.FC<ForecastVintagesProps> = ({ availableDates }) => {
  const [deliveryDate, setDeliveryDate] = useState<string>('2026-01-16');
  const [vintagesData, setVintagesData] = useState<VintagesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchVintages(deliveryDate)
      .then((data) => {
        if (isMounted) {
          setVintagesData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load forecast vintages');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [deliveryDate]);

  const vintageColors = ['#64748b', '#00f2fe', '#f59e0b', '#10b981'];

  // Prepare chart
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  const datasets = vintagesData?.vintages.map((v, idx) => {
    // Map periods to hourly array
    const dataMap: { [hour: number]: number } = {};
    v.periods.forEach((p) => {
      const dt = new Date(p.startTime);
      dataMap[dt.getUTCHours()] = p.forecast_mw;
    });

    return {
      label: v.vintage_name,
      data: hours.map((_, h) => dataMap[h] ?? null),
      borderColor: vintageColors[idx % vintageColors.length],
      backgroundColor: 'transparent',
      borderWidth: idx === 1 ? 3 : 2, // highlight 24h Day-Ahead gate closure
      borderDash: idx === 0 ? [5, 5] : undefined,
      pointRadius: 2.5,
      tension: 0.35,
    };
  }) || [];

  const chartData = {
    labels: hours,
    datasets,
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
        borderColor: 'rgba(0, 242, 254, 0.3)',
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
        title: { display: true, text: 'Forecast Generation (MW)', color: '#94a3b8', font: { family: 'Inter' } },
      },
    },
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header and Filter */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} style={{ color: 'var(--accent-cyan)' }} />
              Forecast Vintage Convergence (Lead-Time Evolution)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Track how the National Grid ESO forecast for {deliveryDate} evolved across 4 key operational horizons.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Delivery Day:</span>
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
          </div>
        </div>
      </div>

      {/* Main Vintage Comparison Chart */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ height: 420, width: '100%' }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Loading Forecast Vintages...
            </div>
          ) : error ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-rose)' }}>
              {error}
            </div>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Domain Explanation Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16
      }}>
        <div className="glass-panel" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            48h Ahead (D-2 11:00)
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Initial synoptic numerical weather prediction (NWP) runs. Useful for preliminary plant maintenance scheduling, but subject to high front-timing uncertainty.
          </p>
        </div>

        <div className="glass-panel glow-accent" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: 6 }}>
            24h Ahead (D-1 11:00 Gate)
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong>The crucial Day-Ahead decision moment:</strong> This is the exact forecast available when traders place their binding bids in the EPEX SPOT / Nord Pool UK Day-Ahead auctions.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-amber)', marginBottom: 6 }}>
            14h Ahead (D-1 21:00)
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Evening intraday update incorporating evening sounding balloon & satellite updates. Schedulers adjust intraday positions to re-hedge overnight ramps.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: 6 }}>
            6h Ahead (D-0 05:00)
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            High-resolution rapid refresh NWP. Represents near-final renewable expectation before physical gate closure in the Balancing Mechanism.
          </p>
        </div>
      </div>
    </div>
  );
};
