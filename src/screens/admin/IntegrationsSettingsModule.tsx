import React, { useEffect, useState } from 'react';
import { useTheme } from '../../theme/theme';
import { apiRequest, ApiError } from '../../data/http';
import { BarChart3, MessageCircle, Mail, Flame, KeyRound, ShieldCheck, CheckCircle2, AlertCircle, Loader2, BrainCircuit } from 'lucide-react';

type Provider = 'posthog' | 'openwa' | 'postal' | 'firebase' | 'otp' | 'twofa' | 'llm';

const PROVIDER_META: Record<Provider, { title: string; desc: string; icon: any }> = {
  posthog: { title: 'PostHog Analytics', desc: 'Product analytics (opt-in, dark surfaces excluded). Get key from PostHog → Project Settings.', icon: BarChart3 },
  openwa: { title: 'WhatsApp OTP · OpenWA', desc: 'Self-hosted OpenWA/WAHA gateway for WhatsApp OTP delivery.', icon: MessageCircle },
  postal: { title: 'Email OTP · Postal', desc: 'Postal mail server for Email OTP. Primary email provider.', icon: Mail },
  firebase: { title: 'Firebase', desc: 'Client SDK config for Auth / Firestore / FCM (public keys only).', icon: Flame },
  otp: { title: 'OTP Policy', desc: 'Default channel, TTL and rate limits for signup/login codes.', icon: KeyRound },
  twofa: { title: '2FA Policy (TOTP)', desc: 'Authenticator-app 2FA. Enforced roles must complete TOTP after OTP.', icon: ShieldCheck },
  llm: { title: 'AI / LLM Gateway', desc: 'API Keys for emergent AI agents, RAG, and NLP models (OpenAI, Gemini, Ollama).', icon: BrainCircuit },
};

const SECRET_HINT: Record<string, string> = {
  api_key: 'API key / token',
  server_api_key: 'Server API key',
  service_account_json: 'Service account JSON',
  server_key: 'Server key',
  vapid_key: 'VAPID key',
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

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiRequest<{ integrations: Record<string, Record<string, any>> }>('/admin/integrations');
        setForms(res.integrations);
        setSaved(res.integrations);
      } catch (e) {
        setLoadError(e instanceof ApiError ? e.message : 'Could not load integrations.');
      }
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
    // Don't send *_masked helper keys
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
      setMsg((m) => ({ ...m, [p]: { ok: true, text: 'Saved and audit-logged.' } }));
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

  if (loading) {
    return <div style={{ padding: 40, color: tokens.text2 }}>Loading integrations…</div>;
  }

  if (loadError) {
    return <div style={{ padding: 40, color: tokens.emergency }}>{loadError} Super-admin access is required.</div>;
  }

  return (
    <div>
      <div style={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.ruleSoft}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: tokens.text }}>Integrations & Secrets (SA-1.8)</h3>
        <p style={{ margin: '6px 0 0 0', fontSize: 12, color: tokens.text2 }}>
          Configure PostHog, WhatsApp OTP (OpenWA), Email OTP (Postal), Firebase, OTP + 2FA policy. Secrets are masked in transit
          and every save is audit-logged. Public (non-secret) values power <span style={{ fontFamily: typography.fontMono }}>GET /api/config/public</span> for frontend init.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {(Object.keys(PROVIDER_META) as Provider[]).map((p) => {
          const meta = PROVIDER_META[p];
          const Icon = meta.icon;
          const data = forms[p] || {};
          const fields = Object.keys(data).filter((k) => !k.endsWith('_masked'));
          return (
            <div key={p} style={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.ruleSoft}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Icon size={18} color={tokens.action} />
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: tokens.text }}>{meta.title}</h4>
                {data.enabled !== undefined && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, padding: '2px 10px', borderRadius: 9999, backgroundColor: data.enabled ? tokens.positiveBg : tokens.surface3, color: data.enabled ? tokens.positive : tokens.text3 }}>
                    {data.enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: tokens.text3, margin: '0 0 12px 0' }}>{meta.desc}</p>

              {fields.map((k) => {
                const masked = data[`${k}_masked`] as string | undefined;
                const secret = isSecretKey(k);
                const val = data[k];
                if (typeof val === 'boolean') {
                  return (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: tokens.text2, marginBottom: 10, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!val} onChange={(e) => setField(p, k, e.target.checked)} />
                      <span style={{ fontFamily: typography.fontMono, fontWeight: 700 }}>{k}</span>
                    </label>
                  );
                }
                if (Array.isArray(val)) {
                  return (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: tokens.text3, fontFamily: typography.fontMono }}>{k} (comma-separated)</label>
                      <input
                        value={(val as string[]).join(', ')}
                        onChange={(e) => setField(p, k, e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                        style={{ width: '100%', padding: 8, borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontSize: 12, marginTop: 4 }}
                      />
                    </div>
                  );
                }
                return (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: tokens.text3, fontFamily: typography.fontMono }}>
                      {k} {secret && masked && <span style={{ color: tokens.text3, fontWeight: 400 }}>· stored: {showSecrets[p] ? String(val || '—') : masked}</span>}
                    </label>
                    <input
                      type={secret && !showSecrets[p] ? 'password' : k === 'ttl_seconds' || k === 'length' || k === 'max_attempts' ? 'number' : 'text'}
                      value={typeof val === 'number' ? val : (val as string) ?? ''}
                      placeholder={SECRET_HINT[k] || k}
                      onChange={(e) => setField(p, k, e.target.type === 'number' ? Number(e.target.value) : e.target.value)}
                      style={{ width: '100%', padding: 8, borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontSize: 12, marginTop: 4, fontFamily: secret ? typography.fontMono : undefined }}
                    />
                  </div>
                );
              })}

              {msg[p] && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, fontWeight: 700, color: msg[p].ok ? tokens.positive : tokens.emergency, marginBottom: 10 }}>
                  {msg[p].ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {msg[p].text}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleSave(p)}
                  disabled={!!busy[p] || !dirty(p)}
                  style={{ padding: '8px 14px', borderRadius: 10, border: 'none', backgroundColor: dirty(p) ? tokens.action : tokens.surface3, color: dirty(p) ? '#fff' : tokens.text3, fontWeight: 800, fontSize: 12, cursor: dirty(p) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {busy[p] && <Loader2 size={13} />} Save {p}
                </button>
                <button
                  onClick={() => handleTest(p)}
                  disabled={!!busy[`${p}_test`]}
                  style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                >
                  {busy[`${p}_test`] ? 'Testing…' : 'Test connection'}
                </button>
                {Object.keys(data).some(isSecretKey) && (
                  <button
                    onClick={() => setShowSecrets((s) => ({ ...s, [p]: !s[p] }))}
                    style={{ padding: '8px 10px', borderRadius: 10, border: 'none', background: 'none', color: tokens.text3, fontSize: 12, cursor: 'pointer' }}
                  >
                    {showSecrets[p] ? 'Hide' : 'Show'} secrets
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: tokens.text3, fontFamily: typography.fontMono }}>
        Providers: posthog · openwa · postal · firebase · otp · twofa — backed by PUT /api/admin/integrations/:provider (SUPER_ADMIN only).
      </div>
    </div>
  );
};
