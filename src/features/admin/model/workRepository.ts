import { apiRequest } from '@/data/http';
import type { AppointmentTransition, AppointmentList, FollowUpList, WorkRequestPage, WorkRequestQuery, WorkRequestTransition } from './types';

/** Requests, appointments and follow-ups assigned to staff. The only place that knows the /work endpoints. */
export interface WorkRepository {
  listRequests(query: WorkRequestQuery, signal?: AbortSignal): Promise<WorkRequestPage>;
  updateRequest(requestId: string, status: WorkRequestTransition): Promise<unknown>;
  listAppointments(signal?: AbortSignal): Promise<AppointmentList>;
  updateAppointment(appointmentId: string, status: AppointmentTransition): Promise<unknown>;
  listFollowUps(signal?: AbortSignal): Promise<FollowUpList>;
  /** Sent with no body. */
  resolveFollowUp(taskId: string): Promise<unknown>;
}

/** /work/requests?limit=…&offset=…[&status=…] */
const requestsPath = ({ limit, offset, status }: WorkRequestQuery) =>
  `/work/requests?limit=${limit}&offset=${offset}${status !== 'ALL' ? `&status=${status}` : ''}`;

export const workRepository: WorkRepository = {
  listRequests: (query, signal) => apiRequest<WorkRequestPage>(requestsPath(query), { signal }),
  updateRequest: (requestId, status) => apiRequest(`/work/requests/${requestId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  listAppointments: signal => apiRequest<AppointmentList>('/work/appointments', { signal }),
  updateAppointment: (appointmentId, status) => apiRequest(`/work/appointments/${appointmentId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  listFollowUps: signal => apiRequest<FollowUpList>('/work/followups', { signal }),
  resolveFollowUp: taskId => apiRequest(`/work/followups/${taskId}/resolve`, { method: 'POST' }),
};
