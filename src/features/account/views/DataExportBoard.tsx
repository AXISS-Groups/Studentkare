import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { Button, Note } from '@/design-system';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardScreen, BoardSection, TextLink, boardText } from '@/design-system/board/BoardKit';
import { color, radius, size, space } from '@/design-system/theme';
import { apiRequest } from '@/data/services/http';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

/** What GET /records/export returns: the account's own data, never another's. */
export interface RecordsExport {
  user: Record<string, unknown>;
  documents: unknown[];
  readings: unknown[];
  policies: unknown[];
}

export interface DataExportLinks {
  back?: () => void;
  /** Hands the prepared file to the person (web: a download). */
  save: (data: RecordsExport) => void;
  deleteAccount?: () => void;
}

const INCLUDED: readonly { title: MessageKey; meta: MessageKey }[] = [
  { title: 'pb.export.records', meta: 'pb.export.recordsMeta' },
  { title: 'pb.export.readings', meta: 'pb.export.readingsMeta' },
  { title: 'pb.export.policies', meta: 'pb.export.policiesMeta' },
  { title: 'pb.export.account', meta: 'pb.export.accountMeta' },
];

/**
 * Download my data (canvas page 2, DataExport, Tier 2): what the export holds
 * and a button that prepares it now. It lists only what GET /records/export
 * returns (records with their download links, readings, insurance policies,
 * account details) and says it is a JSON file: the board's FHIR bundle and
 * 24-hour preparation are not what the server does, so they are not claimed.
 */
export function DataExportBoard({ links }: { links: DataExportLinks }): React.ReactElement {
  const t = useT();
  const docs = useApiResource<{ items: unknown[]; total?: number }>('/health/documents?limit=1');
  const [phase, setPhase] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle');
  const docTotal = docs.data ? docs.data.total ?? docs.data.items.length : null;

  const prepare = () => {
    setPhase('busy');
    apiRequest<RecordsExport>('/records/export')
      .then((data) => { links.save(data); setPhase('done'); }, () => setPhase('failed'));
  };

  return (
    <BoardScreen testID="data-export">
      <BoardHeader title={t('pb.export.title')} backIcon="arrow-left" backLabel={t('common.back')} onBack={links.back} />
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={boardText.title}>{t('pb.export.heading')}</Text>
        <Text style={boardText.body}>{t('pb.export.intro')}</Text>
      </View>
      <BoardSection label={t('pb.export.included')}>
        <View style={styles.card}>
          {INCLUDED.map((item, i) => (
            <View key={item.title} style={[styles.row, i < INCLUDED.length - 1 ? styles.divider : null]}>
              <View style={styles.tick}><Icon name="check" size={space.s14} color={color.onAction} strokeWidth={3} /></View>
              <View style={styles.flex}>
                <Text style={boardText.strong}>{t(item.title)}</Text>
                <Text style={boardText.meta}>{item.title === 'pb.export.records' && docTotal !== null ? t('pb.export.recordsCount', { count: docTotal }) : t(item.meta)}</Text>
              </View>
            </View>
          ))}
        </View>
      </BoardSection>
      <View style={styles.format}>
        <Text style={[boardText.strong, { color: color.info }]}>{t('pb.export.formatTitle')}</Text>
        <Text style={[boardText.body, { color: color.info }]}>{t('pb.export.formatBody')}</Text>
      </View>
      {phase === 'done' ? <Note tone="positive" title={t('pb.export.doneTitle')}>{t('pb.export.doneBody')}</Note> : null}
      {phase === 'failed' ? <Note tone="danger">{t('pb.export.failed')}</Note> : null}
      <View style={styles.actions}>
        <Button label={t('pb.export.prepare')} size="cta" fullWidth busy={phase === 'busy'} onPress={prepare} testID="data-export-prepare" />
        {links.deleteAccount ? <View style={styles.center}><TextLink label={t('pb.export.deleteInstead')} tone="danger" onPress={links.deleteAccount} /></View> : null}
      </View>
      <Text style={boardText.meta}>{t('pb.export.footnote')}</Text>
    </BoardScreen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: space.s8 },
  card: { backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, paddingHorizontal: space.s16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.touchTarget, paddingVertical: space.s12 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  tick: { width: space.s24, height: space.s24, borderRadius: radius.sm, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0, gap: space.s2 },
  format: { gap: space.s6, backgroundColor: color.surface3, borderRadius: radius.xl, padding: space.s16 },
  actions: { gap: space.s10 },
  center: { alignItems: 'center' },
});
