import React from 'react';
import { StudentWebShell } from '@/design-system/student-shell/StudentWebShell';
import type { RoutePath } from '@/lib/utils/workflowRouting';

const noop = () => undefined;

/**
 * Shared wrapper for the "Web" (signed-in student web) preview screens —
 * reuses the real `StudentWebShell` (sidebar, top nav, search, alerts,
 * avatar) rather than hand-drawing a fake header, same principle as
 * `PillNav` for the phone previews. Each `Web*Preview` component only
 * supplies its own body content as `children`.
 */
export function WebShellPreview({ route, children }: { route: RoutePath; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ width: 1180, minHeight: 760, overflow: 'hidden' }}>
      <StudentWebShell
        route={route}
        student={{ fullName: '[Student name]', campus: '[Campus]', verified: true }}
        cartCount={1}
        onNavigate={noop}
        onSos={noop}
        onAlerts={noop}
        onSearch={noop}
        onSignOut={noop}
      >
        {children}
      </StudentWebShell>
    </div>
  );
}
