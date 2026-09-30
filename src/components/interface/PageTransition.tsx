import React, { ReactNode } from 'react';
import { useInterface } from '../../theme/InterfaceProvider';

export function PageTransition({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { reducedMotion } = useInterface();
  return (
    <div
      className={`care-page-enter ${className}`}
      data-ui="page"
      style={{
        width: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        flex: '1 0 auto',
        ...(reducedMotion ? { animation: 'none' } : undefined)
      }}
    >
      {children}
    </div>
  );
}
