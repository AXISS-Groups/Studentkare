import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { useAppStore } from '../data/store';
import { Modal } from './Modal';
import { Send, Bot, ShieldCheck, Sparkles, AlertTriangle } from 'lucide-react';

export interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateRoute?: (routeId: string) => void;
}

export const AIChatModal: React.FC<AIChatModalProps> = ({ visible, onClose, onNavigateRoute }) => {
  const { tokens, radius, typography } = useTheme();
  const { chatMessages, sendStudentChatMessage } = useAppStore();
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendStudentChatMessage(inputText.trim());
    setInputText('');
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="AXISS AI Care Copilot"
      subtitle="Guarded by Student Health AI Constitution Rules A–H & J/K"
    >
      <View style={styles.container}>
        {/* Constitution Banner */}
        <View
          style={[
            styles.constitutionBanner,
            {
              backgroundColor: tokens.surface3,
              borderColor: tokens.veil,
              borderRadius: radius.md,
            },
          ]}
        >
          <ShieldCheck size={14} color={tokens.action} />
          <Text style={[styles.constitutionText, { color: tokens.data, fontFamily: typography.fontMono }]}>
            ZERO-TRAINING PRIVACY · RULE A & K1 ENFORCED
          </Text>
        </View>

        {/* Message Stream */}
        <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatContent}>
          {chatMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isEmergency = msg.triageSeverity === 'URGENT_EMERGENCY';

            return (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  isUser
                    ? [styles.userBubble, { backgroundColor: tokens.action, borderRadius: radius.lg }]
                    : [
                        styles.botBubble,
                        {
                          backgroundColor: isEmergency ? tokens.emergencyBg : tokens.surface2,
                          borderColor: isEmergency ? tokens.emergency : tokens.ruleSoft,
                          borderRadius: radius.lg,
                        },
                      ],
                ]}
              >
                {!isUser && (
                  <View style={styles.botMetaRow}>
                    <View style={styles.botTitle}>
                      <Bot size={13} color={isEmergency ? tokens.emergency : tokens.action} />
                      <Text
                        style={[
                          styles.botLabel,
                          { color: isEmergency ? tokens.emergency : tokens.action },
                        ]}
                      >
                        Care AI
                      </Text>
                    </View>
                    {msg.constitutionRuleRef && (
                      <Text
                        style={[
                          styles.ruleTag,
                          { color: tokens.text3, fontFamily: typography.fontMono },
                        ]}
                      >
                        {msg.constitutionRuleRef}
                      </Text>
                    )}
                  </View>
                )}

                <Text
                  style={[
                    styles.messageText,
                    {
                      color: isUser ? '#ffffff' : tokens.text,
                      fontFamily: typography.fontFamily,
                    },
                  ]}
                >
                  {msg.text}
                </Text>

                {msg.actionPrompt && msg.actionPayload?.targetRoute && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      onClose();
                      if (onNavigateRoute) onNavigateRoute(msg.actionPayload.targetRoute);
                    }}
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: isEmergency ? tokens.emergency : tokens.action,
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    {isEmergency && <AlertTriangle size={13} color="#ffffff" />}
                    <Text style={styles.actionBtnText}>{msg.actionPrompt} →</Text>
                  </TouchableOpacity>
                )}

                <Text
                  style={[
                    styles.timestamp,
                    { color: isUser ? 'rgba(255,255,255,0.75)' : tokens.text3 },
                  ]}
                >
                  {msg.timestamp}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Suggested Quick Prompts */}
        <View style={styles.quickPromptsRow}>
          {[
            'Explain my latest CBC report',
            'Campus health camp schedule',
            'I have fever and eye headache',
          ].map((prompt, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => {
                sendStudentChatMessage(prompt);
              }}
              accessibilityLabel={`Ask Care AI: ${prompt}`}
              accessibilityRole="button"
              style={[
                styles.promptPill,
                { backgroundColor: tokens.surface3, borderColor: tokens.rule },
              ]}
            >
              <Sparkles size={11} color={tokens.action} />
              <Text style={[styles.promptPillText, { color: tokens.action }]}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input Bar */}
        <View style={[styles.inputBar, { borderTopColor: tokens.ruleSoft }]}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask anything about reports, camp, symptoms..."
            placeholderTextColor={tokens.text3}
            onSubmitEditing={handleSend}
            accessibilityLabel="Ask Care AI a health question"
            style={[
              styles.input,
              {
                backgroundColor: tokens.surface2,
                color: tokens.text,
                borderRadius: radius.md,
                borderColor: tokens.rule,
              },
            ]}
          />
          <TouchableOpacity
            onPress={handleSend}
            accessibilityLabel="Send message to Care AI"
            accessibilityRole="button"
            style={[styles.sendBtn, { backgroundColor: tokens.action, borderRadius: radius.md }]}
          >
            <Send size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 480,
    flexDirection: 'column',
  },
  constitutionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  constitutionText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: 6,
    gap: 12,
  },
  messageBubble: {
    padding: 12,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  botBubble: {
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  botMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  botTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  botLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  ruleTag: {
    fontSize: 9,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  quickPromptsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 8,
  },
  promptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  promptPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
  },
  sendBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
