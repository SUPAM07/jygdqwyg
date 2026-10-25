import React, { useState, useEffect } from 'react';
import { X, Database, RefreshCw, CheckCircle2, ExternalLink, HardDrive } from 'lucide-react';
import { HealthStatus } from '../types';
import { fetchHealth, triggerSync } from '../services/api';

interface DataSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataSyncModal: React.FC<DataSyncModalProps> = ({ isOpen, onClose }) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchHealth()
        .then((data) => {
          setHealth(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await triggerSync('2026-01-01', '2026-01-31');
      setSyncResult(res.message);
      const updatedHealth = await fetchHealth();
      setHealth(updatedHealth);
    } catch (err: any) {
      setSyncResult(`Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650, padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={20} style={{ color: 'var(--accent-cyan)' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Elexon BMRS Data Synchronization</h3>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px 10px', borderRadius: '50%' }}>
            <X size={16} />
          </button>
        </div>

        {/* Database Status Cards */}
        {health && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                WINDFOR Forecast Records
              </div>
              <div className="stat-value mono" style={{ fontSize: '1.5rem', color: 'var(--accent-cyan)' }}>
                {health.forecasts_count.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                {health.earliest_forecast?.slice(0, 10)} to {health.latest_forecast?.slice(0, 10)}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                FUELHH Actual Wind Records
              </div>
              <div className="stat-value mono" style={{ fontSize: '1.5rem', color: 'var(--accent-emerald)' }}>
                {health.actuals_count.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                {health.earliest_actual?.slice(0, 10)} to {health.latest_actual?.slice(0, 10)}
              </div>
            </div>
          </div>
        )}

        {/* Endpoint References */}
        <div className="glass-panel" style={{ padding: '16px', marginBottom: 20 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', marginBottom: 8 }}>
            Connected Official Stream Endpoints:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ExternalLink size={12} style={{ color: 'var(--accent-cyan)' }} />
              <span>Actuals: <code>https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream</code></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ExternalLink size={12} style={{ color: 'var(--accent-cyan)' }} />
              <span>Forecasts: <code>https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream</code></span>
            </div>
          </div>
        </div>

        {/* Sync Trigger Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {syncResult && <span style={{ color: 'var(--accent-cyan)' }}>{syncResult}</span>}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn btn-primary"
            style={{ padding: '9px 18px' }}
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Fetching from Elexon...' : 'Trigger Live Sync'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
