import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollView, Text, View } from 'react-native';
import {
  GlossTile, GradientHeroCard, HeroButton, HeroCarousel, LiftCard, M2Card, M2EmptyState, M2Grid, M2Header, M2HeroPanel, M2ListRow, M2Note, M2Pill, M2ProductCard, M2Responsive,
  M2SearchField, M2SectionHead, M2StatCard, M2Table, M2Tabs, M2Timeline, M2TimerRing, NAVY_STOPS, NotYetTile, SERVICE_HUES, ServiceRail, SoftTileGrid, heroStops, m2TableText, m2Text,
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
 * The Tier 1 records pieces (plan docs/plans/tier1-parity-2026-10-24.md, boards approved 24 Oct 2026): a
 * hero section with actions, gradient count cards as filters, tab pills and a segmented pair, notes in every
 * tone, pills, a timeline (dots and gloss tiles), the countdown ring and a table of views.
 */
function RecordsSampler({ layout }: { layout: 'phone' | 'desktop' }) {
  const [tab, setTab] = React.useState<'documents' | 'prescriptions' | 'who'>('documents');
  const [seg, setSeg] = React.useState<'summary' | 'history'>('summary');
  const rows = [{ id: 'd1', title: 'Complete blood count (sample)', type: 'Lab report', date: '12 Oct 2026', shared: 1 }, { id: 'd2', title: 'Prescription · Demo Clinic', type: 'Prescription', date: '03 Oct 2026', shared: 0 }];
  return (
    <Frame layout={layout}>
      <M2Header backLabel="Back" onBack={noop} title="Health vault" sos={{ label: 'SOS', spoken: 'SOS, get help now', onPress: noop }} />
      <M2HeroPanel icon="lock" title="Health vault" sub="5 documents · Portable after you graduate"
        actions={<><HeroButton label="Add a document" icon="plus" onPress={noop} /><HeroButton label="Export all" icon="download" variant="glass" onPress={noop} /></>} />
      <M2Grid columns={{ phone: 2, desktop: 4 }}>
        <M2StatCard icon="flask" hue="violet" count={2} label="Lab reports" selected onPress={noop} fill />
        <M2StatCard icon="file-text" hue="green" count={1} label="Prescriptions" onPress={noop} fill />
        <M2StatCard icon="syringe" hue="rose" count={1} label="Vaccine documents" onPress={noop} fill />
        <M2StatCard icon="file" hue="orange" count={1} label="Scans and other" onPress={noop} fill />
      </M2Grid>
      <M2Tabs label="Health records sections" current={tab} onChange={setTab} tabs={[{ key: 'documents', label: 'Documents' }, { key: 'prescriptions', label: 'Prescriptions' }, { key: 'who', label: 'Who can see what' }]} />
      <M2Tabs label="Report views" segmented current={seg} onChange={setSeg} tabs={[{ key: 'summary', label: 'Clinician summary' }, { key: 'history', label: 'History · 3' }]} />
      <M2Card style={{ padding: space.s16 }}>
        <M2Table caption="Your documents, newest first" rows={rows} rowKey={(r) => r.id} columns={[
          { key: 'doc', header: 'Document', flex: 2, cell: (r) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s12 }}><GlossTile icon="flask" hue="violet" size={36} iconSize={17} /><Text style={m2TableText.strong}>{r.title}</Text></View> },
          { key: 'type', header: 'Type', cell: (r) => <Text style={m2TableText.cell}>{r.type}</Text> },
          { key: 'date', header: 'Date', cell: (r) => <Text style={m2TableText.mono}>{r.date}</Text> },
          { key: 'shared', header: 'Shared', cell: (r) => (r.shared ? <M2Pill label={`Shared · ${r.shared}`} tone="attention" /> : <M2Pill label="Private" tone="neutral" icon="lock" />) },
        ]} />
      </M2Card>
      <M2ListRow icon="stethoscope" hue="sky" tile="gloss" title="Consult with Dr. Demo Clinician" meta="Visit 03 Oct 2026 · Signed 03 Oct 2026" onPress={noop} selected={layout === 'desktop'} />
      <M2Note tone="positive" icon="shield-check">Nothing is released to you until a doctor has reviewed it.</M2Note>
      <M2Note tone="attention" icon="alert-triangle" announce>This pass has expired. Connect to the internet to show a live one.</M2Note>
      <M2Note tone="danger" icon="phone">If you feel worse, or something in these notes worries you, contact your doctor. In an emergency, call 112.</M2Note>
      <M2Note tone="info" icon="lock">Scanning this ID tells a clinic you are verified and nothing more.</M2Note>
      <M2Card style={{ padding: space.s16, gap: space.s16 }}>
        <M2Timeline items={[{ key: 's', title: 'What you told the doctor', body: 'Shown word for word, as the doctor signed it', eyebrow: true }, { key: 'o', title: 'What the doctor found', body: 'Shown word for word', eyebrow: true }]} />
        <M2Timeline items={[{ key: 'scan', icon: 'qr-code', hue: 'indigo', title: 'Scanned', body: 'The pass signature and its time window are checked.' }, { key: 'see', icon: 'eye', hue: 'green', title: 'What staff see', body: 'Your name, campus and roll number.' }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s16 }}>
          <M2TimerRing secondsLeft={24} totalSeconds={30} label="24s" />
          <Text style={m2Text.body}>Refreshes in 24 s</Text>
        </View>
      </M2Card>
    </Frame>
  );
}

export const RecordsPhone: Story = { render: () => <RecordsSampler layout="phone" /> };
export const RecordsDesktop: Story = { render: () => <RecordsSampler layout="desktop" /> };
