import { useCallback } from 'react';
import { PermissionKey, UserPermissions } from '../types/permissions';
import { UserProfile } from '../types';

export const usePermissions = (userProfile: UserProfile | null) => {
  const hasPermission = useCallback((permission: PermissionKey): boolean => {
    if (!userProfile) return false;
    
    // Admin has all permissions by default
    if (userProfile.role === 'admin') return true;

    // Check specific permission
    return userProfile.permissions?.[permission] === true;
  }, [userProfile]);

  return { hasPermission };
};
