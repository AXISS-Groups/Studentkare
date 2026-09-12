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
  requires2FA?: boolean;
  tempToken?: string;
  fallbackSent?: boolean;
  fallbackChannel?: string;
  fallbackTargetMasked?: string;
}

export const authApi = {
  async sendOtp(
    identifier: string,
    channel: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP',
    intent: 'LOGIN' | 'SIGNUP' = 'LOGIN',
    fallbackEmail?: string
  ): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, channel, intent, fallbackEmail: fallbackEmail || undefined }),
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

  async getDemoCredentials(): Promise<{ description: string; credentials: any[] }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/demo-credentials`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }

    return {
      description: 'Studentkare Role-Based Test Login Credentials',
      credentials: [
        {
          role: 'SUPER_ADMIN',
          name: 'Dr. Vikram Sarabhai',
          phone: '9999999999',
          email: 'super.admin@studentkare.in',
          notes: 'Full access to Super Admin Console, Break-Glass Protocol, Constitution Rules & AI Ops Control',
        },
        {
          role: 'COSIGNER_ADMIN',
          name: 'Prof. Rajesh Sharma',
          phone: '9999999998',
          email: 'cosigner.admin@studentkare.in',
          notes: 'Co-signing Admin for Dual-Auth Emergency Access & Restricted Pool Sign-off (Rule K8)',
        },
        {
          role: 'CAMPUS_ADMIN',
          name: 'Dr. Sunita Rao',
          phone: '9876500001',
          email: 'health.admin@osmania.ac.in',
          notes: 'Campus Health Administrator for Osmania University',
        },
        {
          role: 'NMC_DOCTOR',
          name: 'Dr. Ananya Rao, MD',
          phone: '9876500002',
          email: 'dr.ananya.rao@studentkare.in',
          notes: 'NMC Registered Clinician for Teleconsult & Prescription Sign-off',
        },
        {
          role: 'STUDENT',
          name: 'Arjun Mehta',
          phone: '9876543210',
          email: 'arjun.m@osmania.ac.in',
          notes: 'Student PHR Record Holder & Teleconsult Pass User',
        },
      ],
    };
  },
};

export const adminApi = {
  async getTelemetry(token?: string) {    try {
      const res = await fetch(`${API_BASE_URL}/admin/telemetry`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // Offline fallback
    }
    return {
      systemStatus: 'OPERATIONAL',
      totalStudents: 128450,
      activeSessions: 42,
      totalTenants: 42,
      abdmSyncCount: 412980,
      kAnonymityFloor: 20,
    };
  },

  async requestBreakGlass(
    data: {
      studentId: string;
      reasonCategory: string;
      reasonText: string;
      scope: string[];
      dualApproverAdminId: string;
      sensitiveCategoryApproverId?: string;
      sensitiveCategory?: string;
    },
    token?: string
  ) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/break-glass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      return { success: false, message: err.detail || 'Break-glass request failed' };
    } catch (e) {
      return { success: false, message: 'Break-glass API offline' };
    }
  },

  async getAuditLogs(ruleId?: string, actorType?: string, token?: string) {
    try {
      const query = new URLSearchParams();
      if (ruleId) query.append('ruleId', ruleId);
      if (actorType) query.append('actorType', actorType);
      const res = await fetch(`${API_BASE_URL}/admin/audit-logs?${query.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // Offline fallback
    }
    return { total: 0, logs: [] };
  },

  async getTenants(token?: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tenants`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // Offline fallback
    }
    return { tenants: [] };
  },

  async getDepartments(token?: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/departments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // Offline fallback
    }
    return { departments: [] };
  },

  async toggleKillSwitch(deptId: string, token?: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/departments/${deptId}/kill-switch`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // Offline fallback
    }
    return { success: false };
  },

  async getIntegrations(token?: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/integrations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) return await res.json();
      return { success: false, message: `Server ${res.status}` };
    } catch (e) {
      return { success: false, message: 'Integrations API offline' };
    }
  },

  async updateIntegration(provider: string, config: Record<string, any>, token?: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/integrations/${provider}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ config }),
      });
      const data = await res.json().catch(() => ({}));
      return res.ok ? data : { success: false, message: data.detail || `Save failed (${res.status})` };
    } catch (e) {
      return { success: false, message: 'Integrations API offline' };
    }
  },

  async testIntegration(provider: string, token?: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/integrations/${provider}/test`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Integrations API offline' };
    }
  },
};

export const publicConfigApi = {
  async getPublicConfig() {
    try {
      const res = await fetch(`${API_BASE_URL}/config/public`);
      if (res.ok) return await res.json();
    } catch (e) {
      // offline
    }
    return {
      posthog: { enabled: false, apiKey: '', host: 'https://app.posthog.com' },
      firebase: { enabled: false, apiKey: '', authDomain: '', projectId: '', messagingSenderId: '', appId: '', vapidKey: '' },
      otp: { channel: 'WHATSAPP', ttlSeconds: 300 },
      twofa: { enforcedRoles: ['SUPER_ADMIN'], issuer: 'StudentKare' },
    };
  },
};

export const twoFactorApi = {
  async setup(token: string) {
    const res = await fetch(`${API_BASE_URL}/auth/2fa/setup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  },
  async enable(token: string, code: string) {
    const res = await fetch(`${API_BASE_URL}/auth/2fa/enable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ token: code }),
    });
    const data = await res.json().catch(() => ({}));
    return { ...data, ok: res.ok };
  },
  async disable(token: string, code: string) {
    const res = await fetch(`${API_BASE_URL}/auth/2fa/disable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ token: code }),
    });
    const data = await res.json().catch(() => ({}));
    return { ...data, ok: res.ok };
  },
  async challenge(tempToken: string, code: string): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/2fa/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, token: code }),
      });
      const data = await res.json();
      if (res.ok) return { success: true, token: data.token, user: data.user };
      return { success: false, message: data.detail || 'Invalid authenticator code' };
    } catch (e) {
      return { success: false, message: '2FA service offline' };
    }
  },
};

