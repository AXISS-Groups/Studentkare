import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, fontWeight, radius, space } from './theme';

export interface StepDiagramProps {
  steps: ReadonlyArray<{ title: string; description?: string }>;
  testID?: string;
}

/**
 * A vertical numbered step list — a circled step number connected to the
 * next by a thin vertical rule, with a title and optional description
 * beside each. This pattern turned up independently in two different
 * reference-video reviews (a forex-card activation flow and an insurance
 * "how a top-up works" explainer), so it's built here once as a shared
 * component rather than re-drawn per screen.
 */
export function StepDiagram({ steps, testID }: StepDiagramProps): React.ReactElement {
  return (
    <View testID={testID}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <View key={`${index}-${step.title}`} style={styles.row}>
            <View style={styles.rail}>
              <View style={styles.circle}>
                <Text style={styles.circleText}>{index + 1}</Text>
              </View>
              {!isLast ? <View style={styles.connector} /> : null}
            </View>
            <View style={[styles.copy, isLast ? null : styles.copyWithConnector]}>
              <Text style={styles.title}>{step.title}</Text>
              {step.description ? <Text style={styles.description}>{step.description}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const CIRCLE_SIZE = 28;

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  rail: { alignItems: 'center', width: CIRCLE_SIZE },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: radius.full,
    backgroundColor: color.action,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  connector: { flex: 1, width: 2, minHeight: space.s24, backgroundColor: color.ruleSoft, marginVertical: space.s4 },
  copy: { flex: 1, paddingLeft: space.s12, paddingBottom: space.s16 },
  copyWithConnector: { minHeight: CIRCLE_SIZE + space.s24 },
  title: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  description: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * font.lineHeight.body, fontWeight: fontWeight(font.weight.regular), color: color.text3, marginTop: space.s4 },
});
