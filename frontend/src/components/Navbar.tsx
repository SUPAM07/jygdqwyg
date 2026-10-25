import React from 'react';
import { Wind, Activity, Clock, Database, Zap } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSync: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSync,
}) => {
  return (
    <header style={{
      background: 'rgba(11, 16, 28, 0.9)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '12px 24px',
    }}>
      <div style={{
        maxWidth: 1440,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(56, 189, 248, 0.1) 100%)',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan)',
            boxShadow: '0 0 15px rgba(0, 242, 254, 0.2)'
          }}>
            <Wind size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-0.02em'
              }}>
                AeroTrade <span style={{ color: 'var(--accent-cyan)' }}>UK</span>
              </span>
              <span className="badge badge-live">
                <span className="badge-pulse-dot" />
                GB Market Live
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Day-Ahead Wholesale Power & Elexon BMRS Wind Analytics
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'day-ahead' ? 'active' : ''}`}
            onClick={() => setActiveTab('day-ahead')}
          >
            <Clock size={16} />
            Day-Ahead Dispatch
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'error-analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('error-analytics')}
          >
            <Activity size={16} />
            Quantified Error Audit
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'procurement-sim' ? 'active' : ''}`}
            onClick={() => setActiveTab('procurement-sim')}
          >
            <Zap size={16} />
            Procurement & Hedge Sim
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'vintages' ? 'active' : ''}`}
            onClick={() => setActiveTab('vintages')}
          >
            <Wind size={16} />
            Forecast Vintages
          </button>
        </nav>

        {/* Status Indicators & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Market Status Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Grid Freq:</span>
            <span className="mono" style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>50.02 Hz</span>
            <span style={{ color: 'var(--border-subtle)' }}>|</span>
            <span style={{ color: 'var(--text-muted)' }}>DA Gate:</span>
            <span className="mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>11:00 UTC</span>
          </div>

          {/* Sync Status Button */}
          <button
            onClick={onOpenSync}
            className="btn btn-secondary"
            title="Elexon BMRS Data Status"
            style={{ padding: '7px 12px', fontSize: '0.8rem' }}
          >
            <Database size={15} style={{ color: 'var(--accent-cyan)' }} />
            <span>Data Sync</span>
          </button>
        </div>
      </div>
    </header>
  );
};
