import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { VendorShell } from '../VendorShell';
import { VENDOR_NAVIGATION } from '../vendorNavigation';
import type { PartnerKind } from '../../../data/types/workflowTypes';
import type { RoutePath } from '../../../lib/utils/workflowRouting';

const renderShell = (partnerKind: PartnerKind, route: RoutePath = 'vendor', onNavigate = vi.fn()) => {
  render(
    <VendorShell route={route} role="VENDOR" partnerKind={partnerKind} accountName="MedPlus · Bachupally" onNavigate={onNavigate} onSignOut={vi.fn()}>
      <p>page</p>
    </VendorShell>,
  );
  return onNavigate;
};
const nav = () => screen.getByRole('navigation', { name: 'Partner links' });

describe('partner console sidebar (VendorConsole / VendorHome boards)', () => {
  it('follows the canvas groups, labels, order and brief icon names', () => {
    expect(VENDOR_NAVIGATION.map(group => group.title)).toEqual(['Store', 'Lab', 'Business']);
    expect(VENDOR_NAVIGATION.flatMap(group => group.items.map(item => [item.label, item.icon]))).toEqual([
      ['Home', 'home-2'], ['Verify student', 'scan'], ['Orders', 'box-2'], ['Rx review', 'prescription'],
      ['Substitutions', 'arrows-left-right-2'], ['OTP handover', 'key'], ['Returns', 'undo'],
      ['Dispense register', 'clipboard'], ['Medicine info', 'pill'], ['Reorder rules', 'repeat'],
      ['Sample queue', 'flask'], ['Run sheet', 'truck'], ['Cold chain', 'asterisk'], ['Lab reports', 'file'], ['Camp intake', 'alert-triangle-2'],
      ['Staff & roles', 'users'], ['Catalogue', 'grid'], ['Settlement', 'banknote'], ['Performance', 'bar-chart'],
    ]);
  });

  it('shows a pharmacy only its own tools, with Home as the current white pill', () => {
    renderShell('PHARMACY');
    expect(within(nav()).getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav()).queryByRole('heading', { name: 'LAB' })).toBeNull();
    const icons = Array.from(nav().querySelectorAll('svg')).map(icon => icon.getAttribute('data-icon'));
    expect(icons).toEqual(['home-2', 'scan', 'box-2', 'prescription', 'arrows-left-right-2', 'key', 'undo', 'clipboard', 'pill', 'repeat', 'users', 'grid', 'banknote', 'bar-chart']);
  });

  it('marks the lab page being shown as the current pill', () => {
    renderShell('LAB', 'lab-queue');
    expect(within(nav()).getByRole('button', { name: 'Sample queue' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav()).getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(within(nav()).getByRole('button', { name: 'Lab reports' })).not.toHaveAttribute('aria-current');
  });

  it('"Lab reports" (the board\'s Release results slot, file icon) is its own page now (WP-15)', () => {
    renderShell('LAB', 'lab-reporting');
    expect(within(nav()).getByRole('button', { name: 'Lab reports' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav()).getByRole('button', { name: 'Sample queue' })).not.toHaveAttribute('aria-current');
  });

  it('keeps the console item lit while a staff app phone board is open (WP-15)', () => {
    renderShell('LAB', 'staff-collect');
    expect(within(nav()).getByRole('button', { name: 'Run sheet' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps Camp intake lit while the staff app\'s camp fast mode is open', () => {
    renderShell('LAB', 'camp-fast');
    expect(within(nav()).getByRole('button', { name: 'Camp intake' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the brand mark, the PARTNER role line, and the partner’s own name on the help link', () => {
    const onNavigate = renderShell('PHARMACY');
    const sidebar = screen.getByRole('complementary', { name: 'Partner console sidebar' });
    expect(sidebar.querySelector('[data-icon="brand:studentkare-logo"]')).not.toBeNull();
    expect(within(sidebar).getByText('PARTNER')).toBeInTheDocument();
    fireEvent.click(within(sidebar).getByRole('button', { name: 'MedPlus · Bachupally help centre' }));
    expect(onNavigate).toHaveBeenCalledWith('support');
  });

  it('uses no lucide icons: every sidebar svg is a manifest icon', () => {
    renderShell('LAB');
    screen.getByRole('complementary', { name: 'Partner console sidebar' }).querySelectorAll('svg').forEach(icon => {
      expect(icon.getAttribute('data-icon') ?? icon.parentElement?.getAttribute('data-icon')).toBeTruthy();
    });
  });
});
