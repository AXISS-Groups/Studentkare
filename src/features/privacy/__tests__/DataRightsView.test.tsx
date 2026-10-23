import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';
import { navigate } from '@/lib/utils/workflowRouting';
import { DataRightsView } from '../DataRightsView';
import type { LegalDocument } from '../privacyRepository';

vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: vi.fn() }));

const UNPUBLISHED: LegalDocument = { kind: 'GRIEVANCE_OFFICER', published: false, version: null, title: null, body: null, publishedAt: null };

describe('Your data rights (audit H2)', () => {
  it('offers access, correction, erasure, consent and grievance, and names no officer while none is published', async () => {
    const { container } = render(<DataRightsView loadLegal={vi.fn().mockResolvedValue(UNPUBLISHED)} />);
    expect(await screen.findByTestId('grievance-unpublished')).toBeTruthy();
    for (const [name, route] of [['Download my data', 'data-export'], ['Edit my details', 'profile'], ['Delete my account', 'delete-account'], ['Privacy & consent', 'privacy-consent'], ['Open Help', 'support']] as const) {
      fireEvent.click(screen.getByRole('button', { name }));
      expect(navigate).toHaveBeenLastCalledWith(route);
    }
    expect(screen.getByText(/erased after 7 days/)).toBeTruthy();
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);
  });

  it('shows the published grievance officer details exactly as published', async () => {
    const doc: LegalDocument = { kind: 'GRIEVANCE_OFFICER', published: true, version: 'g-1', title: 'Grievance officer', body: 'Text from legal.\n\nSecond paragraph.', publishedAt: 1_760_000_000 };
    render(<DataRightsView loadLegal={vi.fn().mockResolvedValue(doc)} />);
    expect(await screen.findByText('Text from legal.')).toBeTruthy();
    expect(screen.getByText('Second paragraph.')).toBeTruthy();
    expect(screen.getByText(/Version g-1/)).toBeTruthy();
    expect(screen.queryByTestId('grievance-unpublished')).toBeNull();
  });
});
