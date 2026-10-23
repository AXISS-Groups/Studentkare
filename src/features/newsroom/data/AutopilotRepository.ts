import { apiRequest } from '@/data/services/http';
import type { PostStatus } from './NewsroomRepository';
import type { PostTemplate } from '../model/templates';

/**
 * The content autopilot (backend services/newsroom_autopilot.py), super admin only.
 * Its on/off and schedule are settings (PATCH /ops/settings/{key}, a reason each
 * time); this reads the state and runs the actions the Autopilot tab offers.
 */

export type AutopilotLane = 'NEWS' | 'BLOG';
export type AutopilotState = 'SEEN' | 'SKIPPED' | 'POSTED' | 'HELD' | 'FAILED';

export interface AutopilotSource {
  id: string;
  publisher: string;
  url: string;
  enabled: boolean;
  /** What was checked from the network and when; empty when no feed was found yet. */
  verified: string;
  lastFetchAt: number | null;
  lastOkAt: number | null;
  lastError: string;
  lastItems: number;
  failures: number;
}

export interface AutopilotPost {
  id: string;
  status: PostStatus;
  live: boolean;
  path: string;
  template: PostTemplate;
  needsReview: boolean;
  reviewCurrent: boolean;
  publishAt: number | null;
  sample: boolean;
  /** The precision gate's score (-1: not scored) and why it waits for the super admin ('' when it does not). */
  precision: number;
  holdReason: '' | 'PRECISION' | 'EDITOR';
}

/** A built-in series' schedule (settings series.<key>.*). */
export interface AutopilotSeries {
  key: 'motivation' | 'health';
  enabled: boolean;
  name: string;
  slug: string;
  id: string;
  days: string[];
  hour: number;
  rota: string[];
  library: number;
  episodes: number;
  upcoming: number[];
}

export interface AutopilotItem {
  id: string;
  lane: AutopilotLane;
  state: AutopilotState;
  reason: string;
  title: string;
  topic: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourcePublishedAt: number | null;
  relevance: number;
  generator: string;
  slotAt: number | null;
  createdAt: number;
  updatedAt: number;
  post: AutopilotPost | null;
  categoryId: string;
  seriesName: string;
  precision: number;
}

export interface AutopilotStatus {
  killSwitch: boolean;
  production: boolean;
  timezone: string;
  model: { configured: boolean; use: boolean; aiKillSwitch: boolean };
  news: { enabled: boolean; autoPublish: boolean; perDay: number; today: number; windowStart: number; windowEnd: number; candidates: number };
  blog: { enabled: boolean; autoPublish: boolean; perWeek: number; days: string[]; hour: number; topics: string[]; upcoming: number[] };
  sources: AutopilotSource[];
  fetchIntervalMinutes: number;
  precision: { threshold: number; healthRequiresClinician: boolean };
  series: AutopilotSeries[];
  queue: AutopilotItem[];
  log: AutopilotItem[];
  job: { lastRunAt: number | null; lastStatus: string; lastError: string; nextRunAt: number | null } | null;
}

export interface AutopilotRun extends AutopilotStatus { run: { status: string; summary: Record<string, unknown> } }

export class AutopilotRepository {
  constructor(private readonly request: typeof apiRequest = apiRequest) {}

  status(): Promise<AutopilotStatus> {
    return this.request('/ops/autopilot');
  }

  runNow(): Promise<AutopilotRun> {
    return this.request('/ops/autopilot/run', { method: 'POST' });
  }

  checkSources(): Promise<AutopilotStatus> {
    return this.request('/ops/autopilot/check-sources', { method: 'POST' });
  }

  killSwitch(active: boolean, reason: string, takeDown: boolean): Promise<AutopilotStatus & { takenDown: number }> {
    return this.request('/ops/autopilot/kill-switch', { method: 'POST', body: JSON.stringify({ active, reason, takeDown }) });
  }

  /** One autopilot setting (on/off, schedule, caps), through the settings registry: validated, audited. */
  changeSetting(key: string, value: boolean | number | string, reason: string): Promise<unknown> {
    return this.request(`/ops/settings/${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify({ value, reason }) });
  }

  publish(postId: string): Promise<unknown> {
    return this.request(`/ops/posts/${encodeURIComponent(postId)}/publish`, { method: 'POST', body: JSON.stringify({ publishAt: null }) });
  }

  unpublish(postId: string): Promise<unknown> {
    return this.request(`/ops/posts/${encodeURIComponent(postId)}/unpublish`, { method: 'POST' });
  }
}
