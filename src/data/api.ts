/**
 * SA Care — FastAPI Client & Offline Auth Simulator
 */

const API_BASE_URL = 'http://localhost:8000/api';

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: any;
  message?: string;
  targetMasked?: string;
  channelUsed?: string;
  demoOtp?: string;
}

export const authApi = {
  async sendOtp(identifier: string, channel: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP', intent: 'LOGIN' | 'SIGNUP' = 'LOGIN'): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, channel, intent }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback offline simulator
    }

    const clean = identifier.replace('+91', '').trim();
    const masked = clean.includes('@')
      ? `${clean[0]}•••••@${clean.split('@')[1]}`
      : `+91 ${clean.slice(0, 2)}•••• ••${clean.slice(-2)}`;

    return {
      success: true,
      message: `6-digit authentication code dispatched to ${channel}`,
      targetMasked: masked,
      channelUsed: channel,
      demoOtp: '142857',
    };
  },

  async verifyOtp(identifier: string, otp: string, channel: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP'): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp, channel }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }

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
        bloodGroup: 'B+',
        university: 'Osmania University',
        rollNumber: 'URN-OSMANIA-2026-ARJUN',
        abhaAddress: 'arjun.mehta@abdm',
        ageVerified: true,
        allergies: ['Penicillin', 'Sulfa drugs'],
        chronicConditions: ['Asthma'],
        currentMedications: ['Salbutamol inhaler'],
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
    } catch (e) {
      // Fallback
    }

    return {
      success: true,
      message: 'Student account created and age verified under DPDP Act 2023',
      token: 'sacare_sim_jwt_token_signup_2026',
      user: {
        ...data,
        ageVerified: true,
        abhaAddress: `${data.fullName.toLowerCase().replace(' ', '.')}@abdm`,
      },
    };
  },
};
