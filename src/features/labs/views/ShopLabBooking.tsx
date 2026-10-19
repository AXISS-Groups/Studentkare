import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';
import { Button, Note } from '@/design-system';
import { space } from '@/design-system/theme';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { navigate } from '@/lib/utils/workflowRouting';
import { LabBookingViewModel } from '../viewmodel/LabBookingViewModel';
import { LabBookingSheet } from './LabBookingSheet';

/**
 * The shop's "Book" on a lab test. Students book and pay; anyone else is told
 * why they can't, rather than meeting a refusal after filling the form.
 */
export function ShopLabBooking({ item, onClose }: { item: LiveCatalogItem; onClose: () => void }) {
  const t = useT();
  const { user } = useAuth();
  const vm = useMemo(() => new LabBookingViewModel({
    catalogItemId: item.id, name: item.name, pricePaise: item.pricePaise, preparation: item.preparation ?? '',
  }), [item.id, item.name, item.pricePaise, item.preparation]);

  if (!user) {
    return (
      <View style={styles.gate} testID="lab-booking-signin">
        <Note tone="info">{t('care.labBook.signIn')}</Note>
        <Button label={t('care.signIn')} onPress={() => { onClose(); navigate('login', 'shop'); }} fullWidth />
      </View>
    );
  }
  if (user.role !== 'STUDENT') {
    return <View style={styles.gate} testID="lab-booking-students-only"><Note tone="info">{t('care.labBook.studentsOnly')}</Note></View>;
  }
  return (
    <LabBookingSheet
      viewModel={vm}
      studentName={user.fullName}
      onClose={onClose}
      onViewBooking={() => { onClose(); navigate('prescriptions'); }}
      onOrders={() => { onClose(); navigate('orders'); }}
    />
  );
}

const styles = StyleSheet.create({
  gate: { gap: space.s12 },
});
