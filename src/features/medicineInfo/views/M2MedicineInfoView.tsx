import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { Button, CrisisLinks, ErrorState, Rise, Skeleton } from '@/design-system';
import { Gradient, LiftCard, M2Card, M2Heading, M2SearchField, M2_NAV_CLEARANCE, RoundButton, heroStops, m2Text, useOwnPhoneChrome, webAttrs } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, shadow, shadowStyle, size, space, webOnly } from '@/design-system/theme';
import { money } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { BuyState, MatchedOn, MedicineDetail, MedicineSummary, RelatedMedicine, ReviewNote, ReviewedLines } from '../data/MedicineInfoRepository';
import type { LabelForm } from '../model/ageBands';
import type { MedicineInfoViewModel } from '../viewmodel/MedicineInfoViewModel';

/**
 * Medicine information (M2MedicineInfo, Tier 1; plan
 * docs/plans/tier1-medicine-info-2026-10-22.md, approved by Krishna Chintakayala
 * 2026-10-22). Designed in code in the Mobile 2.0 language; no canvas board.
 *
 * Shows only what a pharmacist reviewed; otherwise says so. The note "Take
 * medicines only as prescribed…" with Book a consult is always on screen, and
 * crisis help is one tap away in every state. The age answer lists label forms
 * and strengths only (never a dose), and the age band is never sent anywhere.
 * Photos are matched to printed text and confirmed by the person; nothing is
 * guessed from how a tablet looks.
 */
export interface MedicineInfoLinks {
  back?: () => void;
  /** Book a consult (the existing consult booking, or sign in to it). */
  consult: () => void;
  /** Find a pharmacy (Find care, pharmacies). */
  pharmacy: () => void;
  /** Send a prescription to a pharmacy (the dispense flow, as M2Product). */
  sendRx: () => void;
  /** Open a listing's product page in the shop. */
  product: (itemId: string) => void;
  /** The crisis support page / screen. */
  crisis: () => void;
  /** Take a photo with the camera, where the device has one. */
  takePhoto?: () => void;
  /** Choose a photo already on the device. */
  uploadPhoto?: () => void;
}

const MATCHED: Record<MatchedOn, MessageKey> = { brand: 'mi.matched.brand', composition: 'mi.matched.composition', strength: 'mi.matched.strength' };
const SECTIONS: readonly { field: 'uses' | 'side_effects' | 'warnings' | 'storage'; title: MessageKey; icon: SkIconName }[] = [
  { field: 'uses', title: 'mi.sec.uses', icon: 'check-circle' },
  { field: 'side_effects', title: 'mi.sec.sideEffects', icon: 'info' },
  { field: 'warnings', title: 'mi.sec.warnings', icon: 'alert-triangle' },
  { field: 'storage', title: 'mi.sec.storage', icon: 'box' },
];

const FORMS: Readonly<Record<string, MessageKey>> = {
  TABLET: 'mi.form.TABLET', CAPSULE: 'mi.form.CAPSULE', SYRUP: 'mi.form.SYRUP', SUSPENSION: 'mi.form.SUSPENSION', DROPS: 'mi.form.DROPS',
  CREAM: 'mi.form.CREAM', OINTMENT: 'mi.form.OINTMENT', GEL: 'mi.form.GEL', LOTION: 'mi.form.LOTION', SOLUTION: 'mi.form.SOLUTION',
  SPRAY: 'mi.form.SPRAY', INHALER: 'mi.form.INHALER', INJECTION: 'mi.form.INJECTION', SACHET: 'mi.form.SACHET', LOZENGE: 'mi.form.LOZENGE',
  POWDER: 'mi.form.POWDER',
};

export function formLabel(t: ReturnType<typeof useT>, form: string): string {
  const key = FORMS[form];
  return key ? t(key) : form;
}

function reviewedLine(t: ReturnType<typeof useT>, note: ReviewNote): string {
  return note.reviewedOn
    ? t('mi.reviewedOn', { date: note.reviewedOn, source: note.source.title })
    : t('mi.sourceOnly', { source: note.source.title });
}

