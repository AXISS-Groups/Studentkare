import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as http from '@/data/services/http';
import { VideoConsultationDialog } from '../VideoConsultationDialog';
import { ProviderConsultationDialog } from '../ProviderConsultationDialog';
import { NotificationCenterModal } from '../NotificationCenterModal';

vi.mock('@/data/services/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/services/http')>();
  return { ...actual, apiRequest: vi.fn() };
});
const mocked = vi.mocked(http.apiRequest);
const { ApiError } = http;

// A stand-in for livekit-client: records what the dialogs do with it.
type Handler = (...args: unknown[]) => void;
interface FakeTrack {
  kind: 'audio' | 'video';
  attach: ReturnType<typeof vi.fn>;
  detach: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  mute: ReturnType<typeof vi.fn>;
  unmute: ReturnType<typeof vi.fn>;
}
const lk = vi.hoisted(() => {
  class FakeRoom {
    handlers = new Map<string, Handler[]>();
    remoteParticipants = new Map<string, object>();
    localParticipant = { publishTrack: vi.fn(async () => ({})) };
    connect = vi.fn(async (_url: string, _token: string) => { if (lk.connectError) throw lk.connectError; });
    disconnect = vi.fn(async () => { this.emit('disconnected', 1); });
    constructor() { lk.rooms.push(this); }
    on(event: string, handler: Handler) { this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]); return this; }
    removeAllListeners() { this.handlers.clear(); return this; }
    emit(event: string, ...args: unknown[]) { (this.handlers.get(event) ?? []).forEach(handler => handler(...args)); }
  }
  return { rooms: [] as FakeRoom[], FakeRoom, createLocalTracks: vi.fn(), connectError: null as Error | null };
});
vi.mock('livekit-client', () => ({
  Room: lk.FakeRoom,
  RoomEvent: {
    ParticipantConnected: 'participantConnected', ParticipantDisconnected: 'participantDisconnected',
    TrackSubscribed: 'trackSubscribed', TrackUnsubscribed: 'trackUnsubscribed', Reconnecting: 'reconnecting',
    SignalReconnecting: 'signalReconnecting', Reconnected: 'reconnected', Disconnected: 'disconnected',
  },
  Track: { Kind: { Audio: 'audio', Video: 'video' } },
  DisconnectReason: { CLIENT_INITIATED: 1 },
  createLocalTracks: lk.createLocalTracks,
}));

function fakeTrack(kind: 'audio' | 'video'): FakeTrack {
  return { kind, attach: vi.fn(() => document.createElement(kind)), detach: vi.fn(), stop: vi.fn(), mute: vi.fn(async () => undefined), unmute: vi.fn(async () => undefined) };
}

const GRANT = { available: true, url: 'wss://livekit.example.test', token: 'jwt-token', room: 'sk-consult-a1', identity: 'acc1', expiresAt: 1_900_000_000, role: 'student' };

function routes(table: Record<string, () => unknown>) {
  mocked.mockImplementation(async (path: string) => {
    const handler = table[path];
    if (!handler) throw new Error(`unexpected request ${path}`);
    return handler();
  });
}

function stubGetUserMedia() {
  const getUserMedia = vi.fn();
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
  return getUserMedia;
}

afterEach(() => {
  mocked.mockReset();
  lk.createLocalTracks.mockReset();
  lk.rooms.length = 0;
  lk.connectError = null;
});

