import React, { useState, useEffect, useRef } from 'react';
import { X, Database, RefreshCw, CheckCircle2, ExternalLink, HardDrive, AlertCircle } from 'lucide-react';
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
  const [syncMode, setSyncMode] = useState<'quick' | 'full'>('quick');
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setSyncResult(null);
      setSyncError(null);
      fetchHealth()
        .then((data) => {
          setHealth(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen]);

  // Elapsed timer while syncing
  useEffect(() => {
    let interval: any = null;
    if (syncing) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [syncing]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fromDate = '2026-01-01';
    const toDate = syncMode === 'quick' ? '2026-01-02' : '2026-01-31';

    try {
      const res = await triggerSync(fromDate, toDate, controller.signal);
      setSyncResult(res.message);
      const updatedHealth = await fetchHealth();
      setHealth(updatedHealth);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setSyncError('Sync canceled by user.');
      } else {
        setSyncError(`Sync error: ${err.message}`);
      }
    } finally {
      setSyncing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSyncing(false);
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
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

        {/* Database Pre-seeded notice */}
        {health && health.forecasts_count >= 20000 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            marginBottom: 16,
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontSize: '0.8rem',
            color: '#34d399'
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Local Database Fully Seeded:</strong> All January 2026 forecasts & actuals are pre-cached in SQLite. Triggering a live sync is optional to verify Elexon stream connectivity.
            </span>
          </div>
        )}

        {/* Sync Mode Selection */}
        <div className="glass-panel" style={{ padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', marginBottom: 10 }}>
            Sync Mode (Elexon BMRS Live Streams):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              type="button"
              onClick={() => setSyncMode('quick')}
              className={`btn ${syncMode === 'quick' ? 'btn-active' : 'btn-secondary'}`}
              style={{ padding: '10px 12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>⚡ Quick Test Sync (1 Day)</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fast test (~3 seconds) to verify streaming connection</div>
            </button>

            <button
              type="button"
              onClick={() => setSyncMode('full')}
              className={`btn ${syncMode === 'full' ? 'btn-active' : 'btn-secondary'}`}
              style={{ padding: '10px 12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>🔄 Full Month Sync (31 Days)</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Downloads ~20,000 records (~45 seconds)</div>
            </button>
          </div>
        </div>

        {/* Endpoint References */}
        <div className="glass-panel" style={{ padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            Connected Official Stream Endpoints:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ExternalLink size={11} style={{ color: 'var(--accent-cyan)' }} />
              <span>Actuals: <code>https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream</code></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ExternalLink size={11} style={{ color: 'var(--accent-cyan)' }} />
              <span>Forecasts: <code>https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream</code></span>
            </div>
          </div>
        </div>

        {/* Sync Trigger Action & Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: '0.8rem', flex: 1 }}>
            {syncing && (
              <span style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={13} className="animate-spin" />
                Connecting to Elexon BMRS stream... ({elapsedSeconds}s elapsed{syncMode === 'full' ? ' / ~45s total' : ''})
              </span>
            )}
            {syncResult && !syncing && (
              <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={15} />
                {syncResult}
              </span>
            )}
            {syncError && !syncing && (
              <span style={{ color: '#fb7185', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={15} />
                {syncError}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {syncing && (
              <button
                onClick={handleCancel}
                className="btn btn-secondary"
                style={{ padding: '9px 14px', borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn btn-primary"
              style={{ padding: '9px 18px' }}
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              <span>
                {syncing
                  ? `Fetching (${elapsedSeconds}s)...`
                  : syncMode === 'quick'
                  ? 'Trigger Quick Sync (1 Day)'
                  : 'Trigger Full Sync (31 Days)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
