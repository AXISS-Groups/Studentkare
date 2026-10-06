import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

// Answers keyed by request path, for screens that load through a repository. Unscripted paths resolve to {}.
const apiAnswers: Record<string, () => Promise<unknown>> = {};
const apiRequest = vi.fn((path: string, _init?: { method?: string; body?: string; signal?: AbortSignal }) => apiAnswers[path]?.() ?? Promise.resolve({}));

// Both content screens load through their repositories; using the hook again would fail here.
vi.mock('../../../hooks/useApiResource', () => ({
  useApiResource: () => { throw new Error('Content screens load through their repositories, not useApiResource.'); },
}));
vi.mock('../../../data/http', async importOriginal => ({ ...(await importOriginal<typeof import('../../../data/http')>()), apiRequest: (path: string, init?: { method?: string; body?: string; signal?: AbortSignal }) => apiRequest(path, init) }));

import { IntakeView } from '../../../features/admin/views/IntakeView';
import { KnowledgeView } from '../../../features/admin/views/KnowledgeView';

beforeEach(() => {
  Object.keys(apiAnswers).forEach(key => delete apiAnswers[key]);
  apiRequest.mockClear();
});

describe('Intake & OCR', () => {
  const QUEUE = '/ops/intake/review';
  const field = (id: string, intakeId: string, name: string, value: string, confidence: number) => ({ id, intakeId, field: name, value, confidence, documentId: `doc-${intakeId}-0000` });
  const queue = { items: [field('f1', 'i1', 'report_date', '22/09/2026', 0.98), field('f2', 'i1', 'wbc_count', '11,900', 0.68), field('f3', 'i2', 'patient_name', 'sample', 0.64)] };
  const queueRequests = () => apiRequest.mock.calls.filter(([path]) => path === QUEUE);

  it('groups the queue by document and shows the waiting count in the header', async () => {
    apiAnswers[QUEUE] = () => Promise.resolve(queue);
    render(<IntakeView />);
    expect(screen.getByText('Loading the intake queue…')).toBeInTheDocument();
    expect(await screen.findByText('3 fields waiting')).toBeInTheDocument();
    expect(queueRequests()).toHaveLength(1);
    const list = screen.getByRole('region', { name: /Needs a human · 2/ });
    expect(within(list).getAllByRole('button')).toHaveLength(2);
    expect(within(list).getAllByRole('button')[0]).toHaveTextContent('Lowest confidence 68%');
  });

  it('shows the selected document’s fields with their confidence, and no preview it cannot load', async () => {
    apiAnswers[QUEUE] = () => Promise.resolve(queue);
    render(<IntakeView />);
    const fields = await screen.findByRole('region', { name: 'Extracted fields' });
    expect(within(fields).getByLabelText(/Wbc count/)).toHaveValue('11,900');
    expect(within(fields).getByText('68%')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Original' })).toHaveTextContent('No preview.');
    expect(screen.queryByRole('button', { name: /ask the lab/i })).toBeNull();
  });

  it('confirms every field of the document, with corrections, through the existing review endpoint', async () => {
    apiAnswers[QUEUE] = () => Promise.resolve(queue);
    render(<IntakeView />);
    fireEvent.change(await screen.findByLabelText(/Wbc count/), { target: { value: '11,800' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm fields' }));
    await waitFor(() => expect(queueRequests()).toHaveLength(2));
    expect(apiRequest).toHaveBeenCalledWith('/ops/intake/review/f1', { method: 'PATCH', body: JSON.stringify({ approved: true, correctedValue: '22/09/2026' }) });
    expect(apiRequest).toHaveBeenCalledWith('/ops/intake/review/f2', { method: 'PATCH', body: JSON.stringify({ approved: true, correctedValue: '11,800' }) });
    expect(apiRequest).not.toHaveBeenCalledWith('/ops/intake/review/f3', expect.anything());
  });

  it('rejects the document’s fields', async () => {
    apiAnswers[QUEUE] = () => Promise.resolve(queue);
    render(<IntakeView />);
    fireEvent.click((await screen.findAllByRole('button', { pressed: false }))[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/ops/intake/review/f3', { method: 'PATCH', body: JSON.stringify({ approved: false, correctedValue: '' }) }));
  });

  it('keeps the edits and shows the error when a decision fails', async () => {
    apiAnswers[QUEUE] = () => Promise.resolve(queue);
    apiAnswers['/ops/intake/review/f1'] = () => Promise.reject(new Error('Review service unavailable'));
    render(<IntakeView />);
    fireEvent.change(await screen.findByLabelText(/Wbc count/), { target: { value: '11,800' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm fields' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Review service unavailable');
    expect(screen.getByLabelText(/Wbc count/)).toHaveValue('11,800');
    expect(queueRequests()).toHaveLength(1);
    expect(apiRequest).not.toHaveBeenCalledWith('/ops/intake/review/f2', expect.anything());
  });

  it('shows empty and error states, and Retry requests the queue again', async () => {
    apiAnswers[QUEUE] = () => Promise.resolve({ items: [] });
    const { unmount } = render(<IntakeView />);
    expect(await screen.findByText('Nothing waiting for a person.')).toBeInTheDocument();
    expect(screen.queryByText(/waiting$/)).toBeNull();
    unmount();
    apiRequest.mockClear();
    apiAnswers[QUEUE] = () => Promise.reject(new Error('Network error'));
    render(<IntakeView />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load the intake queue');
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
  const requestsTo = (path: string) => apiRequest.mock.calls.filter(([called]) => called === path);
  // jsdom has no modal dialogs: open and close the element the way a browser does, so its
  // contents are reachable by role.
  const dialogSupport = () => {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute('open'); };
  };

  it('lists sources with their real state and shows the indexed chunk count', async () => {
    apiAnswers[SOURCES] = () => Promise.resolve(sources);
    apiAnswers[INDEX] = () => Promise.resolve(index);
    render(<KnowledgeView />);
    expect(screen.getByText('Loading sources…')).toBeInTheDocument();
    expect(screen.getByText('Checking the index…')).toBeInTheDocument();
    expect(await screen.findByText('48 chunks indexed')).toBeInTheDocument();
    expect(apiRequest.mock.calls.map(([path]) => path)).toEqual([SOURCES, INDEX]);
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
    const panel = screen.getByRole('region', { name: 'Search index' });
    await within(panel).findByText('Approved sources indexed');
    expect(panel).toHaveTextContent('1 of 2');
    expect(panel).toHaveTextContent('Keyword · hash-ngram');
    expect(panel).toHaveTextContent('1 approved source is not in the index yet');
    fireEvent.click(within(panel).getByRole('button', { name: 'Rebuild index' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/ops/knowledge/reindex', { method: 'POST' }));
    await waitFor(() => expect(requestsTo(INDEX)).toHaveLength(2));
    expect(requestsTo(SOURCES)).toHaveLength(2);
    const order = apiRequest.mock.calls.map(([path]) => path);
    expect(order.slice(order.indexOf('/ops/knowledge/reindex') + 1)).toEqual([INDEX, SOURCES]);
  });

  it('shows a failed rebuild in the index panel and keeps the index', async () => {
    apiAnswers[SOURCES] = () => Promise.resolve(sources);
    apiAnswers[INDEX] = () => Promise.resolve(index);
    apiAnswers['/ops/knowledge/reindex'] = () => Promise.reject(new Error('Index busy'));
    render(<KnowledgeView />);
    const panel = screen.getByRole('region', { name: 'Search index' });
    fireEvent.click(await within(panel).findByRole('button', { name: 'Rebuild index' }));
    expect(await within(panel).findByRole('alert')).toHaveTextContent('Index busy');
    expect(panel).toHaveTextContent('1 of 2');
    expect(requestsTo(INDEX)).toHaveLength(1);
  });

  it('keeps Test a question as an empty section, without asking the real agent', async () => {
    apiAnswers[SOURCES] = () => Promise.resolve(sources);
    apiAnswers[INDEX] = () => Promise.resolve(index);
    render(<KnowledgeView />);
    await screen.findByText('48 chunks indexed');
    const test = screen.getByRole('region', { name: 'Test a question' });
    expect(test).toHaveTextContent('No retrieval preview.');
    expect(within(test).queryByRole('textbox')).toBeNull();
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
    expect(order.slice(order.indexOf('/ops/knowledge') + 1)).toEqual([SOURCES, INDEX]);
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
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add source' }));
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.queryByText('Title already used')).toBeNull();
  });
});
