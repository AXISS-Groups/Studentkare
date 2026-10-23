import { describe, expect, it, vi } from 'vitest';
import { AnnouncementsViewModel } from '../AnnouncementsViewModel';
import type { Announcement, AnnouncementsRepository } from '../../model/announcementsRepository';

const row: Announcement = {
  id: 'a1', kind: 'ANNOUNCEMENT', title: 'Water supply', body: 'Off 2 to 4 pm', campus: '', status: 'SCHEDULED',
  scheduledAt: 1, createdAt: 1, sentAt: null, recipients: 0,
  counts: { devices: 0, sent: 0, delivered: 0, failed: 0, pending: 0, suppressed: 0 },
};

function repository(problems: string[] = []): AnnouncementsRepository {
  return {
    list: vi.fn(async () => ({ items: [], campuses: [], providers: { phone: true, web: false }, limits: { titleMax: 60, bodyMax: 160, scheduleMaxDays: 30 } })),
    preview: vi.fn(async () => ({ problems, students: 3, devices: 4, lockScreen: { title: 'Water supply', body: 'Off 2 to 4 pm' } })),
    create: vi.fn(async () => row),
    cancel: vi.fn(async () => ({ ...row, status: 'CANCELLED' as const })),
  };
}

describe('AnnouncementsViewModel', () => {
  it('cannot send until the server has previewed exactly this text, and an edit clears the preview', async () => {
    const repo = repository();
    const vm = new AnnouncementsViewModel(repo);
    await vm.load();
    vm.setTitle('Water supply');
    vm.setBody('Off 2 to 4 pm');
    expect(vm.canSend).toBe(false);
    await vm.runPreview();
    expect(vm.canSend).toBe(true);
    vm.setBody('Off 2 to 5 pm');
    expect(vm.canSend).toBe(false);
  });

  it('a refused text cannot be sent', async () => {
    const vm = new AnnouncementsViewModel(repository(['HEALTH_TERM']));
    await vm.load();
    vm.setTitle('Dengue alert');
    vm.setBody('Use nets');
    await vm.runPreview();
    expect(vm.canSend).toBe(false);
    vm.askSend();
    expect(vm.confirming).toBe(false);
  });

  it('sends after confirmation and cancels a scheduled one', async () => {
    const repo = repository();
    const vm = new AnnouncementsViewModel(repo);
    await vm.load();
    vm.setTitle('Water supply');
    vm.setBody('Off 2 to 4 pm');
    await vm.runPreview();
    vm.askSend();
    expect(vm.confirming).toBe(true);
    await vm.send();
    expect(repo.create).toHaveBeenCalledWith({ kind: 'ANNOUNCEMENT', title: 'Water supply', body: 'Off 2 to 4 pm', campus: '' });
    expect(vm.data?.items[0]?.id).toBe('a1');
    vm.askCancel(row);
    await vm.confirmCancel();
    expect(vm.data?.items[0]?.status).toBe('CANCELLED');
  });
});
