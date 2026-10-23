import { useCallback, useRef, useState } from 'react';
import { apiRequest } from '@/data/services/http';
import type { MessageKey } from '@/i18n';

/** POST /agents/ayush/ask (backend/services/agent_ayush.py). Citations come only from the response. */
export interface AyushCitation { sourceId: string; title: string; category: string; version: number; snippet: string; score: number; stale: boolean }
export interface AyushCrisisResource { label: string; number: string; detail: string }
export type AyushOutcome = 'ANSWERED' | 'NO_SOURCE' | 'REFUSED_SCOPE' | 'REFUSED_PERSONAL' | 'REFUSED_OUTPUT' | 'CRISIS' | 'EMPTY';
export interface AyushReply {
  agent: string;
  outcome: AyushOutcome;
  answer: string;
  citations: AyushCitation[];
  answered: boolean;
  refusedFor?: string;
  crisis?: { kind: string; resources: AyushCrisisResource[] };
}
export interface AyushTurn { id: string; question: string; reply: AyushReply }

/** Why Ayush declined, said plainly (the existing assist catalogue). */
export const AYUSH_REFUSAL_NOTE: Partial<Record<AyushOutcome, MessageKey>> = {
  NO_SOURCE: 'assist.ayush.refusal.noSource',
  REFUSED_SCOPE: 'assist.ayush.refusal.scope',
  REFUSED_PERSONAL: 'assist.ayush.refusal.personal',
  REFUSED_OUTPUT: 'assist.ayush.refusal.output',
};

/**
 * A citation's category as a student reads it. The help pack's own category has a
 * label; a category the clinical team typed in the Knowledge screen is shown as typed.
 */
const CATEGORY_LABEL: Readonly<Record<string, MessageKey>> = { PRODUCT_HELP: 'assist.ayush.category.PRODUCT_HELP' };
export function ayushCategoryLabel(category: string, t: (key: MessageKey) => string): string {
  const key = CATEGORY_LABEL[category];
  return key ? t(key) : category;
}

export const AYUSH_STARTERS: readonly MessageKey[] = ['assist.ayush.starter.book', 'assist.ayush.starter.share', 'assist.ayush.starter.verify'];

/** The longest question the server accepts (AyushQuestion.question). */
export const AYUSH_MAX_QUESTION = 1000;

/**
 * One Ayush conversation, shared by the full page (WebAyush) and the floating
 * widget (AyushWidget). Behaviour is the server's: crisis interception, scope
 * guard, the vault boundary and grounding all run there; this only sends the
 * question and keeps the replies in memory for the life of the screen (never
 * storage — a transcript is clinical data).
 */
export function useAyushConversation(request: typeof apiRequest = apiRequest) {
  const conversationId = useRef(`conv-${Date.now().toString(36)}`);
  const [turns, setTurns] = useState<AyushTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const counter = useRef(0);

  const ask = useCallback(async (text: string): Promise<void> => {
    const question = text.trim().slice(0, AYUSH_MAX_QUESTION);
    if (!question || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const reply = await request<AyushReply>('/agents/ayush/ask', {
        method: 'POST',
        body: JSON.stringify({ question, conversationId: conversationId.current }),
      });
      counter.current += 1;
      setTurns((previous) => [...previous, { id: `${conversationId.current}-${counter.current}`, question, reply }]);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [busy, request]);

  const reset = useCallback(() => {
    conversationId.current = `conv-${Date.now().toString(36)}`;
    setTurns([]);
    setFailed(false);
  }, []);

  return { turns, busy, failed, ask, reset };
}
