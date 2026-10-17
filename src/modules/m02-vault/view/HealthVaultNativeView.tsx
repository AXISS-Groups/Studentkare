import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useVaultViewModel } from '../viewmodel/useVaultViewModel';

/**
 * Native View Component for the Digital Health Vault.
 * Binds reactively to `useVaultViewModel`.
 */
export const HealthVaultNativeView: React.FC = () => {
  const { state } = useVaultViewModel();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR HEALTH VAULT</Text>
        <Text style={styles.title}>Digital Health Vault</Text>
        <Text style={styles.subtitle}>FHIR health records stored in your Studentkare account.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Encrypted Health Records ({state.storedRecords.length})</Text>
        {state.storedRecords.map((rec) => (
          <View key={rec.id} style={styles.recordItem}>
            <Text style={styles.recTitle}>{rec.title}</Text>
            <Text style={styles.recSub}>{rec.facilityName} • {rec.doctorName}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  header: { marginBottom: 16 },
  eyebrow: { fontSize: 10, fontWeight: '700', color: '#0284c7', letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginVertical: 4 },
  subtitle: { fontSize: 13, color: '#64748b' },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  recordItem: { backgroundColor: '#ffffff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  recTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  recSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
});
