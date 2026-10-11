import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { PARTNER_CATEGORIES } from '../viewmodel/PartnershipEnquiryViewModel';
import type { PartnershipEnquiryViewModel } from '../viewmodel/PartnershipEnquiryViewModel';
import { BoundaryList, Footer, GapNote, Hero, Page, Paragraph, PrimaryAction, Section, color, styles } from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';

const NOT_FOR_SALE: readonly MessageKey[] = ['landing.partners.nfs.search', 'landing.partners.nfs.record', 'landing.partners.nfs.ads'];

interface LandingPartnershipsNativeViewProps {
  viewModel: PartnershipEnquiryViewModel;
  destinations: LandingDestinations;
}

/**
 * Partnerships, React Native (design page 3, `WebPartnerships`, Tier 3).
 *
 * Same content as LandingPartnershipsView. The form posts to the public
 * /billing/inquiries, which reaches the support queue. Left off, as on web:
 * partner logos, the founder's note, a commission rate, a reply-time promise.
 */
export const LandingPartnershipsNativeView: React.FC<LandingPartnershipsNativeViewProps> = observer(({ viewModel: vm, destinations: to }) => {
  const t = useT();
  const notForSale = NOT_FOR_SALE.map(key => ({ tag: t('landing.partners.notForSale'), body: t(key) }));
  return (
    <Page>
      <Hero
        eyebrow={t('landing.partners.eyebrow')}
        title={t('landing.partners.title')}
        lede={t('landing.partners.lede')}
      />

      <Section title={t('landing.partners.firewall.title')}>
        <Paragraph>{t('landing.partners.firewall.intro')}</Paragraph>
        <BoundaryList items={notForSale} />
      </Section>

      <GapNote title={t('landing.partners.gap.title')}>
        <Paragraph>{t('landing.partners.gap.body')}</Paragraph>
      </GapNote>

      <Section title={t('landing.partners.apply.title')}>
        {vm.status === 'sent' ? (
          <View style={styles.sent} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Text style={styles.sentTitle}>{t('landing.partners.sent.title')}</Text>
            <Paragraph>{t('landing.partners.sent.body')}</Paragraph>
          </View>
        ) : (
          <EnquiryForm vm={vm} />
        )}
      </Section>

      <Footer
        note={t('landing.partners.footer.note')}
        links={[
          { title: t('landing.consult.footer.forStudents'), onPress: to.students },
          { title: t('landing.consult.footer.forCampuses'), onPress: to.campuses },
          { title: t('landing.consult.footer.forClinicians'), onPress: to.clinicians },
          { title: t('landing.partners.footer.privacy'), onPress: to.privacy },
          { title: t('landing.partners.footer.terms'), onPress: to.terms },
        ]}
      />
    </Page>
  );
});

const EnquiryForm = observer(({ vm }: { vm: PartnershipEnquiryViewModel }) => {
  const t = useT();
  const sending = vm.status === 'sending';
  const consentText = t('landing.partners.consent');
  return (
    <View style={styles.section}>
      {vm.error ? (
        <View style={styles.formError} accessibilityRole="alert" accessibilityLiveRegion="assertive">
          <Text style={styles.formErrorText}>{vm.error}</Text>
        </View>
      ) : null}

      <Field label={t('landing.partners.field.org')} required value={vm.organization} onChange={vm.setOrganization} maxLength={160} autoComplete="organization" />
      <Field label={t('landing.partners.field.name')} value={vm.contactName} onChange={vm.setContactName} maxLength={120} autoComplete="name" />
      <Field label={t('landing.partners.field.email')} required value={vm.email} onChange={vm.setEmail} maxLength={254} autoComplete="email" keyboardType="email-address" />

      <View style={styles.field}>
        <Text style={styles.label} nativeID="partner-category">{t('landing.partners.field.category')} *</Text>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabelledBy="partner-category">
          {PARTNER_CATEGORIES.map(option => {
            const selected = vm.category === option;
            const optionLabel = t(`landing.partners.cat.${option}` as MessageKey);
            return (
              <TouchableOpacity
                key={option}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="radio"
                accessibilityLabel={optionLabel}
                aria-checked={selected}
                onPress={() => vm.setCategory(option)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{optionLabel}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Field label={t('landing.partners.field.message')} value={vm.message} onChange={vm.setMessage} maxLength={4000} multiline />

      {/* Never pre-ticked, and the request is refused without it. */}
      <TouchableOpacity
        style={styles.consent}
        accessibilityRole="checkbox"
        aria-checked={vm.consent}
        accessibilityLabel={consentText}
        onPress={vm.toggleConsent}
      >
        <View style={[styles.box, vm.consent && styles.boxChecked]}>
          {vm.consent ? <Text style={styles.boxMark}>✓</Text> : null}
        </View>
        <Text style={styles.consentText}>{consentText}</Text>
      </TouchableOpacity>

      {!vm.canSubmit && !sending && vm.problem ? <Text style={styles.meta}>{vm.problem}</Text> : null}
      <PrimaryAction title={sending ? t('landing.partners.sending') : t('landing.partners.send')} onPress={() => void vm.submit()} disabled={!vm.canSubmit} />
    </View>
  );
});

function Field({ label, required = false, value, onChange, maxLength, multiline = false, autoComplete, keyboardType }: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  multiline?: boolean;
  autoComplete?: React.ComponentProps<typeof TextInput>['autoComplete'];
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
}) {
  const t = useT();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{required ? `${label} *` : label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        accessibilityLabel={required ? t('landing.partners.field.required', { label }) : label}
        value={value}
        onChangeText={onChange}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        autoComplete={autoComplete}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        keyboardType={keyboardType}
        placeholderTextColor={color.text3}
      />
    </View>
  );
}
