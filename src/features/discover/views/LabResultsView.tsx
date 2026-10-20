import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon3d } from '@/design-system/icons';
import { Button, Chip, ErrorState, Rise, useOnline } from '@/design-system';
import { color, radius, space } from '@/design-system/theme';
import { discountPercent, money } from '@/data/types/workflowTypes';
import type { LabPackage } from '@/features/labBooking/data/LabBookingRepository';
import { useT } from '@/i18n';
import { IconTile, Tag, phoneLayout, phoneText } from '@/features/phoneKit/phoneParts';
import { OfflineBoard } from '@/features/phoneKit/OfflineBoard';
import { plural } from '@/features/phoneKit/plural';
import type { SearchViewModel } from '../viewmodel/SearchViewModel';
import { SearchBar } from './searchParts';
import type { SearchLinks } from './searchParts';

function LabCard({ pkg, index, onBook }: { pkg: LabPackage; index: number; onBook: () => void }) {
  const t = useT();
  const off = discountPercent(pkg.mrpPaise, pkg.pricePaise);
  const meta = [pkg.pack, pkg.reportHours ? t('phone.lab.reportIn', { hours: pkg.reportHours }) : '', pkg.fastingHours ? t('phone.lab.fasting', { hours: pkg.fastingHours }) : t('phone.lab.noFasting')]
    .filter(Boolean).join(' · ');
  return (
    <Rise index={index}>
      <View style={styles.card} testID={`lab-${pkg.id}`}>
        <View style={phoneLayout.top}>
          <IconTile icon="flask-3" tone="positive" size={42} iconSize={20} />
          <View style={phoneLayout.grow}>
            <Text style={phoneText.title}>{pkg.name}</Text>
            <Text style={phoneText.meta}>{meta}</Text>
            <Text style={phoneText.meta}>{pkg.lab.name}</Text>
          </View>
          {/* The lab's own accreditation, from its record; nothing is shown when it has none. */}
          {pkg.lab.accreditation ? <Tag label={pkg.lab.accreditation} tone="positive" /> : null}
        </View>
        <View style={styles.rule} />
        <View style={styles.foot}>
          <View style={styles.prices}>
            <Text style={phoneText.price}>{money(pkg.pricePaise)}</Text>
            {off > 0 ? <Text style={phoneText.mrp}>{money(pkg.mrpPaise)}</Text> : null}
            {off > 0 ? <Text style={phoneText.off}>{t('phone.shop.percentOff', { percent: off })}</Text> : null}
          </View>
          <Button label={t('phone.lab.viewSlots')} accessibilityLabel={t('phone.lab.viewSlotsFor', { name: pkg.name })} onPress={onBook} testID={`lab-book-${pkg.id}`} />
        </View>
        {pkg.lab.homeCollection ? <Text style={phoneText.meta}>{t('phone.lab.homePickup')}</Text> : null}
      </View>
    </Rise>
  );
}

/**
 * Lab test results (canvas LabResults, SK-036 / SK-145): the bookable lab
 * packages that match the search, with the price before anything is booked.
 * "View slots" opens the real booking flow (slot, address, payment). States:
 * data, first time (nothing matches), offline, error.
 *
 * Left out from the board: the "slots left today" bar (it would take one
 * request per test; the slots are shown in the booking flow instead).
 */
export const LabResultsView = observer(function LabResultsView({ vm, links }: { vm: SearchViewModel; links: SearchLinks }) {
  const t = useT();
  const online = useOnline();
  const list = vm.labList;
  return (
    <View style={phoneLayout.screen} testID="lab-results">
      <SearchBar vm={vm} onBack={() => vm.setTab('all')} editable={false} />
      <ScrollView contentContainerStyle={phoneLayout.content}>
        {!online ? (
          <OfflineBoard links={links} onRetry={vm.retry} />
        ) : vm.labsFailed ? (
          <ErrorState title={t('phone.lab.failedTitle')} body={t('phone.lab.failedBody')} retryLabel={t('common.tryAgain')} onRetry={vm.retry} />
        ) : (
          <>
            <View>
              <Text accessibilityRole="header" style={phoneText.heading}>{t('phone.lab.title')}</Text>
              <Text style={phoneText.body} role="status">{plural(t, list.length, 'phone.lab.countOne', 'phone.lab.count')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label={t('phone.lab.homeOnly')} selected={vm.labHomeOnly} onPress={vm.toggleLabHome} testID="lab-chip-home" />
              <Chip label={t('phone.lab.noFastingChip')} selected={vm.labNoFasting} onPress={vm.toggleLabFasting} testID="lab-chip-fasting" />
              <Chip label={t('phone.lab.sortPrice')} selected={vm.labSort === 'price'} onPress={() => vm.setLabSort(vm.labSort === 'price' ? 'name' : 'price')} testID="lab-chip-sort" />
            </ScrollView>
            {list.map((pkg, i) => <LabCard key={pkg.id} pkg={pkg} index={i} onBook={() => links.bookLab(pkg.id)} />)}
            {list.length === 0 ? (
              <View style={styles.first} testID="lab-first-time">
                <Icon3d name="lab-alt--p5" size={72} />
                <Text accessibilityRole="header" style={phoneText.heading}>{t('phone.lab.emptyTitle')}</Text>
                <Text style={[phoneText.body, styles.center]}>{t('phone.lab.emptyBody')}</Text>
                <Button label={t('phone.lab.seeAll')} variant="secondary" onPress={() => links.openList({ category: 'labs' })} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { gap: space.s12, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  rule: { height: 1, backgroundColor: color.ruleSoft },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s12, flexWrap: 'wrap' },
  prices: { flexDirection: 'row', alignItems: 'baseline', gap: space.s8, flexWrap: 'wrap' },
  chips: { flexDirection: 'row', gap: space.s8 },
  first: { alignItems: 'center', gap: space.s12, padding: space.s24, borderRadius: radius.xl, backgroundColor: color.surface },
  center: { textAlign: 'center' },
});
