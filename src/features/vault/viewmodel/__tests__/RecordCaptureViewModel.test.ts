import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/http';
import { RecordCaptureViewModel } from '../RecordCaptureViewModel';
import type { RecordDraft } from '../RecordCaptureViewModel';

const photo = { uri: 'file:///cache/Camera/abc.jpg', width: 1200, height: 1600 };

function ready(upload: (draft: RecordDraft) => Promise<void>) {
  const vm = new RecordCaptureViewModel(upload);
  vm.setPhoto(photo);
  vm.setTitle('  Blood test, March  ');
  vm.setCategory('LAB');
  return vm;
}

describe('RecordCaptureViewModel', () => {
  it('sends the photo with a trimmed title and a server-accepted category', async () => {
    const upload = vi.fn(async () => undefined);
    const vm = ready(upload);
    await vm.save();
    expect(upload).toHaveBeenCalledWith({ title: 'Blood test, March', category: 'LAB', photo });
    expect(vm.saved).toBe(true);
    expect(vm.photo).toBeNull();
  });

  it('does not send without a name or a category', async () => {
    const upload = vi.fn(async () => undefined);
    const vm = new RecordCaptureViewModel(upload);
    vm.setPhoto(photo);
    await vm.save();
    expect(vm.problem).toBe('title');
    vm.setTitle('Prescription');
    await vm.save();
    expect(vm.problem).toBe('category');
    expect(upload).not.toHaveBeenCalled();
    expect(vm.saved).toBe(false);
  });

  it('never says saved when the upload fails, and keeps the photo to retry', async () => {
    const vm = ready(async () => {
      throw new ApiError('Cannot connect', 0);
    });
    await vm.save();
    expect(vm.saved).toBe(false);
    expect(vm.problem).toBe('failed');
    expect(vm.photo).toEqual(photo);
    expect(vm.title).toBe('  Blood test, March  ');
  });

  it('tells the student a photo is too large when the server says so', async () => {
    const vm = ready(async () => {
      throw new ApiError('Files must be 10 MB or smaller.', 413);
    });
    await vm.save();
    expect(vm.problem).toBe('tooLarge');
    expect(vm.saved).toBe(false);
  });

  it('ignores a second save while one is in flight', async () => {
    let finish: () => void = () => undefined;
    const upload = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const vm = ready(upload);
    const first = vm.save();
    await vm.save();
    finish();
    await first;
    expect(upload).toHaveBeenCalledTimes(1);
  });
});
