import React from 'react';
import { useTheme } from '../theme/theme';
import {
  WifiOff,
  Server,
  Lock,
  ShieldAlert,
  Wrench,
  Search,
  CheckCircle2,
  X,
} from 'lucide-react';

export type ErrorStateCode = 'E1_404' | 'E2_OFFLINE' | 'E3_500' | 'E4_SESSION_EXPIRED' | 'E5_OUT_OF_SCOPE' | 'E6_MAINTENANCE';

interface SystemErrorOverlayProps {
  errorCode: ErrorStateCode;
  onClose?: () => void;
  onRetry?: () => void;
}

export const SystemErrorOverlay: React.FC<SystemErrorOverlayProps> = ({
  errorCode,
  onClose,
  onRetry,
}) => {
  const { tokens, typography } = useTheme();

  const getErrorDetails = () => {
    switch (errorCode) {
      case 'E1_404':
        return {
          codeLabel: '404 · NOT FOUND',
          title: 'That record is not on your line.',
          body: 'It may have been deleted, or the link may belong to someone else’s vault. Nothing has been lost from your own records.',
          primaryAction: 'Back to your records',
          secondaryAction: 'Search your records',
          survivedMessage: 'Nothing has been deleted from your personal health vault.',
          icon: <Search size={22} color={tokens.action} />,
          badgeColor: tokens.action,
        };
      case 'E2_OFFLINE':
        return {
          codeLabel: 'OFFLINE',
          title: 'You can still read everything you have.',
          body: 'Fourteen records are cached on this phone, including your emergency card. Two new uploads will send themselves when you are back online.',
          primaryAction: 'Read your cached records',
          secondaryAction: 'Try again',
          survivedMessage: 'Your emergency card never needs a connection. It opens from the lock screen either way.',
          icon: <WifiOff size={22} color={tokens.attention} />,
          badgeColor: tokens.attention,
        };
      case 'E3_500':
        return {
          codeLabel: '500 · SERVER ERROR',
          title: 'Something broke on our side.',
          body: 'Your records are not affected — nothing was being written when this happened. We have been told automatically and are already looking.',
          primaryAction: 'Try again',
          secondaryAction: 'Open your cached records',
          survivedMessage: 'Reference Code: SK-8F4C-2109 · Quote this if you contact support.',
          icon: <Server size={22} color={tokens.emergency} />,
          badgeColor: tokens.emergency,
        };
      case 'E4_SESSION_EXPIRED':
        return {
          codeLabel: 'SESSION EXPIRED',
          title: 'You have been signed out.',
          body: 'Sessions end after 30 days on a device, or straight away if you signed out everywhere. Your records are untouched and encrypted.',
          primaryAction: 'Sign in again',
          secondaryAction: 'Get a code on WhatsApp',
          survivedMessage: 'Emergency card is still readable without signing in.',
          icon: <Lock size={22} color={tokens.attention} />,
          badgeColor: tokens.attention,
        };
      case 'E5_OUT_OF_SCOPE':
        return {
          codeLabel: '403 · OUT OF SCOPE',
          title: 'This student is not in your camp.',
          body: 'Your access covers the Osmania CSE camp on 21 August and closes when that review is signed off. It does not extend to the wider student body.',
          primaryAction: 'Back to the review queue',
          secondaryAction: undefined,
          survivedMessage: 'Scope is granted per camp, and this attempt is written to the student’s access log.',
          icon: <ShieldAlert size={22} color={tokens.attention} />,
          badgeColor: tokens.attention,
        };
      case 'E6_MAINTENANCE':
        return {
          codeLabel: 'SCHEDULED MAINTENANCE',
          title: 'We are moving some things around.',
          body: 'Back at 04:30 IST. New uploads and bookings are paused, and anything you already have on this phone stays readable.',
          primaryAction: 'Read your cached records',
          secondaryAction: undefined,
          survivedMessage: 'Cached records & Emergency card remain 100% operational.',
          icon: <Wrench size={22} color={tokens.positive} />,
          badgeColor: tokens.positive,
        };
    }
  };

  const err = getErrorDetails();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 8, 36, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 999990,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: tokens.surface,
          borderRadius: 24,
          border: `1.5px solid ${tokens.rule}`,
          padding: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          position: 'relative',
        }}
      >
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              right: 18,
              top: 18,
              background: tokens.surface2,
              border: `1px solid ${tokens.ruleSoft}`,
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: tokens.text,
            }}
          >
            <X size={16} />
          </button>
        )}

        {/* Code Label Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ padding: 8, borderRadius: 10, backgroundColor: tokens.surface3 }}>
            {err.icon}
          </div>
          <span style={{ fontSize: 11, fontFamily: typography.fontMono, color: err.badgeColor, fontWeight: 800, letterSpacing: 0.5 }}>
            {err.codeLabel}
          </span>
        </div>

        {/* Headline */}
        <h3 style={{ fontSize: 22, fontWeight: 900, color: tokens.text, margin: '0 0 10px', letterSpacing: -0.5 }}>
          {err.title}
        </h3>

        {/* Body Copy */}
        <p style={{ fontSize: 13.5, color: tokens.text2, lineHeight: 1.55, margin: '0 0 18px' }}>
          {err.body}
        </p>

        {/* Survived Proof Box */}
        <div style={{ backgroundColor: tokens.canvas, borderRadius: 14, padding: 14, border: `1px solid ${tokens.ruleSoft}`, marginBottom: 22, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <CheckCircle2 size={16} color={tokens.positive} style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: tokens.text2, lineHeight: 1.45 }}>
            <b>What Survived:</b> {err.survivedMessage}
          </div>
        </div>

        {/* Primary & Secondary Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onRetry || onClose}
            style={{
              backgroundColor: tokens.action,
              color: '#ffffff',
              border: 'none',
              borderRadius: 9999,
              padding: '13px 20px',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(83, 80, 204, 0.3)',
            }}
          >
            {err.primaryAction}
          </button>

          {err.secondaryAction && (
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                color: tokens.action,
                border: `1.5px solid ${tokens.rule}`,
                borderRadius: 9999,
                padding: '11px 20px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              {err.secondaryAction}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
