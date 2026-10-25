import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DayAheadViewer } from './components/DayAheadViewer';
import { ErrorAnalytics } from './components/ErrorAnalytics';
import { ProcurementSimulator } from './components/ProcurementSimulator';
import { ForecastVintages } from './components/ForecastVintages';
import { DataSyncModal } from './components/DataSyncModal';
import { fetchAvailableDates } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('day-ahead');
  const [isSyncOpen, setIsSyncOpen] = useState<boolean>(false);
  const [availableDates, setAvailableDates] = useState<string[]>([
    '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05',
    '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09', '2026-01-10',
    '2026-01-11', '2026-01-12', '2026-01-13', '2026-01-14', '2026-01-15',
    '2026-01-16', '2026-01-17', '2026-01-18', '2026-01-19', '2026-01-20',
    '2026-01-21', '2026-01-22', '2026-01-23', '2026-01-24', '2026-01-25',
    '2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29', '2026-01-30',
    '2026-01-31', '2026-02-01'
  ]);

  useEffect(() => {
    fetchAvailableDates()
      .then((data) => {
        if (data.dates && data.dates.length > 0) {
          setAvailableDates(data.dates);
        }
      })
      .catch(() => {
        // Fallback to default January 2026 dates
      });
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSync={() => setIsSyncOpen(true)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: 1440, width: '100%', margin: '0 auto', padding: '24px' }}>
        {activeTab === 'day-ahead' && <DayAheadViewer availableDates={availableDates} />}
        {activeTab === 'error-analytics' && <ErrorAnalytics />}
        {activeTab === 'procurement-sim' && <ProcurementSimulator availableDates={availableDates} />}
        {activeTab === 'vintages' && <ForecastVintages availableDates={availableDates} />}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '20px 24px',
        background: 'rgba(11, 16, 28, 0.7)',
        marginTop: 40
      }}>
        <div style={{
          maxWidth: 1440,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}>
          <div>
            AeroTrade UK &copy; 2026 | UK Day-Ahead Wholesale Power & Renewable Risk Analytics
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>Data: Elexon BMRS (FUELHH & WINDFOR)</span>
            <span>Market: EPEX SPOT / Nord Pool UK Day-Ahead</span>
            <span style={{ color: 'var(--accent-cyan)' }}>FAANG-Grade Architecture</span>
          </div>
        </div>
      </footer>

      {/* Data Sync & Status Modal */}
      <DataSyncModal isOpen={isSyncOpen} onClose={() => setIsSyncOpen(false)} />
    </div>
  );
};

export default App;