const getToken = (): string | undefined => {
  try {
    return (localStorage.getItem('sacare_token') as string | null) || undefined;
  } catch {
    return undefined;
  }
};

export const aiApi = {
  async chat(messages: { role: string; content: string }[], token?: string): Promise<{ reply: string; engine: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/agents/llm/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token || getToken() ? { Authorization: `Bearer ${token || getToken()}` } : {}),
        },
        body: JSON.stringify({ messages }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // offline
    }
    return { reply: '', engine: 'offline' };
  },

  async ragQuery(query: string, topK = 2, token?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/rag/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token || getToken() ? { Authorization: `Bearer ${token || getToken()}` } : {}),
        },
        body: JSON.stringify({ query, topK }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // offline
    }
    return null;
  },

  async dispatchN8n(webhook: string, payload: Record<string, unknown>, token?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/automation/n8n/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token || getToken() ? { Authorization: `Bearer ${token || getToken()}` } : {}),
        },
        body: JSON.stringify({ webhook, payload }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // offline
    }
    return null;
  },

  async schedulerStatus(token?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/automation/scheduler/status`, {
        headers: token || getToken() ? { Authorization: `Bearer ${token || getToken()}` } : {},
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // offline
    }
    return null;
  },

  async schedulerStart(token?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/automation/scheduler/start`, {
        method: 'POST',
        headers: token || getToken() ? { Authorization: `Bearer ${token || getToken()}` } : {},
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // offline
    }
    return null;
  },

  async schedulerStop(token?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/automation/scheduler/stop`, {
        method: 'POST',
        headers: token || getToken() ? { Authorization: `Bearer ${token || getToken()}` } : {},
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // offline
    }
    return null;
  },

  async abdmStatus(token?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/abdm/status`, {
        headers: token || getToken() ? { Authorization: `Bearer ${token || getToken()}` } : {},
      });
      if (res.ok) return await res.json();
    } catch (e) {
      // offline
    }
    return null;
  },
};


