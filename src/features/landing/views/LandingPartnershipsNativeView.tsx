import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { PARTNER_CATEGORIES } from '../viewmodel/PartnershipEnquiryViewModel';
import type { PartnershipEnquiryViewModel } from '../viewmodel/PartnershipEnquiryViewModel';
import { BoundaryList, Footer, GapNote, Hero, Page, Paragraph, PrimaryAction, Section, color, styles } from './landingNativeKit';
import type { LandingDestinations } from './landingNativeKit';

const NOT_FOR_SALE = [
  {
    tag: 'Not for sale',
    body: 'Position in search results. The ordering is pincode match, then name, and the API states that on every response.',
  },
  {
    tag: 'Not for sale',
    body: 'Anything in a student’s health record — for targeting, segmentation or any other purpose. Clinical data does not reach commercial surfaces.',
  },
  {
    tag: 'Not for sale',
    body: 'Advertising slots. There are none, and paying for anything never grants sight of a member’s record.',
  },
] as const;

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
export const LandingPartnershipsNativeView: React.FC<LandingPartnershipsNativeViewProps> = observer(({ viewModel: vm, destinations: to }) => (
  <Page>
    <Hero
      eyebrow="PARTNERSHIPS"
      title="Reach students without buying your way to the top."
      lede="There are no sponsored slots, because there is nothing to sell you. Provider search sorts by whether you serve the student’s pincode, then alphabetically — never by what you pay. The way to be seen is to serve a campus well."
    />

    <Section title="What you cannot buy here">
      <Paragraph>
        Read this before you apply. If your model needs targeting or placement, we are the wrong platform, and we
        would rather say so now than after a contract.
      </Paragraph>
      <BoundaryList items={NOT_FOR_SALE} />
    </Section>

    <GapNote title="Commission is not published yet.">
      <Paragraph>
        Our designs say the rate is published on every line. No rate is configured in the system yet, so there is
        nothing honest to print here. It will appear on this page and on every statement line once it is set — and
        not before.
      </Paragraph>
    </GapNote>

    <Section title="Tell us what you can serve">
      {vm.status === 'sent' ? (
        <View style={styles.sent} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Text style={styles.sentTitle}>Your enquiry is with our team.</Text>
          <Paragraph>
            It has been recorded and raised to the people who read these. We have not set a response time, so we
            are not going to promise you one.
          </Paragraph>
        </View>
      ) : (
        <EnquiryForm vm={vm} />
      )}
    </Section>

    <Footer
      note="Studentkare is still being built, and this page lists what is missing on purpose. We do not show partner logos until a partner has signed and agreed in writing to appear."
      links={[
        { title: 'For students', onPress: to.students },
        { title: 'For campuses', onPress: to.campuses },
        { title: 'For clinicians', onPress: to.clinicians },
        { title: 'Privacy', onPress: to.privacy },
        { title: 'Terms', onPress: to.terms },
      ]}
    />
  </Page>
));

const EnquiryForm = observer(({ vm }: { vm: PartnershipEnquiryViewModel }) => {
  const sending = vm.status === 'sending';
  return (
    <View style={styles.section}>
      {vm.error ? (
        <View style={styles.formError} accessibilityRole="alert" accessibilityLiveRegion="assertive">
          <Text style={styles.formErrorText}>{vm.error}</Text>
        </View>
      ) : null}

      <Field label="Organisation *" value={vm.organization} onChange={vm.setOrganization} maxLength={160} autoComplete="organization" />
      <Field label="Your name" value={vm.contactName} onChange={vm.setContactName} maxLength={120} autoComplete="name" />
      <Field label="Email *" value={vm.email} onChange={vm.setEmail} maxLength={254} autoComplete="email" keyboardType="email-address" />

      <View style={styles.field}>
        <Text style={styles.label} nativeID="partner-category">Category *</Text>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabelledBy="partner-category">
          {PARTNER_CATEGORIES.map(option => {
            const selected = vm.category === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="radio"
                accessibilityLabel={option}
                aria-checked={selected}
                onPress={() => vm.setCategory(option)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Field label="What can you serve, and where?" value={vm.message} onChange={vm.setMessage} maxLength={4000} multiline />

      {/* Never pre-ticked, and the request is refused without it. */}
      <TouchableOpacity
        style={styles.consent}
        accessibilityRole="checkbox"
        aria-checked={vm.consent}
        accessibilityLabel="You may contact me about this enquiry. We do not sell or share what you send here, and this form is not a contract."
        onPress={vm.toggleConsent}
      >
        <View style={[styles.box, vm.consent && styles.boxChecked]}>
          {vm.consent ? <Text style={styles.boxMark}>✓</Text> : null}
        </View>
        <Text style={styles.consentText}>
          You may contact me about this enquiry. We do not sell or share what you send here, and this form is not a
          contract.
        </Text>
      </TouchableOpacity>

      {!vm.canSubmit && !sending && vm.problem ? <Text style={styles.meta}>{vm.problem}</Text> : null}
      <PrimaryAction title={sending ? 'Sending…' : 'Send application'} onPress={() => void vm.submit()} disabled={!vm.canSubmit} />
    </View>
  );
});

function Field({ label, value, onChange, maxLength, multiline = false, autoComplete, keyboardType }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  multiline?: boolean;
  autoComplete?: React.ComponentProps<typeof TextInput>['autoComplete'];
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        accessibilityLabel={label.replace(' *', ', required')}
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
