import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, CheckCircle2, Smartphone, Heart, Moon, Zap } from 'lucide-react';
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
    <div style={{ background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'var(--sk-color-surface-3)', color: 'var(--sk-color-action)', padding: 8, borderRadius: 8 }}>
            <Activity size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--sk-color-text)' }}>Native OS Background Health Sync</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--sk-color-text-2)' }}>
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
        <div style={{ background: 'var(--sk-color-positive-bg)', border: '1px solid var(--sk-color-positive-rule)', padding: 10, borderRadius: 6, color: 'var(--sk-color-positive)', fontSize: '0.82rem', marginBottom: 14 }}>
          <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6 }} />
          {syncNotice}
        </div>
      )}

      {syncData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          <div style={{ background: 'var(--sk-color-surface-2)', border: '1px solid var(--sk-color-rule)', padding: 12, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--sk-color-text-3)', marginBottom: 4 }}>
              <Zap size={14} style={{ color: 'var(--sk-color-action)' }} /> Daily Steps
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--sk-color-text)' }}>
              {syncData.steps_24h.toLocaleString()}
            </div>
          </div>

          <div style={{ background: 'var(--sk-color-surface-2)', border: '1px solid var(--sk-color-rule)', padding: 12, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--sk-color-text-3)', marginBottom: 4 }}>
              <Heart size={14} style={{ color: 'var(--sk-color-action)' }} /> Active Energy
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--sk-color-text)' }}>
              {syncData.active_calories_kcal} kcal
            </div>
          </div>

          <div style={{ background: 'var(--sk-color-surface-2)', border: '1px solid var(--sk-color-rule)', padding: 12, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--sk-color-text-3)', marginBottom: 4 }}>
              <Moon size={14} style={{ color: 'var(--sk-color-action)' }} /> Sleep Duration
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--sk-color-text)' }}>
              {syncData.sleep_hours} hrs
            </div>
          </div>

          <div style={{ background: 'var(--sk-color-surface-2)', border: '1px solid var(--sk-color-rule)', padding: 12, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--sk-color-text-3)', marginBottom: 4 }}>
              <Smartphone size={14} style={{ color: 'var(--sk-color-action)' }} /> Provider
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--sk-color-text)', textTransform: 'uppercase' }}>
              {syncData.provider}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