describe('consultation dialogs without LiveKit: no call is pretended', () => {
  it('student dialog never asks for the camera and says no call happens here', async () => {
    const getUserMedia = stubGetUserMedia();
    mocked.mockResolvedValue({ status: 'WAITING', studentJoined: false, providerJoined: false, liveMedia: false });

    render(<VideoConsultationDialog appointment={{ id: 'a1', slotStart: '2026-10-12T10:00:00Z' }} onClose={() => undefined} />);

    expect(await screen.findByText('No call can be started from the app')).toBeInTheDocument();
    expect(screen.queryByText(/waiting room|in progress|live media|join/i)).toBeNull();

    mocked.mockResolvedValue({ status: 'WAITING', studentJoined: true, providerJoined: false, liveMedia: false });
    fireEvent.click(screen.getByRole('button', { name: /check in/i }));
    await waitFor(() => expect(screen.getByText('You have checked in.')).toBeInTheDocument());
    expect(mocked).toHaveBeenCalledWith('/consultation/a1/join', { method: 'POST' });
    expect(screen.getByText('Your provider has not started yet.')).toBeInTheDocument();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(lk.createLocalTracks).not.toHaveBeenCalled();
    expect(lk.rooms).toHaveLength(0);
  });

  it('student dialog fails closed to "no call" when the state cannot be read', async () => {
    mocked.mockRejectedValue(new ApiError('down', 0));
    render(<VideoConsultationDialog appointment={{ id: 'a1', slotStart: '2026-10-12T10:00:00Z' }} onClose={() => undefined} />);
    expect(await screen.findByText('No call can be started from the app')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /join/i })).toBeNull();
  });

  it('provider dialog cannot start before the student checks in, and claims no live media', async () => {
    mocked.mockResolvedValue({ status: 'NOT_STARTED', studentJoined: false, providerJoined: false, liveMedia: false });

    render(<ProviderConsultationDialog appointment={{ id: 'a1', customer: 'Asha' }} onClose={() => undefined} />);

    await waitFor(() => expect(screen.getByText('Student has not checked in yet')).toBeInTheDocument());
    expect(screen.getByText('No call can be started from the app')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark consultation as started' })).toBeDisabled();
    expect(screen.queryByText(/live media|camera|microphone/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /join/i })).toBeNull();
  });
});

