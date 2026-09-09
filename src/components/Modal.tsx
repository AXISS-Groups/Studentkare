import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Modal as RNModal, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/theme';
import { X } from 'lucide-react';
import { useInterface } from '../theme/InterfaceProvider';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ visible, onClose, title, subtitle, children }) => {
  const { tokens, radius, shadows } = useTheme();
  const { reducedMotion } = useInterface();

  return (
    <RNModal visible={visible} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          dataSet={{ ui: 'modal' }}
          style={[
            styles.modalContainer,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.rule,
              borderRadius: radius.r3xl,
            },
            shadows.lg,
          ]}
        >
          <View style={[styles.header, { borderBottomColor: tokens.ruleSoft }]}>
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={[styles.title, { color: tokens.text }]}>{title}</Text>
              {subtitle && <Text style={[styles.subtitle, { color: tokens.text2 }]}>{subtitle}</Text>}
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel={`Close ${title} modal`}
              accessibilityRole="button"
              style={[styles.closeBtn, { backgroundColor: tokens.surface2 }]}
            >
              <X size={18} color={tokens.text2} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 22, 92, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '90%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  content: {
    padding: 20,
  },
});