const withAuth = (token?: string): HeadersInit => ({
  ...(token || getToken() ? { Authorization: `Bearer ${token || getToken()}` } : {}),
});

export interface TeleconsultDoctorDto {
  id: string;
  name: string;
  specialty: string;
  councilRef: string;
  campusStation: string;
  experienceYears: number;
  rating: number;
  consultationFee: string;
  status: string;
}

export interface PharmacyMedicationDto {
  id: string;
  brandName: string;
  activeMolecule: string;
  category: string;
  price: number;
  prescriptionRequired: boolean;
  deliveryTimeMins: number;
  stockCount: number;
}

export interface DiagnosticLabTestDto {
  id: string;
  testName: string;
  category: string;
  vendorName: string;
  price: number;
  turnaroundHours: number;
  samplePickup: string;
}

export const teleconsultApi = {
  async getDoctors(q?: string): Promise<{ total: number; items: TeleconsultDoctorDto[] } | null> {
    try {
      const url = `${API_BASE_URL}/teleconsult/doctors${q ? `?q=${encodeURIComponent(q)}` : ''}`;
      const res = await fetch(url, { headers: withAuth() });
      if (res.ok) return await res.json();
    } catch {
      return null;
    }
    return null;
  },
  async getMedications(q?: string): Promise<{ total: number; items: PharmacyMedicationDto[] } | null> {
    try {
      const url = `${API_BASE_URL}/teleconsult/medications${q ? `?q=${encodeURIComponent(q)}` : ''}`;
      const res = await fetch(url, { headers: withAuth() });
      if (res.ok) return await res.json();
    } catch {
      return null;
    }
    return null;
  },
  async getDiagnostics(q?: string): Promise<{ total: number; items: DiagnosticLabTestDto[] } | null> {
    try {
      const url = `${API_BASE_URL}/teleconsult/diagnostics${q ? `?q=${encodeURIComponent(q)}` : ''}`;
      const res = await fetch(url, { headers: withAuth() });
      if (res.ok) return await res.json();
    } catch {
      return null;
    }
    return null;
  },
};

export const agentApi = {
  async runTriageLoop(
    complaint: string,
    tempF: number,
    bp: string,
  ): Promise<{ steps: { step: number; phase: string; result: string }[] } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/agents/triage-loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...withAuth() },
        body: JSON.stringify({ complaint, tempF, bloodPressure: bp }),
      });
      if (res.ok) return await res.json();
    } catch {
      return null;
    }
    return null;
  },
  async runSafetyLoop(
    medicationName: string,
    allergies: string[],
  ): Promise<{ steps: { step: number; phase: string; result: string }[] } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/agents/prescription-safety-loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...withAuth() },
        body: JSON.stringify({ medicationName, allergies }),
      });
      if (res.ok) return await res.json();
    } catch {
      return null;
    }
    return null;
  },
  async adjudicateClaim(claim: Record<string, unknown>) {
    try {
      const res = await fetch(`${API_BASE_URL}/claims/adjudicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...withAuth() },
        body: JSON.stringify({ claim }),
      });
      if (res.ok) return await res.json();
    } catch {
      return null;
    }
    return null;
  },
  async clinicalAssist(vitals: Record<string, unknown>, historyText: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/clinician/assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...withAuth() },
        body: JSON.stringify({ vitals, historyText }),
      });
      if (res.ok) return await res.json();
    } catch {
      return null;
    }
    return null;
  },
};

export const telemetryApi = {
  async ingest(deviceId: string, deviceType: string, readings: Record<string, unknown>, studentId?: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/telemetry/sensors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...withAuth() },
        body: JSON.stringify({ deviceId, deviceType, readings, studentId }),
      });
      if (res.ok) return await res.json();
    } catch {
      return null;
    }
    return null;
  },
  async list(limit = 100) {
    try {
      const res = await fetch(`${API_BASE_URL}/telemetry/sensors?limit=${limit}`, { headers: withAuth() });
      if (res.ok) return await res.json();
    } catch {
      return null;
    }
    return null;
  },
};
