import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollView, Text, View } from 'react-native';
import {
  GradientHeroCard, HeroCarousel, LiftCard, M2Card, M2EmptyState, M2Grid, M2Header, M2ListRow, M2ProductCard, M2Responsive, M2SearchField, M2SectionHead,
  M2Callout, M2Countdown, M2EdgeCard, M2ListLine, M2PageHero, M2Tile3d, M2Timeline,
  NAVY_STOPS, NotYetTile, SERVICE_HUES, ServiceRail, SoftTileGrid, heroStops, m2Text,
} from '../m2';
import type { HeroSlide, M2Layout, ServiceTile, SoftTileItem } from '../m2';
import { color, size, space } from '../theme';

/**
 * Mobile 2.0 at every width (docs/ux/web-mobile-parity-2026-10-23.md, phase 1): each shared piece
 * as the phone boards draw it (390 px) and as the web draws it on a desktop (1100 px, the content
 * width beside the student shell's sidebar at 1440). Use the Theme switch for dark; turn on
 * "reduce motion" in the OS to see the still frames.
 */
const meta = { title: 'Design system/Mobile 2.0 (phone and desktop)', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;
const WIDTH: Record<'phone' | 'desktop', number> = { phone: size.phoneWidth, desktop: 1100 };

function Frame({ layout, children }: { layout: Extract<M2Layout, 'phone' | 'desktop'>; children: React.ReactNode }) {
  return (
    <ScrollView style={{ backgroundColor: color.canvas }} contentContainerStyle={{ padding: space.s20 }}>
      <M2Responsive layout={layout} style={{ width: WIDTH[layout], gap: space.s20 }}>{children}</M2Responsive>
    </ScrollView>
  );
}

const tiles: ServiceTile[] = [
  { key: 'you', label: 'For You', icon: 'star', hue: 'indigo', onPress: noop },
  { key: 'medicines', label: 'Medicines', icon: 'pill-3', hue: 'teal', onPress: noop },
  { key: 'labs', label: 'Lab tests', icon: 'lab', hue: 'violet', onPress: noop },
  { key: 'consults', label: 'Consults', icon: 'stetho', hue: 'blue', onPress: noop },
  { key: 'vaccines', label: 'Vaccines', icon: 'syringe', hue: 'amber', onPress: noop },
  { key: 'insurance', label: 'Insurance', icon: 'shield', hue: 'green', onPress: noop },
  { key: 'campus', label: 'Campus', icon: 'home-2', hue: 'sky', anim: 'anim-home', onPress: noop },
];

const slides: HeroSlide[] = [
  { key: 'check', eyebrow: 'Semester health check', title: 'Three checks, one visit to the campus clinic', body: 'Blood count, vitamin D and an eye test, booked together.', cta: 'Book the check', icon: 'lab', stops: NAVY_STOPS, chipFill: color.brandNavy, ink: color.onHeroCurrent, onPress: noop },
  { key: 'generics', eyebrow: 'Generics', title: 'Same composition, a lower price', body: 'Your pharmacist confirms the swap.', cta: 'Compare options', icon: 'plus-slash', stops: heroStops('green'), chipFill: SERVICE_HUES.green.end, ink: SERVICE_HUES.green.end, onPress: noop },
  { key: 'report', eyebrow: 'Your records', title: 'Upload a lab report', body: 'Keep it in your vault.', cta: 'Upload', icon: 'doc-upload', stops: heroStops('orange'), chipFill: SERVICE_HUES.orange.end, ink: SERVICE_HUES.orange.deep, onPress: noop },
];

const concerns: SoftTileItem[] = [
  { key: 'fever', label: 'Fever and cold', icon: 'thermo', hue: 'orange', onPress: noop },
  { key: 'skin', label: 'Skin care', icon: 'bottle', hue: 'rose', onPress: noop },
  { key: 'sleep', label: 'Stress and sleep', icon: 'moon-2', hue: 'violet', onPress: noop },
  { key: 'sports', label: 'Sports injury', icon: 'trend-arrow', hue: 'blue', onPress: noop },
  { key: 'eye', label: 'Eye strain', icon: 'eye', hue: 'teal', onPress: noop },
  { key: 'vitamins', label: 'Vitamins', icon: 'bottle', hue: 'amber', onPress: noop },
  { key: 'first-aid', label: 'First aid', icon: 'first-aid-kit', hue: 'green', onPress: noop },
  { key: 'devices', label: 'Devices', icon: 'monitor', hue: 'sky', onPress: noop },
];

function Sampler({ layout }: { layout: 'phone' | 'desktop' }) {
  return (
    <Frame layout={layout}>
      <M2Header backLabel="Back" onBack={noop} eyebrow="Pharmacy" title="Medicines" />
      <M2SearchField placeholder="Search a medicine or salt" label="Search medicines" onPress={noop} micUnavailable="Voice search is not available yet" />
      <ServiceRail label="Services" tiles={tiles} current="you" />
      <HeroCarousel label="Highlights" slides={slides} dotLabel={(n) => `Show highlight ${n}`} />
      <View>
        <M2SectionHead title="Shop by concern" action={{ label: 'See all', onPress: noop }} />
        <SoftTileGrid items={concerns} />
      </View>
      <M2Grid columns={{ phone: 2, desktop: 4 }}>
        <LiftCard label="Order with prescription" onPress={noop} fill style={{ padding: space.s14, borderRadius: 22, backgroundColor: color.surface }}>
          <Text style={m2Text.cardTitle}>Order with prescription</Text>
        </LiftCard>
        <NotYetTile icon="phone" title="Call to order" note="Not available yet" fill />
        <NotYetTile icon="message-circle" title="Chat to order" note="Coming soon" fill />
        <M2Card fill style={{ padding: space.s14, gap: space.s6 }}>
          <Text style={m2Text.eyebrow}>Clinic pickup</Text>
          <Text style={m2Text.cardTitle}>Pick a time at checkout</Text>
        </M2Card>
      </M2Grid>
      <GradientHeroCard stops={heroStops('green')} chipFill={SERVICE_HUES.green.end} eyebrow="Generics" title="Same composition, a lower price" body="Same composition and strength."
        cta={{ label: 'Compare options', ink: SERVICE_HUES.green.end }} icon="plus-slash" onPress={noop} label="Same composition, a lower price. Compare options" />
      <M2Grid columns={{ phone: 1, desktop: 2 }}>
        <M2ListRow icon="refresh" hue="indigo" title="Refills for your regular medicines" meta="They live in My health, with your prescriptions." onPress={noop} fill />
        <M2ListRow icon="star" hue="amber" title="0 Kare points" meta="Points only — never cash, never transferable" fill />
      </M2Grid>
      <M2Grid columns={{ phone: 2, desktop: 4 }}>
        <M2ProductCard art={{ icon: 'pill-alt', hue: 'teal' }} off="13% off" eyebrow="Sample Pharma E" name="Acidease Chewable" pack="Strip of 15 chewable tablets" price="₹26" mrp="₹30"
          notes={[{ text: '40 available', tone: 'meta' }]} onOpen={noop} label="Acidease Chewable" action={{ label: 'Add', spoken: 'Add, Acidease Chewable', onPress: noop }} />
        <M2ProductCard art={{ icon: 'pill-alt', hue: 'teal' }} name="Acipan 40" pack="Strip of 15 tablets" price="₹99" mrp="₹115"
          notes={[{ text: 'Prescription needed', tone: 'attention' }]} onOpen={noop} label="Acipan 40" action={{ label: 'Add', spoken: 'Add, Acipan 40', onPress: noop, disabled: true }} />
        <M2ProductCard art={{ icon: 'heart-3', hue: 'rose' }} name="Anemia & Iron Panel" pack="4 tests" price="₹699"
          notes={[{ text: 'Provider booking', tone: 'positive' }]} onOpen={noop} label="Anemia & Iron Panel" action={{ label: 'Book a slot', spoken: 'Book a slot, Anemia & Iron Panel', onPress: noop, tone: 'positive' }} />
        <M2ProductCard art={{ icon: 'bottle', hue: 'amber' }} name="Vitamin D3" pack="Bottle of 60" price="₹299" onOpen={noop} label="Vitamin D3" />
      </M2Grid>
      <M2EmptyState animation="anim-package" title="No orders yet" body="Medicines and wellness products you order show here. Prices are shown before you pay." action={{ label: 'Browse the shop', onPress: noop }} />
    </Frame>
  );
}

export const Phone: Story = { render: () => <Sampler layout="phone" /> };
export const Desktop: Story = { render: () => <Sampler layout="desktop" /> };

export const HeaderWithSos: Story = {
  render: () => (
    <Frame layout="phone">
      <M2Header backLabel="Back" onBack={noop} eyebrow="Sample collected at your hostel" title="Lab tests" sos={{ label: 'SOS', spoken: 'SOS, get help now', onPress: noop }} />
    </Frame>
  ),
};

export const EmptyStates: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: space.s24, padding: space.s20, backgroundColor: color.canvas }}>
      <M2Responsive layout="phone" style={{ width: size.phoneWidth }}>
        <M2EmptyState animation="anim-calendar" hue="amber" title="No camps yet" body="Camps your campus runs show here." />
      </M2Responsive>
      <M2Responsive layout="desktop" style={{ width: 720 }}>
        <M2EmptyState animation="anim-file-text" hue="violet" title="Your vault is empty" body="Reports and prescriptions land here." action={{ label: 'Upload a document', onPress: noop }} />
      </M2Responsive>
    </View>
  ),
};

