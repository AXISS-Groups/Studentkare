import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { MedicalScannerViewModel, ScannerTab } from '../viewmodel/MedicalScannerViewModel';

interface MedicalScannerNativeViewProps {
  viewModel: MedicalScannerViewModel;
}

/**
 * React Native / Mobile View for AI Medication & X-Ray Scanner.
 *
 * Consumes the exact same `MedicalScannerViewModel` as the web app.
 */
export const MedicalScannerNativeView: React.FC<MedicalScannerNativeViewProps> = observer(({ viewModel }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>AI CLINICAL ASSISTANT</Text>
      <Text style={styles.title}>AI Medical & Lab Scanner</Text>

      {viewModel.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{viewModel.error}</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[
          { id: 'MEDICATION_SEARCH', label: '💊 Pill Lookup' },
          { id: 'XRAY_DIAGNOSTICS', label: '🩻 X-Ray Scribe' },
        ].map(({ id, label }) => (
          <TouchableOpacity
            key={id}
            style={[styles.tabBtn, viewModel.activeTab === id && styles.tabActive]}
            onPress={() => viewModel.setActiveTab(id as ScannerTab)}
          >
            <Text style={[styles.tabText, viewModel.activeTab === id && styles.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {viewModel.activeTab === 'MEDICATION_SEARCH' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Search Pill or Active Molecule</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="e.g. Paracetamol, Dolo 650, Augmentin..."
              value={viewModel.searchQuery}
              onChangeText={(text: string) => viewModel.setSearchQuery(text)}
            />
            <TouchableOpacity
              style={styles.searchBtn}
              disabled={viewModel.analyzing}
              onPress={() => viewModel.searchMolecule()}
            >
              <Text style={styles.searchBtnText}>
                {viewModel.analyzing ? '...' : 'Lookup'}
              </Text>
            </TouchableOpacity>
          </View>

          {viewModel.scannedMedications.map((item, i) => (
            <View key={i} style={styles.medCard}>
              <View style={styles.medHeader}>
                <Text style={styles.medBrand}>{item.brandName}</Text>
                <Text style={styles.medMolecule}>{item.activeMolecule}</Text>
              </View>
              <Text style={styles.medText}>Dosage: {item.dosage}</Text>
              <Text style={styles.medText}>Purpose: {item.purpose}</Text>
            </View>
          ))}
        </View>
      )}

      {viewModel.activeTab === 'XRAY_DIAGNOSTICS' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>X-Ray & Lab Report Impression Scribe</Text>
          <TouchableOpacity
            style={styles.uploadArea}
            onPress={() => viewModel.analyzeImage('simulated_native_image_payload')}
          >
            <Text style={styles.uploadTitle}>📷 Select Medical Scan Photo</Text>
            <Text style={styles.uploadSub}>Supports Chest X-Rays, DICOM & Lab PDFs</Text>
          </TouchableOpacity>

          {viewModel.scannedDiagnostic && (
            <View style={styles.diagCard}>
              <Text style={styles.diagTitle}>{viewModel.scannedDiagnostic.scanType}</Text>
              <Text style={styles.confText}>
                Confidence: {(viewModel.scannedDiagnostic.confidenceScore * 100).toFixed(0)}%
              </Text>

              <Text style={styles.sectionLabel}>FINDINGS:</Text>
              {viewModel.scannedDiagnostic.findings.map((f, idx) => (
                <Text key={idx} style={styles.findingItem}>• {f}</Text>
              ))}

              <Text style={styles.sectionLabel}>IMPRESSION:</Text>
              <Text style={styles.impressionText}>{viewModel.scannedDiagnostic.impression}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 16 },
  eyebrow: { fontSize: 10, fontWeight: '700', color: '#4f46e5', letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  errorBox: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5' },
  errorText: { color: '#b91c1c', fontSize: 12 },
  tabRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 4, borderRadius: 10, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#ffffff' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#4f46e5', fontWeight: '700' },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 13, backgroundColor: '#ffffff' },
  searchBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  searchBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  medCard: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  medBrand: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  medMolecule: { fontSize: 10, fontWeight: '700', color: '#0369a1', backgroundColor: '#e0f2fe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  medText: { fontSize: 12, color: '#475569' },
  uploadArea: { backgroundColor: '#f8fafc', borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', borderRadius: 12, padding: 24, alignItems: 'center', gap: 6 },
  uploadTitle: { fontSize: 14, fontWeight: '700', color: '#4f46e5' },
  uploadSub: { fontSize: 11, color: '#64748b' },
  diagCard: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 6, marginTop: 8 },
  diagTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  confText: { fontSize: 10, fontWeight: '700', color: '#15803d' },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginTop: 6 },
  findingItem: { fontSize: 12, color: '#0f172a' },
  impressionText: { fontSize: 12, color: '#0f172a', fontWeight: '600' },
});
