import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

// Answers keyed by request path, for screens that load through a repository. Unscripted paths resolve to {}.
const apiAnswers: Record<string, () => Promise<unknown>> = {};
const apiRequest = vi.fn((path: string, _init?: { method?: string; body?: string; signal?: AbortSignal }) => apiAnswers[path]?.() ?? Promise.resolve({}));

// Both content screens load through their repositories; using the hook again would fail here.
vi.mock('../../../hooks/api/useApiResource', () => ({
  useApiResource: () => { throw new Error('Content screens load through their repositories, not useApiResource.'); },
}));
vi.mock('../../../data/services/http', async importOriginal => ({ ...(await importOriginal<typeof import('../../../data/services/http')>()), apiRequest: (path: string, init?: { method?: string; body?: string; signal?: AbortSignal }) => apiRequest(path, init) }));

import { IntakeView } from '../../../features/admin/views/IntakeView';
import { KnowledgeView } from '../../../features/admin/views/KnowledgeView';

beforeEach(() => {
  Object.keys(apiAnswers).forEach(key => delete apiAnswers[key]);
  apiRequest.mockClear();
});

describe('Intake & OCR', () => {
  const QUEUE = '/ops/intake/review';
  const intake = (id: string, kind: string, status: string, processedAt: number | null = null) => ({ id, kind, status, createdAt: 1_760_000_000, processedAt });
  const queue = { items: [intake('int_a1', 'LAB', 'DRAFT'), intake('int_b2', 'PRESCRIPTION', 'FAILED', 1_760_000_100), intake('int_c3', 'SCAN', 'QUEUED')] };
  const queueRequests = () => apiRequest.mock.calls.filter(([path]) => path === QUEUE);

  it('lists each open intake with its kind, state and times, and the count in the header', async () => {
    apiAnswers[QUEUE] = () => Promise.resolve(queue);
    render(<IntakeView />);
    expect(screen.getByRole('status', { name: 'Loading the intake queue…' })).toBeInTheDocument();
    expect(await screen.findByText('3 open')).toBeInTheDocument();
    expect(queueRequests()).toHaveLength(1);
    const table = screen.getByRole('table', { name: 'Intake & OCR' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('int_a1');
    expect(rows[0]).toHaveTextContent('Lab report');
    expect(rows[0]).toHaveTextContent('Waiting for review');
    expect(rows[1]).toHaveTextContent('Reading failed');
    // An unknown kind falls back to its readable code, never a guess.
    expect(rows[2]).toHaveTextContent('Scan');
    expect(screen.getByText(/never shows a title, a value or the document itself/)).toBeInTheDocument();
  });

  it('offers no extracted fields, no original and no confirm or reject', async () => {
    apiAnswers[QUEUE] = () => Promise.resolve(queue);
    render(<IntakeView />);
    await screen.findByText('3 open');
    expect(screen.queryByRole('region', { name: 'Extracted fields' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Original' })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /confirm|reject/i })).toBeNull();
    expect(apiRequest.mock.calls.every(([path, init]) => path === QUEUE && !init?.method)).toBe(true);
  });

  it('shows empty and error states, and Retry requests the queue again', async () => {
    apiAnswers[QUEUE] = () => Promise.resolve({ items: [] });
    const { unmount } = render(<IntakeView />);
    expect(await screen.findByText('Nothing waiting for a person.')).toBeInTheDocument();
    expect(screen.queryByText(/open$/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Back to overview' })).toBeInTheDocument();
    unmount();
    apiRequest.mockClear();
    apiAnswers[QUEUE] = () => Promise.reject(new Error('Network error'));
    render(<IntakeView />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load intake & OCR');
    expect(alert).toHaveTextContent('Ref ERR-503 · AdminIntake');
    expect(alert).toHaveTextContent('Network error');
    fireEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(queueRequests()).toHaveLength(2));
  });
});

describe('Knowledge base', () => {
  const SOURCES = '/knowledge/sources';
  const INDEX = '/ops/knowledge/index-status';
  const now = Date.now() / 1000;
  const sources = { items: [
    { id: 's1', title: 'Understanding your CBC report', category: 'records', version: 3, author: 'Clinical team', reviewed: true, expiresAt: now + 86400 },
    { id: 's2', title: 'Dengue advisory', category: 'general', version: 1, author: '', reviewed: true, expiresAt: now + 86400 },
    { id: 's3', title: 'Old dosing note', category: 'medications', version: 1, author: 'Clinical team', reviewed: true, expiresAt: now - 86400 },
    { id: 's4', title: 'Draft note', category: 'general', version: 1, author: 'Clinical team', reviewed: false, expiresAt: null },
  ] };
  const index = { approvedSources: 2, indexedSources: 1, chunks: 48, embedder: 'hash-ngram', semantic: false, missing: ['s2'], mismatchedEmbedder: 0 };
  const HEALTH = '/ops/agents/ayush/health';
  const healthy = {
    status: 'ok', published: 2, indexed: 2, missing: 0, stale: 0, chunks: 48, helpPack: { articles: 17, published: 17 },
    retrieval: { mode: 'keyword', embedder: 'local-hashing-v1', requestedProvider: 'local', model: '', misconfigured: '', fallbackPassages: 0 },
    answers: { mode: 'quotes', model: '', reachable: null, modelPulled: null, recent: { rephrased: 0, quoted: 4, fellBack: 0 } },
    lastError: null,
  };
  beforeEach(() => { apiAnswers[HEALTH] = () => Promise.resolve(healthy); });
  const requestsTo = (path: string) => apiRequest.mock.calls.filter(([called]) => called === path);
  // jsdom has no modal dialogs: open and close the element the way a browser does, so its
  // contents are reachable by role.
  const dialogSupport = () => {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute('open'); };
  };

  it('shows Ayush health in plain words, and says so when Ayush cannot answer', async () => {
    apiAnswers[SOURCES] = () => Promise.resolve(sources);
    apiAnswers[INDEX] = () => Promise.resolve(index);
    apiAnswers[HEALTH] = () => Promise.resolve({
      status: 'down', published: 0, indexed: 0, missing: 0, stale: 0, chunks: 0, helpPack: { articles: 17, published: 0 },
      retrieval: { mode: 'keyword', embedder: 'local-hashing-v1', requestedProvider: 'ollama', model: '', misconfigured: 'missing-url', fallbackPassages: 0 },
      answers: { mode: 'rephrased', model: 'llama3.1:8b', reachable: false, modelPulled: null, recent: { rephrased: 0, quoted: 0, fellBack: 2 } },
      lastError: { where: 'generation', error: 'ConnectError', at: now },
    });
    render(<KnowledgeView />);
    const card = await screen.findByRole('region', { name: 'Ayush health' });
    expect(await within(card).findByText('Not answering')).toBeInTheDocument();
    expect(within(card).getByRole('alert')).toHaveTextContent('Ayush can’t answer anything yet');
    expect(card).toHaveTextContent('EMBEDDING_PROVIDER is set to “ollama”');
    expect(card).toHaveTextContent('Keyword matching (no semantic model on)');
    expect(card).toHaveTextContent('Rephrased by the on-prem model · llama3.1:8b');
    expect(card).toHaveTextContent('Not reachable · answers fall back to quotes');
    expect(card).toHaveTextContent('ConnectError while rephrasing an answer');
  });

  it('shows an unreadable health report as an error in its own card', async () => {
    apiAnswers[HEALTH] = () => Promise.resolve({});
    apiAnswers[SOURCES] = () => Promise.resolve(sources);
    apiAnswers[INDEX] = () => Promise.resolve(index);
    render(<KnowledgeView />);
    const card = await screen.findByRole('region', { name: 'Ayush health' });
    expect(await within(card).findByRole('alert')).toHaveTextContent('Couldn’t check Ayush');
    expect(await screen.findByText('48 chunks indexed')).toBeInTheDocument();
  });

  it('lists sources with their real state and shows the indexed chunk count', async () => {
    apiAnswers[SOURCES] = () => Promise.resolve(sources);
    apiAnswers[INDEX] = () => Promise.resolve(index);
    render(<KnowledgeView />);
    expect(screen.getByRole('status', { name: 'Loading sources…' })).toBeInTheDocument();
    expect(await screen.findByText('48 chunks indexed')).toBeInTheDocument();
    expect(apiRequest.mock.calls.map(([path]) => path)).toEqual([SOURCES, INDEX, HEALTH]);
    const list = await screen.findByRole('region', { name: 'Sources Ayush may quote' });
    await within(list).findByText('Understanding your CBC report');
    expect(within(list).getByText('Understanding your CBC report').closest('li')).toHaveTextContent('Live');
    expect(within(list).getByText('Understanding your CBC report').closest('li')).toHaveTextContent('Records · v3');
    expect(within(list).getByText('Dengue advisory').closest('li')).toHaveTextContent('Not indexed');
    expect(within(list).getByText('Dengue advisory').closest('li')).toHaveTextContent('Author not recorded');
    expect(within(list).getByText('Old dosing note').closest('li')).toHaveTextContent('Expired · hidden');
    expect(within(list).getByText('Draft note').closest('li')).toHaveTextContent('Awaiting review');
    expect(within(list).queryByRole('button', { name: /retire|sign off|restore/i })).toBeNull();
  });

  it('shows the index status and rebuilds it through the existing endpoint, then checks the index and the list again', async () => {
    apiAnswers[SOURCES] = () => Promise.resolve(sources);
    apiAnswers[INDEX] = () => Promise.resolve(index);
    render(<KnowledgeView />);
    const panel = await screen.findByRole('region', { name: 'Search index' });
    await within(panel).findByText('Approved sources indexed');
    expect(panel).toHaveTextContent('1 of 2');
    expect(panel).toHaveTextContent('Keyword · hash-ngram');
    expect(panel).toHaveTextContent('1 approved source is not in the index yet');
    fireEvent.click(within(panel).getByRole('button', { name: 'Rebuild index' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/ops/knowledge/reindex', { method: 'POST' }));
    await waitFor(() => expect(requestsTo(INDEX)).toHaveLength(2));
    expect(requestsTo(SOURCES)).toHaveLength(2);
    const order = apiRequest.mock.calls.map(([path]) => path);
    expect(order.slice(order.indexOf('/ops/knowledge/reindex') + 1)).toEqual([INDEX, SOURCES, HEALTH]);
  });

  it('shows a failed rebuild in the index panel and keeps the index', async () => {
    apiAnswers[SOURCES] = () => Promise.resolve(sources);
    apiAnswers[INDEX] = () => Promise.resolve(index);
    apiAnswers['/ops/knowledge/reindex'] = () => Promise.reject(new Error('Index busy'));
    render(<KnowledgeView />);
    const panel = await screen.findByRole('region', { name: 'Search index' });
    fireEvent.click(await within(panel).findByRole('button', { name: 'Rebuild index' }));
    expect(await within(panel).findByRole('alert')).toHaveTextContent('Index busy');
    expect(panel).toHaveTextContent('1 of 2');
    expect(requestsTo(INDEX)).toHaveLength(1);
  });

  it('keeps Test a question disabled, without asking the real agent', async () => {
    apiAnswers[SOURCES] = () => Promise.resolve(sources);
    apiAnswers[INDEX] = () => Promise.resolve(index);
    render(<KnowledgeView />);
    await screen.findByText('48 chunks indexed');
    const test = screen.getByRole('region', { name: 'Test a question' });
    expect(test).toHaveTextContent(/once a preview endpoint is connected/);
    expect(within(test).getByRole('searchbox')).toBeDisabled();
    expect(apiRequest).not.toHaveBeenCalledWith(expect.stringContaining('/agents/ayush/ask'), expect.anything());
  });

  it('opens the publish form from Add source, and shows empty and error states', async () => {
    dialogSupport();
    apiAnswers[SOURCES] = () => Promise.resolve({ items: [] });
    apiAnswers[INDEX] = () => Promise.reject(new Error('Timed out'));
    render(<KnowledgeView />);
    expect(await screen.findByText('No sources yet.')).toBeInTheDocument();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t check the index');
    expect(alert).toHaveTextContent('Timed out');
    expect(screen.queryByText(/chunks indexed/)).toBeNull();
    fireEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(requestsTo(INDEX)).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'Add source' }));
    expect(screen.getByText('Publish a knowledge source')).toBeInTheDocument();
  });

  it('publishes a source with the same body, closes the form and reloads the list and the index', async () => {
    dialogSupport();
    apiAnswers[SOURCES] = () => Promise.resolve(sources);
    apiAnswers[INDEX] = () => Promise.resolve(index);
    render(<KnowledgeView />);
    await screen.findByText('48 chunks indexed');
    fireEvent.click(screen.getByRole('button', { name: 'Add source' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Hand hygiene' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'general' } });
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'Wash hands for twenty seconds.' } });
    fireEvent.change(screen.getByLabelText('Author'), { target: { value: 'Clinical team' } });
    fireEvent.change(screen.getByLabelText('Expires (days)'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish source' }));
    await waitFor(() => expect(screen.queryByText('Publish a knowledge source')).toBeNull());
    expect(apiRequest).toHaveBeenCalledWith('/ops/knowledge', { method: 'POST', body: JSON.stringify({ title: 'Hand hygiene', category: 'general', content: 'Wash hands for twenty seconds.', author: 'Clinical team', expiresInDays: 30 }) });
    await waitFor(() => expect(requestsTo(INDEX)).toHaveLength(2));
    const order = apiRequest.mock.calls.map(([path]) => path);
    expect(order.slice(order.indexOf('/ops/knowledge') + 1)).toEqual([SOURCES, INDEX, HEALTH]);
  });

  it('keeps the publish form open with the error when publishing fails, and a new form starts clean', async () => {
    dialogSupport();
    apiAnswers[SOURCES] = () => Promise.resolve(sources);
    apiAnswers[INDEX] = () => Promise.resolve(index);
    apiAnswers['/ops/knowledge'] = () => Promise.reject(new Error('Title already used'));
    render(<KnowledgeView />);
    await screen.findByText('48 chunks indexed');
    fireEvent.click(screen.getByRole('button', { name: 'Add source' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Hand hygiene' } });
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'Wash hands for twenty seconds.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish source' }));
    expect(await screen.findByText('Title already used')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Hand hygiene');
    expect(requestsTo(SOURCES)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add source' }));
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.queryByText('Title already used')).toBeNull();
  });
});
