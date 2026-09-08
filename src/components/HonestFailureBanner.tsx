/**
 * Studentkare — Honest Failure State Banners (UI-3.5)
 * Compliance: UI-3.5 Specification (Replaces raw alert popups)
 *
 * Provides clear, accessible failure state banners for:
 * 1. Offline write conflict at camp station
 * 2. Consent revoked mid-session
 * 3. ABDM gateway timeout
 * 4. Partial record fetch
 * 5. Expired break-glass session
 * 6. Camp station out of order
 */

import React from 'react';
import { AlertOctagon, WifiOff, Clock, ShieldAlert, FileX, RefreshCw } from 'lucide-react';

export type FailureType =
  | 'OFFLINE_WRITE_CONFLICT'
  | 'CONSENT_REVOKED_MID_SESSION'
  | 'ABDM_TIMEOUT'
  | 'PARTIAL_RECORD_FETCH'
  | 'BREAK_GLASS_EXPIRED'
  | 'STATION_OUT_OF_ORDER';

interface HonestFailureBannerProps {
  type: FailureType;
  customDetail?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const HonestFailureBanner: React.FC<HonestFailureBannerProps> = ({
  type,
  customDetail,
  onRetry,
  onDismiss,
}) => {
  const getFailureConfig = () => {
    switch (type) {
      case 'OFFLINE_WRITE_CONFLICT':
        return {
          title: 'Offline Write Conflict at Camp Station',
          description: 'Local edits conflict with server state. Local queue retained until reconnection.',
          icon: <WifiOff size={20} color="#F59E0B" />,
          bgColor: 'rgba(245,158,11,0.12)',
          borderColor: '#4A3410',
          textColor: '#F59E0B',
          actionText: 'Re-sync Local Draft',
        };
      case 'CONSENT_REVOKED_MID_SESSION':
        return {
          title: 'Consent Revoked Mid-Session',
          description: 'The student updated their consent preferences. Further access to this record is blocked.',
          icon: <ShieldAlert size={20} color="#F0616B" />,
          bgColor: 'rgba(240,97,107,0.13)',
          borderColor: '#5A1E2B',
          textColor: '#F0616B',
          actionText: 'Request New Consent',
        };
      case 'ABDM_TIMEOUT':
        return {
          title: 'ABDM Health Information Exchange Timeout',
          description: 'Remote Health Information Provider (HIP) did not respond within 15s. Showing cached copy.',
          icon: <Clock size={20} color="#F59E0B" />,
          bgColor: 'rgba(245,158,11,0.12)',
          borderColor: '#4A3410',
          textColor: '#F59E0B',
          actionText: 'Retry ABDM Gateway',
        };
      case 'PARTIAL_RECORD_FETCH':
        return {
          title: 'Partial Clinical Record Rendered',
          description: '2 of 5 FHIR resources were unavailable. Rendered items are verified; missing items omitted.',
          icon: <FileX size={20} color="#A78BFA" />,
          bgColor: 'rgba(124,92,252,0.14)',
          borderColor: '#2E2A55',
          textColor: '#A78BFA',
          actionText: 'Reload Missing Records',
        };
      case 'BREAK_GLASS_EXPIRED':
        return {
          title: 'Break-Glass Emergency Session Expired',
          description: 'The 30-minute time-boxed emergency session has elapsed. Access has auto-terminated.',
          icon: <AlertOctagon size={20} color="#F0616B" />,
          bgColor: 'rgba(240,97,107,0.13)',
          borderColor: '#5A1E2B',
          textColor: '#F0616B',
          actionText: 'Re-authenticate Break-Glass',
        };
      case 'STATION_OUT_OF_ORDER':
      default:
        return {
          title: 'Camp Station Temporarily Out of Order',
          description: 'Station 3 offline. Rerouting queue to Station 4.',
          icon: <AlertOctagon size={20} color="#F59E0B" />,
          bgColor: 'rgba(245,158,11,0.12)',
          borderColor: '#4A3410',
          textColor: '#F59E0B',
          actionText: 'Switch Station',
        };
    }
  };

  const config = getFailureConfig();

  return (
    <div
      role="alert"
      style={{
        background: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        borderRadius: '12px',
        padding: '16px 20px',
        color: '#F4F4FA',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        margin: '12px 0',
      }}
    >
      <div style={{ marginTop: '2px' }}>{config.icon}</div>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: config.textColor }}>{config.title}</h4>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9095A8', lineHeight: 1.5 }}>
          {customDetail || config.description}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#FFF',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <RefreshCw size={13} />
          {config.actionText}
        </button>
      )}
    </div>
  );
};
