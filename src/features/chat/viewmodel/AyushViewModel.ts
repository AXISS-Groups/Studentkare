import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

export type AyushOutcome = 'ANSWERED' | 'NO_SOURCE' | 'REFUSED_SCOPE' | 'REFUSED_PERSONAL' | 'REFUSED_OUTPUT' | 'CRISIS' | 'EMPTY';

export interface AyushCitation { sourceId: string; title: string; category: string; version: number; snippet: string; score: number; stale: boolean }
export interface AyushCrisisResource { label: string; number: string; detail: string }

/** POST /api/agents/ayush/ask (backend/services/clinical_api.py → agent_ayush). */
export interface AyushReply {
  agent: string;
  outcome: AyushOutcome;
  answer: string;
  citations: AyushCitation[];
  answered: boolean;
  refusedFor?: string;
  crisis?: { kind: string; resources: AyushCrisisResource[] };
}

/** Why Ayush declined, said plainly — same wording as the web panel. */
export const REFUSAL_NOTE: Partial<Record<AyushOutcome, string>> = {
  NO_SOURCE: 'No approved source covers this yet. Ayush will not guess.',
  REFUSED_SCOPE: 'Diagnosis, prescribing and dosage are for a registered clinician.',
  REFUSED_PERSONAL: 'Ayush cannot read your records — that boundary is deliberate.',
  REFUSED_OUTPUT: 'The approved source read as clinical advice, so it was withheld.',
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
  error: string | null = null;

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
        this.error = 'Ayush couldn’t be reached, so nothing was answered. Try again. If you’re in danger, call 112.';
        this.sending = false;
      });
    }
  }

  dispose(): void {}

  reset(): void {
    this.question = '';
    this.thread = [];
    this.error = null;
  }
}
