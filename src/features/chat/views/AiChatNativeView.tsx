import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { ChatViewModel } from '../viewmodel/ChatViewModel';

interface AiChatNativeViewProps {
  viewModel: ChatViewModel;
}

/**
 * Mobile (React Native) View Component for AI Care Copilot Chat & Crisis Gate.
 * Binds reactively to `ChatViewModel` via MobX `observer`.
 */
export const AiChatNativeView: React.FC<AiChatNativeViewProps> = observer(({ viewModel }) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>AXISS AI CARE COPILOT</Text>
        <Text style={styles.title}>AI Triage & Health Chat</Text>
      </View>

      {/* Quick Prompts */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptsScroll}>
        {viewModel.quickPrompts.map((prompt, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.promptChip}
            onPress={() => viewModel.sendPrompt(prompt)}
          >
            <Text style={styles.promptChipText}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Messages */}
      <ScrollView style={styles.messagesScroll} contentContainerStyle={styles.messagesContent}>
        {viewModel.bubbles.map((b) => (
          <View
            key={b.id}
            style={[
              styles.bubbleCard,
              b.isUser ? styles.userBubble : styles.assistantBubble,
              b.isEmergency && styles.emergencyBubble,
            ]}
          >
            {b.isEmergency && (
              <Text style={styles.emergencyTag}>⚠️ TRIAGE CRISIS GATE (Rule K3)</Text>
            )}
            <Text style={b.isUser ? styles.userText : styles.assistantText}>{b.text}</Text>
            {b.ruleRef ? <Text style={styles.ruleText}>Gov: {b.ruleRef}</Text> : null}
            <Text style={b.isUser ? styles.userTime : styles.assistantTime}>{b.timestamp}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Input Row */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask AXISS about lab reports or symptoms..."
          value={viewModel.inputText}
          onChangeText={(text: string) => viewModel.setInputText(text)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !viewModel.canSend && styles.sendBtnDisabled]}
          onPress={() => viewModel.send()}
          disabled={!viewModel.canSend}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  header: {
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366f1',
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  promptsScroll: {
    maxHeight: 36,
    marginBottom: 12,
  },
  promptChip: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  promptChipText: {
    fontSize: 11,
    color: '#4338ca',
    fontWeight: '600',
  },
  messagesScroll: {
    flex: 1,
    marginBottom: 12,
  },
  messagesContent: {
    gap: 10,
  },
  bubbleCard: {
    padding: 12,
    borderRadius: 12,
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: '#4f46e5',
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emergencyBubble: {
    backgroundColor: '#fff5f5',
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  emergencyTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#dc2626',
    marginBottom: 4,
  },
  userText: {
    color: '#ffffff',
    fontSize: 13,
  },
  assistantText: {
    color: '#0f172a',
    fontSize: 13,
  },
  ruleText: {
    fontSize: 9,
    color: '#6366f1',
    fontWeight: '700',
    marginTop: 4,
  },
  userTime: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  assistantTime: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
  },
  sendBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
