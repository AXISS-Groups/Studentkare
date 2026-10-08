import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

export type CallStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ENDED';

export interface ChatMessage {
  id: string;
  sender: 'PATIENT' | 'DOCTOR';
  text: string;
  timestamp: number;
}

export interface EPrescriptionSummary {
  prescriptionId: string;
  doctorName: string;
  diagnosis: string;
  medicines: { name: string; dosage: string; durationDays: number }[];
  clinicalNotes: string;
  timestamp: number;
}

/**
 * MVVM ViewModel for Teleconsult Video & Digital E-Prescription Scribe.
 *
 * Manages WebRTC call states, audio/video toggles, in-call messaging,
 * and automated doctor E-Prescription extraction across Web & Mobile.
 */
export class TeleconsultViewModel implements ViewModel {
  sessionStatus: CallStatus = 'IDLE';
  /** Empty until a real clinician is assigned by the server. */
  activeDoctorName = '';
  callDurationSeconds = 0;
  isMuted = false;
  isVideoOff = false;

  chatMessages: ChatMessage[] = [];
  chatInput = '';
  ePrescription: EPrescriptionSummary | null = null;

  loading = false;
  error: string | null = null;
  private timerRef: number | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get formattedCallDuration(): string {
    const mins = Math.floor(this.callDurationSeconds / 60);
    const secs = this.callDurationSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  setChatInput(text: string): void {
    this.chatInput = text;
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
  }

  toggleVideo(): void {
    this.isVideoOff = !this.isVideoOff;
  }

  async startCall(): Promise<void> {
    // Fail closed: there is no video consult service behind this view. It used
    // to "connect" after a timeout to an invented doctor who greeted the user.
    this.sessionStatus = 'IDLE';
    this.error = 'Video consults aren’t available yet. No call was started.';
  }

  sendChatMessage(): void {
    if (!this.chatInput.trim()) return;
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'PATIENT',
      text: this.chatInput,
      timestamp: Date.now(),
    };
    this.chatMessages.push(userMsg);
    this.chatInput = '';
  }

  async endCall(): Promise<void> {
    if (this.timerRef) {
      clearInterval(this.timerRef);
      this.timerRef = null;
    }
    this.sessionStatus = 'ENDED';

    // Generate E-Prescription upon call completion
    try {
      const response = await apiRequest<EPrescriptionSummary>('/teleconsult/eprescription', {
        method: 'POST',
        body: JSON.stringify({ doctorName: this.activeDoctorName, duration: this.callDurationSeconds }),
      });

      runInAction(() => {
        // Only a prescription the server actually issued is shown.
        this.ePrescription = response ?? null;
      });
    } catch (err: unknown) {
      runInAction(() => {
        this.ePrescription = null;
        this.error = err instanceof Error ? err.message : 'No prescription was issued.';
      });
    }
  }

  reset(): void {
    if (this.timerRef) {
      clearInterval(this.timerRef);
      this.timerRef = null;
    }
    this.sessionStatus = 'IDLE';
    this.callDurationSeconds = 0;
    this.isMuted = false;
    this.isVideoOff = false;
    this.chatMessages = [];
    this.ePrescription = null;
    this.error = null;
  }

  dispose(): void {
    this.reset();
  }
}
