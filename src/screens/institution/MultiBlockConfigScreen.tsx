import React, { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { EmptyState, Field } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import '../../theme/workflows.css';

interface HostelBlock {
  id: string;
  name: string;
  code: string;
  capacity: number;
  /** Empty when no warden was named; shown as "Unassigned" in the viewer's language. */
  assignedWarden: string;
  activeCount: number;
}

export function MultiBlockConfigScreen() {
  const t = useT();
  // No block-configuration API yet: start empty instead of inventing blocks and
  // wardens. Blocks added below live only in this browser tab and are labelled so.
  const [blocks, setBlocks] = useState<HostelBlock[]>([]);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState('400');
  const [warden, setWarden] = useState('');

  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && code) {
      setBlocks([...blocks, {
        id: `b-${Date.now()}`,
        name,
        code,
        capacity: Number(capacity),
        assignedWarden: warden,
        activeCount: 0
      }]);
      setName('');
      setCode('');
      setWarden('');
    }
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('campus.blocks.eyebrow')}</span>
          <h2>{t('campus.blocks.title')}</h2>
          <p>{t('campus.blocks.lead')}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="wf-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={18} aria-hidden="true" /> {t('campus.blocks.listTitle', { count: blocks.length })}
            </h3>

            {blocks.length === 0 && <EmptyState title={t('campus.blocks.emptyTitle')} description={t('campus.blocks.emptyBody')} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {blocks.map(b => (
                <div key={b.id} style={{ border: '1px solid var(--sk-color-rule)', borderRadius: 10, padding: 16, background: 'var(--sk-color-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: 15 }}>{b.name}</strong> (<code>{b.code}</code>)
                      <p style={{ fontSize: 13, color: 'var(--sk-color-text-2)', margin: '4px 0 0' }}>
                        {t('campus.blocks.warden')} <strong>{b.assignedWarden || t('campus.blocks.unassigned')}</strong> · <strong>{t('campus.blocks.residents', { active: b.activeCount, capacity: b.capacity })}</strong>
                      </p>
                    </div>
                    <span style={{ fontSize: 12, background: 'var(--sk-color-attention-bg)', color: 'var(--sk-color-attention)', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                      {t('campus.blocks.notSaved')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="wf-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={18} aria-hidden="true" /> {t('campus.blocks.addTitle')}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--sk-color-text-2)', margin: '0 0 12px' }}>{t('campus.blocks.localNote')}</p>
            <form onSubmit={handleAddBlock} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <Field label={t('campus.blocks.name')}>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('campus.blocks.namePlaceholder')} required />
                </Field>
                <Field label={t('campus.blocks.code')}>
                  <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder={t('campus.blocks.codePlaceholder')} required />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <Field label={t('campus.blocks.capacity')}>
                  <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} required />
                </Field>
                <Field label={t('campus.blocks.wardenName')}>
                  <input type="text" value={warden} onChange={e => setWarden(e.target.value)} placeholder={t('campus.blocks.wardenPlaceholder')} />
                </Field>
              </div>

              <button className="health-button health-button-primary" type="submit" style={{ minHeight: 44, width: 'fit-content' }}>
                {t('campus.blocks.add')}
              </button>
            </form>
          </section>
        </div>

        <div className="wf-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'start' }}>
          <span className="care-eyebrow">{t('campus.blocks.privacyEyebrow')}</span>
          <h4 style={{ fontSize: 15, marginTop: 4 }}>{t('campus.blocks.privacyTitle')}</h4>
          <p style={{ fontSize: 12, color: 'var(--sk-color-text-2)' }}>
            {t('campus.blocks.privacyBody')}
          </p>
        </div>
      </div>
    </div>
  );
}
