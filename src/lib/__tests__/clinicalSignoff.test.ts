/**
 * Studentkare — Clinical Sign-Off Guard Unit Test (G0.5)
 */

import { describe, it, expect } from 'vitest';
import { verifyClinicalSignoff } from '../clinicalSignoff';

describe('G0.5 Clinical Sign-Off Guard Test Suite', () => {
  it('must render "Pending Clinical Sign-Off" banner in development when artifacts are unsigned', () => {
    const result = verifyClinicalSignoff('development');
    expect(result.isFullySigned).toBe(false);
    expect(result.renderBanner).toBe(true);
    expect(result.bannerMessage).toContain('Pending Clinical Sign-Off');
    expect(result.pendingArtifacts.length).toBeGreaterThan(0);
  });

  it('must throw fatal error blocking application startup in production when artifacts are unsigned', () => {
    expect(() => verifyClinicalSignoff('production')).toThrow(
      '[FATAL CLINICAL SIGNOFF ERROR]'
    );
  });
});
