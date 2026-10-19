import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate } from '@/lib/utils/workflowRouting';
import { color } from '@/design-system/theme';
import { LabBookingRoute } from './LabBookingFlow';

/**
 * The lab booking flow over the web shop, opened by a lab card's "Book".
 * A full-screen modal (role="dialog", aria-modal, focus trap on web).
 */
export function LabBookingOverlay({ itemId, onClose }: { itemId: string; onClose: () => void }): React.ReactElement {
  const { user } = useAuth();
  const leave = (route: 'prescriptions' | 'records') => { onClose(); navigate(route); };
  return (
    <Modal visible transparent={false} animationType="none" onRequestClose={onClose}>
      <View style={styles.page} testID="lab-booking-overlay">
        <LabBookingRoute
          openItemId={itemId}
          studentName={user?.fullName ?? ''}
          links={{ onExit: onClose, onReports: () => leave('records'), onViewBooking: () => leave('prescriptions') }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.canvas },
});
