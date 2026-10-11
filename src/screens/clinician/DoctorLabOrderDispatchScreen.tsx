import React, { useState } from 'react';
import { FlaskConical, Info, Send } from 'lucide-react';
import { Field } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import '../../theme/workflows.css';

/** Test names are clinical terms and stay in English in every language. */
const AVAILABLE_TESTS = [
  'Complete Blood Count (CBC)',
  'Dengue NS1 Antigen & IgM',
  'Lipid Profile Full',
  'Thyroid Function Test (T3, T4, TSH)',
  'Fasting Blood Sugar (FBS)',
  'Liver Function Test (LFT)',
  'Widal Test (Typhoid)',
  'Urine Routine & Micro'
];

/**
 * No lab-order endpoint exists. The send button used to flash "Dispatched to
 * Lab!" while sending nothing; it is now disabled and the screen says why.
 */
export function DoctorLabOrderDispatchScreen() {
  const t = useT();
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [collectionMode, setCollectionMode] = useState<'HOME' | 'WALK_IN'>('WALK_IN');
  const [fasting, setFasting] = useState(false);

  const toggleTest = (test: string) => {
    if (selectedTests.includes(test)) {
      setSelectedTests(selectedTests.filter(x => x !== test));
    } else {
      setSelectedTests([...selectedTests, test]);
    }
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('partner.clin.lab.eyebrow')}</span>
          <h2>{t('partner.clin.lab.title')}</h2>
          <p>{t('partner.clin.lab.intro')}</p>
        </div>
      </div>

      <div className="wf-notice" role="note" style={{ marginBottom: 16 }}>
        <Info size={18} aria-hidden="true" />
        <span>{t('partner.clin.lab.notConnected')}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div className="wf-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FlaskConical size={18} aria-hidden="true" /> {t('partner.clin.lab.selectHeading')}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {AVAILABLE_TESTS.map(test => {
              const active = selectedTests.includes(test);
              return (
                <button
                  key={test}
                  type="button"
                  aria-pressed={active}
                  className={`health-button ${active ? 'health-button-primary' : ''}`}
                  style={{ justifyContent: 'flex-start', minHeight: 44, fontSize: 13, textAlign: 'left' }}
                  onClick={() => toggleTest(test)}
                >
                  <span aria-hidden="true">{active ? '✓ ' : '+ '}</span> {test}
                </button>
              );
            })}
          </div>

          <Field label={t('partner.clin.lab.mode')}>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minHeight: 44 }}>
                <input type="radio" name="mode" checked={collectionMode === 'WALK_IN'} onChange={() => setCollectionMode('WALK_IN')} />
                {t('partner.clin.lab.walkIn')}
              </label>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minHeight: 44 }}>
                <input type="radio" name="mode" checked={collectionMode === 'HOME'} onChange={() => setCollectionMode('HOME')} />
                {t('partner.clin.lab.hostel')}
              </label>
            </div>
          </Field>
        </div>

        <div className="wf-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="care-eyebrow">{t('partner.clin.lab.summary')}</span>
          <div>
            <strong>{t('partner.clin.lab.selected', { count: selectedTests.length })}</strong>
            <ul style={{ fontSize: 13, margin: '6px 0 0', paddingLeft: 16 }}>
              {selectedTests.map(x => <li key={x}>{x}</li>)}
            </ul>
          </div>

          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minHeight: 44 }}>
            <input type="checkbox" checked={fasting} onChange={e => setFasting(e.target.checked)} />
            {t('partner.clin.lab.fasting')}
          </label>

          <button
            type="button"
            className="health-button health-button-primary"
            disabled
            style={{ minHeight: 44, width: '100%', marginTop: 'auto' }}
          >
            <Send size={16} aria-hidden="true" /> {t('partner.clin.lab.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
