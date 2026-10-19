import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';

/**
 * The answers GET/PATCH /api/profile/wellness accepts
 * (backend/services/member_profile_api.py). Neutral on purpose: there is no
 * weight-loss goal and no body measure, because for students that invites
 * disordered eating (AGENTS.md guardrail 4: no gamification of body metrics).
 *
 * Protocol values (AGENTS.md rule 11): the server's PRIMARY_GOALS and
 * ACTIVITY_LEVELS are the definition and backend/tests/test_wellness_goals.py
 * keeps these copies equal to them. Labels are i18n only
 * (`onboard.goal.<VALUE>`, `onboard.activity.<VALUE>`). The lists are not
 * server data on purpose: a new option needs its en/te/hi labels, which ship
 * with a release, and only reviewed code can add to the vocabulary.
 */
export const PRIMARY_GOALS = ['STAY_ACTIVE', 'SLEEP_BETTER', 'MANAGE_STRESS', 'BUILD_ROUTINE', 'RECORDS_IN_ONE_PLACE'] as const;
export const ACTIVITY_LEVELS = ['MOSTLY_SEATED', 'SOME_WALKING', 'ACTIVE_MOST_DAYS', 'VERY_ACTIVE'] as const;
export type PrimaryGoal = (typeof PRIMARY_GOALS)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export interface WellnessGoals {
  primaryGoal: PrimaryGoal | '';
  activityLevel: ActivityLevel | '';
  updatedAt: number | null;
}

/** The setup questions in the order they are asked, one per screen. */
export const SETUP_QUESTIONS = ['primaryGoal', 'activityLevel'] as const;
export type SetupQuestion = (typeof SETUP_QUESTIONS)[number];
export type SetupAnswer<Q extends SetupQuestion> = Q extends 'primaryGoal' ? PrimaryGoal : ActivityLevel;

const OPTIONS: { [Q in SetupQuestion]: readonly SetupAnswer<Q>[] } = {
  primaryGoal: PRIMARY_GOALS,
  activityLevel: ACTIVITY_LEVELS,
};

/**
 * One setup question on one screen. Every question is optional:
 *
 * - Skip never touches the network and always moves on, so declining costs
 *   nothing — not even a failed request.
 * - Continue sends only this screen's field, so answering the second question
 *   can never reset the first.
 * - Nothing is pre-selected that the student did not choose; a stored answer
 *   is shown only once the server has returned it.
 */
export class SetupQuestionViewModel<Q extends SetupQuestion> implements ViewModel {
  choice: SetupAnswer<Q> | null = null;
  loaded = false;
  loadFailed = false;
  saving = false;
  saveFailed = false;
  private disposed = false;

  constructor(
    readonly question: Q,
    private readonly request: typeof apiRequest = apiRequest,
  ) {
    makeAutoObservable<SetupQuestionViewModel<Q>, 'disposed' | 'request'>(
      this,
      { disposed: false, request: false, question: false },
      { autoBind: true },
    );
  }

  get options(): readonly SetupAnswer<Q>[] {
    return OPTIONS[this.question];
  }

  /** 1-based position among the setup questions, for the progress bar. */
  get step(): number {
    return SETUP_QUESTIONS.indexOf(this.question) + 1;
  }

  get total(): number {
    return SETUP_QUESTIONS.length;
  }

  get loading(): boolean {
    return !this.loaded && !this.loadFailed;
  }

  /** Continue needs an answer; Skip is the way past without one. */
  get canContinue(): boolean {
    return this.loaded && this.choice !== null && !this.saving;
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.loadFailed = false;
    this.loaded = false;
    try {
      const stored = await this.request<WellnessGoals>('/profile/wellness');
      if (this.disposed) return;
      const value: string = stored[this.question];
      const known = this.options.find((option) => option === value) ?? null;
      runInAction(() => {
        this.choice = known;
        this.loaded = true;
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.loadFailed = true; });
    }
  }

  choose(value: SetupAnswer<Q>): void {
    if (this.saving) return;
    this.choice = value;
    this.saveFailed = false;
  }

  /** Saves this answer, then calls onDone. On failure stays here and says so. */
  async save(onDone: () => void): Promise<void> {
    if (!this.canContinue || this.choice === null) return;
    this.saving = true;
    this.saveFailed = false;
    try {
      await this.request<WellnessGoals>('/profile/wellness', {
        method: 'PATCH',
        body: JSON.stringify({ [this.question]: this.choice }),
      });
      if (this.disposed) return;
      runInAction(() => { this.saving = false; });
      onDone();
    } catch {
      if (!this.disposed) runInAction(() => {
        this.saving = false;
        this.saveFailed = true;
      });
    }
  }

  /** Moves on without saving anything. Works in every state, including a failed load. */
  skip(onDone: () => void): void {
    // A save still in flight must not move the student a second time.
    this.disposed = true;
    onDone();
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.choice = null;
    this.loaded = false;
    this.loadFailed = false;
    this.saving = false;
    this.saveFailed = false;
  }
}
