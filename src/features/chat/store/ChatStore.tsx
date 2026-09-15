import { makeAutoObservable, runInAction } from 'mobx';
import { processStudentCareMessage } from '@/ai/careCopilot';
import type { AIResponsePayload } from '@/ai/careCopilot';
import { aiApi } from '@/data/api';
import type { ChatMessage } from '@/types';
import type { StudentStore } from '../../health/store/StudentStore';

const firstName = (fullName: string): string => fullName.split(' ')[0] || 'there';

/** Domain store for the AI care copilot chat, with the crisis gate applied first. */
export class ChatStore {
  chatMessages: ChatMessage[] = [
    {
      id: 'msg-0',
      sender: 'assistant',
      text: 'Hello! I am your AI Health Assistant. How can I support your health and records today?',
      timestamp: '09:00 AM',
      constitutionRuleRef: 'Rule-A',
    },
  ];

  constructor(private readonly studentStore: StudentStore) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  sendStudentChatMessage(text: string): void {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    this.chatMessages = [...this.chatMessages, userMsg];

    const localResponse = processStudentCareMessage(text, firstName(this.studentStore.student.fullName));
    if (localResponse.severity === 'URGENT_EMERGENCY') {
      this.chatMessages = [...this.chatMessages, this.buildBotMessage(localResponse)];
      return;
    }

    void aiApi
      .chat([{ role: 'user', content: text }])
      .then((res) => {
        const reply = res.reply && res.reply.trim() ? res.reply : localResponse.message;
        runInAction(() => {
          this.chatMessages = [...this.chatMessages, this.buildBotMessage({ ...localResponse, message: reply })];
        });
      })
      .catch(() => {
        runInAction(() => {
          this.chatMessages = [...this.chatMessages, this.buildBotMessage(localResponse)];
        });
      });
  }

  clearChat(): void {
    this.chatMessages = [
      {
        id: 'msg-init',
        sender: 'assistant',
        text: `Hello ${firstName(this.studentStore.student.fullName)}! How can I support your health today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        constitutionRuleRef: 'Rule-A',
      },
    ];
  }

  private buildBotMessage(response: AIResponsePayload): ChatMessage {
    return {
      id: `msg-${Date.now() + 1}`,
      sender: 'assistant',
      text: response.message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      constitutionRuleRef: response.ruleRef,
      triageSeverity: response.severity,
      actionPrompt: response.suggestedAction?.label,
      actionPayload: response.suggestedAction,
    };
  }
}
