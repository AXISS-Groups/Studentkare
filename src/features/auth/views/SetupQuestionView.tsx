import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, ErrorState, Note, RadioGroup, Skeleton, Stepper } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { color, font, fontWeight, size, space } from '@/design-system/theme';
import { useT, type MessageKey } from '@/i18n';
import { SetupQuestionViewModel, type SetupAnswer, type SetupQuestion } from '../viewmodel/SetupQuestionViewModel';

const TITLE: Record<SetupQuestion, MessageKey> = {
  primaryGoal: 'onboard.goal.title',
  activityLevel: 'onboard.activity.title',
};
const OPTION_PREFIX: Record<SetupQuestion, 'onboard.goal' | 'onboard.activity'> = {
  primaryGoal: 'onboard.goal',
  activityLevel: 'onboard.activity',
};

export interface SetupQuestionViewProps<Q extends SetupQuestion> {
  question: Q;
  /** 1-based position among the setup questions, for the progress bar. */
  step: number;
  total: number;
  onBack: () => void;
  /** Called after a saved answer, and after Skip. */
  onDone: () => void;
  /** Tests pass a view model with a fake request. */
  viewModel?: SetupQuestionViewModel<Q>;
}

/**
 * One setup question per screen: primary goal, then activity level.
 *
 * Tier 3 with no canvas board. Built only from design-system components
 * (Stepper, RadioGroup, Button, Skeleton, ErrorState, Note) in the shape of
 * the setup screens around it: back, progress, title, one choice, Continue and
 * a way past. Skip is always there and always works, including when the
 * stored answer could not be loaded.
 */
function SetupQuestionViewInner<Q extends SetupQuestion>({
  question,
  step,
  total,
  onBack,
  onDone,
  viewModel,
}: SetupQuestionViewProps<Q>): React.ReactElement {
  const t = useT();
  const [vm] = useState(() => viewModel ?? new SetupQuestionViewModel(question));

  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);

  const options = vm.options.map((value) => ({
    value,
    label: t(`${OPTION_PREFIX[question]}.${value}` as MessageKey),
  }));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <Button
          label={t('common.back')}
          variant="ghost"
          icon={<Icon name="arrow-left" size={18} />}
          onPress={onBack}
        />
      </View>
      <Stepper current={step} total={total} label={t('onboard.q.step', { n: step, total })} />

      <Text accessibilityRole="header" aria-level={1} style={styles.title}>
        {t(TITLE[question])}
      </Text>
      <Text style={styles.lede}>{t('onboard.q.optional')}</Text>

      {vm.loading ? <Skeleton label={t('onboard.q.loading')} lines={['90%', '90%', '90%', '90%']} /> : null}

      {vm.loadFailed ? (
        <ErrorState
          title={t('onboard.q.loadErrorTitle')}
          body={t('onboard.q.loadErrorBody')}
          retryLabel={t('common.tryAgain')}
          onRetry={() => void vm.load()}
        />
      ) : null}

      {vm.loaded ? (
        <RadioGroup<SetupAnswer<Q>>
          label={t(TITLE[question])}
          options={options}
          value={vm.choice}
          onChange={vm.choose}
        />
      ) : null}

      {vm.saveFailed ? <Note tone="danger">{t('onboard.q.saveError')}</Note> : null}

      <View style={styles.actions}>
        <Button
          label={t('onboard.q.continue')}
          size="cta"
          fullWidth
          disabled={!vm.canContinue && !vm.saving}
          busy={vm.saving}
          onPress={() => void vm.save(onDone)}
        />
        <Button label={t('onboard.q.skip')} variant="ghost" fullWidth onPress={() => vm.skip(onDone)} />
      </View>
    </ScrollView>
  );
}

export const SetupQuestionView = observer(SetupQuestionViewInner) as <Q extends SetupQuestion>(
  props: SetupQuestionViewProps<Q>,
) => React.ReactElement;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: {
    width: '100%',
    maxWidth: size.phoneWidth,
    alignSelf: 'center',
    paddingHorizontal: space.gutterPhone,
    paddingTop: space.s24,
    paddingBottom: space.s40,
    gap: space.s16,
  },
  top: { flexDirection: 'row' },
  title: {
    fontFamily: font.family.sans,
    fontSize: font.size.heading,
    fontWeight: fontWeight(font.weight.heavy),
    color: color.text,
  },
  lede: {
    fontFamily: font.family.sans,
    fontSize: font.size.body,
    lineHeight: font.size.body * font.lineHeight.body,
    color: color.text2,
  },
  actions: { gap: space.s8, marginTop: space.s8 },
});
