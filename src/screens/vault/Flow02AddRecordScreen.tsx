import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { ProvenancePointer } from '../../components/ProvenancePointer';
import { simulateDocumentOcrExtraction } from '../../ai/documentExtractor';
import { HealthRecord, FHIRObservation } from '../../types';
import { Scan, FileCheck, CheckCircle2, FileText, Shield } from 'lucide-react';

interface Flow02Props {
  onRecordSaved: () => void;
}

export const Flow02AddRecordScreen: React.FC<Flow02Props> = ({ onRecordSaved }) => {
  const { tokens, typography } = useTheme();
  const { addRecord } = useAppStore();

  const [step, setStep] = useState<'SELECT' | 'EXTRACTING' | 'PREVIEW'>('SELECT');
  const [, setSelectedFileName] = useState('Dr_Lal_CBC_Panel_August2026.pdf');
  const [extractedData, setExtractedData] = useState<any>(null);

  const handleStartExtraction = (fileName: string) => {
    setSelectedFileName(fileName);
    setStep('EXTRACTING');
    setTimeout(() => {
      const data = simulateDocumentOcrExtraction(fileName);
      setExtractedData(data);
      setStep('PREVIEW');
    }, 850);
  };

  const handleSaveToVault = () => {
    if (!extractedData) return;

    const newRecord: HealthRecord = {
      id: `REC-${Date.now()}`,
      title: extractedData.title,
      category: extractedData.documentType === 'HOSPITAL_BILL' ? 'DISCHARGE_SUMMARY' : 'LAB',
      date: extractedData.date,
      facilityName: extractedData.facilityName,
      doctorName: extractedData.doctorName,
      sourceType: 'SCAN',
      confidenceGatePassed: extractedData.confidenceOverall >= 90,
      humanReviewRequired: extractedData.confidenceOverall < 90,
      isCachedOffline: true,
      fileSizeBytes: 480000,
      syncStatus: 'SYNCED',
      observations: extractedData.observations || [],
    };

    addRecord(newRecord);
    onRecordSaved();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <Badge label="FLOW 02 · HEALTH RECORD VAULT & OCR" variant="mono" />
        <Text style={[styles.title, { color: tokens.text }]}>Add & Structure Health Record</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Upload or scan any lab report, prescription, or hospital bill. Our privacy-first engine
          extracts FHIR R4 observations with pixel-level provenance and confidence gate verification.
        </Text>
      </View>

      <View style={styles.cardContainer}>
        {step === 'SELECT' && (
          <Card variant="surface">
            <Text style={[styles.cardTitle, { color: tokens.text }]}>Choose Document Source</Text>

            <View style={styles.uploadOptions}>
              <TouchableOpacity
                onPress={() => handleStartExtraction('Dr_Lal_CBC_Panel_August2026.pdf')}
                style={[styles.uploadBox, { backgroundColor: tokens.surface2, borderColor: tokens.action }]}
              >
                <Scan size={32} color={tokens.action} />
                <Text style={[styles.uploadLabel, { color: tokens.text }]}>Scan / Upload CBC Lab Report</Text>
                <Text style={[styles.uploadSub, { color: tokens.text3 }]}>PDF / JPEG (Simulate Blood Panel)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleStartExtraction('Apollo_Hospital_Inpatient_Bill_August.pdf')}
                style={[styles.uploadBox, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}
              >
                <FileText size={32} color={tokens.reward} />
                <Text style={[styles.uploadLabel, { color: tokens.text }]}>Scan Hospital Inpatient Bill</Text>
                <Text style={[styles.uploadSub, { color: tokens.text3 }]}>Itemized room rent, pharmacy & investigation</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.privacyBox, { backgroundColor: tokens.surface3, borderColor: tokens.veil }]}>
              <Shield size={16} color={tokens.action} />
              <Text style={[styles.privacyText, { color: tokens.data }]}>
                RULE C COMPLIANT: Your medical records are tokenized and NEVER used to train external AI models.
              </Text>
            </View>
          </Card>
        )}

        {step === 'EXTRACTING' && (
          <Card variant="surface" style={{ alignItems: 'center', paddingVertical: 40 }}>
            <FileCheck size={48} color={tokens.action} />
            <Text style={[styles.extractTitle, { color: tokens.text }]}>Processing & Structuring Document...</Text>
            <Text style={[styles.extractSub, { color: tokens.text2 }]}>
              Extracting LOINC codes, reference ranges, and generating pixel-accurate bounding box coordinates.
            </Text>
          </Card>
        )}

        {step === 'PREVIEW' && extractedData && (
          <Card variant="surface">
            <View style={styles.previewHeader}>
              <View>
                <Text style={[styles.docTitle, { color: tokens.text }]}>{extractedData.title}</Text>
                <Text style={[styles.docMeta, { color: tokens.text2 }]}>
                  {extractedData.facilityName} · {extractedData.date}
                </Text>
              </View>
              <Badge
                label={`${extractedData.confidenceOverall}% Confidence Gate Passed`}
                variant="positive"
              />
            </View>

            {/* Extracted Observations List */}
            {extractedData.observations && (
              <View style={styles.obsList}>
                <Text style={[styles.sectionHeading, { color: tokens.text }]}>
                  Extracted FHIR R4 Observations ({extractedData.observations.length})
                </Text>

                {extractedData.observations.map((obs: FHIRObservation) => (
                  <View
                    key={obs.id}
                    style={[
                      styles.obsCard,
                      {
                        backgroundColor: tokens.surface2,
                        borderColor: obs.isAbnormal ? tokens.emergency : tokens.ruleSoft,
                      },
                    ]}
                  >
                    <View style={styles.obsMainRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.obsName, { color: tokens.text }]}>{obs.display}</Text>
                        <Text style={[styles.obsLoinc, { color: tokens.data, fontFamily: typography.fontMono }]}>
                          LOINC: {obs.code} · Normal: {obs.referenceRange} {obs.unit}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.obsValue, { color: obs.isAbnormal ? tokens.emergency : tokens.text }]}>
                          {obs.value} {obs.unit}
                        </Text>
                        <Badge label="Normal" variant="positive" size="sm" />
                      </View>
                    </View>

                    {/* Pixel Provenance Inspector */}
                    <ProvenancePointer
                      provenance={obs.provenance}
                      confidence={obs.confidenceScore}
                      label={obs.display}
                    />
                  </View>
                ))}
              </View>
            )}

            {/* If Bill Line Items */}
            {extractedData.billItems && (
              <View style={styles.obsList}>
                <Text style={[styles.sectionHeading, { color: tokens.text }]}>
                  Extracted Bill Line Items ({extractedData.billItems.length})
                </Text>
                {extractedData.billItems.map((item: any) => (
                  <View
                    key={item.id}
                    style={[styles.obsCard, { backgroundColor: tokens.surface2, borderColor: tokens.ruleSoft }]}
                  >
                    <View style={styles.obsMainRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.obsName, { color: tokens.text }]}>{item.itemDescription}</Text>
                        <Text style={[styles.obsLoinc, { color: tokens.data, fontFamily: typography.fontMono }]}>
                          Category: {item.category}
                        </Text>
                      </View>
                      <Text style={[styles.obsValue, { color: tokens.text }]}>₹{item.billedAmount}</Text>
                    </View>
                    <ProvenancePointer provenance={item.provenance} confidence={item.confidence} />
                  </View>
                ))}
              </View>
            )}

            <View style={styles.saveActions}>
              <Button
                label="Save & Index into FHIR Vault (+50 Pts)"
                onPress={handleSaveToVault}
                size="lg"
                icon={<CheckCircle2 size={16} color="#ffffff" />}
              />
              <Button
                label="Scan Another Document"
                onPress={() => setStep('SELECT')}
                variant="outline"
              />
            </View>
          </Card>
        )}
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
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardContainer: {
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  uploadOptions: {
    gap: 12,
    marginBottom: 16,
  },
  uploadBox: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  uploadSub: {
    fontSize: 12,
    marginTop: 2,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  privacyText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  extractTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  extractSub: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 400,
    marginTop: 6,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    marginBottom: 16,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  docMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  obsList: {
    gap: 10,
    marginBottom: 20,
  },
  obsCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  obsMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  obsName: {
    fontSize: 14,
    fontWeight: '700',
  },
  obsLoinc: {
    fontSize: 11,
    marginTop: 2,
  },
  obsValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  saveActions: {
    gap: 10,
    marginTop: 12,
  },
});