function Chip({ tone, label, icon, testID }: { tone: 'attention' | 'positive' | 'neutral'; label: string; icon?: SkIconName; testID?: string }) {
  const palette = { attention: [color.attentionBg, color.attention], positive: [color.positiveBg, color.positive], neutral: [color.neutralBg, color.text2] }[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette[0] }]} testID={testID}>
      {icon ? <Icon name={icon} size={13} color={palette[1]} strokeWidth={2.4} /> : null}
      <Text style={[styles.chipText, { color: palette[1] }]}>{label}</Text>
    </View>
  );
}

/** Always on screen (founder copy, D-MI-14 [CL copy]). */
function PrescribedNote({ links, rx }: { links: MedicineInfoLinks; rx: boolean }) {
  const t = useT();
  return (
    <View style={styles.note} testID="mi-note" {...webAttrs({ role: 'note' })}>
      <View style={styles.noteHead}>
        <Icon name="stethoscope" size={18} color={color.info} strokeWidth={2.2} />
        <Text style={[m2Text.body, styles.grow, styles.noteText]}>{t('mi.note')}</Text>
      </View>
      {rx ? <Chip tone="attention" icon="prescription" label={t('mi.rxNeeded')} testID="mi-note-rx" /> : null}
      <View style={styles.row}>
        <Button label={t('mi.bookConsult')} variant="secondary" onPress={links.consult} testID="mi-consult" />
        {rx ? <Button label={t('mi.sendRx')} onPress={links.sendRx} testID="mi-note-send-rx" /> : null}
      </View>
    </View>
  );
}

function ResultRow({ item, onPress, testID }: { item: MedicineSummary; onPress: () => void; testID: string }) {
  const t = useT();
  const label = [item.brand, item.composition, formLabel(t, item.form), item.requiresPrescription ? t('mi.rxNeeded') : null,
    item.reviewed ? t('mi.reviewedChip') : t('mi.notReviewedChip')].filter(Boolean).join('. ');
  return (
    <LiftCard label={label} onPress={onPress} testID={testID} style={styles.result}>
      <View style={styles.resultIcon}><Icon name="pill" size={20} color={color.serviceTealInk} strokeWidth={2.2} /></View>
      <View style={styles.grow}>
        <Text style={m2Text.cardTitle}>{item.brand}</Text>
        <Text style={m2Text.meta}>{[item.composition, formLabel(t, item.form), item.manufacturer].filter(Boolean).join(' · ')}</Text>
        <View style={styles.chips}>
          {item.requiresPrescription ? <Chip tone="attention" label={t('mi.rxNeeded')} /> : null}
          {item.reviewed ? <Chip tone="positive" icon="shield-check" label={t('mi.reviewedChip')} /> : <Chip tone="neutral" label={t('mi.notReviewedChip')} />}
        </View>
      </View>
      <Icon name="chevron-right" size={18} color={color.text3} strokeWidth={2.2} />
    </LiftCard>
  );
}

