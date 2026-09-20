import { apiRequest, setCsrfToken } from '@/data/http';
import type { Channel, OtpSendResponse, SessionResponse } from '../domain/Auth';

export interface SendOtpPayload {
  identifier: string;
  channel: Channel;
  intent: 'LOGIN' | 'SIGNUP';
  fallbackEmail?: string;
}

export interface VerifyOtpPayload {
  otp: string;
}

export interface Challenge2FAPayload {
  tempToken: string;
  token: string;
}

export interface CompleteSignupPayload {
  fullName: string;
  dob: string;
  university: string;
  rollNumber: string;
  bloodGroup?: string;
}

export class AuthRepository {
  async loadOptions(): Promise<Channel[]> {
    const res = await apiRequest<{ channels: Channel[] }>('/auth/options');
    return res.channels || ['WHATSAPP', 'EMAIL'];
  }

  async sendCode(payload: SendOtpPayload): Promise<OtpSendResponse> {
    return await apiRequest<OtpSendResponse>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async verifyCode(payload: VerifyOtpPayload): Promise<SessionResponse> {
    return await apiRequest<SessionResponse>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async challenge2FA(payload: Challenge2FAPayload): Promise<SessionResponse> {
    return await apiRequest<SessionResponse>('/auth/2fa/challenge', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async completeSignup(payload: CompleteSignupPayload): Promise<SessionResponse> {
    return await apiRequest<SessionResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  setCsrfToken(token: string): void {
    setCsrfToken(token);
  }
}

export const authRepository = new AuthRepository();
