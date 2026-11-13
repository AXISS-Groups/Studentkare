/**
 * The two calls that still go through this early client. Every other feature
 * talks to the API through its own service module under `src/data/services`
 * or its feature folder.
 */

import { apiBaseUrl } from '../core/env';

const API_BASE_URL = apiBaseUrl();

export const publicConfigApi = {
  async getPublicConfig() {
    try {
      const res = await fetch(`${API_BASE_URL}/config/public`);
      if (res.ok) return await res.json();
    } catch (e) {
      // offline
    }
    return {
      posthog: { enabled: false, apiKey: '', host: 'https://app.posthog.com' },
      firebase: { enabled: false, apiKey: '', authDomain: '', projectId: '', messagingSenderId: '', appId: '', vapidKey: '' },
      otp: { channel: 'WHATSAPP', ttlSeconds: 300 },
      twofa: { enforcedRoles: ['SUPER_ADMIN'], issuer: 'StudentKare' },
    };
  },
};

export const agentApi = {
  async adjudicateClaim(claim: Record<string, unknown>) {
    try {
      const res = await fetch(`${API_BASE_URL}/claims/adjudicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim }),
      });
      if (res.ok) return await res.json();
    } catch {
      return null;
    }
    return null;
  },
};