const PhotoPanel = observer(function PhotoPanel({ vm, links }: { vm: MedicineInfoViewModel; links: MedicineInfoLinks }) {
  const t = useT();
  const off = vm.reader === 'NOT_CONFIGURED' || vm.reader === 'UNAVAILABLE';
  return (
    <M2Card style={styles.photoCard} testID="mi-photo">
      <M2Heading style={m2Text.cardTitle}>{t('mi.photo.title')}</M2Heading>
      {off ? (
        <View style={styles.offNote} testID="mi-photo-off" aria-live="polite">
          <Icon name="info" size={16} color={color.info} strokeWidth={2.2} />
          <Text style={[m2Text.body, styles.grow]}>{t(vm.reader === 'UNAVAILABLE' ? 'mi.photo.unavailable' : 'mi.photo.notConfigured')}</Text>
        </View>
      ) : (
        <>
          <Text style={m2Text.body}>{t('mi.photo.body')}</Text>
          <View style={styles.row}>
            {links.takePhoto ? <Button label={t('mi.photo.take')} icon={<Icon name="camera-2" size={18} color={color.onAction} strokeWidth={2.2} />} onPress={links.takePhoto} testID="mi-photo-take" /> : null}
            {links.uploadPhoto ? <Button label={t('mi.photo.upload')} variant="secondary" icon={<Icon name="upload" size={18} color={color.action} strokeWidth={2.2} />} onPress={links.uploadPhoto} testID="mi-photo-upload" /> : null}
          </View>
        </>
      )}
      <View style={styles.privacy}>
        <Icon name="lock" size={14} color={color.text3} strokeWidth={2.2} />
        <Text style={[m2Text.meta, styles.grow]}>{t('mi.photo.privacy')}</Text>
      </View>
      {!vm.typing ? (
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('mi.photo.typeInstead')} aria-label={t('mi.photo.typeInstead')}
          onPress={vm.openTyping} testID="mi-type-open" style={({ focused }: PressState) => [styles.link, focused ? focusRing : null]}>
          <Text style={m2Text.link}>{t('mi.photo.typeInstead')}</Text>
        </Pressable>
      ) : (
        <View style={styles.typing}>
          <Text style={m2Text.meta} nativeID="mi-type-label">{t('mi.photo.typeLabel')}</Text>
          <TextInput value={vm.printed} onChangeText={vm.setPrinted} onSubmitEditing={() => void vm.matchPrinted()} multiline
            accessibilityLabel={t('mi.photo.typeLabel')} aria-label={t('mi.photo.typeLabel')} placeholder={t('mi.photo.typePlaceholder')}
            placeholderTextColor={color.text3} testID="mi-type-input" style={[styles.textArea, webOnly({ outlineStyle: 'none' as const })]} />
          <Button label={t('mi.photo.match')} onPress={() => void vm.matchPrinted()} disabled={vm.printed.trim().length < vm.minChars} testID="mi-type-match" />
        </View>
      )}
    </M2Card>
  );
});

const PhotoResult = observer(function PhotoResult({ vm }: { vm: MedicineInfoViewModel }) {
  const t = useT();
  const phase = vm.photoPhase;
  if (phase === 'idle') return null;
  if (phase === 'reading') return <Skeleton label={t('mi.photo.reading')} lines={['90%', '70%', '80%']} />;
  const plain: Partial<Record<typeof phase, MessageKey>> = {
    noMatch: 'mi.photo.noMatch', noText: 'mi.photo.noText', failed: 'mi.photo.failed', error: 'mi.photo.error',
    notConfigured: 'mi.photo.notConfigured', unavailable: 'mi.photo.unavailable',
  };
  const message = plain[phase];
  if (message) {
    return (
      <M2Card style={styles.messageCard} testID={`mi-photo-${phase}`}>
        <Text style={m2Text.body} aria-live="polite">{t(message)}</Text>
        {phase === 'noMatch' ? <Text style={m2Text.body}>{t('mi.noReviewed')}</Text> : null}
      </M2Card>
    );
  }
  return (
    <View style={styles.list} testID="mi-confirm">
      <M2Heading style={m2Text.cardTitle}>{t('mi.confirm.title')}</M2Heading>
      <Text style={m2Text.body}>{t('mi.confirm.body')}</Text>
      {vm.printed ? <Text style={styles.printed} testID="mi-printed">{t('mi.confirm.read', { text: vm.printed })}</Text> : null}
      {vm.candidates.map((c) => (
        <M2Card key={c.id} style={styles.candidate} testID={`mi-candidate-${c.id}`}>
          <View style={styles.grow}>
            <Text style={m2Text.cardTitle}>{c.brand}</Text>
            <Text style={m2Text.meta}>{[c.composition, formLabel(t, c.form), c.manufacturer].join(' · ')}</Text>
            <View style={styles.chips}>
              {c.matchedOn.map((m) => <Chip key={m} tone="neutral" icon="check" label={t(MATCHED[m])} />)}
            </View>
          </View>
          <Button label={t('mi.confirm.thisOne')} accessibilityLabel={t('mi.confirm.thisOneSpoken', { brand: c.brand })} onPress={() => vm.confirm(c)} testID={`mi-confirm-${c.id}`} />
        </M2Card>
      ))}
      <Button label={t('mi.confirm.none')} variant="ghost" onPress={vm.noneOfThese} testID="mi-confirm-none" />
    </View>
  );
});

