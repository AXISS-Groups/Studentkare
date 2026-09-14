import React, { ReactNode } from 'react';
import { useInterface } from '../../theme/InterfaceProvider';

export function PageTransition({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { reducedMotion } = useInterface();
  return <div className={`care-page-enter ${className}`} data-ui="page" style={reducedMotion ? { animation: 'none' } : undefined}>{children}</div>;
}
