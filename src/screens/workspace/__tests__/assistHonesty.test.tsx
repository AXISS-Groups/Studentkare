import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { translate } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';
import { DEFAULT_CAMPUS_COUNSELLOR } from '../../../ai/core/crisisGate';

vi.mock('../../../data/services/http', () => ({ apiRequest: vi.fn(() => Promise.resolve({})) }));

import * as http from '../../../data/services/http';
import { CareNavigatorPanel, localResources } from '../CareNavigatorPanel';
import { DevicesAndSensorsScreen, PulseEstimateUnavailable } from '../DevicesAndSensorsScreen';

const en = (key: MessageKey, vars?: Vars) => translate('en', key, vars);
const te = (key: MessageKey, vars?: Vars) => translate('te', key, vars);

describe('care navigator crisis contacts', () => {
  it.each(['CRISIS_SELF_HARM', 'CRISIS_OVERDOSE', 'CRISIS_MEDICAL', 'ERROR_FAIL_CLOSED'] as const)(
    'never offers the bundled number as a "campus counsellor" (%s)',
    (kind) => {
      const lines = localResources(kind, en);
      expect(lines.map((line) => line.number)).not.toContain(DEFAULT_CAMPUS_COUNSELLOR);
      expect(lines.some((line) => /counsell?or/i.test(line.label))).toBe(false);
      expect(lines.map((line) => line.number)).toContain('112');
    },
  );

  it('keeps helpline names and numbers in English when the words are translated', () => {
    const lines = localResources('CRISIS_SELF_HARM', te);
    expect(lines[0]).toMatchObject({ label: 'Tele-MANAS', number: '14416' });
    expect(lines[0].detail).not.toBe(en('assist.nav.res.teleManasDetail'));
  });

  it('answers a crisis on the device, without the gate’s English "Student," or its internal reason, and sends no query', () => {
    vi.mocked(http.apiRequest).mockClear();
    render(<CareNavigatorPanel />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'I want to end my life' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    const text = document.body.textContent ?? '';
    expect(text).toContain(en('assist.nav.crisis.selfHarm'));
    expect(text).not.toMatch(/Student,/);
    expect(vi.mocked(http.apiRequest).mock.calls.map(([path]) => path)).not.toContain('/care/navigate');
  });
});

describe('devices and sensors', () => {
  it('shows no heart-rate number from the unvalidated camera method', () => {
    render(<PulseEstimateUnavailable />);
    expect(document.body.textContent).not.toMatch(/\d+\s*bpm/i);
    expect(screen.getByRole('heading', { name: /not available/i })).toBeInTheDocument();
  });

  it('saves a camera photo as the file itself, not an empty "captured" record', () => {
    const source = readFileSync(join(process.cwd(), 'src/screens/workspace/DevicesAndSensorsScreen.tsx'), 'utf-8');
    expect(source).not.toMatch(/camera-scan/);
    expect(source).toMatch(/form\.append\('file'/);
  });

  it('counts no steps in the browser: says to open the phone app and offers typed entry', () => {
    render(<DevicesAndSensorsScreen />);
    fireEvent.click(screen.getByRole('button', { name: translate('en', 'steps.title') }));
    const panel = screen.getByTestId('devices-steps');
    expect(panel).toHaveTextContent(translate('en', 'steps.sources.webTitle'));
    expect(panel.textContent ?? '').not.toMatch(/\d|estimate/i);
    const source = readFileSync(join(process.cwd(), 'src/screens/workspace/DevicesAndSensorsScreen.tsx'), 'utf-8');
    expect(source).not.toMatch(/devicemotion|stepAccum|recordSession/);
  });
});
