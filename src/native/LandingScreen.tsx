import React, { useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { LandingViewModel, parseCatalogPage } from '@/features/landing/viewmodel/LandingViewModel';
import type { CatalogQuery, ListLandingCatalog } from '@/features/landing/viewmodel/LandingViewModel';
import { PartnershipEnquiryViewModel } from '@/features/landing/viewmodel/PartnershipEnquiryViewModel';
import type { SubmitEnquiry } from '@/features/landing/viewmodel/PartnershipEnquiryViewModel';
import { LandingNativeView } from '@/features/landing/views/LandingNativeView';
import { LandingCampusNativeView } from '@/features/landing/views/LandingCampusNativeView';
import { LandingClinicianNativeView } from '@/features/landing/views/LandingClinicianNativeView';
import { LandingLabTestsNativeView } from '@/features/landing/views/LandingLabTestsNativeView';
import { LandingPartnershipsNativeView } from '@/features/landing/views/LandingPartnershipsNativeView';
import type { LandingDestinations } from '@/features/landing/views/landingNativeKit';
import { useNavigate } from './navigation';
import { nativeApiBaseUrl } from './PreventiveCareScreen';

/** Public transport only: no shared authenticated client, session headers or cookies. */
async function publicRequest(path: string, init: { method: 'GET' | 'POST'; body?: string }): Promise<Response> {
  const base = nativeApiBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(`${base}${path}`, {
      method: init.method,
      headers: init.body ? { Accept: 'application/json', 'Content-Type': 'application/json' } : { Accept: 'application/json' },
      body: init.body,
      credentials: 'omit',
      signal: controller.signal,
    });
  } catch {
    throw new Error(controller.signal.aborted ? 'The request timed out.' : 'Cannot reach Studentkare. Check your connection.');
  } finally {
    clearTimeout(timeout);
  }
}

export const listNativeCatalog: ListLandingCatalog = async (query: CatalogQuery) => {
  const kind = query.kind ? `&kind=${encodeURIComponent(query.kind)}` : '';
  const response = await publicRequest(`/catalog?offset=0&limit=${query.limit}${kind}`, { method: 'GET' });
  // Do not surface server detail envelopes on a public screen.
  if (!response.ok) throw new Error(`The catalog is unavailable (HTTP ${response.status}).`);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`The catalog returned unreadable JSON (HTTP ${response.status}).`);
  }
  return parseCatalogPage(body, query);
};

export const submitNativeEnquiry: SubmitEnquiry = async (enquiry) => {
  const response = await publicRequest('/billing/inquiries', { method: 'POST', body: JSON.stringify(enquiry) });
  if (response.ok) return;
  // The backend's own validation messages are plain sentences meant for the
  // person filling the form; anything else gets a generic line.
  let detail: unknown;
  try {
    detail = ((await response.json()) as { detail?: unknown }).detail;
  } catch {
    detail = undefined;
  }
  if (response.status === 422 && typeof detail === 'string') throw new Error(detail);
  throw new Error(response.status >= 500
    ? `This is on our side, not yours. Your enquiry was not sent (HTTP ${response.status}). Try again.`
    : 'Your enquiry was not sent. Check the details and try again.');
};

/**
 * If the dialler cannot open, say so and show the number: a helpline tap must
 * never fail silently.
 */
async function callHelpline(number: string) {
  try {
    await Linking.openURL(`tel:${number}`);
  } catch {
    Alert.alert(`Call ${number}`, `This device could not open the dialler. Dial ${number} directly.`);
  }
}

const onCall = (number: string) => void callHelpline(number);

/**
 * Only screens that exist on native. Sign-up, sign-in, shop, privacy and
 * terms are not built here yet, so their links are not drawn.
 */
function useDestinations(): LandingDestinations {
  const navigate = useNavigate();
  return {
    students: () => navigate('Landing'),
    campuses: () => navigate('Campuses'),
    clinicians: () => navigate('Clinicians'),
    labTests: () => navigate('LabTests'),
    partnerships: () => navigate('Partnerships'),
    vaccines: () => navigate('PreventiveCare'),
  };
}

function useCatalog(query: CatalogQuery): LandingViewModel {
  const [viewModel] = useState(() => new LandingViewModel(listNativeCatalog, query));
  useEffect(() => {
    void viewModel.load();
    return () => viewModel.dispose();
  }, [viewModel]);
  return viewModel;
}

export function LandingScreen() {
  const viewModel = useCatalog({ limit: 6 });
  return <LandingNativeView viewModel={viewModel} onCall={onCall} destinations={useDestinations()} />;
}

export function LandingLabTestsScreen() {
  const viewModel = useCatalog({ kind: 'lab', limit: 12 });
  return <LandingLabTestsNativeView viewModel={viewModel} onCall={onCall} destinations={useDestinations()} />;
}

export function LandingCampusScreen() {
  return <LandingCampusNativeView destinations={useDestinations()} />;
}

export function LandingClinicianScreen() {
  return <LandingClinicianNativeView destinations={useDestinations()} />;
}

export function LandingPartnershipsScreen() {
  const [viewModel] = useState(() => new PartnershipEnquiryViewModel(submitNativeEnquiry));
  return <LandingPartnershipsNativeView viewModel={viewModel} destinations={useDestinations()} />;
}
