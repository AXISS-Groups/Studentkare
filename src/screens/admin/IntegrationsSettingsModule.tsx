import React, { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { pressable } from '@/lib/a11y/pressable';
import { useTheme } from '../../theme/tokens/theme';
import { apiRequest, ApiError } from '../../data/services/http';
import { say, useT } from '../../i18n';
import type { MessageKey, Said } from '../../i18n';
import {
  BarChart3,
  Bell,
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
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

type Provider = 'platform' | 'posthog' | 'openwa' | 'postal' | 'slack' | 'firebase' | 'otp' | 'twofa' | 'llm' | 'abdm_hfr';

/** One stored setting, as GET /admin/integrations returns it. */
type ConfigValue = string | number | boolean | string[] | null;
type ProviderConfig = Record<string, ConfigValue>;

const PROVIDER_META: Record<Provider, { title: MessageKey; desc: MessageKey; icon: LucideIcon; category: MessageKey }> = {
  platform: { title: 'admin.int.platform.title', desc: 'admin.int.platform.desc', icon: Globe, category: 'admin.int.cat.brand' },
  posthog: { title: 'admin.int.posthog.title', desc: 'admin.int.posthog.desc', icon: BarChart3, category: 'admin.int.cat.telemetry' },
  openwa: { title: 'admin.int.openwa.title', desc: 'admin.int.openwa.desc', icon: MessageCircle, category: 'admin.int.cat.comms' },
  postal: { title: 'admin.int.postal.title', desc: 'admin.int.postal.desc', icon: Mail, category: 'admin.int.cat.comms' },
  slack: { title: 'admin.int.slack.title', desc: 'admin.int.slack.desc', icon: Bell, category: 'admin.int.cat.comms' },
  firebase: { title: 'admin.int.firebase.title', desc: 'admin.int.firebase.desc', icon: Flame, category: 'admin.int.cat.cloud' },
  otp: { title: 'admin.int.otp.title', desc: 'admin.int.otp.desc', icon: KeyRound, category: 'admin.int.cat.security' },
  twofa: { title: 'admin.int.twofa.title', desc: 'admin.int.twofa.desc', icon: ShieldCheck, category: 'admin.int.cat.security' },
  llm: { title: 'admin.int.llm.title', desc: 'admin.int.llm.desc', icon: BrainCircuit, category: 'admin.int.cat.ai' },
  abdm_hfr: { title: 'admin.int.abdm_hfr.title', desc: 'admin.int.abdm_hfr.desc', icon: Globe, category: 'admin.int.cat.registry' },
};

// Placeholders are example values, so they stay as they are in every language.
const FIELD_LABELS: Record<string, { label: MessageKey; description?: MessageKey; placeholder?: string }> = {
  // Platform
  app_domain: { label: 'admin.int.f.app_domain', description: 'admin.int.d.app_domain', placeholder: 'studentkare.co' },
  brand_name: { label: 'admin.int.f.brand_name', description: 'admin.int.d.brand_name', placeholder: 'StudentKare' },
  support_email: { label: 'admin.int.f.support_email', description: 'admin.int.d.support_email', placeholder: 'support@studentkare.co' },
  support_phone: { label: 'admin.int.f.support_phone', description: 'admin.int.d.support_phone', placeholder: '+91 80080 00000' },
  company_address: { label: 'admin.int.f.company_address', description: 'admin.int.d.company_address', placeholder: 'Knowledge Park, HITEC City, Hyderabad, 500081' },
  copyright_text: { label: 'admin.int.f.copyright_text', description: 'admin.int.d.copyright_text', placeholder: '© 2026 StudentKare. All rights reserved.' },
  logo_url: { label: 'admin.int.f.logo_url', description: 'admin.int.d.logo_url', placeholder: '/api/platform/asset/logo' },
  favicon_url: { label: 'admin.int.f.favicon_url', description: 'admin.int.d.favicon_url', placeholder: '/api/platform/asset/favicon' },

  // OTP
  channel: { label: 'admin.int.f.channel', description: 'admin.int.d.channel', placeholder: 'WHATSAPP / EMAIL' },
  length: { label: 'admin.int.f.length', description: 'admin.int.d.length', placeholder: '6' },
  ttl_seconds: { label: 'admin.int.f.ttl_seconds', description: 'admin.int.d.ttl_seconds', placeholder: '300' },
  max_attempts: { label: 'admin.int.f.max_attempts', description: 'admin.int.d.max_attempts', placeholder: '5' },

  // TwoFA
  enforced_roles: { label: 'admin.int.f.enforced_roles', description: 'admin.int.d.enforced_roles', placeholder: 'SUPER_ADMIN, CAMPUS_ADMIN' },
  issuer: { label: 'admin.int.f.issuer', description: 'admin.int.d.issuer', placeholder: 'StudentKare' },

  // Postal
  api_url: { label: 'admin.int.f.api_url', description: 'admin.int.d.api_url', placeholder: 'https://postal.yourdomain.com' },
  server_api_key: { label: 'admin.int.f.server_api_key', description: 'admin.int.d.server_api_key' },
  from_email: { label: 'admin.int.f.from_email', description: 'admin.int.d.from_email', placeholder: 'StudentKare <noreply@studentkare.co>' },

  // Slack
  enabled: { label: 'admin.int.f.enabled', description: 'admin.int.d.enabled' },
  bot_token: { label: 'admin.int.f.bot_token', description: 'admin.int.d.bot_token', placeholder: 'xoxb-…' },
  default_channel: { label: 'admin.int.f.default_channel', description: 'admin.int.d.default_channel', placeholder: '#ops-alerts' },
  ops_channel: { label: 'admin.int.f.ops_channel', description: 'admin.int.d.ops_channel', placeholder: '#ops-alerts' },
  booking_channel: { label: 'admin.int.f.booking_channel', description: 'admin.int.d.booking_channel', placeholder: '#bookings' },

  // OpenWA
  base_url: { label: 'admin.int.f.base_url', description: 'admin.int.d.base_url', placeholder: 'http://localhost:3000' },
  api_key: { label: 'admin.int.f.api_key', description: 'admin.int.d.api_key' },
  session_id: { label: 'admin.int.f.session_id', description: 'admin.int.d.session_id', placeholder: 'default' },
  default_country_code: { label: 'admin.int.f.default_country_code', description: 'admin.int.d.default_country_code', placeholder: '91' },

  // PostHog
  host: { label: 'admin.int.f.host', description: 'admin.int.d.host', placeholder: 'https://app.posthog.com' },
  autocapture: { label: 'admin.int.f.autocapture', description: 'admin.int.d.autocapture' },

  // Firebase
  auth_domain: { label: 'admin.int.f.auth_domain', placeholder: 'project.firebaseapp.com' },
  project_id: { label: 'admin.int.f.project_id', placeholder: 'studentkare-firebase' },
  messaging_sender_id: { label: 'admin.int.f.messaging_sender_id', placeholder: '109823487123' },
  app_id: { label: 'admin.int.f.app_id', placeholder: '1:12345:web:abcdef' },
  vapid_key: { label: 'admin.int.f.vapid_key' },
  server_key: { label: 'admin.int.f.server_key' },
  service_account_json: { label: 'admin.int.f.service_account_json', placeholder: '{ "type": "service_account", ... }' },

  // LLM
  provider: { label: 'admin.int.f.provider', description: 'admin.int.d.provider', placeholder: 'openai' },
  model: { label: 'admin.int.f.model', description: 'admin.int.d.model', placeholder: 'gpt-4o-mini / llama3.1:8b' },
  // ABDM Health Facility Registry (care directory connector; nothing is fetched until a live search is built)
  registry_url: { label: 'admin.int.f.registry_url', description: 'admin.int.d.registry_url' },
  client_id: { label: 'admin.int.f.client_id', description: 'admin.int.d.client_id' },
  client_secret: { label: 'admin.int.f.client_secret', description: 'admin.int.d.client_secret' },
};

function isSecretKey(k: string) {
  return /key|secret|token|password|service_account/i.test(k);
}

/** WhatsApp delivery as the server sees it (GET /admin/integrations `status.openwa`). */
type WhatsAppState = 'connected' | 'not_connected' | 'not_configured';
const WHATSAPP_STATE_COPY: Record<WhatsAppState, MessageKey> = {
  connected: 'authch.admin.wa.connected',
  not_connected: 'authch.admin.wa.notConnected',
  not_configured: 'authch.admin.wa.notConfigured',
};
const isWhatsAppState = (value: unknown): value is WhatsAppState =>
  value === 'connected' || value === 'not_connected' || value === 'not_configured';

/** A setting as text, or '' when it isn't text. */
const text = (value: ConfigValue | undefined): string => (typeof value === 'string' ? value : '');

export const IntegrationsSettingsModule: React.FC = () => {
  const t = useT();
  const { tokens, typography } = useTheme();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Record<string, ProviderConfig>>({});
  const [saved, setSaved] = useState<Record<string, ProviderConfig>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<Partial<Record<Provider, { ok: boolean; said: Said }>>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  // Configured is not connected: the WhatsApp session can log out while every key is right.
  const [whatsapp, setWhatsapp] = useState<WhatsAppState | null>(null);
  const [loadError, setLoadError] = useState<{ said: Said; forbidden: boolean } | null>(null);

  // Active modal for the selected provider
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);

  // Asset upload state (Logo / Favicon)
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'favicon' | null>(null);
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetBusy, setAssetBusy] = useState(false);
  const [assetMsg, setAssetMsg] = useState<{ ok: boolean; said: Said } | null>(null);

  const loadData = async () => {
    try {
      const res = await apiRequest<{ integrations: Record<string, ProviderConfig>; status?: { openwa?: { state?: unknown } } }>('/admin/integrations');
      const state = res.status?.openwa?.state;
      setWhatsapp(isWhatsAppState(state) ? state : null);
      setForms(res.integrations);
      setSaved(res.integrations);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof ApiError
        ? { said: { raw: e.message }, forbidden: e.status === 401 || e.status === 403 }
        : { said: { key: 'admin.int.loadFailed' }, forbidden: false });
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, []);

  const setField = (p: Provider, k: string, v: ConfigValue) => {
    setForms((f) => ({ ...f, [p]: { ...(f[p] || {}), [k]: v } }));
  };

  const dirty = (p: Provider) => JSON.stringify(forms[p] || {}) !== JSON.stringify(saved[p] || {});

  const handleSave = async (p: Provider) => {
    setBusy((b) => ({ ...b, [p]: true }));
    setMsg((m) => ({ ...m, [p]: undefined }));
    const payload: ProviderConfig = {};
    Object.entries(forms[p] || {}).forEach(([k, v]) => {
      if (!k.endsWith('_masked')) payload[k] = v;
    });
    try {
      const res = await apiRequest<{ success: boolean; provider: string; config?: ProviderConfig; message?: string }>(`/admin/integrations/${p}`, {
        method: 'PUT',
        body: JSON.stringify({ config: payload }),
      });
      if (res.success) {
        setSaved((s) => ({ ...s, [p]: res.config ?? forms[p] }));
        setForms((f) => ({ ...f, [p]: res.config ?? forms[p] }));
        // Only what the server confirmed: the settings are stored.
        setMsg((m) => ({ ...m, [p]: { ok: true, said: { key: 'admin.int.saved' } } }));
      } else {
        setMsg((m) => ({ ...m, [p]: { ok: false, said: res.message ? { raw: res.message } : { key: 'admin.int.saveFailed' } } }));
      }
    } catch (e) {
      setMsg((m) => ({ ...m, [p]: { ok: false, said: e instanceof ApiError ? { raw: e.message } : { key: 'admin.int.saveFailed' } } }));
    } finally {
      setBusy((b) => ({ ...b, [p]: false }));
    }
  };

  const handleTest = async (p: Provider) => {
    setBusy((b) => ({ ...b, [`${p}_test`]: true }));
    const res = await apiRequest<{ success: boolean; message?: string }>(`/admin/integrations/${p}/test`, { method: 'POST' })
      .catch((e: unknown) => ({ success: false as const, message: e instanceof ApiError ? e.message : undefined }));
    setBusy((b) => ({ ...b, [`${p}_test`]: false }));
    setMsg((m) => ({ ...m, [p]: res.success
      ? { ok: true, said: res.message ? { raw: res.message } : { key: 'admin.int.testOk' } }
      : { ok: false, said: res.message ? { raw: res.message } : { key: 'admin.int.testFailed' } } }));
  };

  const handleNotify = async (p: Provider) => {
    setBusy((b) => ({ ...b, [`${p}_notify`]: true }));
    const res = await apiRequest<{ success: boolean; reason?: string; ts?: string }>(`/admin/integrations/slack/notify`, {
      method: 'POST',
      // Sent to Slack, not shown here: stays in English for the ops channel.
      body: JSON.stringify({ text: 'Studentkare test — Slack alerts wired. No patient data included.' }),
    }).catch((e: unknown) => ({ success: false as const, reason: e instanceof ApiError ? e.message : undefined }));
    setBusy((b) => ({ ...b, [`${p}_notify`]: false }));
    setMsg((m) => ({ ...m, [p]: res.success
      ? { ok: true, said: { key: 'admin.int.notifyOk' } }
      : { ok: false, said: res.reason ? { raw: res.reason } : { key: 'admin.int.notifyFailed' } } }));
  };

  const handleAssetUpload = async () => {
    if (!uploadingAsset || !assetFile) return;
    setAssetBusy(true);
    setAssetMsg(null);
    const fd = new FormData();
    fd.append('file', assetFile);
    try {
      const res = await apiRequest<{ success: boolean; url: string }>(`/admin/platform/asset/${uploadingAsset}`, {
        method: 'POST',
        body: fd,
      });
      if (res.success) {
        setField('platform', `${uploadingAsset}_url`, res.url);
        setAssetMsg({ ok: true, said: { key: uploadingAsset === 'logo' ? 'admin.int.logoUpdated' : 'admin.int.faviconUpdated' } });
        await loadData();
        setAssetFile(null);
        setTimeout(() => {
          setUploadingAsset(null);
          setAssetMsg(null);
        }, 1200);
      } else {
        setAssetMsg({ ok: false, said: { key: 'admin.int.uploadFailed' } });
      }
    } catch (e) {
      setAssetMsg({ ok: false, said: e instanceof ApiError ? { raw: e.message } : { key: 'admin.int.uploadFailed' } });
    } finally {
      setAssetBusy(false);
    }
  };

  if (loading) {
    return (
      <div role="status" style={{ padding: 48, textAlign: 'center', color: tokens.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Loader2 size={18} className="wf-spin" color={tokens.action} aria-hidden="true" />
        <span>{t('admin.int.loading')}</span>
      </div>
    );
  }

  if (loadError) {
    // Fail closed: nothing is shown or editable without the server's settings.
    return (
      <div role="alert" style={{ padding: 32, backgroundColor: tokens.surface, border: `1px solid ${tokens.emergency}`, borderRadius: 16, color: tokens.emergency, display: 'flex', alignItems: 'center', gap: 12 }}>
        <ShieldAlert size={22} aria-hidden="true" />
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{loadError.forbidden ? t('admin.int.restricted') : t('admin.int.loadFailedTitle')}</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{say(t, loadError.said)}{loadError.forbidden ? ` ${t('admin.int.superAdminOnly')}` : ''}</div>
        </div>
      </div>
    );
  }

  const activeMeta = activeProvider ? PROVIDER_META[activeProvider] : null;
  const activeData: ProviderConfig = activeProvider ? forms[activeProvider] || {} : {};
  const activeFields = activeProvider ? Object.keys(activeData).filter((k) => !k.endsWith('_masked')) : [];
  const notSet = t('admin.int.notSet');

  return (
    <div>
      {/* Header Banner */}
      <div style={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.ruleSoft}`, borderRadius: 16, padding: '24px 28px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: tokens.text, letterSpacing: '-0.02em' }}>
              {t('admin.int.title')}
            </h3>
            <p style={{ margin: '8px 0 0 0', fontSize: 13, color: tokens.text2, lineHeight: 1.5, maxWidth: 800 }}>
              {t('admin.int.intro')}
            </p>
          </div>
          {/* No overall "all services live" badge: these are stored settings, not probes. Service health is on the Health & jobs tab. */}
        </div>
      </div>

      {/* Cards Grid Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 20 }}>
        {(Object.keys(PROVIDER_META) as Provider[]).map((p) => {
          const meta = PROVIDER_META[p];
          const Icon = meta.icon;
          const data: ProviderConfig = forms[p] || {};
          const isDirty = dirty(p);

          // Summaries: only what is stored. Nothing unset is shown as a default or as "connected".
          let summary = '';
          if (p === 'openwa') {
            summary = text(data.base_url) ? `${text(data.base_url)} · ${t('admin.int.session', { id: text(data.session_id) || notSet })}` : t('admin.int.notConfigured');
          } else if (p === 'postal') {
            summary = text(data.api_url) ? `${text(data.api_url)}${text(data.from_email) ? ` · ${text(data.from_email)}` : ''}` : t('admin.int.notConfigured');
          } else if (p === 'slack') {
            summary = text(data.default_channel) ? `${text(data.default_channel)} · ${data.enabled ? t('admin.int.enabled') : t('admin.int.disabled')}` : t('admin.int.notConfigured');
          } else if (p === 'otp') {
            summary = t('admin.int.otpSummary', { channel: text(data.channel) || notSet, ttl: typeof data.ttl_seconds === 'number' ? `${data.ttl_seconds}s` : notSet });
          } else if (p === 'twofa') {
            summary = t('admin.int.twofaSummary', { issuer: text(data.issuer) || notSet, roles: Array.isArray(data.enforced_roles) && data.enforced_roles.length ? data.enforced_roles.join(', ') : t('admin.int.none') });
          } else if (p === 'posthog') {
            summary = text(data.host) || t('admin.int.notConfigured');
          } else if (p === 'firebase') {
            summary = text(data.project_id) ? t('admin.int.project', { id: text(data.project_id) }) : t('admin.int.notConfigured');
          } else if (p === 'llm') {
            summary = t('admin.int.llmSummary', { provider: text(data.provider) || notSet, model: text(data.model) || notSet });
          } else if (p === 'abdm_hfr') {
            summary = text(data.registry_url) ? text(data.registry_url) : t('admin.int.notConfigured');
          }

          return (
            <div
              key={p}
              {...pressable(() => setActiveProvider(p), t('admin.int.configureFor', { name: t(meta.title) }))}
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
                      <Icon size={22} color={tokens.action} aria-hidden="true" />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: tokens.text3, letterSpacing: '0.04em' }}>{t(meta.category)}</div>
                      <h4 style={{ margin: '2px 0 0 0', fontSize: 15, fontWeight: 800, color: tokens.text }}>{t(meta.title)}</h4>
                    </div>
                  </div>

                  {data.enabled !== undefined && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 9999, backgroundColor: data.enabled ? tokens.positiveBg : tokens.surface3, color: data.enabled ? tokens.positive : tokens.text3, border: `1px solid ${data.enabled ? tokens.positive : tokens.ruleSoft}` }}>
                      {data.enabled ? t('admin.int.active') : t('admin.int.inactive')}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p style={{ fontSize: 12, color: tokens.text2, margin: '0 0 16px 0', lineHeight: 1.45, minHeight: 36 }}>
                  {t(meta.desc)}
                </p>

                {/* Brand Preview / Quick Summary */}
                {p === 'platform' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 10, backgroundColor: tokens.surface2, border: `1px solid ${tokens.ruleSoft}`, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: tokens.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {text(data.logo_url) ? (
                        <img src={text(data.logo_url)} alt={t('admin.int.logo')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <Globe size={18} color={tokens.action} aria-hidden="true" />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: tokens.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {text(data.brand_name) || notSet}
                      </div>
                      <div style={{ fontSize: 11, color: tokens.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {text(data.app_domain) || notSet}
                      </div>
                    </div>
                  </div>
                )}

                {p !== 'platform' && (
                  <div style={{ fontSize: 11, color: tokens.text2, backgroundColor: tokens.surface2, padding: '7px 12px', borderRadius: 8, border: `1px solid ${tokens.ruleSoft}`, marginBottom: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 700, color: tokens.text }}>{t('admin.int.status')} </span>{summary}
                  </div>
                )}
                {p === 'openwa' && whatsapp ? (
                  <div
                    role="status"
                    data-testid="whatsapp-connection"
                    style={{ fontSize: 12, lineHeight: 1.45, fontWeight: 700, padding: '8px 12px', borderRadius: 8, marginBottom: 14, color: whatsapp === 'connected' ? tokens.positive : whatsapp === 'not_connected' ? tokens.attention : tokens.text2, backgroundColor: whatsapp === 'connected' ? tokens.positiveBg : whatsapp === 'not_connected' ? tokens.attentionBg : tokens.surface2 }}
                  >
                    {t('authch.admin.wa.label')}: {t(WHATSAPP_STATE_COPY[whatsapp])}
                  </div>
                ) : null}
              </div>

              {/* Action Button Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: `1px solid ${tokens.ruleSoft}` }}>
                {isDirty ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: tokens.emergency }}>{t('admin.int.unsaved')}</span>
                ) : (
                  <span style={{ fontSize: 11, color: tokens.text3 }}>{t('admin.int.synced')}</span>
                )}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  onClick={(e) => { e.stopPropagation(); setActiveProvider(p); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    minHeight: 44,
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
                  <Sliders size={13} color={tokens.action} aria-hidden="true" />
                  <span>{t('admin.int.configure')}</span>
                  <ChevronRight size={13} color={tokens.text3} aria-hidden="true" />
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="sk-int-dialog-title"
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
                  {React.createElement(activeMeta.icon, { size: 20, color: tokens.action, 'aria-hidden': true })}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: tokens.text3 }}>{t(activeMeta.category)}</div>
                  <h3 id="sk-int-dialog-title" style={{ margin: '2px 0 0 0', fontSize: 17, fontWeight: 900, color: tokens.text }}>{t(activeMeta.title)}</h3>
                </div>
              </div>
              <button aria-label={t('admin.int.close')}
                type="button"
                onClick={() => setActiveProvider(null)}
                style={{ width: 44, height: 44, borderRadius: 8, border: `1px solid ${tokens.ruleSoft}`, backgroundColor: tokens.surface2, color: tokens.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <p style={{ margin: '0 0 20px 0', fontSize: 13, color: tokens.text2, lineHeight: 1.5 }}>
                {t(activeMeta.desc)}
              </p>

              {/* Special Brand Assets Upload for Platform */}
              {activeProvider === 'platform' && (
                <div style={{ backgroundColor: tokens.surface2, border: `1px solid ${tokens.ruleSoft}`, borderRadius: 14, padding: 18, marginBottom: 22 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: tokens.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ImageIcon size={16} color={tokens.action} aria-hidden="true" />
                    <span>{t('admin.int.assets')}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                    <div style={{ backgroundColor: tokens.surface, border: `1px dashed ${tokens.rule}`, borderRadius: 10, padding: 14, textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: tokens.text, marginBottom: 8 }}>{t('admin.int.headerLogo')}</div>
                      <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        {text(activeData.logo_url) ? (
                          <img src={text(activeData.logo_url)} alt={t('admin.int.logo')} style={{ maxHeight: 44, maxWidth: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: 11, color: tokens.text3 }}>{t('admin.int.defaultLogo')}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setUploadingAsset('logo'); setAssetFile(null); setAssetMsg(null); }}
                        style={{ padding: '6px 12px', minHeight: 44, fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <Upload size={12} aria-hidden="true" /> {t('admin.int.uploadLogo')}
                      </button>
                    </div>

                    <div style={{ backgroundColor: tokens.surface, border: `1px dashed ${tokens.rule}`, borderRadius: 10, padding: 14, textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: tokens.text, marginBottom: 8 }}>{t('admin.int.favicon')}</div>
                      <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        {text(activeData.favicon_url) ? (
                          <img src={text(activeData.favicon_url)} alt={t('admin.int.favicon')} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: 11, color: tokens.text3 }}>/favicon.ico</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setUploadingAsset('favicon'); setAssetFile(null); setAssetMsg(null); }}
                        style={{ padding: '6px 12px', minHeight: 44, fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <Upload size={12} aria-hidden="true" /> {t('admin.int.uploadFavicon')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Field Form */}
              <div style={{ display: 'grid', gridTemplateColumns: activeFields.length > 4 ? 'repeat(auto-fit, minmax(240px, 1fr))' : '1fr', gap: 16 }}>
                {activeFields.map((k) => {
                  const masked = text(activeData[`${k}_masked`]);
                  const secret = isSecretKey(k);
                  const val = activeData[k];
                  const known = FIELD_LABELS[k];
                  // A setting this screen has no words for is labelled from its key.
                  const fieldLabel = known ? t(known.label) : k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  const fieldDescription = known?.description ? t(known.description) : '';
                  const placeholder = known?.placeholder;
                  const isFullWidth = activeFields.length <= 4 || k === 'company_address' || k === 'copyright_text' || k === 'service_account_json' || k === 'enforced_roles';
                  const inputId = `sk-int-${activeProvider}-${k}`;

                  if (typeof val === 'boolean') {
                    return (
                      <div key={k} style={{ gridColumn: isFullWidth ? '1 / -1' : undefined }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: tokens.text, cursor: 'pointer', padding: '8px 12px', minHeight: 44, borderRadius: 8, backgroundColor: tokens.surface2, border: `1px solid ${tokens.ruleSoft}` }}>
                          <input
                            type="checkbox"
                            checked={val}
                            onChange={(e) => setField(activeProvider, k, e.target.checked)}
                            style={{ width: 16, height: 16, cursor: 'pointer', marginTop: 2 }}
                          />
                          <div>
                            <strong style={{ display: 'block', fontSize: 13 }}>{fieldLabel}</strong>
                            {fieldDescription && <small style={{ color: tokens.text3, fontSize: 11 }}>{fieldDescription}</small>}
                          </div>
                        </label>
                      </div>
                    );
                  }

                  if (Array.isArray(val)) {
                    return (
                      <div key={k} style={{ gridColumn: isFullWidth ? '1 / -1' : undefined }}>
                        <label htmlFor={inputId} style={{ display: 'block', fontSize: 12, fontWeight: 700, color: tokens.text, marginBottom: 4 }}>
                          {fieldLabel}
                        </label>
                        {fieldDescription && <small style={{ color: tokens.text3, fontSize: 11, display: 'block', marginBottom: 6 }}>{fieldDescription}</small>}
                        <input
                          id={inputId}
                          value={val.join(', ')}
                          placeholder={placeholder || t('admin.int.commaSeparated')}
                          onChange={(e) => setField(activeProvider, k, e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                          style={{ width: '100%', padding: '10px 12px', minHeight: 44, borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={k} style={{ gridColumn: isFullWidth ? '1 / -1' : undefined }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                        <label htmlFor={inputId} style={{ fontSize: 12, fontWeight: 700, color: tokens.text }}>{fieldLabel}</label>
                        {secret && masked && (
                          <span style={{ color: tokens.text3, fontSize: 11 }}>
                            {t('admin.int.stored', { value: showSecrets[activeProvider] ? (val === null || val === '' ? '—' : String(val)) : masked })}
                          </span>
                        )}
                      </div>
                      {fieldDescription && <small style={{ color: tokens.text3, fontSize: 11, display: 'block', marginBottom: 6 }}>{fieldDescription}</small>}
                      <input
                        id={inputId}
                        type={secret && !showSecrets[activeProvider] ? 'password' : k === 'ttl_seconds' || k === 'length' || k === 'max_attempts' ? 'number' : 'text'}
                        value={typeof val === 'number' ? val : val ?? ''}
                        placeholder={placeholder || fieldLabel}
                        onChange={(e) => setField(activeProvider, k, e.target.type === 'number' ? Number(e.target.value) : e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          minHeight: 44,
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
                  role={msg[activeProvider]?.ok ? 'status' : 'alert'}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: msg[activeProvider]?.ok ? tokens.positive : tokens.emergency,
                    padding: '12px 14px',
                    borderRadius: 8,
                    backgroundColor: msg[activeProvider]?.ok ? tokens.positiveBg : tokens.surface3,
                    border: `1px solid ${msg[activeProvider]?.ok ? tokens.positive : tokens.emergency}`,
                    marginTop: 20,
                  }}
                >
                  {msg[activeProvider]?.ok ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}
                  <span>{say(t, msg[activeProvider]?.said ?? { raw: '' })}</span>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${tokens.ruleSoft}`, backgroundColor: tokens.surface2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {activeFields.some(isSecretKey) && (
                  <button
                    type="button"
                    aria-pressed={!!showSecrets[activeProvider]}
                    onClick={() => setShowSecrets((s) => ({ ...s, [activeProvider]: !s[activeProvider] }))}
                    style={{ padding: '6px 12px', minHeight: 44, borderRadius: 6, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface, color: tokens.text2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {showSecrets[activeProvider] ? t('admin.int.hideSecrets') : t('admin.int.revealSecrets')}
                  </button>
                )}
                {activeProvider !== 'platform' && (
                  <button
                    type="button"
                    onClick={() => handleTest(activeProvider)}
                    disabled={!!busy[`${activeProvider}_test`]}
                    style={{ padding: '6px 12px', minHeight: 44, borderRadius: 6, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface, color: tokens.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {busy[`${activeProvider}_test`] && <Loader2 size={12} className="wf-spin" aria-hidden="true" />}
                    <span>{busy[`${activeProvider}_test`] ? t('admin.int.testing') : t('admin.int.test')}</span>
                  </button>
                )}
                {activeProvider === 'slack' && (
                  <button
                    type="button"
                    onClick={() => handleNotify(activeProvider)}
                    disabled={!!busy[`${activeProvider}_notify`]}
                    style={{ padding: '6px 12px', minHeight: 44, borderRadius: 6, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface, color: tokens.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {busy[`${activeProvider}_notify`] && <Loader2 size={12} className="wf-spin" aria-hidden="true" />}
                    <span>{busy[`${activeProvider}_notify`] ? t('admin.int.sending') : t('admin.int.sendTest')}</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setActiveProvider(null)}
                  style={{ padding: '8px 16px', minHeight: 44, borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface, color: tokens.text, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  {t('admin.int.close')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(activeProvider)}
                  disabled={!!busy[activeProvider] || !dirty(activeProvider)}
                  style={{
                    padding: '8px 20px',
                    minHeight: 44,
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: dirty(activeProvider) ? tokens.action : tokens.surface3,
                    color: dirty(activeProvider) ? tokens.onAction : tokens.text3,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: dirty(activeProvider) ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: dirty(activeProvider) ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                  }}
                >
                  {busy[activeProvider] && <Loader2 size={14} className="wf-spin" aria-hidden="true" />}
                  <span>{t('admin.int.save')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset Upload Sub-Modal */}
      {uploadingAsset && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="sk-int-upload-title" style={{ backgroundColor: tokens.surface, borderRadius: 16, padding: 24, maxWidth: 460, width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', border: `1px solid ${tokens.ruleSoft}` }}>
            <h3 id="sk-int-upload-title" style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 800, color: tokens.text }}>
              {uploadingAsset === 'logo' ? t('admin.int.uploadLogoTitle') : t('admin.int.uploadFaviconTitle')}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 12, color: tokens.text3, lineHeight: 1.45 }}>
              {t('admin.int.uploadBody')}
            </p>

            <div style={{ marginBottom: 16 }}>
              <input
                type="file"
                aria-label={t('admin.int.chooseFile')}
                accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
                onChange={(e) => setAssetFile(e.target.files?.[0] || null)}
                style={{ width: '100%', padding: '10px', minHeight: 44, borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontSize: 12, boxSizing: 'border-box' }}
              />
            </div>

            {assetFile && (
              <div style={{ marginBottom: 16, padding: 14, backgroundColor: tokens.surface2, borderRadius: 10, textAlign: 'center', border: `1px solid ${tokens.ruleSoft}` }}>
                <span style={{ fontSize: 11, color: tokens.text3, display: 'block', marginBottom: 6 }}>{t('admin.int.assetPreview')}</span>
                <img
                  src={URL.createObjectURL(assetFile)}
                  alt={t('admin.catalogue.preview')}
                  style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain', margin: '0 auto', display: 'block' }}
                />
              </div>
            )}

            {assetMsg && (
              <div role={assetMsg.ok ? 'status' : 'alert'} style={{ fontSize: 12, fontWeight: 700, color: assetMsg.ok ? tokens.positive : tokens.emergency, marginBottom: 12 }}>
                {say(t, assetMsg.said)}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setUploadingAsset(null)}
                style={{ padding: '8px 16px', minHeight: 44, borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={!assetFile || assetBusy}
                onClick={handleAssetUpload}
                style={{ padding: '8px 18px', minHeight: 44, borderRadius: 8, border: 'none', backgroundColor: tokens.action, color: tokens.onAction, fontSize: 12, fontWeight: 800, cursor: !assetFile || assetBusy ? 'default' : 'pointer', opacity: !assetFile || assetBusy ? 0.6 : 1 }}
              >
                {assetBusy ? t('admin.int.uploading') : t('admin.int.uploadApply')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
