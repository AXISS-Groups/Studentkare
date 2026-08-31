import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { OrderState } from '../../types';
import { Layers, ArrowRight, CheckCircle2, Clock, FileCheck, Shield, ChevronRight } from 'lucide-react';

export const M20OrchestratorScreen: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  const { fabricOrders, advanceOrderState } = useAppStore();

  const stateMachineOrder: OrderState[] = [
    'created',
    'routed',
    'accepted',
    'scheduled',
    'in_progress',
    'fulfilled',
    'reported',
    'settled',
  ];

  const getNextState = (current: OrderState): OrderState | null => {
    const idx = stateMachineOrder.indexOf(current);
    if (idx !== -1 && idx < stateMachineOrder.length - 1) {
      return stateMachineOrder[idx + 1];
    }
    return null;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Badge label="VERTICAL C · HEALTH SERVICES FABRIC" variant="cyan" />
          <Badge label="M20 FULFILMENT ORCHESTRATOR" variant="mono" />
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>Unified Order Engine & Reconciliation</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          One single Order object across all service verticals. 8-stage auditable state machine:
          created → routed → accepted → scheduled → in_progress → fulfilled → reported → settled.
        </Text>
      </View>

      {/* Orders List */}
      <View style={styles.ordersList}>
        {fabricOrders.map((order) => {
          const nextState = getNextState(order.state);
          const isSettled = order.state === 'settled';

          return (
            <Card key={order.id} variant="surface" style={styles.orderCard}>
              <View style={styles.orderTopRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <Badge label={order.serviceCategory} variant="primary" size="sm" />
                    <Badge label={`Pincode ${order.pincode}`} variant="mono" size="sm" />
                    <Text style={[styles.orderId, { color: tokens.data, fontFamily: typography.fontMono }]}>
                      {order.id}
                    </Text>
                  </View>
                  <Text style={[styles.serviceTitle, { color: tokens.text }]}>{order.serviceName}</Text>
                  <Text style={[styles.patientSub, { color: tokens.text2 }]}>
                    Patient: {order.patientName} · Partner: {order.partnerName}
                  </Text>
                </View>

                <Badge
                  label={order.state.toUpperCase()}
                  variant={isSettled ? 'positive' : 'cyan'}
                />
              </View>

              {/* State Machine Step Bar */}
              <View style={[styles.stateBar, { backgroundColor: tokens.surface2, borderRadius: radius.md }]}>
                {stateMachineOrder.map((st, idx) => {
                  const isPassed = stateMachineOrder.indexOf(order.state) >= idx;
                  const isCurrent = order.state === st;

                  return (
                    <View key={st} style={styles.stateStepItem}>
                      <View
                        style={[
                          styles.stepNode,
                          {
                            backgroundColor: isCurrent ? tokens.action : isPassed ? tokens.positive : tokens.veil,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.stepText,
                          {
                            color: isCurrent ? tokens.action : isPassed ? tokens.positive : tokens.text3,
                            fontWeight: isCurrent ? '800' : '600',
                          },
                        ]}
                      >
                        {st}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Routing & Settlement Split */}
              <View style={styles.bottomMetaRow}>
                <View style={styles.provInfo}>
                  <Text style={[styles.metaLabel, { color: tokens.text3 }]}>Assigned Provider (SLA Ranked):</Text>
                  <Text style={[styles.provName, { color: tokens.text }]}>
                    {order.assignedProviderName || 'Auto-Routing'} (Fallback: {order.fallbackProviderId})
                  </Text>
                </View>

                <View style={styles.settlementBox}>
                  <Text style={[styles.metaLabel, { color: tokens.text3 }]}>Reconciliation Ledger:</Text>
                  <Text style={[styles.settleAmounts, { color: tokens.data, fontFamily: typography.fontMono }]}>
                    Provider Cost: ₹{order.providerCost} · Partner Price: ₹{order.partnerPrice} ({order.settlementStatus})
                  </Text>
                </View>
              </View>

              {/* Interactive State Advance Action */}
              {nextState && (
                <View style={styles.advanceRow}>
                  <Button
                    label={`Advance State to "${nextState.toUpperCase()}"`}
                    onPress={() => advanceOrderState(order.id, nextState)}
                    size="sm"
                    iconRight={<ArrowRight size={14} color="#ffffff" />}
                  />
                </View>
              )}
            </Card>
          );
        })}
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
    maxWidth: 960,
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
  ordersList: {
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
    gap: 16,
    paddingBottom: 40,
  },
  orderCard: {
    padding: 18,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 11,
    fontWeight: '700',
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  patientSub: {
    fontSize: 12,
    marginTop: 2,
  },
  stateBar: {
    flexDirection: 'row',
    padding: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  stateStepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepText: {
    fontSize: 9,
    textTransform: 'uppercase',
  },
  bottomMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 12,
  },
  provInfo: {
    flex: 1,
    minWidth: 260,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  provName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  settlementBox: {
    alignItems: 'flex-end',
  },
  settleAmounts: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  advanceRow: {
    marginTop: 14,
    flexDirection: 'row',
  },
});
