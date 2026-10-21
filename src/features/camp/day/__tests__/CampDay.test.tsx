import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { CampDayView } from '../CampDayView';
import { campDayView } from '../campDay';
import type { CampDayData } from '../campDay';

const NOW = new Date(2026, 9, 21, 11, 0);
const data = (over: Partial<CampDayData> = {}): CampDayData => ({
  camp: { id: 'camp-1', name: 'Annual health check', date: '2026-10-21', location: 'Main auditorium' },
  status: { registered: true, checkedIn: true, completedStations: ['s1'], slotId: 'slot-1' },
  stations: [{ id: 's2', name: 'Vitals', sort: 2 }, { id: 's1', name: 'Registration', sort: 1 }, { id: 's3', name: 'Blood sample', sort: 3 }],
  slot: { id: 'slot-1', slotStart: '10:00 AM', slotEnd: '10:30 AM' },
  ...over,
});

describe('camp day model', () => {
  it('orders stations and marks done / now / next from the server’s record', () => {
    const view = campDayView(data(), NOW);
    expect(view.isToday).toBe(true);
    expect(view.stations.map((s) => [s.name, s.state])).toEqual([['Registration', 'done'], ['Vitals', 'now'], ['Blood sample', 'next']]);
    expect(view.current?.id).toBe('s2');
  });

  it('has no current station before check-in', () => {
    const view = campDayView(data({ status: { registered: true, checkedIn: false, completedStations: [] } }), NOW);
    expect(view.current).toBeNull();
    expect(view.stations.every((s) => s.state === 'next')).toBe(true);
  });
});

describe('CampDay view', () => {
  it('shows the camp, the slot, the stations, and no invented token or queue numbers', () => {
    render(<CampDayView data={data()} now={NOW} onBack={vi.fn()} onCheckIn={vi.fn()} onCompleteStation={vi.fn()} onSeeResults={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Annual health check' })).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Main auditorium · 2026-10-21 · 3 stations')).toBeInTheDocument();
    expect(screen.getByText('Your slot · 10:00 AM – 10:30 AM')).toBeInTheDocument();
    const stations = screen.getByRole('list');
    expect(within(stations).getByText('Done')).toBeInTheDocument();
    expect(within(stations).getByText('Now')).toBeInTheDocument();
    expect(screen.getByText(/live queue isn’t connected yet/)).toBeInTheDocument();
    for (const fake of [/Your token/, /students ahead/, /~20 min/]) expect(screen.queryByText(fake)).toBeNull();
  });

  it('checks in, completes the current station, goes back and opens results', () => {
    const onCheckIn = vi.fn(); const onComplete = vi.fn(); const onBack = vi.fn(); const onSeeResults = vi.fn();
    const { rerender } = render(<CampDayView data={data({ status: { registered: true, checkedIn: false, completedStations: [] } })} now={NOW} onBack={onBack} onCheckIn={onCheckIn} onCompleteStation={onComplete} onSeeResults={onSeeResults} />);
    fireEvent.click(screen.getByRole('button', { name: 'I’ve arrived — check me in' }));
    expect(onCheckIn).toHaveBeenCalled();
    rerender(<CampDayView data={data()} now={NOW} onBack={onBack} onCheckIn={onCheckIn} onCompleteStation={onComplete} onSeeResults={onSeeResults} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark this station done' }));
    expect(onComplete).toHaveBeenCalledWith('s2');
    fireEvent.click(screen.getByRole('button', { name: 'Back to health camps' }));
    expect(onBack).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'See results as they arrive' }));
    expect(onSeeResults).toHaveBeenCalled();
  });
});
