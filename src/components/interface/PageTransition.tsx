import React, { ReactNode } from 'react';

export function PageTransition({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`care-page-enter ${className}`} data-ui="page">{children}</div>;
}
