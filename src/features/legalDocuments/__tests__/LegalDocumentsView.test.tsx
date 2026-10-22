import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';
import { LegalDocumentsView } from '../LegalDocumentsView';
import type { LegalAdminRepository, LegalDocumentVersion } from '@/features/privacy/privacyRepository';

const DRAFT: LegalDocumentVersion = { id: 'd1', kind: 'PRIVACY_NOTICE', version: '2026-11-01', title: 'Privacy notice', body: 'Text', status: 'DRAFT', createdAt: 1, updatedAt: 1, publishedAt: null };

function repo(items: LegalDocumentVersion[]): LegalAdminRepository {
  return {
    list: vi.fn().mockResolvedValue({ items }),
    create: vi.fn().mockResolvedValue(DRAFT),
    edit: vi.fn().mockResolvedValue(DRAFT),
    publish: vi.fn().mockResolvedValue({ ...DRAFT, status: 'PUBLISHED', publishedAt: 2 }),
  };
}

describe('Super admin → Legal documents (audit H2)', () => {
  it('says each kind is not published until a version is', async () => {
    const { container } = render(<LegalDocumentsView repository={repo([])} />);
    expect(await screen.findAllByText('Not published: the app says so')).toHaveLength(3);
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);
  });

  it('creates a draft from the text legal supplies', async () => {
    const r = repo([]);
    render(<LegalDocumentsView repository={r} />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'New version' }))[0]);
    fireEvent.change(screen.getByLabelText('Version'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Pasted from legal.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(r.create).toHaveBeenCalledWith({ kind: 'PRIVACY_NOTICE', version: '2026-11-01', title: 'Privacy notice', body: 'Pasted from legal.' }));
  });

  it('publishes a draft only after confirming', async () => {
    const r = repo([DRAFT]);
    render(<LegalDocumentsView repository={r} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    expect(r.publish).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(r.publish).toHaveBeenCalledWith('d1'));
    expect(await screen.findByText('Privacy notice version 2026-11-01 is live.')).toBeTruthy();
  });
});
