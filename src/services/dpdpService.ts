import { ErasureRequest, ConsentPolicyVersion } from '../types/dpdp';

const API_BASE_URL = '/api/v1/dpdp';

export class DpdpService {
  /**
   * Returns pending requests with 30-day countdowns and legal exemption lists.
   */
  async getErasureQueue(): Promise<ErasureRequest[]> {
    const response = await fetch(`${API_BASE_URL}/erasure-queue`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch erasure queue: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Executes deletion while retaining mandated records.
   * Note: The actual database deletion logic and mandated record retention 
   * is executed by the FastAPI backend endpoint.
   */
  async processErasure(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/erasure/${id}/process`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to process erasure for ID ${id}: ${response.statusText}`);
    }
  }

  /**
   * Updates policy version and flags existing active student sessions for forced re-consent.
   * Note: The actual flagging of active sessions is executed by the FastAPI backend.
   */
  async updateConsentPolicy(versionData: Partial<ConsentPolicyVersion>): Promise<ConsentPolicyVersion> {
    const response = await fetch(`${API_BASE_URL}/consent-policy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(versionData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update consent policy: ${response.statusText}`);
    }
    
    return response.json();
  }
}

export const dpdpService = new DpdpService();
