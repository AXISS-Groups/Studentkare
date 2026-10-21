import { describe, expect, it } from 'vitest';
import { ResourceViewModel } from '../ResourceViewModel';
import { AuditExplorerViewModel, isBreakGlass, isDenied } from '../AuditExplorerViewModel';
import { medianToAcknowledge, sortSos } from '../../views/SafetyEventsView';
import { erasureClock } from '../../views/ErasureQueueView';
import { proxyRoute } from '../../views/ApiKeysView';
import { dependencyState } from '../../views/IntegrationsView';
import type { SosAlertRow } from '../../model/governanceTypes';

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

describe('ResourceViewModel', () => {
  it('is loading first, then ready with the data', async () => {
    const vm = new ResourceViewModel(() => Promise.resolve({ value: 1 }));
    expect(vm.status).toBe('loading');
    vm.load();
    await settle();
    expect(vm.status).toBe('ready');
    expect(vm.data).toEqual({ value: 1 });
  });

  it('fails closed: an error, even one with no message, is an error and never data', async () => {
    const vm = new ResourceViewModel<{ value: number }>(() => Promise.reject(new Error('')));
    vm.load();
    await settle();
    expect(vm.status).toBe('error');
    expect(vm.data).toBeNull();
  });

  it('ignores a late answer after it is disposed', async () => {
    let resolve: (value: number) => void = () => undefined;
    const vm = new ResourceViewModel(() => new Promise<number>(done => { resolve = done; }));
    vm.load();
    vm.dispose();
    resolve(5);
    await settle();
    expect(vm.data).toBeNull();
  });
});

describe('audit tabs', () => {
  it('classifies refusals and break-glass actions by name', () => {
    expect(isDenied('PAYMENT_SIGNATURE_REJECTED')).toBe(true);
    expect(isDenied('DIGITAL_ID_REFUSED_STALE')).toBe(true);
    expect(isDenied('ACCOUNT_CREATED')).toBe(false);
    expect(isBreakGlass('BREAK_GLASS_OPENED')).toBe(true);
    expect(isBreakGlass('ACCOUNT_CREATED')).toBe(false);
  });

  it('narrows the loaded page to the chosen tab', async () => {
    const vm = new AuditExplorerViewModel({ listEvents: () => Promise.resolve({ total: 2, items: [
      { id: '1', actorId: 'a', action: 'ACCOUNT_CREATED', resourceId: 'r', createdAt: 1 },
      { id: '2', actorId: 'b', action: 'RX_UPLOAD_REJECTED', resourceId: 'r', createdAt: 2 },
    ] }) });
    await vm.load();
    vm.setTab('denied');
    expect(vm.filtered.map(item => item.id)).toEqual(['2']);
    vm.setTab('break-glass');
    expect(vm.filtered).toEqual([]);
    vm.setTab('all');
    expect(vm.filtered).toHaveLength(2);
  });
});

const alert = (id: string, status: string, createdAt: number, acknowledgedAt: number | null = null): SosAlertRow => ({ id, status, campus: 'C', createdAt, acknowledgedAt, resolvedAt: null, cancelledAt: null, deliveries: [] });

describe('SOS ordering', () => {
  it('puts live SOS first, then acknowledged, then closed, newest first within each', () => {
    const sorted = sortSos([alert('closed', 'RESOLVED', 50), alert('old-live', 'ACTIVE', 10), alert('ack', 'ACKNOWLEDGED', 40), alert('new-live', 'ACTIVE', 30), alert('cancelled', 'CANCELLED', 60)]);
    expect(sorted.map(item => item.id)).toEqual(['new-live', 'old-live', 'ack', 'cancelled', 'closed']);
  });

  it('takes the median acknowledgement time only over acknowledged alerts, or none', () => {
    expect(medianToAcknowledge([alert('a', 'ACTIVE', 0)])).toBeNull();
    expect(medianToAcknowledge([alert('a', 'RESOLVED', 0, 60), alert('b', 'RESOLVED', 0, 180), alert('c', 'ACTIVE', 0)])).toBe(120);
  });
});

describe('erasure clock', () => {
  it('counts down to the scheduled date, then counts the days over it', () => {
    const day = 86400;
    expect(erasureClock({ accountId: 'a', requestedAt: 0, scheduledFor: 7 * day }, 2 * day)).toMatchObject({ overdue: false, daysLeft: 5, age: 2 });
    expect(erasureClock({ accountId: 'a', requestedAt: 0, scheduledFor: 7 * day }, 10 * day)).toMatchObject({ overdue: true, daysOver: 3, age: 10 });
  });
});

describe('integrations', () => {
  it('names each proxy route as it is mounted', () => {
    expect(proxyRoute('bad_words')).toBe('/api/apilayer/badwords');
    expect(proxyRoute('resume_parser')).toBe('/api/apilayer/resume-parser');
    expect(proxyRoute('numverify')).toBe('/api/apilayer/numverify');
  });

  it('marks a degraded Rule L firewall as a danger, and other breakages as attention', () => {
    const check = (name: string, status: 'online' | 'degraded' | 'unavailable' | 'unknown') => ({ name, configured: true, reachable: null, status, detail: '', checked_at: 0 });
    expect(dependencyState(check('rule_l_firewall', 'degraded')).tone).toBe('danger');
    expect(dependencyState(check('messaging_openwa', 'degraded')).tone).toBe('attention');
    expect(dependencyState(check('messaging_openwa', 'online')).tone).toBe('positive');
    expect(dependencyState(check('email_postal', 'unavailable')).tone).toBe('neutral');
  });
});
