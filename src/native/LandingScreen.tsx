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
import { LandingConsultNativeView } from '@/features/landing/views/LandingConsultNativeView';
import { LandingPartnershipsNativeView } from '@/features/landing/views/LandingPartnershipsNativeView';
import { LandingProgramsNativeView } from '@/features/landing/views/LandingProgramsNativeView';
import { LandingPlansNativeView } from '@/features/landing/views/LandingPlansNativeView';
import { LandingWellnessNativeView } from '@/features/landing/views/LandingWellnessNativeView';
import { LandingLabListNativeView } from '@/features/landing/views/LandingLabListNativeView';
import type { LandingDestinations } from '@/features/landing/views/landingNativeKit';
import { useT, type MessageKey, type Vars } from '@/i18n';
import { useNavigate } from './navigation';
import { nativeApiBaseUrl } from './PreventiveCareScreen';

type Translate = (key: MessageKey, vars?: Vars) => string;

/** Public transport only: no shared authenticated client, session headers or cookies. */
async function publicRequest(path: string, init: { method: 'GET' | 'POST'; body?: string }, t: Translate): Promise<Response> {
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
    throw new Error(controller.signal.aborted ? t('onboard.net.timeout') : t('onboard.net.unreachable'));
  } finally {
    clearTimeout(timeout);
  }
}

/** The view models keep the message as given, so it is written in the reader's language here. */
export function nativeCatalog(t: Translate): ListLandingCatalog {
  return async (query: CatalogQuery) => {
    const kind = query.kind ? `&kind=${encodeURIComponent(query.kind)}` : '';
    const response = await publicRequest(`/catalog?offset=0&limit=${query.limit}${kind}`, { method: 'GET' }, t);
    // Do not surface server detail envelopes on a public screen.
    if (!response.ok) throw new Error(t('onboard.net.catalogUnavailable', { status: response.status }));
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error(t('onboard.net.catalogUnreadable', { status: response.status }));
    }
    return parseCatalogPage(body, query);
  };
}

export function nativeEnquiry(t: Translate): SubmitEnquiry {
  return async (enquiry) => {
    const response = await publicRequest('/billing/inquiries', { method: 'POST', body: JSON.stringify(enquiry) }, t);
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
      ? t('onboard.net.enquiryServer', { status: response.status })
      : t('onboard.net.enquiryFailed'));
  };
}

/**
 * If the dialler cannot open, say so and show the number: a helpline tap must
 * never fail silently.
 */
async function callHelpline(number: string, t: Translate) {
  try {
    await Linking.openURL(`tel:${number}`);
  } catch {
    Alert.alert(t('onboard.dial.title', { number }), t('onboard.dial.body', { number }));
  }
}

function useOnCall(): (number: string) => void {
  const t = useT();
  return (number) => void callHelpline(number, t);
}

function useDestinations(): LandingDestinations {
  const navigate = useNavigate();
  return {
    students: () => navigate('Landing'),
    campuses: () => navigate('Campuses'),
    clinicians: () => navigate('Clinicians'),
    labTests: () => navigate('LabTests'),
    consult: () => navigate('Consult'),
    labList: () => navigate('LabList'),
    partnerships: () => navigate('Partnerships'),
    programs: () => navigate('Programs'),
    plans: () => navigate('Plans'),
    wellness: () => navigate('Wellness'),
    vaccines: () => navigate('PreventiveCare'),
    shop: () => navigate('Marketplace'),
    signIn: () => navigate('SignIn'),
    signUp: () => navigate('CreateAccount'),
    lostPhone: () => navigate('LostPhone'),
  };
}

function useCatalog(query: CatalogQuery): LandingViewModel {
  const t = useT();
  const [viewModel] = useState(() => new LandingViewModel(nativeCatalog(t), query));
  useEffect(() => {
    void viewModel.load();
    return () => viewModel.dispose();
  }, [viewModel]);
  return viewModel;
}

export function LandingScreen() {
  const viewModel = useCatalog({ limit: 6 });
  return <LandingNativeView viewModel={viewModel} onCall={useOnCall()} destinations={useDestinations()} />;
}

export function LandingLabTestsScreen() {
  const viewModel = useCatalog({ kind: 'lab', limit: 12 });
  return <LandingLabTestsNativeView viewModel={viewModel} onCall={useOnCall()} destinations={useDestinations()} />;
}

export function LandingConsultScreen() {
  return <LandingConsultNativeView onCall={useOnCall()} destinations={useDestinations()} />;
}

export function LandingCampusScreen() {
  return <LandingCampusNativeView destinations={useDestinations()} />;
}

export function LandingClinicianScreen() {
  return <LandingClinicianNativeView destinations={useDestinations()} />;
}

export function LandingPartnershipsScreen() {
  const t = useT();
  const [viewModel] = useState(() => new PartnershipEnquiryViewModel(nativeEnquiry(t)));
  return <LandingPartnershipsNativeView viewModel={viewModel} destinations={useDestinations()} />;
}

export function LandingProgramsScreen() {
  return <LandingProgramsNativeView destinations={useDestinations()} />;
}

export function LandingPlansScreen() {
  return <LandingPlansNativeView destinations={useDestinations()} />;
}

export function LandingWellnessScreen() {
  return <LandingWellnessNativeView destinations={useDestinations()} />;
}

export function LandingLabListScreen() {
  return <LandingLabListNativeView destinations={useDestinations()} />;
}

