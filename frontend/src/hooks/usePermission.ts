import { useAuthStore } from '../stores/authStore';

export const usePermission = (permission: string): boolean => {
  return useAuthStore((state) => state.hasPermission(permission));
};

export const usePermissions = (permissions: string[]): boolean => {
  return useAuthStore((state) => state.hasAllPermissions(permissions));
};

export const useAnyPermission = (permissions: string[]): boolean => {
  return useAuthStore((state) => state.hasAnyPermission(permissions));
};

export const useRole = (role: string): boolean => {
  return useAuthStore((state) => state.hasRole(role));
};