function Lines({ title, icon, data, testID }: { title: string; icon: SkIconName; data: ReviewedLines; testID: string }) {
  const t = useT();
  return (
    <M2Card style={styles.section} testID={testID}>
      <View style={styles.sectionHead}>
        <Icon name={icon} size={18} color={color.action} strokeWidth={2.2} />
        <M2Heading style={m2Text.cardTitle}>{title}</M2Heading>
      </View>
      <View role="list" accessibilityRole="list">
        {data.items.map((line) => (
          <View key={line} role="listitem" style={styles.bulletRow}>
            <View style={styles.bullet} />
            <Text style={[m2Text.body, styles.grow]}>{line}</Text>
          </View>
        ))}
      </View>
      <Text style={m2Text.meta}>{reviewedLine(t, data)}</Text>
    </M2Card>
  );
}

function BuyBlock({ buy, links, testID }: { buy: BuyState; links: MedicineInfoLinks; testID: string }) {
  const t = useT();
  if (buy.state === 'BUY') {
    return <Button label={t('mi.buy', { price: money(buy.pricePaise) })} icon={<Icon name="cart" size={18} color={color.onAction} strokeWidth={2.2} />}
      onPress={() => links.product(buy.itemId)} testID={testID} />;
  }
  if (buy.state === 'PRESCRIPTION') {
    return (
      <View style={styles.row} testID={testID}>
        <Button label={t('mi.sendRx')} icon={<Icon name="prescription" size={18} color={color.onAction} strokeWidth={2.2} />} onPress={links.sendRx} testID={`${testID}-rx`} />
        {buy.itemId ? <Button label={t('mi.seeInShop')} variant="secondary" onPress={() => links.product(buy.itemId ?? '')} testID={`${testID}-shop`} /> : null}
      </View>
    );
  }
  if (buy.state === 'OUT_OF_STOCK') {
    return (
      <View style={styles.row} testID={testID}>
        <Text style={m2Text.body}>{t('mi.outOfStock')}</Text>
        <Button label={t('mi.seeInShop')} variant="secondary" onPress={() => links.product(buy.itemId)} testID={`${testID}-shop`} />
      </View>
    );
  }
  return <Text style={m2Text.meta} testID={testID}>{t('mi.notSold')}</Text>;
}

