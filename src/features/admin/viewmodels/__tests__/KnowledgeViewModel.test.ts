import { describe, expect, it, vi } from 'vitest';
import type { KnowledgeRepository } from '../../model/knowledgeRepository';
import type { IndexStatus, KnowledgeSources } from '../../model/types';
import { KnowledgeViewModel } from '../KnowledgeViewModel';
import { PublishSourceViewModel } from '../PublishSourceViewModel';

const NOW = 1_800_000_000_000;
const sources: KnowledgeSources = { items: [
  { id: 's1', title: 'CBC report', category: 'records', version: 3, author: 'Clinical team', reviewed: true, expiresAt: NOW / 1000 + 86400 },
  { id: 's2', title: 'Dengue advisory', category: 'general', version: 1, author: '', reviewed: true, expiresAt: null },
  { id: 's3', title: 'Old note', category: 'medications', version: 1, author: 'Clinical team', reviewed: true, expiresAt: NOW / 1000 - 1 },
  { id: 's4', title: 'Draft', category: 'general', version: 1, author: 'Clinical team', reviewed: false, expiresAt: null },
] };
const index: IndexStatus = { approvedSources: 2, indexedSources: 1, chunks: 48, embedder: 'hash-ngram', semantic: false, missing: ['s2'], mismatchedEmbedder: 0 };
const settle = async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); };

