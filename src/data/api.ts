/**
 * StudentKare — FastAPI Client & Gated Offline Simulator
 */

import { StudentProfile } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000/api';
const ALLOW_OFFLINE_AUTH = import.meta.env.DEV && import.meta.env.VITE_ALLOW_OFFLINE_AUTH === 'true';

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: StudentProfile;
  message?: string;
  targetMasked?: string;
  channelUsed?: string;
}

export const authApi = {
  async sendOtp(
    identifier: string,
    channel: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP',
    intent: 'LOGIN' | 'SIGNUP' = 'LOGIN'
  ): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, channel, intent }),
      });

      if (res.ok) {
        return await res.json();
      }

      // Backend HTTP Error (400, 429, 500, etc.) - DO NOT fall through to offline simulator
      const errorData = await res.json().catch(() => ({ detail: 'Authentication request failed' }));
      return {
        success: false,
        message: errorData.detail || errorData.message || `Server returned error (${res.status})`,
      };
    } catch (e) {
      // Network failure (server unreachable / offline)
      if (!ALLOW_OFFLINE_AUTH) {
        return {
          success: false,
          message: 'Unable to connect to authentication server. Please check your network connection.',
        };
      }
    }

    // Gated offline fallback for local development ONLY (when VITE_ALLOW_OFFLINE_AUTH === 'true')
    const clean = identifier.replace('+91', '').trim();
    const masked = clean.includes('@')
      ? `${clean[0]}•••••@${clean.split('@')[1]}`
      : `+91 ${clean.slice(0, 2)}•••• ••${clean.slice(-2)}`;

    return {
      success: true,
      message: `6-digit authentication code dispatched to ${channel}`,
      targetMasked: masked,
      channelUsed: channel,
    };
  },

  async verifyOtp(
    identifier: string,
    otp: string,
    channel: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP'
  ): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp, channel }),
      });

      if (res.ok) {
        return await res.json();
      }

      // HTTP Error from Backend (e.g. invalid OTP 400)
      const errorData = await res.json().catch(() => ({ detail: 'Invalid or expired verification code.' }));
      return {
        success: false,
        message: errorData.detail || errorData.message || 'OTP verification failed.',
      };
    } catch (e) {
      if (!ALLOW_OFFLINE_AUTH) {
        return {
          success: false,
          message: 'Unable to connect to authentication server. Please try again.',
        };
      }
    }

    // Offline fallback for development only
    return {
      success: true,
      token: 'sacare_sim_jwt_token_2026',
      user: {
        id: 'std_001',
        fullName: 'Arjun Mehta',
        phone: identifier.includes('@') ? '9876543210' : identifier,
        email: identifier.includes('@') ? identifier : 'arjun.m@osmania.ac.in',
        dob: '2004-03-14',
        age: 22,
        ageVerified: false,
        ageVerificationDoc: 'STUDENT_ID',
        studentIdNumber: 'URN-OSMANIA-2026-ARJUN',
        institutionName: 'Osmania University',
        institutionId: 'inst_osmania_01',
        campusName: 'Main Campus',
        bloodGroup: 'B+',
        university: 'Osmania University',
        rollNumber: 'URN-OSMANIA-2026-ARJUN',
        abhaAddress: 'arjun.mehta@abdm',
        allergies: ['Penicillin', 'Sulfa drugs'],
        chronicConditions: ['Asthma'],
        emergencyContactName: 'Amma',
        emergencyContactPhone: '+91 98111 22334',
        emergencyContactRelation: 'Mother',
        pointsBalance: 240,
      },
    };
  },

  async signup(data: {
    fullName: string;
    phone: string;
    email?: string;
    dob: string;
    university: string;
    rollNumber: string;
    bloodGroup?: string;
    institutionId?: string | null;
  }): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        return await res.json();
      }

      const errorData = await res.json().catch(() => ({ detail: 'Signup failed.' }));
      return {
        success: false,
        message: errorData.detail || errorData.message || 'Account registration failed.',
      };
    } catch (e) {
      if (!ALLOW_OFFLINE_AUTH) {
        return {
          success: false,
          message: 'Unable to connect to registration server. Please try again.',
        };
      }
    }

    return {
      success: true,
      message: 'Student account created under DPDP Act 2023',
      token: 'sacare_sim_jwt_token_signup_2026',
      user: {
        id: `std_${Date.now()}`,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || `${data.fullName.toLowerCase().replace(' ', '.')}@university.edu`,
        dob: data.dob,
        age: 20,
        ageVerified: false,
        ageVerificationDoc: 'STUDENT_ID',
        studentIdNumber: data.rollNumber,
        institutionName: data.university,
        institutionId: data.institutionId || null,
        campusName: 'Main Campus',
        rollNumber: data.rollNumber,
        bloodGroup: data.bloodGroup || 'B+',
        university: data.university,
        abhaAddress: `${data.fullName.toLowerCase().replace(' ', '.')}@abdm`,
        allergies: [],
        chronicConditions: [],
        emergencyContactName: 'Guardian',
        emergencyContactPhone: '+91 98111 22334',
        emergencyContactRelation: 'Parent',
        pointsBalance: 100,
      },
    };
  },
};
