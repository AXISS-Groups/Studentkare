let csrfToken = '';
export const setCsrfToken = (value: string) => { csrfToken = value; };
export const getCsrfToken = () => csrfToken;
const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) headers.set('X-CSRF-Token', csrfToken);
  try {
    const response = await fetch(`${apiBase}${path}`, { ...options, headers, credentials: 'include', signal: controller.signal });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('care:session-expired'));
      const detail = body?.detail ?? body?.message;
      const message = Array.isArray(detail) ? detail.map((entry: { msg?: string }) => entry.msg).filter(Boolean).join(' ') : typeof detail === 'string' ? detail : 'The request could not be completed. Please try again.';
      throw new ApiError(message, response.status);
    }
    if (body === null) throw new ApiError('The server returned an invalid response.', 502);
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw error;
    throw new ApiError(controller.signal.aborted ? 'The request timed out. Please try again.' : 'Cannot connect to the care service. Check your connection and try again.', 0);
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}

export const apiFileUrl = (id: string) => `${apiBase}/health/documents/${encodeURIComponent(id)}/file`;
