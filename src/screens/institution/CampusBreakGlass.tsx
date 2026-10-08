import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ShieldAlert, WifiOff, Users } from 'lucide-react';
import { DataState, Field, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';

const translations = {
  en: {
    title: 'Emergency Break-Glass Access',
    subtitle: 'Override privacy controls in a clinical emergency.',
    reason: 'Emergency Reason',
    reasonHint: 'Specify the clinical emergency requiring immediate access.',
    authorizer: 'Authorizing Officer',
    authorizerHint: 'A second person must authorize this action.',
    submit: 'Declare Emergency & Access',
    successTitle: 'Emergency Access Granted',
    successMsg: 'Audit logged and student notified.',
    offline: 'You are offline. Break-glass requires a secure connection.',
    offlineBtn: 'Try Again'
  },
  te: {
    title: 'అత్యవసర బ్రేక్-గ్లాస్ యాక్సెస్',
    subtitle: 'క్లినికల్ అత్యవసర పరిస్థితిలో గోప్యతా నియంత్రణలను ఓవర్‌రైడ్ చేయండి.',
    reason: 'అత్యవసర కారణం',
    reasonHint: 'తక్షణ యాక్సెస్ అవసరమయ్యే క్లినికల్ అత్యవసరాన్ని పేర్కొనండి.',
    authorizer: 'అధికార అధికారి',
    authorizerHint: 'మరొక వ్యక్తి ఈ చర్యను ఆమోదించాలి.',
    submit: 'అత్యవసర పరిస్థితిని ప్రకటించండి',
    successTitle: 'యాక్సెస్ మంజూరు చేయబడింది',
    successMsg: 'ఆడిట్ లాగ్ చేయబడింది మరియు విద్యార్థికి తెలియజేయబడింది.',
    offline: 'మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. బ్రేక్-గ్లాస్‌కు సురక్షిత కనెక్షన్ అవసరం.',
    offlineBtn: 'మళ్ళీ ప్రయత్నించండి'
  },
  hi: {
    title: 'आपातकालीन ब्रेक-ग्लास एक्सेस',
    subtitle: 'नैदानिक आपात स्थिति में गोपनीयता नियंत्रण को ओवरराइड करें।',
    reason: 'आपातकालीन कारण',
    reasonHint: 'तत्काल पहुंच की आवश्यकता वाले नैदानिक आपातकाल को निर्दिष्ट करें।',
    authorizer: 'प्राधिकृत अधिकारी',
    authorizerHint: 'दूसरे व्यक्ति को इस कार्रवाई को अधिकृत करना होगा।',
    submit: 'आपातकाल घोषित करें और पहुंचें',
    successTitle: 'आपातकालीन पहुंच प्रदान की गई',
    successMsg: 'ऑडिट लॉग किया गया और छात्र को सूचित किया गया।',
    offline: 'आप ऑफ़लाइन हैं। ब्रेक-ग्लास के लिए एक सुरक्षित कनेक्शन की आवश्यकता है।',
    offlineBtn: 'पुनः प्रयास करें'
  }
};

type Lang = 'en' | 'te' | 'hi';

export function CampusBreakGlass() {
  const [lang, setLang] = useState<Lang>('en');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState('');
  
  const [reason, setReason] = useState('');
  const [authorizer, setAuthorizer] = useState('');
  const [success, setSuccess] = useState(false);

  const t = translations[lang];
  const { busy, error, run, setError } = useMutation();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Simulate initial data loading
    setTimeout(() => {
      setLoading(false);
    }, 600);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !authorizer.trim()) {
      setError('Both reason and authorizer are required.');
      return;
    }
    
    run(async () => {
      // Fail closed (AGENTS.md guardrail 1): no break-glass endpoint exists yet, so
      // never report access as granted. Nothing is written to the console (guardrail 9).
      throw new Error('Emergency access isn’t available yet. No access was granted. Follow your campus emergency protocol.');
    }, () => {
      setSuccess(true);
    });
  };

  const retryInit = () => {
    setLoading(true);
    setInitError('');
    setTimeout(() => setLoading(false), 600);
  };

  if (isOffline) {
    return (
      <div style={{ padding: 'var(--sk-space-20)', backgroundColor: 'var(--sk-color-canvas)', minHeight: '100vh' }}>
        <div style={{ backgroundColor: 'var(--sk-color-danger-bg)', padding: 'var(--sk-space-16)', borderRadius: 'var(--sk-radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--sk-space-12)' }}>
          <WifiOff color="var(--sk-color-danger)" size={24} aria-hidden="true" />
          <p style={{ margin: 0, color: 'var(--sk-color-danger)', fontWeight: 500, fontSize: 'var(--sk-text-body)' }}>
            {t.offline}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--sk-space-gutter-phone)', backgroundColor: 'var(--sk-color-canvas)', minHeight: '100vh', maxWidth: 'var(--sk-size-web-content-max)', margin: '0 auto' }}>
      
      {/* Language Toggle (for mock demonstration) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sk-space-8)', marginBottom: 'var(--sk-space-24)' }}>
        {(['en', 'te', 'hi'] as Lang[]).map(l => (
          <button 
            key={l}
            onClick={() => setLang(l)}
            aria-label={`Switch to ${l.toUpperCase()} language`}
            style={{
              padding: 'var(--sk-space-8) var(--sk-space-12)',
              borderRadius: 'var(--sk-radius-full)',
              border: '1px solid var(--sk-color-rule)',
              backgroundColor: lang === l ? 'var(--sk-color-surface-2)' : 'var(--sk-color-surface)',
              color: lang === l ? 'var(--sk-color-text)' : 'var(--sk-color-text-2)',
              cursor: 'pointer',
              minHeight: 'var(--sk-size-touch-target)',
              minWidth: 'var(--sk-size-touch-target)',
              fontFamily: l === 'te' ? 'var(--sk-font-telugu)' : l === 'hi' ? 'var(--sk-font-hindi)' : 'var(--sk-font-sans)'
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <DataState loading={loading} error={initError} retry={retryInit}>
        <div style={{ 
          backgroundColor: 'var(--sk-color-surface)', 
          borderRadius: 'var(--sk-radius-xl)', 
          padding: 'var(--sk-space-24)', 
          boxShadow: 'var(--sk-shadow-card)',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sk-space-12)', marginBottom: 'var(--sk-space-24)' }}>
            <ShieldAlert color="var(--sk-color-danger)" size={32} aria-hidden="true" />
            <div>
              <h1 style={{ margin: 0, fontSize: 'var(--sk-text-heading)', color: 'var(--sk-color-danger)' }}>
                {t.title}
              </h1>
              <p style={{ margin: 'var(--sk-space-4) 0 0 0', fontSize: 'var(--sk-text-body)', color: 'var(--sk-color-text-2)' }}>
                {t.subtitle}
              </p>
            </div>
          </div>

          {success ? (
            <div style={{ backgroundColor: 'var(--sk-color-positive-bg)', padding: 'var(--sk-space-20)', borderRadius: 'var(--sk-radius-md)', textAlign: 'center' }}>
              <CheckCircle2 color="var(--sk-color-positive)" size={48} style={{ margin: '0 auto var(--sk-space-12)' }} aria-hidden="true" />
              <h2 style={{ margin: 0, fontSize: 'var(--sk-text-title)', color: 'var(--sk-color-positive)' }}>{t.successTitle}</h2>
              <p style={{ margin: 'var(--sk-space-8) 0 0 0', fontSize: 'var(--sk-text-body)', color: 'var(--sk-color-positive)' }}>{t.successMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sk-space-20)' }}>
              
              {error && (
                <div style={{ backgroundColor: 'var(--sk-color-danger-bg)', padding: 'var(--sk-space-12)', borderRadius: 'var(--sk-radius-sm)', display: 'flex', alignItems: 'center', gap: 'var(--sk-space-8)', color: 'var(--sk-color-danger)' }}>
                  <AlertCircle size={20} aria-hidden="true" />
                  <span style={{ fontSize: 'var(--sk-text-body-sm)' }}>{error}</span>
                </div>
              )}

              <Field label={t.reason} hint={t.reasonHint}>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  disabled={busy}
                  rows={3}
                  aria-required="true"
                  style={{
                    width: '100%',
                    padding: 'var(--sk-space-12)',
                    borderRadius: 'var(--sk-radius-md)',
                    border: '1px solid var(--sk-color-rule-strong)',
                    fontSize: 'var(--sk-text-body)',
                    color: 'var(--sk-color-text)',
                    backgroundColor: 'var(--sk-color-surface)',
                    resize: 'vertical',
                    minHeight: 'var(--sk-size-touch-target)'
                  }}
                />
              </Field>

              <Field label={t.authorizer} hint={t.authorizerHint}>
                <div style={{ position: 'relative' }}>
                  <Users color="var(--sk-color-text-3)" size={20} style={{ position: 'absolute', left: 'var(--sk-space-12)', top: '15px' }} aria-hidden="true" />
                  <input
                    type="text"
                    value={authorizer}
                    onChange={e => setAuthorizer(e.target.value)}
                    disabled={busy}
                    aria-required="true"
                    style={{
                      width: '100%',
                      padding: 'var(--sk-space-12) var(--sk-space-12) var(--sk-space-12) 44px',
                      borderRadius: 'var(--sk-radius-md)',
                      border: '1px solid var(--sk-color-rule-strong)',
                      fontSize: 'var(--sk-text-body)',
                      color: 'var(--sk-color-text)',
                      backgroundColor: 'var(--sk-color-surface)',
                      minHeight: 'var(--sk-size-control)'
                    }}
                  />
                </div>
              </Field>

              <div style={{ marginTop: 'var(--sk-space-8)' }}>
                <SubmitButton busy={busy} disabled={!reason.trim() || !authorizer.trim()}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sk-space-8)', width: '100%', minHeight: 'var(--sk-size-control-lg)', fontSize: 'var(--sk-text-title-sm)', backgroundColor: 'var(--sk-color-danger-fill)', color: 'white', borderRadius: 'var(--sk-radius-lg)', border: 'none', cursor: (!reason.trim() || !authorizer.trim() || busy) ? 'not-allowed' : 'pointer', opacity: (!reason.trim() || !authorizer.trim() || busy) ? 0.6 : 1 }}>
                    {t.submit}
                    <ArrowRight size={20} aria-hidden="true" />
                  </span>
                </SubmitButton>
              </div>

            </form>
          )}

        </div>
      </DataState>
    </div>
  );
}
