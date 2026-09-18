import React, { useEffect, useState } from 'react';
import { useTheme } from '../../theme/theme';
import { apiRequest, ApiError } from '../../data/http';
import { BarChart3, MessageCircle, Mail, Flame, KeyRound, ShieldCheck, CheckCircle2, AlertCircle, Loader2, BrainCircuit, Globe, Upload, Image as ImageIcon } from 'lucide-react';

type Provider = 'platform' | 'posthog' | 'openwa' | 'postal' | 'firebase' | 'otp' | 'twofa' | 'llm';

const PROVIDER_META: Record<Provider, { title: string; desc: string; icon: any }> = {
  platform: { title: 'Brand & Platform Settings', desc: 'Configure brand identity, logo, favicon, official address, and public domain for emails and links.', icon: Globe },
  posthog: { title: 'PostHog Analytics', desc: 'Product analytics & session metrics. Obtain your project API key from PostHog Settings.', icon: BarChart3 },
  openwa: { title: 'WhatsApp OTP · OpenWA Gateway', desc: 'Self-hosted OpenWA/WAHA gateway for reliable WhatsApp OTP verification delivery.', icon: MessageCircle },
  postal: { title: 'Email OTP · Postal Mail Server', desc: 'Self-hosted Postal mail server for instant transactional email OTP delivery.', icon: Mail },
  firebase: { title: 'Firebase Cloud Messaging & Auth', desc: 'Client SDK configuration for Push Notifications and Firebase Cloud Messaging.', icon: Flame },
  otp: { title: 'OTP Security & Expiry Policy', desc: 'Manage default OTP channels, expiry duration (TTL), and maximum allowed verification attempts.', icon: KeyRound },
  twofa: { title: 'Two-Factor Authentication (TOTP)', desc: 'Authenticator app (Google Authenticator / 1Password) policies and enforced administrative roles.', icon: ShieldCheck },
  llm: { title: 'AI & Large Language Model Gateway', desc: 'Configure AI agents, medical guard models, triage assistance, and RAG intelligence gateways.', icon: BrainCircuit },
};