const AgeSection = observer(function AgeSection({ vm, detail, links }: { vm: MedicineInfoViewModel; detail: MedicineDetail; links: MedicineInfoLinks }) {
  const t = useT();
  const option = vm.bandOption;
  const forms: LabelForm[] = vm.labelForms;
  const anyAges = detail.fields.age_availability !== null || detail.sameSalt.length > 0;
  return (
    <M2Card style={styles.section} testID="mi-age">
      <View style={styles.sectionHead}>
        <Icon name="users" size={18} color={color.action} strokeWidth={2.2} />
        <M2Heading style={m2Text.cardTitle}>{t('mi.age.title')}</M2Heading>
      </View>
      <Text style={m2Text.body}>{t('mi.age.body')}</Text>
      <View role="radiogroup" accessibilityRole="radiogroup" aria-label={t('mi.age.title')} accessibilityLabel={t('mi.age.title')} style={styles.bands}>
        {vm.bands.map((b) => {
          const on = vm.band === b.band;
          const range = b.range ? t(b.range.key, b.range.vars) : '';
          const label = [t(b.label), range].filter(Boolean).join(', ');
          return (
            <Pressable key={b.band} role="radio" accessibilityRole="radio" aria-checked={on} accessibilityState={{ checked: on }}
              accessibilityLabel={label} aria-label={label} onPress={() => vm.chooseBand(b.band)} testID={`mi-band-${b.band}`}
              style={({ focused }: PressState) => [styles.band, on ? styles.bandOn : null, focused ? focusRing : null]}>
              <Text style={[styles.bandText, on ? styles.bandTextOn : null]}>{t(b.label)}</Text>
              {range ? <Text style={[styles.bandRange, on ? styles.bandTextOn : null]}>{range}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      {option ? (
        <View style={styles.ageAnswer} aria-live="polite" testID="mi-age-answer">
          {option.askFirst ? (
            <View style={styles.askFirst} testID="mi-ask-first">
              <View style={styles.noteHead}>
                <Icon name="alert-triangle" size={18} color={color.attention} strokeWidth={2.2} />
                <Text style={[styles.askText, styles.grow]}>{t('mi.age.askFirst')}</Text>
              </View>
              <View style={styles.row}>
                <Button label={t('mi.bookConsult')} onPress={links.consult} testID="mi-ask-consult" />
                <Button label={t('mi.findPharmacy')} variant="secondary" onPress={links.pharmacy} testID="mi-ask-pharmacy" />
              </View>
            </View>
          ) : null}
          {forms.length ? (
            <View style={styles.list} testID="mi-age-forms">
              <Text style={m2Text.meta}>{t('mi.age.formsIntro')}</Text>
              {forms.map((f) => (
                <View key={`${f.medicineId}-${f.form}-${f.strength}`} style={styles.formRow} testID={`mi-form-${f.medicineId}`}>
                  <View style={styles.grow}>
                    <Text style={m2Text.cardTitle}>{`${formLabel(t, f.form)} · ${f.strength}`}</Text>
                    <Text style={m2Text.meta}>{f.self ? t('mi.age.thisMedicine', { brand: f.brand }) : f.brand}</Text>
                  </View>
                  {f.related ? <BuyBlock buy={f.related.buy} links={links} testID={`mi-form-buy-${f.medicineId}`} /> : null}
                </View>
              ))}
            </View>
          ) : !option.askFirst ? (
            <View style={styles.list} testID="mi-age-none">
              <Text style={m2Text.body}>{t(anyAges ? 'mi.age.notListed' : 'mi.age.noReviewed')}</Text>
              <View style={styles.row}>
                <Button label={t('mi.bookConsult')} variant="secondary" onPress={links.consult} testID="mi-none-consult" />
                <Button label={t('mi.findPharmacy')} variant="secondary" onPress={links.pharmacy} testID="mi-none-pharmacy" />
              </View>
            </View>
          ) : null}
          <Text style={m2Text.meta}>{t('mi.age.notADose')}</Text>
        </View>
      ) : null}
    </M2Card>
  );
});

function Alternatives({ detail, links }: { detail: MedicineDetail; links: MedicineInfoLinks }) {
  const t = useT();
  if (detail.alternativesRestricted) {
    return <M2Card style={styles.messageCard} testID="mi-alts-restricted"><Text style={m2Text.body}>{t('mi.alts.restricted')}</Text></M2Card>;
  }
  if (!detail.alternatives.length) return null;
  return (
    <M2Card style={styles.section} testID="mi-alts">
      <M2Heading style={m2Text.cardTitle}>{t('mi.alts.title')}</M2Heading>
      <Text style={m2Text.meta}>{t('mi.alts.sub')}</Text>
      {detail.alternatives.map((a: RelatedMedicine) => (
        <View key={a.id} style={styles.formRow} testID={`mi-alt-${a.id}`}>
          <View style={styles.grow}>
            <Text style={m2Text.cardTitle}>{a.brand}</Text>
            <Text style={m2Text.meta}>{[a.pack, a.manufacturer].filter(Boolean).join(' · ')}</Text>
          </View>
          <BuyBlock buy={a.buy} links={links} testID={`mi-alt-buy-${a.id}`} />
        </View>
      ))}
    </M2Card>
  );
}

const Detail = observer(function Detail({ vm, links }: { vm: MedicineInfoViewModel; links: MedicineInfoLinks }) {
  const t = useT();
  const back = (
    <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('mi.backToResults')} aria-label={t('mi.backToResults')} onPress={vm.closeDetail}
      testID="mi-detail-back" style={({ focused }: PressState) => [styles.backRow, focused ? focusRing : null]}>
      <Icon name="arrow-left" size={16} color={color.action} strokeWidth={2.4} />
      <Text style={m2Text.link}>{t('mi.backToResults')}</Text>
    </Pressable>
  );
  if (vm.detailPhase === 'loading') return <View style={styles.list}>{back}<Skeleton label={t('mi.loadingMedicine')} lines={['60%', '100%', '80%']} /></View>;
  if (vm.detailPhase === 'missing') return <View style={styles.list}>{back}<M2Card style={styles.messageCard} testID="mi-detail-missing"><Text style={m2Text.body}>{t('mi.missing')}</Text></M2Card></View>;
  if (vm.detailPhase === 'error' || !vm.detail) {
    return <View style={styles.list}>{back}<ErrorState title={t('mi.errorTitle')} body={t('mi.errorBody')} retryLabel={t('common.tryAgain')} onRetry={vm.retryDetail} reference={{ label: t('mi.reference'), code: 'MI-DETAIL' }} /></View>;
  }
  const d = vm.detail;
  return (
    <View style={styles.list} testID="mi-detail">
      {back}
      <M2Card style={styles.identity}>
        <View style={styles.chips}>
          {d.requiresPrescription ? <Chip tone="attention" icon="prescription" label={t('mi.rxNeeded')} testID="mi-rx-chip" /> : <Chip tone="neutral" label={t('mi.otc')} />}
        </View>
        <M2Heading level={1} style={styles.brand}>{d.brand}</M2Heading>
        <View style={styles.contains}>
          <Icon name="flask" size={16} color={color.action} strokeWidth={2.2} />
          <Text style={styles.containsText}>{t('mi.contains', { composition: d.composition })}</Text>
        </View>
        <Text style={m2Text.meta}>{[formLabel(t, d.form), d.pack, d.manufacturer].filter(Boolean).join(' · ')}</Text>
        {d.identityReview ? (
          <View style={styles.privacy} testID="mi-identity-reviewed">
            <Icon name="shield-check" size={14} color={color.positive} strokeWidth={2.2} />
            <Text style={[m2Text.meta, styles.grow]}>{reviewedLine(t, d.identityReview)}</Text>
          </View>
        ) : <Text style={m2Text.meta} testID="mi-identity-unreviewed">{t('mi.identityUnreviewed')}</Text>}
        <BuyBlock buy={d.buy} links={links} testID="mi-buy" />
      </M2Card>
      {!d.reviewed ? (
        <M2Card style={styles.messageCard} testID="mi-no-reviewed">
          <Text style={m2Text.body}>{t('mi.noReviewed')}</Text>
          <View style={styles.row}>
            <Button label={t('mi.findPharmacy')} variant="secondary" onPress={links.pharmacy} testID="mi-no-reviewed-pharmacy" />
          </View>
        </M2Card>
      ) : null}
      {SECTIONS.map((s) => {
        const data = d.fields[s.field];
        return data ? <Lines key={s.field} title={t(s.title)} icon={s.icon} data={data} testID={`mi-sec-${s.field}`} /> : null;
      })}
      <AgeSection vm={vm} detail={d} links={links} />
      <Alternatives detail={d} links={links} />
    </View>
  );
});

const SearchResults = observer(function SearchResults({ vm }: { vm: MedicineInfoViewModel }) {
  const t = useT();
  if (vm.searchPhase === 'idle') return null;
  if (vm.searchPhase === 'loading') return <Skeleton label={t('mi.searching')} lines={['100%', '86%', '92%']} />;
  if (vm.searchPhase === 'error') {
    return <ErrorState title={t('mi.errorTitle')} body={t('mi.errorBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.submit()} reference={{ label: t('mi.reference'), code: 'MI-SEARCH' }} />;
  }
  if (!vm.results.length) {
    return (
      <M2Card style={styles.messageCard} testID="mi-no-match">
        <Text style={m2Text.cardTitle}>{t('mi.noMatchTitle', { query: vm.searched })}</Text>
        <Text style={m2Text.body}>{t('mi.noReviewed')}</Text>
      </M2Card>
    );
  }
  return (
    <View style={styles.list} testID="mi-results" aria-live="polite">
      <Text style={m2Text.meta}>{t('mi.resultsCount', { count: vm.results.length, query: vm.searched })}</Text>
      {vm.results.map((r) => <ResultRow key={r.id} item={r} onPress={() => void vm.open(r.id)} testID={`mi-result-${r.id}`} />)}
    </View>
  );
});

export const M2MedicineInfoView = observer(function M2MedicineInfoView({ vm, links, wide = false }: { vm: MedicineInfoViewModel; links: MedicineInfoLinks; wide?: boolean }) {
  const t = useT();
  useOwnPhoneChrome();
  const inDetail = vm.detailPhase !== 'idle';
  const rx = vm.detail?.requiresPrescription === true;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, wide ? styles.contentWide : null]} testID="mi-screen" keyboardShouldPersistTaps="handled">
      <Rise>
        <Gradient colors={heroStops('teal')} angle={160} style={[styles.hero, wide ? styles.heroWide : null]}>
          <View pointerEvents="none" style={styles.heroRing} />
          <View style={styles.heroHead}>
            {links.back ? <RoundButton icon="arrow-left" label={t('mi.back')} onPress={links.back} onHero testID="mi-back" /> : null}
            <Text style={styles.heroEyebrow}>{t('mi.eyebrow')}</Text>
          </View>
          <M2Heading level={1} style={styles.heroTitle}>{t('mi.title')}</M2Heading>
          <Text style={styles.heroBody}>{t('mi.body')}</Text>
        </Gradient>
      </Rise>

      <View style={[styles.gutter, styles.searchWrap]}>
        <M2SearchField placeholder={t('mi.searchPlaceholder')} label={t('mi.searchLabel')} value={vm.query} onChangeText={vm.setQuery}
          onSubmit={() => void vm.submit()} testID="mi-search" />
        <View style={styles.row}>
          <Button label={t('mi.search')} icon={<Icon name="search" size={18} color={color.onAction} strokeWidth={2.2} />} onPress={() => void vm.submit()}
            disabled={!vm.canSearch} testID="mi-search-go" />
        </View>
      </View>

      {vm.crisis ? (
        <Rise index={1} style={styles.gutter}>
          <View style={styles.crisis} testID="mi-crisis" accessibilityRole="alert">
            <CrisisLinks titleKey="mi.crisisTitle" />
            <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('mi.crisisMore')} aria-label={t('mi.crisisMore')} onPress={links.crisis}
              testID="mi-crisis-more" style={({ focused }: PressState) => [styles.link, focused ? focusRing : null]}>
              <Text style={m2Text.link}>{t('mi.crisisMore')}</Text>
            </Pressable>
          </View>
        </Rise>
      ) : null}

      <Rise index={1} style={styles.gutter}><PrescribedNote links={links} rx={rx} /></Rise>

      {!vm.crisis ? (
        <Rise index={2} style={styles.gutter}>
          {inDetail ? <Detail vm={vm} links={links} /> : (
            <View style={styles.list}>
              <SearchResults vm={vm} />
              <PhotoResult vm={vm} />
              <PhotoPanel vm={vm} links={links} />
            </View>
          )}
        </Rise>
      ) : null}

      <Rise index={3} style={styles.gutter}>
        <View style={styles.how} testID="mi-how">
          <Icon name="info" size={16} color={color.info} strokeWidth={2.2} />
          <View style={styles.grow}>
            <Text style={m2Text.cardTitle}>{t('mi.howTitle')}</Text>
            <Text style={m2Text.body}>{t('mi.howBody')}</Text>
          </View>
        </View>
      </Rise>
      {!vm.crisis ? <View style={styles.gutter}><CrisisLinks titleKey="mi.helpTitle" testID="mi-help" /></View> : null}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center', overflow: 'hidden' },
  contentWide: { maxWidth: 760, paddingBottom: space.s40 },
  gutter: { paddingHorizontal: space.gutterPhone },
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8, alignItems: 'center' },
  list: { gap: space.s12 },
  hero: {
    paddingTop: space.s16, paddingHorizontal: space.gutterPhone, paddingBottom: space.s40, borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    overflow: 'hidden', gap: space.s6,
  },
  heroWide: { borderRadius: 32, marginTop: space.s16, marginHorizontal: space.gutterPhone },
  heroRing: { position: 'absolute', right: -70, top: 20, width: 230, height: 230, borderRadius: radius.full, borderWidth: 30, borderColor: color.onHeroRule },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: space.s12, marginBottom: space.s10, minHeight: size.touchTarget },
  heroEyebrow: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.onHero2 },
  heroTitle: { maxWidth: 280, fontFamily: font.family.sans, fontSize: font.size.heading, lineHeight: 32, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.8, color: color.onHero },
  heroBody: { maxWidth: 300, fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: 20, fontWeight: fontWeight(font.weight.strong), color: color.onHero2 },
  searchWrap: { marginTop: -(space.s32), gap: space.s10 },
  crisis: { gap: space.s8, padding: space.s14, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.danger },
  note: { gap: space.s10, padding: space.s14, borderRadius: radius.xl, backgroundColor: color.surface3 },
  noteHead: { flexDirection: 'row', gap: space.s10, alignItems: 'flex-start' },
  noteText: { color: color.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6, marginTop: space.s4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.s4, paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full, alignSelf: 'flex-start' },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  result: { borderRadius: 22, padding: space.s14, flexDirection: 'row', alignItems: 'center', gap: space.s12, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  resultIcon: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: color.serviceTealSoft },
  photoCard: { borderRadius: 24, padding: space.s16, gap: space.s10 },
  offNote: { flexDirection: 'row', gap: space.s8, alignItems: 'flex-start', padding: space.s12, borderRadius: radius.md, backgroundColor: color.surface3 },
  privacy: { flexDirection: 'row', gap: space.s6, alignItems: 'center' },
  link: { minHeight: size.touchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  typing: { gap: space.s8 },
  textArea: {
    minHeight: 88, padding: space.s12, borderRadius: radius.md, borderWidth: 1.5, borderColor: color.rule, backgroundColor: color.surface,
    fontFamily: font.family.sans, fontSize: font.size.body, color: color.text, textAlignVertical: 'top',
  },
  messageCard: { borderRadius: 22, padding: space.s16, gap: space.s8 },
  printed: { fontFamily: font.family.mono, fontSize: font.size.caption, color: color.text2, padding: space.s10, borderRadius: radius.md, backgroundColor: color.surface2 },
  candidate: { borderRadius: 22, padding: space.s14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.s12 },
  section: { borderRadius: 22, padding: space.s16, gap: space.s8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  bulletRow: { flexDirection: 'row', gap: space.s8, alignItems: 'flex-start', paddingVertical: space.s2 },
  bullet: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: color.text3, marginTop: space.s8 },
  identity: { borderRadius: 24, padding: space.s16, gap: space.s8 },
  brand: { fontFamily: font.family.sans, fontSize: 25, lineHeight: 30, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.7, color: color.text },
  contains: { paddingVertical: space.s10, paddingHorizontal: space.s12, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', gap: space.s8, backgroundColor: color.surface2 },
  containsText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.action },
  backRow: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s6, alignSelf: 'flex-start' },
  bands: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8, marginTop: space.s4 },
  band: {
    minHeight: size.touchTarget, paddingHorizontal: space.s12, paddingVertical: space.s6, borderRadius: radius.lg, borderWidth: 1.5, borderColor: color.rule,
    backgroundColor: color.surface, justifyContent: 'center',
  },
  bandOn: { borderColor: color.action, backgroundColor: color.action },
  bandText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  bandRange: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2 },
  bandTextOn: { color: color.onAction },
  ageAnswer: { gap: space.s10, marginTop: space.s8 },
  askFirst: { gap: space.s10, padding: space.s12, borderRadius: radius.md, backgroundColor: color.attentionBg },
  askText: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.attention },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.s10, paddingVertical: space.s10, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  how: { flexDirection: 'row', gap: space.s10, padding: space.s14, borderRadius: radius.xl, backgroundColor: color.surface2 },
});
