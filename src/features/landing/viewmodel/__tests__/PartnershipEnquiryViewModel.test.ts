import { describe, expect, it, vi } from 'vitest';
import { PartnershipEnquiryViewModel } from '../PartnershipEnquiryViewModel';

function filled(send = vi.fn().mockResolvedValue(undefined)) {
  const vm = new PartnershipEnquiryViewModel(send);
  vm.setOrganization('  Nizam Diagnostics ');
  vm.setEmail('ops@nizam.example');
  vm.setCategory('Laboratory');
  vm.setMessage('Home collection across Gachibowli.');
  return { vm, send };
}

describe('PartnershipEnquiryViewModel', () => {
  it('starts with consent unticked and cannot submit', () => {
    const { vm } = filled();
    expect(vm.consent).toBe(false);
    expect(vm.canSubmit).toBe(false);
  });

  it('never calls out without consent, even if submit is forced', async () => {
    const { vm, send } = filled();
    await vm.submit();
    expect(send).not.toHaveBeenCalled();
    expect(vm.error).toMatch(/Tick the box/);
  });

  it('refuses a short organisation name or an email without @', async () => {
    const { vm, send } = filled();
    vm.toggleConsent();
    vm.setOrganization('N');
    expect(vm.canSubmit).toBe(false);
    vm.setOrganization('Nizam');
    vm.setEmail('ops.nizam.example');
    expect(vm.canSubmit).toBe(false);
    await vm.submit();
    expect(send).not.toHaveBeenCalled();
  });

  it('sends the body the backend accepts, trimmed, with the category in the message', async () => {
    const { vm, send } = filled();
    vm.toggleConsent();
    await vm.submit();
    expect(send).toHaveBeenCalledWith({
      organization: 'Nizam Diagnostics',
      contactName: '',
      email: 'ops@nizam.example',
      seats: 0,
      planId: 'ENTERPRISE',
      message: 'Partnership enquiry · Laboratory\n\nHome collection across Gachibowli.',
      consent: true,
    });
    expect(vm.status).toBe('sent');
  });

  it('keeps what was typed and says why when sending fails', async () => {
    const { vm } = filled(vi.fn().mockRejectedValue(new Error('This is on our side, not yours.')));
    vm.toggleConsent();
    await vm.submit();
    expect(vm.status).toBe('editing');
    expect(vm.error).toBe('This is on our side, not yours.');
    expect(vm.organization).toBe('  Nizam Diagnostics ');
  });

  it('sends once when tapped twice', async () => {
    const { vm, send } = filled();
    vm.toggleConsent();
    await Promise.all([vm.submit(), vm.submit()]);
    expect(send).toHaveBeenCalledOnce();
  });
});
