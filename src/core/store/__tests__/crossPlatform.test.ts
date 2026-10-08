// Cross-platform guarantee: the shared store + ViewModel layer must be usable
// outside the browser. This runs the actual AppStores composition and feature
// ViewModels in a Node (non-DOM) test environment, proving the same code serves
// web and React Native without duplication.
import { describe, it, expect } from 'vitest';
import { AppStores } from '@/store/AppStores';
import { initialClaimAdjudications } from '@/data/mockData';
import { CampViewModel } from '@/features/camp/viewmodel/CampViewModel';
import { ChatViewModel } from '@/features/chat/viewmodel/ChatViewModel';
import { ClaimsViewModel } from '@/features/claims/viewmodel/ClaimsViewModel';
import { FabricViewModel } from '@/features/care/viewmodel/FabricViewModel';

describe('shared layer is platform-agnostic (no DOM)', () => {
  it('composes all feature stores without a browser', () => {
    const stores = new AppStores();
    // Nobody is signed in until a real profile is set — no invented student.
    expect(stores.student.student.fullName).toBe('');
    expect(stores.student.student.allergies).toEqual([]);
    expect(stores.camp.camp.stations).toEqual([]);
    expect(stores.records.records.length).toBeGreaterThan(0);
    expect(stores.claims.claimAdjudications).toEqual([]);
    expect(stores.clinician.clinicianPatients.length).toBeGreaterThan(0);
    expect(stores.chat.chatMessages.length).toBeGreaterThan(0);
  });

  it('CampViewModel exposes computed projections + actions', () => {
    const stores = new AppStores();
    const vm = new CampViewModel(stores.camp, stores.student);
    // Test fixture: the store ships no camp, so the test supplies one.
    stores.camp.setCamp({
      id: 'camp-test', campName: 'Test camp', institution: '', date: '', location: '',
      checkInStatus: false, qrCode: '', completedCount: 0, totalStations: 1, digitalBadgeEarned: false,
      stations: [{ id: 'st-test', name: 'Station', description: '', iconName: 'Activity', status: 'IN_QUEUE', readings: [], queueWaitMinutes: 0 }],
    });
    const first = stores.camp.camp.stations[0];
    expect(vm.progressPercent).toBeGreaterThanOrEqual(0);
    expect(vm.stationStatus(first)).toBeTruthy();
    vm.openCompleteModal(first);
    expect(vm.activeModalStation?.id).toBe(first.id);
    // No clinical finding is pre-filled for the officer.
    expect(vm.doctorNoteInput).toBe('');
    vm.setDoctorNote('Reviewed');
    vm.confirmComplete();
    expect(stores.camp.camp.stations.find((s) => s.id === first.id)?.status).toBe('COMPLETED');
  });

  it('ClaimsViewModel exposes the decision package + sign-off', () => {
    const stores = new AppStores();
    // No invented claim ships with the store: with nothing loaded there is
    // nothing to review and nothing pre-filled.
    const empty = new ClaimsViewModel(stores.claims);
    expect(empty.claim).toBeUndefined();
    expect(empty.reviewerName).toBe('');
    expect(empty.decisionPackage.totalBilled).toBe(0);
    // Test fixture only.
    stores.claims.setClaimAdjudications(initialClaimAdjudications);
    const vm = new ClaimsViewModel(stores.claims);
    expect(vm.claim).toBeTruthy();
    expect(vm.decisionPackage).toBeTruthy();
    vm.setReviewerName('Dr. Test');
    vm.signOff();
    expect(vm.signedStatus).toBe(true);
  });

  it('ChatViewModel drives the crisis-gated copilot', () => {
    const stores = new AppStores();
    const vm = new ChatViewModel(stores.chat);
    expect(vm.quickPrompts.length).toBe(3);
    expect(vm.canSend).toBe(false);
    vm.setInputText('Explain my latest CBC report');
    expect(vm.canSend).toBe(true);
    vm.send();
    expect(vm.inputText).toBe('');
    expect(vm.bubbles.some((b) => b.sender === 'user')).toBe(true);
  });

  it('FabricViewModel drives the order state machine', () => {
    const stores = new AppStores();
    const vm = new FabricViewModel(stores.fabric);
    const order = stores.fabric.fabricOrders[0];
    const next = vm.nextState(order.state);
    expect(next).not.toBeNull();
    vm.advance(order);
    expect(stores.fabric.fabricOrders[0].state).toBe(next);
  });
});
