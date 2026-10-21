import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useOnline } from '@/design-system';
import { M2ActiveProvider } from '@/design-system/m2';
import { color } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import type { Page, ReportReview } from '@/features/preventive/models';
import { TrendsViewModel } from '@/features/labResults/viewmodel/LabValuesViewModels';
import { M2TrendsView } from '@/features/labResults/views/M2TrendsView';
import { REVIEWS_PATH } from '@/features/labResults/viewmodel/trendScreenModels';
import { useNavigate } from './navigation';

/**
 * Mobile 2.0 My health boards in the Expo app (Tier 1, plan approved
 * 2026-10-21): Trends and Add a lab report, the same views as the web phone
 * frame. Each board draws its own header, so the stack hides the native one.
 *
 * Add a lab report on the phone: "Take a photo" uses the camera here (asked
 * for only when the student chooses it, running only while the viewfinder
 * shows, as RecordCaptureScreen). "Upload a PDF" needs a document picker the
 * app does not bundle, so it is shown as not available on this device.
 */

function useBack(): () => void {
  const navigation = useNavigation();
  return () => { if (navigation.canGoBack()) navigation.goBack(); };
}

function Frame({ children }: { children: React.ReactNode }) {
  const focused = useIsFocused();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.frame}>
      <M2ActiveProvider value={focused}>{children}</M2ActiveProvider>
    </SafeAreaView>
  );
}

export function TrendsScreen(): React.ReactElement {
  const navigate = useNavigate();
  const back = useBack();
  const online = useOnline();
  const [vm] = useState(() => new TrendsViewModel());
  const reviews = useApiResource<Page<ReportReview>>(REVIEWS_PATH);
  useEffect(() => { void vm.load(); return () => vm.dispose(); }, [vm]);
  return (
    <Frame>
      <M2TrendsView vm={vm} reviews={reviews.data?.items ?? null} online={online} links={{ back, upload: () => navigate('ReportUpload') }} />
    </Frame>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: color.canvas },
});
