import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { HealthVaultViewModel } from '../viewmodel/HealthVaultViewModel';

interface HealthVaultNativeViewProps {
  viewModel: HealthVaultViewModel;
}

/**
 * Mobile (React Native) View Component for ABDM / ABHA Digital Health Vault & Consent Manager.
 * Binds reactively to `HealthVaultViewModel` via MobX `observer`.
 */
export const HealthVaultNativeView: React.FC<HealthVaultNativeViewProps> = observer(({ viewModel }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ABDM / ABHA DIGITAL VAULT</Text>
        <Text style={styles.title}>Health Vault & Consent</Text>
      </View>

      {/* ABHA Card */}
      <View style={styles.abhaCard}>
        <Text style={styles.abhaBadge}>ABHA DIGITAL ID</Text>
        <Text style={styles.abhaAddr}>{viewModel.abhaAddress}</Text>
        <Text style={styles.abhaNum}>Num: {viewModel.abhaNumber}</Text>

        <TouchableOpacity
          style={styles.syncBtn}
          onPress={() => viewModel.syncAbdmRecords()}
          disabled={viewModel.isSyncing}
        >
          <Text style={styles.syncBtnText}>{viewModel.isSyncing ? 'Syncing...' : 'Sync ABDM Vault'}</Text>
        </TouchableOpacity>
      </View>

      {/* Sync Message */}
      {viewModel.syncMessage ? (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>✓ {viewModel.syncMessage}</Text>
        </View>
      ) : null}

      {/* Records Section */}
      <Text style={styles.sectionTitle}>Stored Health Records ({viewModel.storedRecords.length})</Text>
      {viewModel.storedRecords.map((rec) => (
        <View key={rec.id} style={styles.recordCard}>
          <View style={styles.recHeader}>
            <Text style={styles.catBadge}>{rec.category}</Text>
            <Text style={styles.recDate}>{rec.date}</Text>
          </View>
          <Text style={styles.recTitle}>{rec.title}</Text>
          <Text style={styles.facilityText}>{rec.facilityName} • Dr. {rec.doctorName}</Text>
        </View>
      ))}

      {/* Consents Section */}
      <Text style={styles.sectionTitle}>ABDM Consent Requests</Text>
      {viewModel.consentRequests.map((req) => (
        <View key={req.id} style={styles.consentCard}>
          <View style={styles.cHeader}>
            <Text style={styles.cTitle}>{req.requesterName}</Text>
            <Text style={[styles.cStatus, req.status === 'GRANTED' ? styles.statusGranted : styles.statusPending]}>
              {req.status}
            </Text>
          </View>
          <Text style={styles.cPurpose}>Purpose: {req.purpose}</Text>

          {req.status === 'PENDING' && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.denyBtn} onPress={() => viewModel.denyConsent(req.id)}>
                <Text style={styles.denyText}>Deny</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.grantBtn} onPress={() => viewModel.grantConsent(req.id)}>
                <Text style={styles.grantText}>Authorize</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  abhaCard: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    padding: 16,
  },
  abhaBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  abhaAddr: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  abhaNum: {
    fontSize: 12,
    color: '#e0f2fe',
    marginTop: 2,
    marginBottom: 12,
  },
  syncBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  syncBtnText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '700',
  },
  syncBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 12,
    borderRadius: 8,
  },
  syncText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  recordCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recDate: {
    fontSize: 11,
    color: '#64748b',
  },
  recTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginVertical: 4,
  },
  facilityText: {
    fontSize: 11,
    color: '#64748b',
  },
  consentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  cStatus: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusGranted: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
  cPurpose: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  denyBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  denyText: {
    fontSize: 11,
    color: '#64748b',
  },
  grantBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  grantText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },
});
