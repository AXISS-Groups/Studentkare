import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SetupQuestionView } from '../SetupQuestionView';
import { PRIMARY_GOALS, SetupQuestionViewModel } from '../../viewmodel/SetupQuestionViewModel';
import { onboardEn } from '@/i18n/areas/onboard';

type Requester = typeof import('@/data/services/http').apiRequest;

const EMPTY = { primaryGoal: '', activityLevel: '', updatedAt: null };

async function open(request: Requester, onDone = vi.fn(), onBack = vi.fn()) {
  const vm = new SetupQuestionViewModel('primaryGoal', request);
  render(<SetupQuestionView question="primaryGoal" onBack={onBack} onDone={onDone} viewModel={vm} />);
  await act(async () => {
    await Promise.resolve();
  });
  return { vm, onDone, onBack };
}

const ok = () => vi.fn(async (_path: string, init?: RequestInit) => (init?.method ? { ...EMPTY, ...JSON.parse(String(init.body)) } : EMPTY)) as unknown as Requester;

describe('SetupQuestionView', () => {
  it('asks one question, with every neutral option and no weight option', async () => {
    await open(ok());
    expect(screen.getByRole('heading', { name: onboardEn['onboard.goal.title'] })).toBeInTheDocument();
    for (const value of PRIMARY_GOALS) {
      expect(screen.getByRole('radio', { name: onboardEn[`onboard.goal.${value}`] })).toBeInTheDocument();
    }
    expect(document.body.textContent).not.toMatch(/weight|BMI|diet|calorie/i);
    expect(screen.getByText(onboardEn['onboard.q.optional'])).toBeInTheDocument();
  });

  it('shows the position as a progress bar', async () => {
    await open(ok());
    expect(screen.getByRole('progressbar', { name: 'Question 1 of 2' })).toBeInTheDocument();
  });

  it('keeps Continue locked until something is chosen, then saves and moves on', async () => {
    const request = ok();
    const { onDone } = await open(request);
    const proceed = screen.getByRole('button', { name: 'Continue' });
    expect(proceed).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Manage stress' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      await Promise.resolve();
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('/profile/wellness', expect.objectContaining({ method: 'PATCH' }));
  });

  it('Skip moves on without saving', async () => {
    const request = ok();
    const { onDone } = await open(request);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1); // the initial GET only
  });

  it('when the stored answer cannot be loaded, says so, offers a retry, and Skip still works', async () => {
    const request = vi.fn(async () => { throw new Error('offline'); }) as unknown as Requester;
    const { onDone } = await open(request);
    expect(screen.getByText(onboardEn['onboard.q.loadErrorTitle'])).toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('says so when the answer was not saved, and stays', async () => {
    const request = vi.fn(async (_path: string, init?: RequestInit) => {
      if (init?.method) throw new Error('offline');
      return EMPTY;
    }) as unknown as Requester;
    const { onDone } = await open(request);
    fireEvent.click(screen.getByRole('radio', { name: 'Sleep better' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      await Promise.resolve();
    });
    expect(screen.getByText(onboardEn['onboard.q.saveError'])).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('has a named Back button and hides decorative icons', async () => {
    const { onBack } = await open(ok());
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
    for (const control of screen.getAllByRole('button')) expect(control).toHaveAccessibleName();
    for (const svg of document.querySelectorAll('svg')) expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
