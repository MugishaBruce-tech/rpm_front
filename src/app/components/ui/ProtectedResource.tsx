import React from 'react';
import { usePermissions, PermissionAction } from '../../contexts/PermissionsContext';

interface ProtectedResourceProps {
  action: PermissionAction | PermissionAction[];
  children: React.ReactNode;
  fallback?: React.ReactNode; 
}

export const ProtectedResource: React.FC<ProtectedResourceProps> = ({ action, children, fallback = null }) => {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return null; 
  }

  const actions = Array.isArray(action) ? action : [action];
  const allowed = actions.some(a => hasPermission(a));

  if (allowed) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
