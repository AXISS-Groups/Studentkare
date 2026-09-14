import { makeAutoObservable } from 'mobx';
import type { ChatMessage } from '@/types';
import type { ChatStore } from '../store/ChatStore';

export const QUICK_PROMPTS = [
  'Explain my latest CBC report',
  'Campus health camp schedule',
  'I have fever and eye headache',
];

export interface ChatBubble {
  id: string;
  text: string;
  timestamp: string;
  sender: 'user' | 'assistant' | 'system';
  isUser: boolean;
  isEmergency: boolean;
  ruleRef?: string;
  actionPrompt?: string;
  targetRoute?: string;
}

/**
 * MVVM ViewModel for the AI Care Copilot chat (AXISS).
 *
 * Wraps the ChatStore, maps raw messages to render-friendly bubbles, and owns
 * the input text + send action. The view binds to `bubbles` and `quickPrompts`.
 */
export class ChatViewModel {
  inputText = '';

  constructor(private readonly chatStore: ChatStore) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get messages(): ChatMessage[] {
    return this.chatStore.chatMessages;
  }

  get bubbles(): ChatBubble[] {
    return this.chatStore.chatMessages.map((message) => ({
      id: message.id,
      text: message.text,
      timestamp: message.timestamp,
      sender: message.sender,
      isUser: message.sender === 'user',
      isEmergency: message.triageSeverity === 'URGENT_EMERGENCY',
      ruleRef: message.constitutionRuleRef,
      actionPrompt: message.actionPrompt,
      targetRoute: message.actionPayload?.targetRoute,
    }));
  }

  get quickPrompts(): string[] {
    return QUICK_PROMPTS;
  }

  setInputText(value: string): void {
    this.inputText = value;
  }

  get canSend(): boolean {
    return this.inputText.trim().length > 0;
  }

  send(): void {
    const text = this.inputText.trim();
    if (!text) return;
    this.chatStore.sendStudentChatMessage(text);
    this.inputText = '';
  }

  sendPrompt(prompt: string): void {
    this.chatStore.sendStudentChatMessage(prompt);
  }

  clear(): void {
    this.chatStore.clearChat();
  }
}
