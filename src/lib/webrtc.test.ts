import { describe, expect, it } from 'vitest';
import { parseIceServers, webrtcSupported, encodeSignal } from './webrtc';

describe('webrtc helper', () => {
  it('parses ice servers with a default STUN fallback', () => {
    expect(parseIceServers('')).toEqual([{ urls: 'stun:stun.l.google.com:19302' }]);
    const custom = parseIceServers('[{"urls":"stun:example.com:3478"}]');
    expect(custom[0].urls).toBe('stun:example.com:3478');
  });

  it('falls back on malformed ice servers json', () => {
    const servers = parseIceServers('not-json');
    expect(servers[0].urls).toContain('stun');
  });

  it('encodes a signalling message', () => {
    expect(JSON.parse(encodeSignal('offer', { sdp: 'x' }))).toEqual({ kind: 'offer', payload: { sdp: 'x' } });
  });

  it('reports webrtc support in a browser-like env', () => {
    // vitest node env: RTCPeerConnection is undefined.
    expect(webrtcSupported()).toBe(false);
  });
});
