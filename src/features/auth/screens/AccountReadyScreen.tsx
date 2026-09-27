import React from 'react';
import { useNavigate } from '@/core/navigation';
import { useAuth } from '@/data/AuthContext';
import { homeForRole } from '@/lib/workflowRouting';
import { AccountReadyView } from '../views/AccountReadyView';

/** Shown once after signup; "Enter" goes wherever this role's work lives. */
export function AccountReadyScreen(): React.ReactElement {
  const navigate = useNavigate();
  const auth = useAuth();
  return (
    <AccountReadyView
      onEnter={() => {
        void navigate(auth.user ? `/${homeForRole(auth.user.role)}` : '/login');
      }}
    />
  );
}
