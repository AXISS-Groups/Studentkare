import React, { useEffect, useState } from 'react';
import { useTheme } from '../../theme/theme';
import { apiRequest, ApiError } from '../../data/http';
import {
  BarChart3,
  MessageCircle,
  Mail,
  Flame,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BrainCircuit,
  Globe,
  Upload,
  Image as ImageIcon,
  Sliders,
  X,
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

type Provider = 'platform' | 'posthog' | 'openwa' | 'postal' | 'firebase' | 'otp' | 'twofa' | 'llm';

const PROVIDER_META: Record<Provider, { title: string; desc: string; icon: any; category: string }> = {
  platform: {
    title: 'Brand & Platform Settings',
    desc: 'Configure brand identity, header logo, browser favicon, registered address, and public domain for emails and links.',
    icon: Globe,
    category: 'Brand & Identity',
  },
  posthog: {
    title: 'PostHog Analytics',
    desc: 'Product analytics & session telemetry. Track student flows and feature adoption safely.',
    icon: BarChart3,
    category: 'Telemetry',
  },
  openwa: {
    title: 'WhatsApp Gateway (OpenWA)',
    desc: 'Self-hosted WAHA/OpenWA gateway for high-priority instant WhatsApp OTP code delivery.',
    icon: MessageCircle,
    category: 'Communications',
  },
  postal: {
    title: 'Postal Mail Server',
    desc: 'Self-hosted Postal mail engine for transactional campus emails and fallback OTP dispatch.',
    icon: Mail,
    category: 'Communications',
  },
  firebase: {
    title: 'Firebase FCM & Auth',
    desc: 'Push notification engine and client SDK tokens for real-time alerts across devices.',
    icon: Flame,
    category: 'Cloud Services',
  },
  otp: {
    title: 'OTP Security & Expiry Policy',
    desc: 'Manage default verification channels, expiration durations (TTL), and rate limiting.',
    icon: KeyRound,
    category: 'Security & Auth',
  },
  twofa: {
    title: 'Two-Factor TOTP Policies',
    desc: 'Authenticator app (Google Authenticator / Authy) enforcement for administrative tiers.',
    icon: ShieldCheck,
    category: 'Security & Auth',
  },
  llm: {
    title: 'AI & Intelligence Gateway',
    desc: 'Medical triage agents, clinical guidelines guard models, and intelligent health assistants.',
    icon: BrainCircuit,
    category: 'AI & Machine Learning',
  },
};

const FIELD_LABELS: Record<string, { label: string; description?: string; placeholder?: string }> = {
  // Platform
  app_domain: { label: 'Application Domain', description: 'Primary web domain for links and notifications.', placeholder: 'studentkare.co' },
  brand_name: { label: 'Platform Brand Name', description: 'Display name appearing across navigation and notices.', placeholder: 'StudentKare' },
  support_email: { label: 'Support Email Address', description: 'Inbound helpdesk email visible to campus members.', placeholder: 'support@studentkare.co' },
  support_phone: { label: 'Support Phone / Hotline', description: 'Help desk or emergency phone number.', placeholder: '+91 80080 00000' },
  company_address: { label: 'Official Campus / Company Address', description: 'Full physical address shown in notices and footers.', placeholder: 'Knowledge Park, HITEC City, Hyderabad, 500081' },
  copyright_text: { label: 'Footer Copyright Notice', description: 'Standard copyright text displayed at page bottoms.', placeholder: '© 2026 StudentKare. All rights reserved.' },
  logo_url: { label: 'Header Logo URL / Path', description: 'Custom uploaded header logo asset.', placeholder: '/api/platform/asset/logo' },
  favicon_url: { label: 'Browser Favicon URL / Path', description: 'Custom browser tab icon asset.', placeholder: '/api/platform/asset/favicon' },

  // OTP
  channel: { label: 'Default OTP Channel', description: 'Primary delivery method for one-time verification passcodes.', placeholder: 'WHATSAPP or EMAIL' },
  length: { label: 'OTP Passcode Length', description: 'Number of digits generated in verification codes.', placeholder: '6' },
  ttl_seconds: { label: 'Passcode Expiry (Seconds)', description: 'Validity duration before code expires (e.g. 300 = 5 min).', placeholder: '300' },
  max_attempts: { label: 'Maximum Failed Attempts', description: 'Attempts permitted before locking verification flow.', placeholder: '5' },

  // TwoFA
  enforced_roles: { label: 'Roles Enforcing 2FA Verification', description: 'Comma-separated administrative roles required to use TOTP.', placeholder: 'SUPER_ADMIN, CAMPUS_ADMIN' },
  issuer: { label: 'Authenticator App Issuer Name', description: 'Service name displayed inside Google Authenticator or Authy.', placeholder: 'StudentKare' },

  // Postal
  api_url: { label: 'Postal Server API Endpoint', description: 'Base URL for Postal mail server instance.', placeholder: 'https://postal.yourdomain.com' },
  server_api_key: { label: 'Postal Server API Key', description: 'Server authentication token generated in Postal admin.', placeholder: 'Secret server key' },
  from_email: { label: 'Outgoing Sender Email ("From")', description: 'Address and name used as sender for platform emails.', placeholder: 'StudentKare <noreply@studentkare.co>' },

  // OpenWA
  base_url: { label: 'OpenWA / WAHA Gateway URL', description: 'Host endpoint where OpenWA / WAHA container is running.', placeholder: 'http://localhost:3000' },
  api_key: { label: 'OpenWA API Token', description: 'API token configured in OpenWA.', placeholder: 'Gateway Secret Token' },
  session_id: { label: 'WhatsApp Session Identifier', description: 'Active WhatsApp session ID (e.g. default).', placeholder: 'default' },
  default_country_code: { label: 'Default Country Dialing Code', description: 'Prefix applied to domestic mobile numbers.', placeholder: '91' },

  // PostHog
  host: { label: 'PostHog Host URL', description: 'Cloud or self-hosted PostHog instance endpoint.', placeholder: 'https://app.posthog.com' },
  autocapture: { label: 'Enable Frontend Autocapture', description: 'Record non-sensitive clicks and navigation telemetry.' },

  // Firebase
  auth_domain: { label: 'Firebase Auth Domain', placeholder: 'project.firebaseapp.com' },
  project_id: { label: 'Firebase Project ID', placeholder: 'studentkare-firebase' },
  messaging_sender_id: { label: 'FCM Messaging Sender ID', placeholder: '109823487123' },
  app_id: { label: 'Firebase App ID', placeholder: '1:12345:web:abcdef' },
  vapid_key: { label: 'FCM Web Push VAPID Key', placeholder: 'Web Push Public Key' },
  server_key: { label: 'Firebase Server Key (Legacy)', placeholder: 'FCM Server Key' },
  service_account_json: { label: 'Firebase Service Account JSON', placeholder: '{ "type": "service_account", ... }' },

  // LLM
  provider: { label: 'Active LLM Provider', description: 'Model provider (openai, gemini, or ollama).', placeholder: 'openai' },
  model: { label: 'Model Identifier', description: 'Model name used by reasoning and triage loops.', placeholder: 'gpt-4o-mini / llama3.1:8b' },
};

function isSecretKey(k: string) {
  return /key|secret|token|password|service_account/i.test(k);
}

export const IntegrationsSettingsModule: React.FC = () => {
  const { tokens, typography } = useTheme();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Record<string, Record<string, any>>>({});
  const [saved, setSaved] = useState<Record<string, Record<string, any>>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState('');

  // Active modal for the selected provider
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);

  // Asset upload state (Logo / Favicon)
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'favicon' | null>(null);
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetBusy, setAssetBusy] = useState(false);
  const [assetMsg, setAssetMsg] = useState('');

  const loadData = async () => {
    try {
      const res = await apiRequest<{ integrations: Record<string, Record<string, any>> }>('/admin/integrations');
      setForms(res.integrations);
      setSaved(res.integrations);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Could not load integrations.');
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, []);

  const setField = (p: Provider, k: string, v: any) => {
    setForms((f) => ({ ...f, [p]: { ...(f[p] || {}), [k]: v } }));
  };

  const dirty = (p: Provider) => JSON.stringify(forms[p] || {}) !== JSON.stringify(saved[p] || {});

  const handleSave = async (p: Provider) => {
    setBusy((b) => ({ ...b, [p]: true }));
    setMsg((m) => ({ ...m, [p]: undefined as any }));
    const payload: Record<string, any> = {};
    Object.entries(forms[p] || {}).forEach(([k, v]) => {
      if (!k.endsWith('_masked')) payload[k] = v;
    });
    const res = await apiRequest<{ success: boolean; provider: string; config: Record<string, any>; message?: string }>(`/admin/integrations/${p}`, {
      method: 'PUT',
      body: JSON.stringify({ config: payload }),
    }).catch((e: unknown) => ({ success: false as const, provider: p, config: forms[p], message: e instanceof ApiError ? e.message : 'Save failed' }));
    setBusy((b) => ({ ...b, [p]: false }));
    if (res?.success) {
      setSaved((s) => ({ ...s, [p]: res.config ?? forms[p] }));
      setForms((f) => ({ ...f, [p]: res.config ?? forms[p] }));
      setMsg((m) => ({ ...m, [p]: { ok: true, text: 'Settings saved & applied in real time.' } }));
    } else {
      setMsg((m) => ({ ...m, [p]: { ok: false, text: (res as any)?.message || 'Save failed' } }));
    }
  };

  const handleTest = async (p: Provider) => {
    setBusy((b) => ({ ...b, [`${p}_test`]: true }));
    const res = await apiRequest<{ success: boolean; message?: string }>(`/admin/integrations/${p}/test`, { method: 'POST' })
      .catch((e: unknown) => ({ success: false as const, message: e instanceof ApiError ? e.message : 'Test failed' }));
    setBusy((b) => ({ ...b, [`${p}_test`]: false }));
    setMsg((m) => ({ ...m, [p]: res?.success ? { ok: true, text: res.message || 'Connected successfully ✓' } : { ok: false, text: res?.message || 'Connection test failed' } }));
  };

  const handleAssetUpload = async () => {
    if (!uploadingAsset || !assetFile) return;
    setAssetBusy(true);
    setAssetMsg('');
    const fd = new FormData();
    fd.append('file', assetFile);
    try {
      const res = await apiRequest<{ success: boolean; url: string }>(`/admin/platform/asset/${uploadingAsset}`, {
        method: 'POST',
        body: fd,
      });
      if (res.success) {
        setField('platform', `${uploadingAsset}_url`, res.url);
        setAssetMsg(`Successfully updated platform ${uploadingAsset}!`);
        await loadData();
        setAssetFile(null);
        setTimeout(() => {
          setUploadingAsset(null);
          setAssetMsg('');
        }, 1200);
      }
    } catch (e: any) {
      setAssetMsg(e?.message || 'Upload failed. Please try again.');
    } finally {
      setAssetBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: tokens.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Loader2 size={18} className="wf-spin" color={tokens.action} />
        <span>Loading platform integrations…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: 32, backgroundColor: tokens.surface, border: `1px solid ${tokens.emergency}`, borderRadius: 16, color: tokens.emergency, display: 'flex', alignItems: 'center', gap: 12 }}>
        <ShieldAlert size={22} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Access Restricted</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{loadError} Super-admin access is required.</div>
        </div>
      </div>
    );
  }

  const activeMeta = activeProvider ? PROVIDER_META[activeProvider] : null;
  const activeData = activeProvider ? forms[activeProvider] || {} : {};
  const activeFields = activeProvider ? Object.keys(activeData).filter((k) => !k.endsWith('_masked')) : [];

  return (
    <div>
      {/* Header Banner */}
      <div style={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.ruleSoft}`, borderRadius: 16, padding: '24px 28px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: tokens.text, letterSpacing: '-0.02em' }}>
              Platform Integrations & Brand Settings
            </h3>
            <p style={{ margin: '8px 0 0 0', fontSize: 13, color: tokens.text2, lineHeight: 1.5, maxWidth: 800 }}>
              Manage brand assets (logo, favicon, address), messaging servers (WhatsApp, Postal), notifications, security policies, and AI gateways. Click any card to inspect or customize its live configuration.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 9999, backgroundColor: tokens.surface2, border: `1px solid ${tokens.rule}` }}>
            <div style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: tokens.positive }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: tokens.text2 }}>All Services Real-Time</span>
          </div>
        </div>
      </div>

      {/* Cards Grid Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {(Object.keys(PROVIDER_META) as Provider[]).map((p) => {
          const meta = PROVIDER_META[p];
          const Icon = meta.icon;
          const data = forms[p] || {};
          const isDirty = dirty(p);

          // Summaries
          let summary = '';
          if (p === 'platform') {
            summary = `${data.brand_name || 'StudentKare'} · ${data.app_domain || 'studentkare.co'}`;
          } else if (p === 'openwa') {
            summary = data.base_url ? `${data.base_url} · Session: ${data.session_id || 'default'}` : 'Not configured';
          } else if (p === 'postal') {
            summary = data.api_url ? `${data.api_url} · ${data.from_email || ''}` : 'Not configured';
          } else if (p === 'otp') {
            summary = `Channel: ${data.channel || 'WHATSAPP'} · TTL: ${data.ttl_seconds || 300}s`;
          } else if (p === 'twofa') {
            summary = `Issuer: ${data.issuer || 'StudentKare'} · Roles: ${Array.isArray(data.enforced_roles) ? data.enforced_roles.join(', ') : 'None'}`;
          } else if (p === 'posthog') {
            summary = data.host ? `${data.host}` : 'Analytics connected';
          } else if (p === 'firebase') {
            summary = data.project_id ? `Project: ${data.project_id}` : 'FCM configured';
          } else if (p === 'llm') {
            summary = `Provider: ${data.provider || 'openai'} · Model: ${data.model || 'gpt-4o-mini'}`;
          }

          return (
            <div
              key={p}
              onClick={() => setActiveProvider(p)}
              style={{
                backgroundColor: tokens.surface,
                border: `1px solid ${tokens.ruleSoft}`,
                borderRadius: 16,
                padding: 22,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.18s ease-in-out',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = tokens.action;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = tokens.ruleSoft;
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
              }}
            >
              <div>
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: tokens.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${tokens.ruleSoft}` }}>
                      <Icon size={22} color={tokens.action} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: tokens.text3, letterSpacing: '0.04em' }}>{meta.category}</div>
                      <h4 style={{ margin: '2px 0 0 0', fontSize: 15, fontWeight: 800, color: tokens.text }}>{meta.title}</h4>
                    </div>
                  </div>

                  {data.enabled !== undefined && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 9999, backgroundColor: data.enabled ? tokens.positiveBg : tokens.surface3, color: data.enabled ? tokens.positive : tokens.text3, border: `1px solid ${data.enabled ? tokens.positive : tokens.ruleSoft}` }}>
                      {data.enabled ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p style={{ fontSize: 12, color: tokens.text2, margin: '0 0 16px 0', lineHeight: 1.45, minHeight: 36 }}>
                  {meta.desc}
                </p>

                {/* Brand Preview / Quick Summary */}
                {p === 'platform' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 10, backgroundColor: tokens.surface2, border: `1px solid ${tokens.ruleSoft}`, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: tokens.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {data.logo_url ? (
                        <img src={data.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <Globe size={18} color={tokens.action} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: tokens.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {data.brand_name || 'StudentKare'}
                      </div>
                      <div style={{ fontSize: 11, color: tokens.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {data.app_domain || 'studentkare.co'}
                      </div>
                    </div>
                  </div>
                )}

                {p !== 'platform' && (
                  <div style={{ fontSize: 11, color: tokens.text2, backgroundColor: tokens.surface2, padding: '7px 12px', borderRadius: 8, border: `1px solid ${tokens.ruleSoft}`, marginBottom: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 700, color: tokens.text }}>Status: </span>{summary}
                  </div>
                )}
              </div>

              {/* Action Button Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: `1px solid ${tokens.ruleSoft}` }}>
                {isDirty ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: tokens.emergency }}>Unsaved edits</span>
                ) : (
                  <span style={{ fontSize: 11, color: tokens.text3 }}>Synced with server</span>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveProvider(p); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: `1px solid ${tokens.rule}`,
                    backgroundColor: tokens.surface,
                    color: tokens.text,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = tokens.surface2; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = tokens.surface; }}
                >
                  <Sliders size={13} color={tokens.action} />
                  <span>Configure</span>
                  <ChevronRight size={13} color={tokens.text3} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Modal Dialog */}
      {activeProvider && activeMeta && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            padding: 20,
          }}
          onClick={() => setActiveProvider(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: tokens.surface,
              borderRadius: 20,
              maxWidth: 720,
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: `1px solid ${tokens.ruleSoft}`,
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tokens.ruleSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: tokens.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${tokens.ruleSoft}` }}>
                  {React.createElement(activeMeta.icon, { size: 20, color: tokens.action })}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: tokens.text3 }}>{activeMeta.category}</div>
                  <h3 style={{ margin: '2px 0 0 0', fontSize: 17, fontWeight: 900, color: tokens.text }}>{activeMeta.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveProvider(null)}
                style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${tokens.ruleSoft}`, backgroundColor: tokens.surface2, color: tokens.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <p style={{ margin: '0 0 20px 0', fontSize: 13, color: tokens.text2, lineHeight: 1.5 }}>
                {activeMeta.desc}
              </p>

              {/* Special Brand Assets Upload for Platform */}
              {activeProvider === 'platform' && (
                <div style={{ backgroundColor: tokens.surface2, border: `1px solid ${tokens.ruleSoft}`, borderRadius: 14, padding: 18, marginBottom: 22 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: tokens.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ImageIcon size={16} color={tokens.action} />
                    <span>Visual Brand Assets (Logo & Favicon)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ backgroundColor: tokens.surface, border: `1px dashed ${tokens.rule}`, borderRadius: 10, padding: 14, textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: tokens.text, marginBottom: 8 }}>Header Logo</div>
                      <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        {activeData.logo_url ? (
                          <img src={activeData.logo_url} alt="Logo" style={{ maxHeight: 44, maxWidth: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: 11, color: tokens.text3 }}>Default Platform Logo</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setUploadingAsset('logo'); setAssetFile(null); setAssetMsg(''); }}
                        style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <Upload size={12} /> Upload New Logo
                      </button>
                    </div>

                    <div style={{ backgroundColor: tokens.surface, border: `1px dashed ${tokens.rule}`, borderRadius: 10, padding: 14, textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: tokens.text, marginBottom: 8 }}>Browser Favicon</div>
                      <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        {activeData.favicon_url ? (
                          <img src={activeData.favicon_url} alt="Favicon" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: 11, color: tokens.text3 }}>/favicon.svg</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setUploadingAsset('favicon'); setAssetFile(null); setAssetMsg(''); }}
                        style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <Upload size={12} /> Upload New Favicon
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Field Form */}
              <div style={{ display: 'grid', gridTemplateColumns: activeFields.length > 4 ? '1fr 1fr' : '1fr', gap: 16 }}>
                {activeFields.map((k) => {
                  const masked = activeData[`${k}_masked`] as string | undefined;
                  const secret = isSecretKey(k);
                  const val = activeData[k];
                  const fieldInfo = FIELD_LABELS[k] || { label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) };
                  const isFullWidth = activeFields.length <= 4 || k === 'company_address' || k === 'copyright_text' || k === 'service_account_json' || k === 'enforced_roles';

                  if (typeof val === 'boolean') {
                    return (
                      <div key={k} style={{ gridColumn: isFullWidth ? '1 / -1' : undefined }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: tokens.text, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, backgroundColor: tokens.surface2, border: `1px solid ${tokens.ruleSoft}` }}>
                          <input
                            type="checkbox"
                            checked={!!val}
                            onChange={(e) => setField(activeProvider, k, e.target.checked)}
                            style={{ width: 16, height: 16, cursor: 'pointer', marginTop: 2 }}
                          />
                          <div>
                            <strong style={{ display: 'block', fontSize: 13 }}>{fieldInfo.label}</strong>
                            {fieldInfo.description && <small style={{ color: tokens.text3, fontSize: 11 }}>{fieldInfo.description}</small>}
                          </div>
                        </label>
                      </div>
                    );
                  }

                  if (Array.isArray(val)) {
                    return (
                      <div key={k} style={{ gridColumn: isFullWidth ? '1 / -1' : undefined }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: tokens.text, marginBottom: 4 }}>
                          {fieldInfo.label}
                        </label>
                        {fieldInfo.description && <small style={{ color: tokens.text3, fontSize: 11, display: 'block', marginBottom: 6 }}>{fieldInfo.description}</small>}
                        <input
                          value={(val as string[]).join(', ')}
                          placeholder={fieldInfo.placeholder || 'Comma-separated values'}
                          onChange={(e) => setField(activeProvider, k, e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={k} style={{ gridColumn: isFullWidth ? '1 / -1' : undefined }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: tokens.text }}>{fieldInfo.label}</label>
                        {secret && masked && (
                          <span style={{ color: tokens.text3, fontSize: 11 }}>
                            stored: {showSecrets[activeProvider] ? String(val || '—') : masked}
                          </span>
                        )}
                      </div>
                      {fieldInfo.description && <small style={{ color: tokens.text3, fontSize: 11, display: 'block', marginBottom: 6 }}>{fieldInfo.description}</small>}
                      <input
                        type={secret && !showSecrets[activeProvider] ? 'password' : k === 'ttl_seconds' || k === 'length' || k === 'max_attempts' ? 'number' : 'text'}
                        value={typeof val === 'number' ? val : (val as string) ?? ''}
                        placeholder={fieldInfo.placeholder || fieldInfo.label}
                        onChange={(e) => setField(activeProvider, k, e.target.type === 'number' ? Number(e.target.value) : e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: `1px solid ${tokens.rule}`,
                          backgroundColor: tokens.surface2,
                          color: tokens.text,
                          fontSize: 13,
                          boxSizing: 'border-box',
                          fontFamily: secret ? typography.fontMono : undefined,
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Status or Error Notification */}
              {msg[activeProvider] && (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: msg[activeProvider].ok ? tokens.positive : tokens.emergency,
                    padding: '12px 14px',
                    borderRadius: 8,
                    backgroundColor: msg[activeProvider].ok ? tokens.positiveBg : tokens.surface3,
                    border: `1px solid ${msg[activeProvider].ok ? tokens.positive : tokens.emergency}`,
                    marginTop: 20,
                  }}
                >
                  {msg[activeProvider].ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{msg[activeProvider].text}</span>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${tokens.ruleSoft}`, backgroundColor: tokens.surface2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {activeFields.some(isSecretKey) && (
                  <button
                    type="button"
                    onClick={() => setShowSecrets((s) => ({ ...s, [activeProvider]: !s[activeProvider] }))}
                    style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface, color: tokens.text2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {showSecrets[activeProvider] ? 'Hide Secrets' : 'Reveal Secrets'}
                  </button>
                )}
                {activeProvider !== 'platform' && (
                  <button
                    type="button"
                    onClick={() => handleTest(activeProvider)}
                    disabled={!!busy[`${activeProvider}_test`]}
                    style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface, color: tokens.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {busy[`${activeProvider}_test`] && <Loader2 size={12} className="wf-spin" />}
                    <span>{busy[`${activeProvider}_test`] ? 'Testing…' : 'Test Connection'}</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setActiveProvider(null)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface, color: tokens.text, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(activeProvider)}
                  disabled={!!busy[activeProvider] || !dirty(activeProvider)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: dirty(activeProvider) ? tokens.action : tokens.surface3,
                    color: dirty(activeProvider) ? '#fff' : tokens.text3,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: dirty(activeProvider) ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: dirty(activeProvider) ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                  }}
                >
                  {busy[activeProvider] && <Loader2 size={14} className="wf-spin" />}
                  <span>Save Configuration</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset Upload Sub-Modal */}
      {uploadingAsset && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 }}>
          <div style={{ backgroundColor: tokens.surface, borderRadius: 16, padding: 24, maxWidth: 460, width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', border: `1px solid ${tokens.ruleSoft}` }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 800, color: tokens.text }}>
              Upload Custom {uploadingAsset === 'logo' ? 'Header Logo' : 'Browser Favicon'}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 12, color: tokens.text3, lineHeight: 1.45 }}>
              Select an image file from your device (PNG, JPEG, SVG, or WEBP · max 3 MB). The new asset is saved securely and updated in real time.
            </p>

            <div style={{ marginBottom: 16 }}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
                onChange={(e) => setAssetFile(e.target.files?.[0] || null)}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontSize: 12, boxSizing: 'border-box' }}
              />
            </div>

            {assetFile && (
              <div style={{ marginBottom: 16, padding: 14, backgroundColor: tokens.surface2, borderRadius: 10, textAlign: 'center', border: `1px solid ${tokens.ruleSoft}` }}>
                <span style={{ fontSize: 11, color: tokens.text3, display: 'block', marginBottom: 6 }}>Asset Preview:</span>
                <img
                  src={URL.createObjectURL(assetFile)}
                  alt="Preview"
                  style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain', margin: '0 auto', display: 'block' }}
                />
              </div>
            )}

            {assetMsg && (
              <div style={{ fontSize: 12, fontWeight: 700, color: assetMsg.includes('Successfully') ? tokens.positive : tokens.emergency, marginBottom: 12 }}>
                {assetMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setUploadingAsset(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!assetFile || assetBusy}
                onClick={handleAssetUpload}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', backgroundColor: tokens.action, color: '#fff', fontSize: 12, fontWeight: 800, cursor: !assetFile || assetBusy ? 'default' : 'pointer', opacity: !assetFile || assetBusy ? 0.6 : 1 }}
              >
                {assetBusy ? 'Uploading…' : 'Upload & Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