/**
 * The Tier 1 pieces (canvas page 3, docs/plans/tier1-parity-2026-10-24.md §13–21): the gradient page hero, the
 * 3D tile, the tinted callout, the consent-history timeline and the deletion countdown, at both widths.
 */
function Tier1Pieces({ layout }: { layout: 'phone' | 'desktop' }) {
  const labels = { what: 'What', wording: 'Wording', given: 'Given', withdrawn: 'Withdrawn', stillOn: 'Still on' };
  return (
    <Frame layout={layout}>
      <M2PageHero hue="indigo" icon="shield-2" title="Privacy & consent" body="Every consent you gave, which wording and when." art={<M2Tile3d icon="shield-check" hue="indigo" size={96} float />} />
      <M2Callout tone="danger" icon="phone-off" hue="danger" title="Lost your phone?" body="Cancel your check-in pass and sign it out in under a minute." action={{ label: 'Secure it', onPress: noop }} />
      <M2Callout tone="attention" icon="mail" hue="amber" title="You sign in with your college email" body="If that address stops working after you leave, you won’t receive sign-in codes." />
      <M2Grid columns={{ phone: 1, tablet: 2, desktop: 3 }}>
        <M2EdgeCard edge={SERVICE_HUES.green.deep}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s12 }}><M2Tile3d icon="check" hue="green" /><Text style={m2Text.section}>Stays yours</Text></View>
          <M2ListLine icon="check" ink={color.positive}>All your records and reports</M2ListLine>
          <M2ListLine icon="check" ink={color.positive}>Your account and sign-in</M2ListLine>
        </M2EdgeCard>
        <M2EdgeCard edge={SERVICE_HUES.orange.deep}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s12 }}><M2Tile3d icon="arrow-right" hue="orange" /><Text style={m2Text.section}>Changes</Text></View>
          <M2ListLine icon="arrow-right" ink={color.attention}>Your verified-student status ends</M2ListLine>
        </M2EdgeCard>
        <M2Card style={{ padding: space.s16 }}>
          <M2Countdown day={2} of={7} label="Day 2 of 7" />
        </M2Card>
      </M2Grid>
      <M2Card style={{ padding: space.s16 }}>
        <M2Timeline caption="Every consent on record" labels={labels} items={[
          { key: '1', what: 'Keep my health records', wording: '3', given: '01 Jul 2026', withdrawn: null },
          { key: '2', what: 'Seasonal health tips', wording: '1', given: '05 Jul 2026', withdrawn: '10 Sep 2026' },
        ]} />
      </M2Card>
    </Frame>
  );
}
export const Tier1Phone: Story = { render: () => <Tier1Pieces layout="phone" /> };
export const Tier1Desktop: Story = { render: () => <Tier1Pieces layout="desktop" /> };
