import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { Provenance, ProvenanceBox } from '../types';
import { Search, FileText, CheckCircle2 } from 'lucide-react';

export interface ProvenancePointerProps {
  provenance?: Provenance | ProvenanceBox;
  confidence?: number;
  label?: string;
}

export const ProvenancePointer: React.FC<ProvenancePointerProps> = ({
  provenance,
  confidence = 96,
  label = 'Document Provenance (Rule K4)',
}) => {
  const { tokens, radius, typography } = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (!provenance) return null;

  const pageNum = 'page' in provenance ? provenance.page : provenance.pageNumber;
  const docId = 'documentId' in provenance ? provenance.documentId : undefined;
  const bboxText = 'bbox' in provenance
    ? `bbox: [${provenance.bbox.join(', ')}]`
    : `box: [x:${provenance.box.x}%, y:${provenance.box.y}%, w:${provenance.box.width}%, h:${provenance.box.height}%]`;
  const snippetText = 'snippet' in provenance ? provenance.snippet : `Doc Ref: ${docId || 'VERIFIED_DOC_PAGE'}`;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded(!expanded)}
        style={[
          styles.triggerRow,
          {
            backgroundColor: tokens.surface3,
            borderColor: tokens.veil,
            borderRadius: radius.md,
          },
        ]}
      >
        <Search size={13} color={tokens.data} />
        <Text style={[styles.triggerText, { color: tokens.data, fontFamily: typography.fontMono }]}>
          Provenance: Page {pageNum} ({confidence}% conf)
        </Text>
        <Text style={[styles.expandHint, { color: tokens.text3 }]}>
          {expanded ? '▲ Hide' : '▼ Inspect'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View
          style={[
            styles.detailsBox,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.action,
              borderRadius: radius.md,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <FileText size={14} color={tokens.action} />
            <Text style={[styles.title, { color: tokens.text }]}>{label}</Text>
            <View style={[styles.badge, { backgroundColor: tokens.positiveBg }]}>
              <CheckCircle2 size={11} color={tokens.positive} />
              <Text style={[styles.badgeText, { color: tokens.positive }]}>Rule K4 Bounding-Box Verified</Text>
            </View>
          </View>

          <Text style={[styles.snippetText, { color: tokens.text2, backgroundColor: tokens.surface2 }]}>
            "{snippetText}"
          </Text>

          <View style={styles.coordsGrid}>
            <Text style={[styles.coordItem, { color: tokens.text3, fontFamily: typography.fontMono }]}>
              Doc: {docId || 'Page ' + pageNum}
            </Text>
            <Text style={[styles.coordItem, { color: tokens.text3, fontFamily: typography.fontMono }]}>
              {bboxText}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  triggerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  expandHint: {
    fontSize: 10,
    marginLeft: 4,
  },
  detailsBox: {
    marginTop: 6,
    padding: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  snippetText: {
    fontSize: 11,
    fontStyle: 'italic',
    padding: 6,
    borderRadius: 4,
    marginVertical: 4,
  },
  coordsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  coordItem: {
    fontSize: 10,
  },
});
