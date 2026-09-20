/**
 * WebRTC peer-connection helper for teleconsultation.
 *
 * Creates an RTCPeerConnection with the configured ICE servers and manages the
 * local stream. Actual negotiation (offer/answer/ICE over a signalling server)
 * is the caller's responsibility once a `signallingUrl` is available; this module
 * provides the media primitives and a typed helper for the signalling payloads.
 */

export interface RTCCredentials {
  signallingUrl: string;
  iceServers: RTCIceServer[];
}

export function parseIceServers(raw: string): RTCIceServer[] {
  if (!raw) return [{ urls: 'stun:stun.l.google.com:19302' }];
  try {
    const parsed = JSON.parse(raw) as RTCIceServer[];
    return Array.isArray(parsed) && parsed.length ? parsed : [{ urls: 'stun:stun.l.google.com:19302' }];
  } catch {
    return [{ urls: 'stun:stun.l.google.com:19302' }];
  }
}

export function webrtcSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.RTCPeerConnection === 'function';
}

/**
 * Create a peer connection and attach a local media stream.
 * Throws if WebRTC is unsupported or the stream is missing.
 */
export function createPeerConnection(credentials: RTCCredentials, localStream: MediaStream): RTCPeerConnection {
  if (!webrtcSupported()) {
    throw new Error('WebRTC is not supported in this browser.');
  }
  const pc = new RTCPeerConnection({ iceServers: credentials.iceServers });
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  return pc;
}

/** Encode a signalling message (offer/answer/candidate) for the server. */
export function encodeSignal(kind: string, payload: unknown): string {
  return JSON.stringify({ kind, payload });
}
