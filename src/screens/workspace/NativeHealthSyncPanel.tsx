import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, CheckCircle2, Smartphone, ShieldCheck, Heart, Moon, Zap, ArrowRight } from 'lucide-react';
import { healthSyncAdapter, BackgroundHealthData } from '../../native/healthSync';
import '../../theme/workflows.css';

export function NativeHealthSyncPanel() {
  const [syncData, setSyncData] = useState<BackgroundHealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');

  const triggerSync = async () => {
    setLoading(true);
    setSyncNotice('');
    try {
      const data = await healthSyncAdapter.fetchBackgroundHealthData();
      setSyncData(data);
      const res = await healthSyncAdapter.syncWithBackend();
      if (res.status === 'SUCCESS' || res.status === 'DEDUPLICATED') {
        setSyncNotice(`Background Sync Complete (${data.provider.toUpperCase()} • ${data.steps_24h} steps)`);
      }
    } catch (e: any) {
      console.error(e);
      setSyncNotice('Sync failed. Please check permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    triggerSync();
  }, []);

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#e0f2fe', color: '#0284c7', padding: 8, borderRadius: 8 }}>
            <Activity size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>Native OS Background Health Sync</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
              Apple HealthKit & Android Health Connect Background Synchronization
            </p>
          </div>
        </div>
        <button
          className="health-button"
          onClick={triggerSync}
          disabled={loading}
          style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Now
        </button>
      </div>

      {syncNotice && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: 10, borderRadius: 6, color: '#166534', fontSize: '0.82rem', marginBottom: 14 }}>
          <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6 }} />
          {syncNotice}
        </div>
      )}

      {syncData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: 12, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>
              <Zap size={14} style={{ color: '#0284c7' }} /> Daily Steps
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
              {syncData.steps_24h.toLocaleString()}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: 12, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>
              <Heart size={14} style={{ color: '#dc2626' }} /> Active Energy
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
              {syncData.active_calories_kcal} kcal
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: 12, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>
              <Moon size={14} style={{ color: '#9333ea' }} /> Sleep Duration
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
              {syncData.sleep_hours} hrs
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: 12, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>
              <Smartphone size={14} style={{ color: '#16a34a' }} /> Provider
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
              {syncData.provider}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
