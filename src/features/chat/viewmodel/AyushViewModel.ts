import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { MessageKey } from '@/i18n';

export type AyushOutcome = 'ANSWERED' | 'NO_SOURCE' | 'REFUSED_SCOPE' | 'REFUSED_PERSONAL' | 'REFUSED_OUTPUT' | 'CRISIS' | 'EMPTY';

export interface AyushCitation { sourceId: string; title: string; category: string; version: number; snippet: string; score: number; stale: boolean }
export interface AyushCrisisResource { label: string; number: string; detail: string }

/** POST /api/agents/ayush/ask (backend/services/clinical_api.py, then agent_ayush). */
export interface AyushReply {
  agent: string;
  outcome: AyushOutcome;
  answer: string;
  citations: AyushCitation[];
  answered: boolean;
  refusedFor?: string;
  crisis?: { kind: string; resources: AyushCrisisResource[] };
}

/** One earlier question (GET /agents/ayush/history), kept only while the student's history setting is on. */
export interface AyushTurn { id: string; question: string; answer: string; outcome: AyushOutcome; createdAt: number }

/** Why Ayush declined, said plainly — same wording as the web panel. */
export const REFUSAL_NOTE: Partial<Record<AyushOutcome, MessageKey>> = {
  NO_SOURCE: 'ayush.refusal.NO_SOURCE',
  REFUSED_SCOPE: 'ayush.refusal.REFUSED_SCOPE',
  REFUSED_PERSONAL: 'ayush.refusal.REFUSED_PERSONAL',
  REFUSED_OUTPUT: 'ayush.refusal.REFUSED_OUTPUT',
};

/**
 * Ask Ayush on the native app. Every question goes to the server agent, which
 * applies the AI constitution, the crisis gate and source grounding (guardrail
 * 3). This replaces a chat that answered on the device from a local rules file
 * and posted to /agents/llm/chat, which does not exist.
 */
export class AyushViewModel implements ViewModel {
  readonly conversationId = `conv-${Date.now().toString(36)}`;
  question = '';
  thread: { question: string; reply: AyushReply }[] = [];
  sending = false;
  /** A message key, translated by the view. */
  error: MessageKey | null = null;
  /** Earlier questions, newest last; empty when history is off or could not be read (never guessed). */
  history: AyushTurn[] = [];

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<AyushViewModel, 'request'>(this, { request: false, conversationId: false }, { autoBind: true });
  }

  setQuestion(text: string): void {
    this.question = text;
  }

  get canSend(): boolean {
    return this.question.trim().length > 0 && this.question.length <= 1000 && !this.sending;
  }

  async send(text: string = this.question): Promise<void> {
    const asked = text.trim();
    if (!asked || this.sending) return;
    this.sending = true;
    this.error = null;
    try {
      const reply = await this.request<AyushReply>('/agents/ayush/ask', {
        method: 'POST',
        body: JSON.stringify({ question: asked, conversationId: this.conversationId }),
      });
      runInAction(() => {
        this.thread.push({ question: asked, reply });
        this.question = '';
        this.sending = false;
      });
    } catch {
      runInAction(() => {
        // No local fallback answer: a made-up reply is worse than none.
        this.error = 'ayush.unreachable';
        this.sending = false;
      });
    }
  }

  /** The student's own earlier questions, when their history setting keeps them. A failure leaves the list empty. */
  async loadHistory(limit = 10): Promise<void> {
    try {
      const res = await this.request<{ items: AyushTurn[] }>(`/agents/ayush/history?limit=${limit}`);
      runInAction(() => { this.history = Array.isArray(res.items) ? res.items : []; });
    } catch {
      runInAction(() => { this.history = []; });
    }
  }

  dispose(): void {}

  reset(): void {
    this.question = '';
    this.thread = [];
    this.error = null;
    this.history = [];
  }
}