const FIELD_LABELS: Record<string, { label: string; description?: string; placeholder?: string }> = {
  // Platform
  app_domain: { label: 'Application Domain', description: 'Primary web domain for referral links and email dispatch.', placeholder: 'studentkare.co' },
  brand_name: { label: 'Platform Brand Name', description: 'Display name appearing across header, navigation, and notifications.', placeholder: 'StudentKare' },
  support_email: { label: 'Customer Support Email', description: 'Inbound enquiry address displayed to account holders.', placeholder: 'support@studentkare.co' },
  support_phone: { label: 'Support Phone / WhatsApp Hotline', description: 'Emergency or customer desk contact number.', placeholder: '+91 80080 00000' },
  company_address: { label: 'Registered Company / Campus Address', description: 'Official address shown in legal notices, footers, and invoices.', placeholder: 'Knowledge Park, HITEC City, Hyderabad, 500081' },
  copyright_text: { label: 'Footer Copyright Notice', description: 'Standard legal copyright statement.', placeholder: '© 2026 StudentKare. All rights reserved.' },
  logo_url: { label: 'Header Logo URL', description: 'Custom uploaded header logo image (or upload below).', placeholder: '/api/platform/asset/logo' },
  favicon_url: { label: 'Browser Favicon URL', description: 'Custom browser tab icon (or upload below).', placeholder: '/api/platform/asset/favicon' },

  // OTP
  channel: { label: 'Default OTP Dispatch Channel', description: 'Primary delivery method for one-time verification codes.', placeholder: 'WHATSAPP or EMAIL' },
  length: { label: 'OTP Code Length', description: 'Number of digits in verification passcodes (usually 6).', placeholder: '6' },
  ttl_seconds: { label: 'Code Expiration (Seconds)', description: 'Duration before a generated OTP expires (e.g. 300 = 5 minutes).', placeholder: '300' },
  max_attempts: { label: 'Maximum Failed Attempts Allowed', description: 'Maximum incorrect code entries before account lock.', placeholder: '5' },

  // TwoFA
  enforced_roles: { label: 'Roles Enforcing 2FA Verification', description: 'Comma-separated administrative roles required to use TOTP.', placeholder: 'SUPER_ADMIN, CAMPUS_ADMIN' },
  issuer: { label: 'Authenticator App Issuer Name', description: 'Service name displayed inside Google Authenticator or Authy.', placeholder: 'StudentKare' },

  // Postal
  api_url: { label: 'Postal Server API Endpoint', description: 'Base URL for Postal mail server.', placeholder: 'https://postal.yourdomain.com' },
  server_api_key: { label: 'Postal Server API Key', description: 'Server authentication token generated in Postal admin.', placeholder: 'Secret server key' },
  from_email: { label: 'Outgoing Sender Email ("From")', description: 'Address and name used as sender for platform emails.', placeholder: 'StudentKare <noreply@studentkare.co>' },

  // OpenWA
  base_url: { label: 'OpenWA / WAHA Gateway URL', description: 'Host endpoint where OpenWA / WAHA container is running.', placeholder: 'http://localhost:3000' },
  api_key: { label: 'OpenWA API Token', description: 'API Key configured in OpenWA.', placeholder: 'Gateway Secret Token' },
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
  model: { label: 'Model Identifier', description: 'Model name used by agents and reasoning loops.', placeholder: 'gpt-4o-mini / llama3.1:8b' },
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
  
  // Asset upload state
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
      method: 'PUT', body: JSON.stringify({ config: payload }),
    }).catch((e: unknown) => ({ success: false as const, provider: p, config: forms[p], message: e instanceof ApiError ? e.message : 'Save failed' }));
    setBusy((b) => ({ ...b, [p]: false }));
    if (res?.success) {
      setSaved((s) => ({ ...s, [p]: res.config ?? forms[p] }));
      setForms((f) => ({ ...f, [p]: res.config ?? forms[p] }));
      setMsg((m) => ({ ...m, [p]: { ok: true, text: 'Settings saved and audit-logged.' } }));
    } else {
      setMsg((m) => ({ ...m, [p]: { ok: false, text: (res as any)?.message || 'Save failed' } }));
    }
  };

  const handleTest = async (p: Provider) => {
    setBusy((b) => ({ ...b, [`${p}_test`]: true }));
    const res = await apiRequest<{ success: boolean; message?: string }>(`/admin/integrations/${p}/test`, { method: 'POST' })
      .catch((e: unknown) => ({ success: false as const, message: e instanceof ApiError ? e.message : 'Test failed' }));
    setBusy((b) => ({ ...b, [`${p}_test`]: false }));
    setMsg((m) => ({ ...m, [p]: res?.success ? { ok: true, text: res.message || 'Connected ✓' } : { ok: false, text: res?.message || 'Test failed' } }));
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
        setAssetMsg(`Successfully uploaded new ${uploadingAsset}!`);
        await loadData();
        setAssetFile(null);
        setTimeout(() => {
          setUploadingAsset(null);
          setAssetMsg('');
        }, 1500);
      }
    } catch (e: any) {
      setAssetMsg(e?.message || 'Upload failed. Please try again.');
    } finally {
      setAssetBusy(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, color: tokens.text2 }}>Loading administrative settings…</div>;
  }

  if (loadError) {
    return <div style={{ padding: 40, color: tokens.emergency }}>{loadError} Super-admin access is required.</div>;
  }

  return (
    <div>
      <div style={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.ruleSoft}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: tokens.text }}>Platform Integrations & Brand Configuration</h3>
        <p style={{ margin: '8px 0 0 0', fontSize: 13, color: tokens.text2, lineHeight: 1.5 }}>
          Manage your live brand settings, upload your header logo and browser favicon, set company address and copyright info, and configure secure API gateways. All modifications update instantly in real time and are permanently recorded in the administrative audit log.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {(Object.keys(PROVIDER_META) as Provider[]).map((p) => {
          const meta = PROVIDER_META[p];
          const Icon = meta.icon;
          const data = forms[p] || {};
          const fields = Object.keys(data).filter((k) => !k.endsWith('_masked'));
          return (
            <div key={p} style={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.ruleSoft}`, borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: tokens.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={tokens.action} />
                </div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: tokens.text }}>{meta.title}</h4>
                {data.enabled !== undefined && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 9999, backgroundColor: data.enabled ? tokens.positiveBg : tokens.surface3, color: data.enabled ? tokens.positive : tokens.text3 }}>
                    {data.enabled ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: tokens.text3, margin: '0 0 16px 0', lineHeight: 1.4 }}>{meta.desc}</p>

              {/* Special Logo & Favicon Uploader for Platform */}
              {p === 'platform' && (
                <div style={{ backgroundColor: tokens.surface2, border: `1px solid ${tokens.ruleSoft}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: tokens.text, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ImageIcon size={15} color={tokens.action} />
                    <span>Visual Brand Assets (Logo & Favicon)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ border: `1px dashed ${tokens.rule}`, borderRadius: 8, padding: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: tokens.text2, marginBottom: 6 }}>Header Logo</div>
                      {data.logo_url ? (
                        <img src={data.logo_url} alt="Logo" style={{ maxHeight: 36, maxWidth: '100%', objectFit: 'contain', margin: '0 auto 8px auto', display: 'block' }} />
                      ) : (
                        <div style={{ fontSize: 11, color: tokens.text3, marginBottom: 8 }}>Default SVG Shield</div>
                      )}
                      <button
                        type="button"
                        onClick={() => { setUploadingAsset('logo'); setAssetFile(null); setAssetMsg(''); }}
                        style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface, color: tokens.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Upload size={12} /> Upload Logo
                      </button>
                    </div>

                    <div style={{ border: `1px dashed ${tokens.rule}`, borderRadius: 8, padding: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: tokens.text2, marginBottom: 6 }}>Browser Favicon</div>
                      {data.favicon_url ? (
                        <img src={data.favicon_url} alt="Favicon" style={{ width: 28, height: 28, objectFit: 'contain', margin: '0 auto 8px auto', display: 'block' }} />
                      ) : (
                        <div style={{ fontSize: 11, color: tokens.text3, marginBottom: 8 }}>/favicon.svg</div>
                      )}
                      <button
                        type="button"
                        onClick={() => { setUploadingAsset('favicon'); setAssetFile(null); setAssetMsg(''); }}
                        style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface, color: tokens.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Upload size={12} /> Upload Favicon
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ flex: 1 }}>
                {fields.map((k) => {
                  const masked = data[`${k}_masked`] as string | undefined;
                  const secret = isSecretKey(k);
                  const val = data[k];
                  const fieldInfo = FIELD_LABELS[k] || { label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) };

                  if (typeof val === 'boolean') {
                    return (
                      <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: tokens.text, marginBottom: 14, cursor: 'pointer', padding: '6px 0' }}>
                        <input type="checkbox" checked={!!val} onChange={(e) => setField(p, k, e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                        <div>
                          <strong style={{ display: 'block' }}>{fieldInfo.label}</strong>
                          {fieldInfo.description && <small style={{ color: tokens.text3, fontSize: 11 }}>{fieldInfo.description}</small>}
                        </div>
                      </label>
                    );
                  }
                  if (Array.isArray(val)) {
                    return (
                      <div key={k} style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: tokens.text }}>{fieldInfo.label}</label>
                        {fieldInfo.description && <small style={{ color: tokens.text3, fontSize: 11, display: 'block', marginBottom: 4 }}>{fieldInfo.description}</small>}
                        <input
                          value={(val as string[]).join(', ')}
                          placeholder={fieldInfo.placeholder || 'Comma-separated values'}
                          onChange={(e) => setField(p, k, e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={k} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: tokens.text }}>{fieldInfo.label}</label>
                        {secret && masked && <span style={{ color: tokens.text3, fontSize: 11 }}>stored: {showSecrets[p] ? String(val || '—') : masked}</span>}
                      </div>
                      {fieldInfo.description && <small style={{ color: tokens.text3, fontSize: 11, display: 'block', marginBottom: 5 }}>{fieldInfo.description}</small>}
                      <input
                        type={secret && !showSecrets[p] ? 'password' : k === 'ttl_seconds' || k === 'length' || k === 'max_attempts' ? 'number' : 'text'}
                        value={typeof val === 'number' ? val : (val as string) ?? ''}
                        placeholder={fieldInfo.placeholder || fieldInfo.label}
                        onChange={(e) => setField(p, k, e.target.type === 'number' ? Number(e.target.value) : e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontSize: 13, boxSizing: 'border-box', fontFamily: secret ? typography.fontMono : undefined }}
                      />
                    </div>
                  );
                })}
              </div>

              {msg[p] && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, fontWeight: 700, color: msg[p].ok ? tokens.positive : tokens.emergency, margin: '8px 0 12px 0' }}>
                  {msg[p].ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {msg[p].text}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${tokens.ruleSoft}` }}>
                <button
                  type="button"
                  onClick={() => handleSave(p)}
                  disabled={!!busy[p] || !dirty(p)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', backgroundColor: dirty(p) ? tokens.action : tokens.surface3, color: dirty(p) ? '#fff' : tokens.text3, fontWeight: 800, fontSize: 12, cursor: dirty(p) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {busy[p] && <Loader2 size={13} className="wf-spin" />} Save {meta.title.split(' ')[0]}
                </button>
                <button
                  type="button"
                  onClick={() => handleTest(p)}
                  disabled={!!busy[`${p}_test`]}
                  style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                >
                  {busy[`${p}_test`] ? 'Testing…' : 'Test connection'}
                </button>
                {Object.keys(data).some(isSecretKey) && (
                  <button
                    type="button"
                    onClick={() => setShowSecrets((s) => ({ ...s, [p]: !s[p] }))}
                    style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: 'none', color: tokens.text3, fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}
                  >
                    {showSecrets[p] ? 'Hide' : 'Show'} secrets
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Asset Upload Modal */}
      {uploadingAsset && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ backgroundColor: tokens.surface, borderRadius: 16, padding: 24, maxWidth: 460, width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 800, color: tokens.text }}>
              Upload Custom {uploadingAsset === 'logo' ? 'Header Logo' : 'Browser Favicon'}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 12, color: tokens.text3 }}>
              Select a file from your computer (PNG, JPEG, SVG, or WEBP · max 3 MB). The new asset will be saved securely and served across the platform.
            </p>

            <div style={{ marginBottom: 16 }}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
                onChange={(e) => setAssetFile(e.target.files?.[0] || null)}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontSize: 12 }}
              />
            </div>

            {assetFile && (
              <div style={{ marginBottom: 16, padding: 12, backgroundColor: tokens.surface2, borderRadius: 8, textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: tokens.text3, display: 'block', marginBottom: 6 }}>Selected Preview:</span>
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

