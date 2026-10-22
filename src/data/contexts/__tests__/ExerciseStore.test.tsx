import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const auth: { user: { id: string; fullName: string; role: string } | null } = { user: null };
const apiRequest = vi.fn(async () => ({ savedExercises: [], completedTasks: [], items: [] }));
vi.mock('../AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('../../services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/http')>()),
  apiRequest: (...args: unknown[]) => apiRequest(...(args as [])),
}));

import { ExerciseProvider } from '../ExerciseStore';

afterEach(() => { apiRequest.mockClear(); auth.user = null; });

describe('ExerciseProvider (live-run audit #8)', () => {
  it.each(['SUPER_ADMIN', 'COUNSELLOR', 'VENDOR', 'NMC_DOCTOR', 'LAB_COLLECTOR'])('loads no student movement data for a %s', async (role) => {
    auth.user = { id: 'u1', fullName: 'Staff', role };
    render(<ExerciseProvider><p>page</p></ExerciseProvider>);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('loads a student’s saved exercises and sessions', async () => {
    auth.user = { id: 's1', fullName: 'Asha', role: 'STUDENT' };
    render(<ExerciseProvider><p>page</p></ExerciseProvider>);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/health/preferences', expect.anything()));
  });
});
