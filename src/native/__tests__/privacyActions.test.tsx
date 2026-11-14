import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const actions = vi.hoisted(() => ({ navigate: vi.fn(), web: vi.fn(), unsupported: false }));
vi.mock('../navigation', () => ({ useNavigate: () => actions.navigate }));
vi.mock('../webActions', () => ({ useNativeWebAction: () => actions.web }));
vi.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: vi.fn() }) }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/data/services/http', () => ({ apiRequest: vi.fn(async (path: string) => path === '/privacy/consents' ? {
  required: { purposes: ['RECORDS_STORAGE', 'CAMPUS_ENROLMENT', 'ADULT_18_PLUS'], version: 'test', language: 'en', givenAt: 1, noticeVersion: 'unpublished', termsVersion: 'test' },
  optional: actions.unsupported ? [{ purpose: 'DOCUMENT_AI_ANALYSIS', on: false, canGiveHere: true, version: null, givenAt: null, withdrawnAt: null }] : [], history: [],
} : { kind: 'GRIEVANCE_OFFICER', published: false, version: null, title: null, body: null, publishedAt: null }) }));
import { PrivacyScreen, DataRightsScreen } from '../PrivacyScreens';
beforeEach(() => { vi.clearAllMocks(); actions.unsupported = false; });
describe('native rights actions', () => {
  it('rendered Download and Help controls produce explicit handoffs and preserve rights destinations', async () => {
    render(<DataRightsScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Download my data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Help' }));
    expect(actions.web.mock.calls).toEqual([['export'], ['support']]);
    for (const [name, route] of [['Edit my details', 'Profile'], ['Delete my account', 'DeleteAccount'], ['Privacy & consent', 'Privacy']] as const) {
      fireEvent.click(screen.getByRole('button', { name }));
      expect(actions.navigate).toHaveBeenLastCalledWith(route);
    }
    await screen.findByTestId('grievance-unpublished');
  });
  it('the privacy export action no longer resolves silently', async () => {
    render(<PrivacyScreen />);
    const exportButton = await screen.findByRole('button', { name: /export|download/i });
    fireEvent.click(exportButton);
    expect(actions.web).toHaveBeenCalledWith('export');
  });
  it('an unsupported server consent shows the existing error while data rights remain reachable', async () => {
    actions.unsupported = true;
    render(<PrivacyScreen />);
    await screen.findByText('Your consents couldn’t load');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: /Your data rights/ }));
    expect(actions.navigate).toHaveBeenCalledWith('DataRights');
  });
});