describe('consultation dialogs with LiveKit', () => {
  const liveState = { status: 'NOT_STARTED', studentJoined: false, providerJoined: false, liveMedia: true };

  it('student joins only after pressing Join: check-in, token, then devices, then the room', async () => {
    const getUserMedia = stubGetUserMedia();
    const mic = fakeTrack('audio');
    const camera = fakeTrack('video');
    lk.createLocalTracks.mockResolvedValue([mic, camera]);
    routes({
      '/consultation/a1/state': () => liveState,
      '/consultation/a1/join': () => ({ ...liveState, status: 'WAITING', studentJoined: true }),
      '/consultation/a1/media-token': () => GRANT,
    });

    render(<VideoConsultationDialog appointment={{ id: 'a1', slotStart: '2026-10-12T10:00:00Z' }} onClose={() => undefined} />);
    const joinButton = await screen.findByRole('button', { name: 'Join video call' });
    expect(screen.queryByText('No call can be started from the app')).toBeNull();
    expect(lk.createLocalTracks).not.toHaveBeenCalled();
    expect(mocked).not.toHaveBeenCalledWith('/consultation/a1/media-token', { method: 'POST' });

    fireEvent.click(joinButton);
    await screen.findByText('You are in the call. Waiting for your doctor to join.');
    const order = mocked.mock.calls.map(([path]) => path);
    expect(order.indexOf('/consultation/a1/join')).toBeLessThan(order.indexOf('/consultation/a1/media-token'));
    expect(lk.createLocalTracks).toHaveBeenCalledWith({ audio: true, video: true });
    expect(getUserMedia).not.toHaveBeenCalled(); // devices go through livekit-client only
    const room = lk.rooms[0];
    expect(room.connect).toHaveBeenCalledWith('wss://livekit.example.test', 'jwt-token');
    expect(room.localParticipant.publishTrack).toHaveBeenCalledTimes(2);

    act(() => { room.remoteParticipants.set('doc', {}); room.emit('participantConnected', {}); });
    expect(await screen.findByText('You are connected with your doctor.')).toBeInTheDocument();
    const remoteAudio = fakeTrack('audio');
    act(() => { room.emit('trackSubscribed', remoteAudio); });
    expect(remoteAudio.attach).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Mute microphone' }));
    await waitFor(() => expect(mic.mute).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: 'Unmute microphone' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Turn camera off' }));
    await waitFor(() => expect(camera.mute).toHaveBeenCalled());

    act(() => { room.emit('reconnecting'); });
    expect(await screen.findByText('Connection lost. Reconnecting…')).toBeInTheDocument();
    act(() => { room.emit('reconnected'); });
    expect(await screen.findByText('You are connected with your doctor.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Leave call' }));
    expect(await screen.findByText('The call has ended.')).toBeInTheDocument();
    expect(room.disconnect).toHaveBeenCalled();
    expect(mic.stop).toHaveBeenCalled();
    expect(camera.stop).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Join again' })).toBeInTheDocument();
  });

  it('a server that turns out not to be connected shows "no call" and never asks for devices', async () => {
    routes({
      '/consultation/a1/state': () => liveState,
      '/consultation/a1/join': () => ({ ...liveState, studentJoined: true }),
      '/consultation/a1/media-token': () => { throw new ApiError('not connected', 503, { code: 'MEDIA_UNAVAILABLE', message: 'not connected' }); },
    });
    render(<VideoConsultationDialog appointment={{ id: 'a1', slotStart: '2026-10-12T10:00:00Z' }} onClose={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Join by voice only' }));
    expect(await screen.findByText('No call can be started from the app')).toBeInTheDocument();
    expect(lk.createLocalTracks).not.toHaveBeenCalled();
    expect(lk.rooms).toHaveLength(0);
  });

  it('outside the join window: the server says why, and no devices are requested', async () => {
    routes({
      '/consultation/a1/state': () => liveState,
      '/consultation/a1/join': () => ({ ...liveState, studentJoined: true }),
      '/consultation/a1/media-token': () => { throw new ApiError('The call opens 15 minutes before your consultation starts.', 409, { code: 'OUTSIDE_WINDOW', message: 'x' }); },
    });
    render(<VideoConsultationDialog appointment={{ id: 'a1', slotStart: '2026-10-12T10:00:00Z' }} onClose={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Join video call' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The call opens 15 minutes before your consultation starts.');
    expect(lk.createLocalTracks).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('blocked camera permission says so and never enters the room', async () => {
    lk.createLocalTracks.mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    routes({
      '/consultation/a1/state': () => liveState,
      '/consultation/a1/join': () => ({ ...liveState, studentJoined: true }),
      '/consultation/a1/media-token': () => GRANT,
    });
    render(<VideoConsultationDialog appointment={{ id: 'a1', slotStart: '2026-10-12T10:00:00Z' }} onClose={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Join video call' }));
    expect(await screen.findByText(/Camera or microphone access is blocked/)).toBeInTheDocument();
    expect(lk.rooms).toHaveLength(0);
  });

  it('a failed connection is an error with a retry, and releases the devices', async () => {
    const mic = fakeTrack('audio');
    lk.createLocalTracks.mockResolvedValue([mic]);
    routes({
      '/consultation/a1/state': () => liveState,
      '/consultation/a1/join': () => ({ ...liveState, studentJoined: true }),
      '/consultation/a1/media-token': () => GRANT,
    });
    render(<VideoConsultationDialog appointment={{ id: 'a1', slotStart: '2026-10-12T10:00:00Z' }} onClose={() => undefined} />);
    lk.connectError = new Error('ws failed');
    fireEvent.click(await screen.findByRole('button', { name: 'Join by voice only' }));
    expect(await screen.findByText('The call could not connect. Check your connection and try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(lk.createLocalTracks).toHaveBeenCalledWith({ audio: true, video: false });
    expect(mic.stop).toHaveBeenCalled();
  });

  it('doctor joins without checking the student in, and waits for the student', async () => {
    lk.createLocalTracks.mockResolvedValue([fakeTrack('audio'), fakeTrack('video')]);
    routes({
      '/consultation/a1/state': () => liveState,
      '/consultation/a1/media-token': () => ({ ...GRANT, role: 'doctor' }),
    });
    render(<ProviderConsultationDialog appointment={{ id: 'a1', customer: 'Asha' }} onClose={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Join video call' }));
    expect(await screen.findByText('You are in the call. Waiting for the student to join.')).toBeInTheDocument();
    expect(mocked).not.toHaveBeenCalledWith('/consultation/a1/join', { method: 'POST' });
    expect(screen.queryByText('No call can be started from the app')).toBeNull();
  });
});

describe('notification centre', () => {
  it('points to the inbox instead of claiming there is nothing new', () => {
    render(<NotificationCenterModal isOpen onClose={() => undefined} />);
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open notifications' })).toBeInTheDocument();
    expect(screen.queryByText(/all caught up|no active notifications/i)).toBeNull();
  });
});
