import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModuleRegistry } from '../moduleRegistry';
import { defineModule } from '../moduleManifest';

describe('ModuleRegistry (P58 & P63)', () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    registry = ModuleRegistry.getInstance();
    registry.reset();
  });

  it('registers modules successfully', () => {
    const m01 = defineModule({
      id: 'M01',
      name: 'auth',
      owner: 'core',
      phase: 1,
      dataClass: 'operational',
    });

    registry.register(m01);
    expect(registry.getModule('M01')).toEqual(m01);
  });

  it('detects circular dependencies (P58)', () => {
    const m01 = defineModule({
      id: 'M01',
      name: 'auth',
      owner: 'core',
      phase: 1,
      dataClass: 'operational',
      dependsOn: ['M02'],
    });

    const m02 = defineModule({
      id: 'M02',
      name: 'user',
      owner: 'core',
      phase: 1,
      dataClass: 'operational',
      dependsOn: ['M01'],
    });

    registry.register(m01);
    expect(() => registry.register(m02)).toThrow(/Circular dependency detected/);
  });

  it('handles valid event emission and consumption (P63)', () => {
    const publisher = defineModule({
      id: 'M19',
      name: 'scanners',
      owner: 'ops',
      phase: 1,
      dataClass: 'operational',
      emits: ['scanner.scanned'],
    });

    const subscriber = defineModule({
      id: 'M02',
      name: 'user',
      owner: 'core',
      phase: 1,
      dataClass: 'operational',
      consumes: ['scanner.scanned'],
    });

    registry.register(publisher);
    registry.register(subscriber);

    const listener = vi.fn();
    registry.subscribe('M02', 'scanner.scanned', listener);

    registry.emit('M19', 'scanner.scanned', { scanId: 'scan_123', code: 'QR_ABC' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].payload).toEqual({ scanId: 'scan_123', code: 'QR_ABC' });
  });

  it('throws error if emitting module did not declare event topic in manifest (P63)', () => {
    const publisher = defineModule({
      id: 'M19',
      name: 'scanners',
      owner: 'ops',
      phase: 1,
      dataClass: 'operational',
      emits: [],
    });

    registry.register(publisher);

    expect(() => {
      registry.emit('M19', 'scanner.scanned', { scanId: 'scan_123' });
    }).toThrow(/attempted to emit undeclared event topic/);
  });

  it('throws error if subscriber module did not declare event topic in manifest (P63)', () => {
    const subscriber = defineModule({
      id: 'M02',
      name: 'user',
      owner: 'core',
      phase: 1,
      dataClass: 'operational',
      consumes: [],
    });

    registry.register(subscriber);

    expect(() => {
      registry.subscribe('M02', 'scanner.scanned', () => {});
    }).toThrow(/attempted to subscribe to undeclared topic/);
  });

  it('rejects event payloads containing clinical data fields (P63 Rule L)', () => {
    const publisher = defineModule({
      id: 'M07',
      name: 'records',
      owner: 'clinical',
      phase: 1,
      dataClass: 'clinical',
      emits: ['records.updated'],
    });

    registry.register(publisher);

    expect(() => {
      registry.emit('M07', 'records.updated', {
        recordId: 'rec_123',
        diagnosis: 'Flu', // Forbidden clinical payload field!
      });
    }).toThrow(/contains forbidden clinical field 'diagnosis'/);
  });
});
