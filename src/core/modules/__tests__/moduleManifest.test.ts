import { describe, it, expect } from 'vitest';
import { defineModule } from '../moduleManifest';

describe('defineModule', () => {
  it('freezes and returns a valid module config', () => {
    const config = defineModule({
      id: 'M19',
      name: 'scanners',
      owner: 'ops',
      phase: 1,
      dataClass: 'operational',
      capabilities: ['seo', 'realtime'],
      dependsOn: ['M01'],
      routes: ['/scan'],
      emits: ['scanner.scanned'],
      consumes: ['auth.session.changed'],
    });

    expect(config.id).toBe('M19');
    expect(config.dataClass).toBe('operational');
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('throws an error if a clinical module attempts to declare SEO capability (P61 / Rule L)', () => {
    expect(() => {
      defineModule({
        id: 'M07',
        name: 'records',
        owner: 'clinical',
        phase: 1,
        dataClass: 'clinical',
        capabilities: ['seo'],
      });
    }).toThrow(/\[P61 Violation\]/);
  });

  it('allows clinical modules to declare non-SEO capabilities like ai and realtime', () => {
    const config = defineModule({
      id: 'M07',
      name: 'records',
      owner: 'clinical',
      phase: 1,
      dataClass: 'clinical',
      capabilities: ['ai', 'realtime'],
    });

    expect(config.capabilities).toEqual(['ai', 'realtime']);
  });
});
