import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { FileSpreadsheet, ShieldCheck, CheckCircle2, AlertTriangle, FileCode, Layers, Eye } from 'lucide-react';
import { assertRule } from '../ai/constitution';

export interface BoundingBoxProvenance {
  pageNumber: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  extractedText: string;
  sourceDocName: string;
}

export interface DroolsDeductionRule {
  ruleCode: string;
  title: string;
  description: string;
  deductionAmount: number;
  provenance?: BoundingBoxProvenance;
  status: 'DEDUCTION_APPLIED' | 'PASSED_NO_DEDUCTION';
}

export const DroolsClaimsEngine: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule('Rule-K4'); // Mandatory document provenance
  assertRule('Rule-K5'); // Drools Tariff & NME calculation

  const [selectedProvenance, setSelectedProvenance] = useState<BoundingBoxProvenance | null>(null);

  const rulesApplied: DroolsDeductionRule[] = [
    {
      ruleCode: 'RULE-POL-04',
      title: 'Room Rent Proportionate Deduction (Rule-K5)',
      description: 'Standard AC Room billed at ₹2,250/day. Base policy SI caps room rent at 1% (₹2,000/day). ₹500 excess deducted.',
      deductionAmount: 500,
      status: 'DEDUCTION_APPLIED',
      provenance: {
        pageNumber: 2,
        boundingBox: { x: 140, y: 320, width: 220, height: 45 },
        extractedText: 'Room Rent & Nursing Charges: ₹2,250 x 2 Days = ₹4,500',
        sourceDocName: 'Apollo_Hospital_Itemized_Invoice.pdf',
      },
    },
    {
      ruleCode: 'RULE-IRDAI-NME-01',
      title: 'IRDAI Standard Non-Medical Expense Exclusion (Rule-K5)',
      description: 'Item 14 (Sanitizer dispensers) and Item 29 (Admission files) are classified as non-payable administrative charges.',
      deductionAmount: 850,
      status: 'DEDUCTION_APPLIED',
      provenance: {
        pageNumber: 3,
        boundingBox: { x: 80, y: 510, width: 310, height: 35 },
        extractedText: 'Misc Charges: Hand Sanitizer (₹350), File Cover (₹500)',
        sourceDocName: 'Apollo_Hospital_Itemized_Invoice.pdf',
      },
    },
    {
      ruleCode: 'RULE-POL-WAITING-PERIOD',
      title: 'Initial 30-Day Waiting Period Verification',
      description: 'Policy active since August 2024. Waiting period satisfied.',
      deductionAmount: 0,
      status: 'PASSED_NO_DEDUCTION',
    },
  ];

  const totalBilled = 18500;
  const totalDeductions = rulesApplied.reduce((sum, r) => sum + r.deductionAmount, 0);
  const netApproved = totalBilled - totalDeductions;

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FileCode size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            Drools Tariff Engine & Document Provenance (Rule-K4/K5)
          </Text>
        </View>
        <Badge label="VERTICAL D ISOLATED CLAIMS PLANE" variant="mono" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        Deterministic Drools adjudication engine. Computes NME deductions & IRDAI tariff rules while attaching exact page bounding box provenance (Rule-K4). Structurally cannot access clinical vault.
      </Text>

      {/* Financial Summary */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 140, backgroundColor: tokens.surface2, padding: 14, borderRadius: radius.lg, border: `1px solid ${tokens.rule}` }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono }}>TOTAL BILLED</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: tokens.text, marginTop: 2 }}>₹{totalBilled.toLocaleString()}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 140, backgroundColor: tokens.emergencyBg, padding: 14, borderRadius: radius.lg, border: `1px solid ${tokens.emergency}` }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: tokens.emergency, fontFamily: typography.fontMono }}>NME DEDUCTIONS</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: tokens.emergency, marginTop: 2 }}>-₹{totalDeductions.toLocaleString()}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 140, backgroundColor: tokens.positiveBg, padding: 14, borderRadius: radius.lg, border: `1px solid ${tokens.positive}` }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: tokens.positive, fontFamily: typography.fontMono }}>NET APPROVED</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: tokens.positive, marginTop: 2 }}>₹{netApproved.toLocaleString()}</Text>
        </View>
      </View>

      {/* Rules Applied List */}
      <Text style={{ fontSize: 13, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily, marginBottom: 12 }}>
        Drools Business Rules & Provenance Extraction ({rulesApplied.length})
      </Text>

      {rulesApplied.map((rule, idx) => (
        <View key={idx} style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: tokens.text }}>{rule.title}</Text>
                <Badge label={rule.ruleCode} variant="mono" />
              </View>
              <Text style={{ fontSize: 12, color: tokens.text2, marginTop: 4 }}>{rule.description}</Text>
              
              {rule.provenance && (
                <TouchableOpacity
                  onPress={() => setSelectedProvenance(rule.provenance!)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}
                >
                  <Eye size={12} color={tokens.action} />
                  <Text style={{ fontSize: 11, color: tokens.action, fontWeight: '800', fontFamily: typography.fontMono }}>
                    View Rule-K4 Bounding-Box Provenance (Page {rule.provenance.pageNumber})
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={{ fontSize: 14, fontWeight: '900', color: rule.deductionAmount > 0 ? tokens.emergency : tokens.positive }}>
              {rule.deductionAmount > 0 ? `-₹${rule.deductionAmount}` : '₹0'}
            </Text>
          </View>
        </View>
      ))}

      {/* Bounding Box Modal */}
      {selectedProvenance && (
        <View style={{ backgroundColor: tokens.canvas, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.action}`, marginTop: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.action, fontFamily: typography.fontMono }}>
              📌 RULE-K4 PROVENANCE COORDINATES
            </Text>
            <TouchableOpacity onPress={() => setSelectedProvenance(null)}>
              <Text style={{ fontSize: 12, color: tokens.text3, fontWeight: '800' }}>Close</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 11, color: tokens.text2 }}>Source File: {selectedProvenance.sourceDocName}</Text>
          <Text style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 2 }}>
            Page #{selectedProvenance.pageNumber} · Bounding Box: [X: {selectedProvenance.boundingBox.x}, Y: {selectedProvenance.boundingBox.y}, W: {selectedProvenance.boundingBox.width}, H: {selectedProvenance.boundingBox.height}]
          </Text>
          <View style={{ backgroundColor: tokens.surface2, padding: 8, borderRadius: 6, marginTop: 6, borderLeftWidth: 3, borderLeftColor: tokens.action }}>
            <Text style={{ fontSize: 11, fontStyle: 'italic', color: tokens.text }}>"{selectedProvenance.extractedText}"</Text>
          </View>
        </View>
      )}
    </Card>
  );
};
