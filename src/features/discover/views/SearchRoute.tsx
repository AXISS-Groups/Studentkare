import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from '@/core/navigation';
import { navigate } from '@/lib/utils/workflowRouting';
import { LabBookingOverlay } from '@/features/labBooking/views/LabBookingOverlay';
import { phoneArt } from '@/features/phoneKit/phoneArt';
import { rememberListing } from '@/features/phoneKit/listingCache';
import { SearchViewModel } from '../viewmodel/SearchViewModel';
import type { ResultsTab } from '../viewmodel/SearchViewModel';
import { SearchFlow } from './SearchFlow';
import type { SearchLinks } from './searchParts';

const TABS: readonly ResultsTab[] = ['all', 'medicines', 'labs', 'doctors'];
const isTab = (value: string | null): value is ResultsTab => value !== null && (TABS as readonly string[]).includes(value);

/** Leave search: back where the student came from, or Discover. */
function leave(): void {
  if (typeof window !== 'undefined' && window.history.length > 1) window.history.back();
  else navigate('health');
}

/**
 * /search on the web (the phone boards SearchEntry … DoctorResults). `?q=`
 * runs a search on arrival and `&tab=` opens a tab, so a search can be linked.
 * A lab test opens the real booking flow over the page; a product opens in the
 * shop; a doctor opens the appointment booking.
 */
export function SearchRoute(): React.ReactElement {
  const [vm] = useState(() => new SearchViewModel());
  const [params] = useSearchParams();
  const routerNavigate = useNavigate();
  const [labItemId, setLabItemId] = useState<string | null>(null);

  useEffect(() => {
    const q = params.get('q');
    const tab = params.get('tab');
    if (q) void vm.submit(q, isTab(tab) ? tab : 'all');
    return () => vm.dispose();
    // Arrival only: later changes come from the boards themselves.
  }, [vm]);

  const links: SearchLinks = {
    exit: leave,
    openProduct: (item) => { rememberListing(item); routerNavigate(`/shop?product=${encodeURIComponent(item.id)}`); },
    openList: ({ category, query }) => routerNavigate(category ? `/shop?category=${encodeURIComponent(category)}` : `/shop?q=${encodeURIComponent(query ?? '')}`),
    bookLab: setLabItemId,
    bookDoctor: () => navigate('appointments'),
    openPrescriptions: () => navigate('prescriptions'),
    openAyush: () => navigate('ayush'),
    openEmergencyCard: () => navigate('emergency-card'),
    openPass: () => navigate('pass'),
    openCrisis: () => navigate('sos'),
    openMedicineInfo: (query) => routerNavigate(query ? `/medicine-info?q=${encodeURIComponent(query)}` : '/medicine-info'),
  };

  return (
    <>
      <SearchFlow vm={vm} links={links} doctorArt={phoneArt.doctorOnScreen} />
      {labItemId ? <LabBookingOverlay itemId={labItemId} onClose={() => setLabItemId(null)} /> : null}
    </>
  );
}
