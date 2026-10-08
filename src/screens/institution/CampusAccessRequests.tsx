import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Lock, WifiOff } from 'lucide-react';
import { DataState, Field, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';

const translations = {
  en: {
    title: 'Health Access Requests',
    subtitle: 'Request student consent to view clinical records.',
    student: 'Student ID or Name',
    purpose: 'Purpose of Request',
    duration: 'Access Duration (Hours)',
    submit: 'Send Consent Request',
    successTitle: 'Request Sent',
    successMsg: 'The student will receive an in-app notification to review.',
    offline: 'You are offline.',
    noRequests: 'No pending requests.',
    newRequest: 'New Request'
  },
  te: {
    title: 'ఆరోగ్య యాక్సెస్ అభ్యర్థనలు',
    subtitle: 'క్లినికల్ రికార్డులను వీక్షించడానికి విద్యార్థి సమ్మతిని అభ్యర్థించండి.',
    student: 'విద్యార్థి ID లేదా పేరు',
    purpose: 'అభ్యర్థన యొక్క ఉద్దేశ్యం',
    duration: 'యాక్సెస్ వ్యవధి (గంటలు)',
    submit: 'సమ్మతి అభ్యర్థనను పంపండి',
    successTitle: 'అభ్యర్థన పంపబడింది',
    successMsg: 'సమీక్షించడానికి విద్యార్థి అనువర్తనంలో నోటిఫికేషన్‌ను పొందుతారు.',
    offline: 'మీరు ఆఫ్‌లైన్‌లో ఉన్నారు.',
    noRequests: 'పెండింగ్ అభ్యర్థనలు లేవు.',
    newRequest: 'కొత్త అభ్యర్థన'
  },
  hi: {
    title: 'स्वास्थ्य पहुँच अनुरोध',
    subtitle: 'नैदानिक रिकॉर्ड देखने के लिए छात्र की सहमति का अनुरोध करें।',
    student: 'छात्र आईडी या नाम',
    purpose: 'अनुरोध का उद्देश्य',
    duration: 'पहुंच अवधि (घंटे)',
    submit: 'सहमति अनुरोध भेजें',
    successTitle: 'अनुरोध भेजा गया',
    successMsg: 'समीक्षा करने के लिए छात्र को ऐप में एक सूचना प्राप्त होगी।',
    offline: 'आप ऑफ़लाइन हैं।',
    noRequests: 'कोई लंबित अनुरोध नहीं।',
    newRequest: 'नया अनुरोध'
  }
};

type Lang = 'en' | 'te' | 'hi';

export function CampusAccessRequests() {
  const [lang, setLang] = useState<Lang>('en');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState('');
  
  const [student, setStudent] = useState('');
  const [purpose, setPurpose] = useState('');
  const [duration, setDuration] = useState('24');
  const [success, setSuccess] = useState(false);

  const t = translations[lang];
  const { busy, error, run, setError } = useMutation();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
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
    if (!student.trim() || !purpose.trim()) {
      setError('Student and purpose are required.');
      return;
    }
    
    run(async () => {
      // Fail closed: no consent-request endpoint exists yet, so never report a
      // request as sent, and never write the student identifier to the console.
      throw new Error('Access requests aren’t available yet. No request was sent.');
    }, () => {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setStudent('');
        setPurpose('');
      }, 3000);
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
          <p style={{ margin: 0, color: 'var(--sk-color-danger)', fontWeight: 500, fontSize: 'var(--sk-text-body)' }}>{t.offline}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--sk-space-gutter-phone)', backgroundColor: 'var(--sk-color-canvas)', minHeight: '100vh', maxWidth: 'var(--sk-size-web-content-max)', margin: '0 auto' }}>
      
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
            <Lock color="var(--sk-color-action)" size={32} aria-hidden="true" />
            <div>
              <h1 style={{ margin: 0, fontSize: 'var(--sk-text-heading)', color: 'var(--sk-color-text)' }}>{t.title}</h1>
              <p style={{ margin: 'var(--sk-space-4) 0 0 0', fontSize: 'var(--sk-text-body)', color: 'var(--sk-color-text-2)' }}>{t.subtitle}</p>
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

              <Field label={t.student}>
                <input
                  type="text"
                  value={student}
                  onChange={e => setStudent(e.target.value)}
                  disabled={busy}
                  aria-required="true"
                  style={{
                    width: '100%',
                    padding: 'var(--sk-space-12)',
                    borderRadius: 'var(--sk-radius-md)',
                    border: '1px solid var(--sk-color-rule-strong)',
                    fontSize: 'var(--sk-text-body)',
                    color: 'var(--sk-color-text)',
                    backgroundColor: 'var(--sk-color-surface)',
                    minHeight: 'var(--sk-size-control)'
                  }}
                />
              </Field>

              <Field label={t.purpose}>
                <textarea
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  disabled={busy}
                  rows={2}
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

              <Field label={t.duration}>
                <select
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  disabled={busy}
                  aria-required="true"
                  style={{
                    width: '100%',
                    padding: 'var(--sk-space-12)',
                    borderRadius: 'var(--sk-radius-md)',
                    border: '1px solid var(--sk-color-rule-strong)',
                    fontSize: 'var(--sk-text-body)',
                    color: 'var(--sk-color-text)',
                    backgroundColor: 'var(--sk-color-surface)',
                    minHeight: 'var(--sk-size-control)'
                  }}
                >
                  <option value="12">12 Hours</option>
                  <option value="24">24 Hours</option>
                  <option value="72">72 Hours</option>
                </select>
              </Field>

              <div style={{ marginTop: 'var(--sk-space-8)' }}>
                <SubmitButton busy={busy} disabled={!student.trim() || !purpose.trim()}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sk-space-8)', width: '100%', minHeight: 'var(--sk-size-control-lg)', fontSize: 'var(--sk-text-title-sm)', backgroundColor: 'var(--sk-color-action)', color: 'var(--sk-color-on-action)', borderRadius: 'var(--sk-radius-lg)', border: 'none', cursor: (!student.trim() || !purpose.trim() || busy) ? 'not-allowed' : 'pointer', opacity: (!student.trim() || !purpose.trim() || busy) ? 0.6 : 1 }}>
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
