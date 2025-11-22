import { type ReactNode } from 'react';
import { usePermission, useAnyPermission } from '../hooks/usePermission';

interface PermissionGateProps {
  children: ReactNode;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

export const PermissionGate = ({
  children,
  permissions = [],
  requireAll = true,
  fallback = null,
}: PermissionGateProps) => {
  const hasPermission = usePermission(permissions[0] || '');
  const hasAnyPermission = useAnyPermission(permissions);

  if (permissions.length === 0) {
    return <>{children}</>;
  }

  if (permissions.length === 1) {
    return hasPermission ? <>{children}</> : <>{fallback}</>;
  }

  // Multiple permissions
  if (requireAll) {
    // Check if user has all permissions
    const hasAll = permissions.every((permission) => usePermission(permission));
    return hasAll ? <>{children}</> : <>{fallback}</>;
  }

  // Check if user has any permission
  return hasAnyPermission ? <>{children}</> : <>{fallback}</>;
};

