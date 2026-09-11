import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/theme';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';

export const Flow12CommunityScreen: React.FC = () => {
  const { tokens } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <Badge label="FLOW 12 · CAMPUS PEER WELLNESS CIRCLES" variant="mono" />
        <Text style={[styles.title, { color: tokens.text }]}>Anonymous Peer Health Circles</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Safe, pseudonymized student wellness discussions moderated by university health ambassadors.
        </Text>
      </View>

      <View style={styles.circlesList}>
        <Card variant="surface" style={styles.circleCard}>
          <View style={styles.circleHeader}>
            <View>
              <Text style={[styles.circleName, { color: tokens.text }]}>Monsoon Running & Fitness Sprint</Text>
              <Text style={[styles.circleMeta, { color: tokens.text2 }]}>184 Campus Runners · 5k Weekend Challenge</Text>
            </View>
            <Badge label="Active Challenge" variant="primary" />
          </View>
          <Text style={[styles.circleDesc, { color: tokens.text2 }]}>
            Join the weekend 5k run around campus lake. Log steps to earn 150 points.
          </Text>
          <Button label="Join Fitness Circle" onPress={() => {}} size="sm" style={{ alignSelf: 'flex-start', marginTop: 10 }} />
        </Card>

        <Card variant="surface" style={styles.circleCard}>
          <View style={styles.circleHeader}>
            <View>
              <Text style={[styles.circleName, { color: tokens.text }]}>Hostel Sleep & De-Stress Circle</Text>
              <Text style={[styles.circleMeta, { color: tokens.text2 }]}>320 Members · Anonymous Mood Check-ins</Text>
            </View>
            <Badge label="Confidential" variant="cyan" />
          </View>
          <Text style={[styles.circleDesc, { color: tokens.text2 }]}>
            Share coping techniques during exam weeks. Free guided breathing audios available.
          </Text>
          <Button label="Enter Circle" onPress={() => {}} variant="secondary" size="sm" style={{ alignSelf: 'flex-start', marginTop: 10 }} />
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  headerBox: {
    maxWidth: 780,
    alignSelf: 'center',
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    marginBottom: 16,
  },
  circlesList: {
    maxWidth: 780,
    alignSelf: 'center',
    width: '100%',
    gap: 14,
    paddingBottom: 40,
  },
  circleCard: {
    padding: 18,
  },
  circleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  circleName: {
    fontSize: 15,
    fontWeight: '700',
  },
  circleMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  circleDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});