function repository(overrides: Partial<KnowledgeRepository> = {}): KnowledgeRepository {
  return {
    sources: vi.fn().mockResolvedValue(sources),
    indexStatus: vi.fn().mockResolvedValue(index),
    reindex: vi.fn().mockResolvedValue({}),
    publish: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe('KnowledgeViewModel', () => {
  it('is loading before the first load, then loads the list and the index independently', async () => {
    const repo = repository();
    const vm = new KnowledgeViewModel(repo);
    expect(vm.sourcesLoading).toBe(true);
    expect(vm.indexLoading).toBe(true);
    vm.load();
    expect(repo.sources).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(repo.indexStatus).toHaveBeenCalledWith(expect.any(AbortSignal));
    await settle();
    expect(vm.sourcesLoading).toBe(false);
    expect(vm.indexLoading).toBe(false);
    expect(vm.list).toHaveLength(4);
    expect(vm.index).toEqual(index);
  });

  it('gives each source its state at the given time', async () => {
    const vm = new KnowledgeViewModel(repository());
    vm.load();
    await settle();
    expect(vm.sourceRows(NOW).map(row => [row.source.id, row.state.label, row.state.tone])).toEqual([
      ['s1', 'Live', 'is-positive'],
      ['s2', 'Not indexed', 'is-attention'],
      ['s3', 'Expired · hidden', 'is-neutral'],
      ['s4', 'Awaiting review', 'is-attention'],
    ]);
  });

  it('sets the header tone from the index', async () => {
    const indexStatus = vi.fn()
      .mockResolvedValueOnce(index)
      .mockResolvedValueOnce({ ...index, missing: [] })
      .mockResolvedValueOnce({ ...index, chunks: 0, missing: [] });
    const vm = new KnowledgeViewModel(repository({ indexStatus }));
    expect(vm.indexTone).toBeNull();
    await vm.loadIndex();
    expect(vm.indexTone).toBe('attention');
    await vm.loadIndex();
    expect(vm.indexTone).toBe('positive');
    await vm.loadIndex();
    expect(vm.indexTone).toBe('neutral');
  });

  it('keeps an index failure separate from the list', async () => {
    const vm = new KnowledgeViewModel(repository({ indexStatus: vi.fn().mockRejectedValue(new Error('Timed out')) }));
    vm.load();
    await settle();
    expect(vm.indexError).toBe('Timed out');
    expect(vm.index).toBeNull();
    expect(vm.sourcesError).toBe('');
    expect(vm.list).toHaveLength(4);
  });

  it('rebuilds the index, then checks the index and the list again, in that order', async () => {
    const calls: string[] = [];
    const repo = repository({
      sources: vi.fn(async () => { calls.push('sources'); return sources; }),
      indexStatus: vi.fn(async () => { calls.push('index'); return index; }),
      reindex: vi.fn(async () => { calls.push('reindex'); return {}; }),
    });
    const vm = new KnowledgeViewModel(repo);
    vm.load();
    await settle();
    calls.length = 0;
    const rebuilding = vm.reindex();
    expect(vm.reindexing).toBe(true);
    await rebuilding;
    expect(calls).toEqual(['reindex', 'index', 'sources']);
    expect(vm.reindexing).toBe(false);
  });

  it('shows a failed rebuild, keeps the index, and runs one rebuild at a time', async () => {
    let fail!: (error: Error) => void;
    const reindex = vi.fn(() => new Promise<unknown>((_resolve, reject) => { fail = reject; }));
    const repo = repository({ reindex });
    const vm = new KnowledgeViewModel(repo);
    vm.load();
    await settle();
    const first = vm.reindex();
    await vm.reindex();
    expect(reindex).toHaveBeenCalledTimes(1);
    fail(new Error('Index busy'));
    await first;
    expect(vm.reindexError).toBe('Index busy');
    expect(vm.index).toEqual(index);
    expect(repo.indexStatus).toHaveBeenCalledTimes(1);
  });

  it('reloads the list then the index after a source is published', async () => {
    const calls: string[] = [];
    const vm = new KnowledgeViewModel(repository({
      sources: vi.fn(async () => { calls.push('sources'); return sources; }),
      indexStatus: vi.fn(async () => { calls.push('index'); return index; }),
    }));
    vm.published();
    expect(calls).toEqual(['sources', 'index']);
    expect(vm.sourcesLoading).toBe(true);
    expect(vm.indexLoading).toBe(true);
  });

  it('ignores stale answers and changes nothing after dispose', async () => {
    const pending: { signal?: AbortSignal; resolve: (value: KnowledgeSources) => void }[] = [];
    const repo = repository({ sources: vi.fn((signal?: AbortSignal) => new Promise<KnowledgeSources>(resolve => { pending.push({ signal, resolve }); })) });
    const vm = new KnowledgeViewModel(repo);
    void vm.loadSources();
    vm.reloadSources();
    expect(pending[0].signal?.aborted).toBe(true);
    pending[1].resolve({ items: [sources.items[0]] });
    await settle();
    pending[0].resolve(sources);
    await settle();
    expect(vm.list.map(source => source.id)).toEqual(['s1']);
    void vm.loadSources();
    vm.dispose();
    expect(pending[2].signal?.aborted).toBe(true);
    pending[2].resolve(sources);
    await settle();
    expect(vm.sources).toBeNull();
  });
});

describe('PublishSourceViewModel', () => {
  it('starts with the empty form and sends expiry as a number, keeping the field order', async () => {
    const publish = vi.fn().mockResolvedValue({});
    const vm = new PublishSourceViewModel(repository({ publish }));
    expect(vm.form).toEqual({ title: '', category: 'appointments', content: '', author: '', expiresInDays: '365' });
    vm.setField('title', 'Hand hygiene');
    vm.setField('content', 'Wash hands for twenty seconds.');
    vm.setField('expiresInDays', '30');
    expect(await vm.publish()).toBe(true);
    expect(publish).toHaveBeenCalledWith({ title: 'Hand hygiene', category: 'appointments', content: 'Wash hands for twenty seconds.', author: '', expiresInDays: 30 });
    expect(Object.keys(publish.mock.calls[0][0])).toEqual(['title', 'category', 'content', 'author', 'expiresInDays']);
    expect(vm.form.title).toBe('');
    expect(vm.publishing).toBe(false);
  });

  it('keeps the form and shows the error when publishing fails', async () => {
    const vm = new PublishSourceViewModel(repository({ publish: vi.fn().mockRejectedValue(new Error('Title already used')) }));
    vm.setField('title', 'Hand hygiene');
    expect(await vm.publish()).toBe(false);
    expect(vm.error).toBe('Title already used');
    expect(vm.form.title).toBe('Hand hygiene');
  });

  it('publishes one at a time, and reports nothing once the dialog has gone', async () => {
    let release!: () => void;
    const publish = vi.fn(() => new Promise<unknown>(resolve => { release = () => resolve({}); }));
    const vm = new PublishSourceViewModel(repository({ publish }));
    const first = vm.publish();
    expect(await vm.publish()).toBe(false);
    expect(publish).toHaveBeenCalledTimes(1);
    vm.dispose();
    release();
    expect(await first).toBe(false);
  });
});
