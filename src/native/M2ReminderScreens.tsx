import React, { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useOnline } from '@/design-system';
import { M2ActiveProvider } from '@/design-system/m2';
import { color } from '@/design-system/theme';
import { useT } from '@/i18n';
import { MedsTodayViewModel } from '@/features/reminders/viewmodel/MedsTodayViewModel';
import { MedicineRemindersViewModel } from '@/features/reminders/viewmodel/MedicineRemindersViewModel';
import { WaterViewModel } from '@/features/reminders/viewmodel/WaterViewModel';
import { WaterRemindersViewModel } from '@/features/reminders/viewmodel/WaterRemindersViewModel';
import { M2RemindersView } from '@/features/reminders/views/M2RemindersView';
import { M2WaterView } from '@/features/reminders/views/M2WaterView';
import { useUndoClock } from '@/features/reminders/views/useUndoClock';
import { createReminderScheduler, createWaterReminderScheduler } from './hardware/notifications';
import { useNavigate } from './navigation';

/**
 * Mobile 2.0 Medicines today and reminders (M2Reminders) and Water (M2Water)
 * in the Expo app: the same views and view models as the web phone frame.
 * Reminders here are local notifications on this phone (expo-notifications,
 * already a dependency); the server sends none. Permission is asked for only
 * when the student turns one on. A reminder never names a medicine or an
 * amount: it shows on the lock screen.
 */

function Frame({ children }: { children: React.ReactNode }) {
  const focused = useIsFocused();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.frame}>
      <M2ActiveProvider value={focused}>{children}</M2ActiveProvider>
    </SafeAreaView>
  );
}

function useBack(): () => void {
  const navigation = useNavigation();
  return () => { if (navigation.canGoBack()) navigation.goBack(); };
}

/** The words of a reminder, read when it is scheduled so it is in the language chosen then. */
function useWords(): React.MutableRefObject<ReturnType<typeof useT>> {
  const t = useT();
  const words = useRef(t);
  words.current = t;
  return words;
}

export const RemindersScreen = observer(function RemindersScreen(): React.ReactElement {
  const navigate = useNavigate();
  const back = useBack();
  const online = useOnline();
  const words = useWords();
  const [vm] = useState(() => new MedsTodayViewModel());
  const [reminders] = useState(() => new MedicineRemindersViewModel(createReminderScheduler(() => ({
    title: words.current('reminders.notifyTitle'),
    body: words.current('reminders.notifyBody'),
    channelName: words.current('reminders.channel'),
  }))));
  useEffect(() => { vm.setOnline(online); }, [vm, online]);
  useEffect(() => {
    vm.load();
    void reminders.load();
    return () => { vm.dispose(); reminders.dispose(); };
  }, [vm, reminders]);
  useUndoClock(vm);
  return (
    <Frame>
      <M2RemindersView vm={vm} reminders={reminders} online={online} links={{
        back,
        sos: () => navigate('Emergency'),
        water: () => navigate('Water'),
        uploadPrescription: () => navigate('CaptureRecord'),
        openSettings: () => void Linking.openSettings(),
      }} />
    </Frame>
  );
});

export const WaterScreen = observer(function WaterScreen(): React.ReactElement {
  const navigate = useNavigate();
  const back = useBack();
  const online = useOnline();
  const words = useWords();
  const [vm] = useState(() => new WaterViewModel());
  const [reminders] = useState(() => new WaterRemindersViewModel(createWaterReminderScheduler(() => ({
    title: words.current('m2r.wrem.notifyTitle'),
    body: words.current('m2r.wrem.notifyBody'),
    channelName: words.current('m2r.wrem.channel'),
  }))));
  useEffect(() => { vm.setOnline(online); }, [vm, online]);
  useEffect(() => {
    vm.load();
    vm.loadWeek();
    void reminders.load();
    return () => { vm.dispose(); reminders.dispose(); };
  }, [vm, reminders]);
  return (
    <Frame>
      <M2WaterView vm={vm} reminders={reminders} online={online} links={{
        back,
        sos: () => navigate('Emergency'),
        openSettings: () => void Linking.openSettings(),
      }} />
    </Frame>
  );
});

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: color.canvas },
});
