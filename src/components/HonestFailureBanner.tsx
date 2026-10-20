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

export const HonestFailureBanner: React.FC<HonestFailureBannerProps> = ({ type, customDetail, onRetry }) => {
  const getFailureConfig = () => {
    switch (type) {
      case 'OFFLINE_WRITE_CONFLICT':
        return {
          title: 'Offline Write Conflict at Camp Station',
          description: 'Local edits conflict with server state. Local queue retained until reconnection.',
          icon: <WifiOff size={20} color="var(--sk-color-attention)" />,
          bgColor: 'var(--sk-color-attention-bg)',
          borderColor: 'var(--sk-color-rule)',
          textColor: 'var(--sk-color-attention)',
          actionText: 'Re-sync Local Draft',
        };
      case 'CONSENT_REVOKED_MID_SESSION':
        return {
          title: 'Consent Revoked Mid-Session',
          description: 'The student updated their consent preferences. Further access to this record is blocked.',
          icon: <ShieldAlert size={20} color="var(--sk-color-danger)" />,
          bgColor: 'var(--sk-color-danger-bg)',
          borderColor: 'var(--sk-color-danger-rule)',
          textColor: 'var(--sk-color-danger)',
          actionText: 'Request New Consent',
        };
      case 'ABDM_TIMEOUT':
        return {
          title: 'ABDM Health Information Exchange Timeout',
          description: 'Remote Health Information Provider (HIP) did not respond within 15s. Showing cached copy.',
          icon: <Clock size={20} color="var(--sk-color-attention)" />,
          bgColor: 'var(--sk-color-attention-bg)',
          borderColor: 'var(--sk-color-rule)',
          textColor: 'var(--sk-color-attention)',
          actionText: 'Retry ABDM Gateway',
        };
      case 'PARTIAL_RECORD_FETCH':
        return {
          title: 'Partial Clinical Record Rendered',
          description: '2 of 5 FHIR resources were unavailable. Rendered items are verified; missing items omitted.',
          icon: <FileX size={20} color="var(--sk-color-info)" />,
          bgColor: 'var(--sk-color-surface-3)',
          borderColor: 'var(--sk-color-rule)',
          textColor: 'var(--sk-color-info)',
          actionText: 'Reload Missing Records',
        };
      case 'BREAK_GLASS_EXPIRED':
        return {
          title: 'Break-Glass Emergency Session Expired',
          description: 'The 30-minute time-boxed emergency session has elapsed. Access has auto-terminated.',
          icon: <AlertOctagon size={20} color="var(--sk-color-danger)" />,
          bgColor: 'var(--sk-color-danger-bg)',
          borderColor: 'var(--sk-color-danger-rule)',
          textColor: 'var(--sk-color-danger)',
          actionText: 'Re-authenticate Break-Glass',
        };
      case 'STATION_OUT_OF_ORDER':
      default:
        return {
          title: 'Camp Station Temporarily Out of Order',
          description: 'Station 3 offline. Rerouting queue to Station 4.',
          icon: <AlertOctagon size={20} color="var(--sk-color-attention)" />,
          bgColor: 'var(--sk-color-attention-bg)',
          borderColor: 'var(--sk-color-rule)',
          textColor: 'var(--sk-color-attention)',
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
        color: 'var(--sk-color-text)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        margin: '12px 0',
      }}
    >
      <div style={{ marginTop: '2px' }}>{config.icon}</div>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: config.textColor }}>{config.title}</h4>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--sk-color-text-2)', lineHeight: 1.5 }}>
          {customDetail || config.description}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'var(--sk-color-surface)',
            border: '1px solid var(--sk-color-rule-strong)',
            color: 'var(--sk-color-text)',
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
