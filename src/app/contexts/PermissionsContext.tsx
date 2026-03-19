import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

export type PermissionAction =
  | 'DASHBOARD_GLOBAL_VIEW'
  | 'DASHBOARD_REGIONAL_VIEW'
  | 'DASHBOARD_SELF_VIEW'
  | 'STOCK_VIEW_GLOBAL'
  | 'STOCK_VIEW_REGIONAL'
  | 'STOCK_VIEW_SELF'
  | 'STOCK_EDIT_SELF'
  | 'STOCK_ADJUST_GLOBAL'
  | 'USER_VIEW_ALL'
  | 'USER_VIEW_REGION'
  | 'USER_CREATE_ALL'
  | 'USER_EDIT_ALL'
  | 'USER_DELETE_ALL'
  | 'USER_CREATE_REGION'
  | 'USER_EDIT_REGION'
  | 'USER_DELETE_REGION'
  | 'LOAN_VIEW_GLOBAL'
  | 'LOAN_VIEW_REGIONAL'
  | 'LOAN_VIEW_SELF'
  | 'LOAN_MANAGE_ALL'
  | 'LOAN_MANAGE_REGION'
  | 'SETTINGS_MANAGE'
  | 'AUDIT_VIEW'
  | 'MANAGE_REGION_USERS' // Legacy
  | 'MANAGE_ROLES' // Legacy
  | 'APPROVE_LOANS'; // Legacy

interface PermissionsContextType {
  permissions: PermissionAction[];
  hasPermission: (action: PermissionAction) => boolean;
  isLoading: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: [],
  hasPermission: () => false,
  isLoading: true,
  refreshPermissions: async () => { },
});

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<PermissionAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPermissions = async () => {
    setIsLoading(true);
    const user = authService.getCurrentUser();

    // Check localStorage first
    if (user && user.permissions) {
      setPermissions(user.permissions);
      setIsLoading(false);
      return;
    }

    // Fallback to API if not in localStorage or if we need a refresh
    if (user) {
      try {
        const profile = await authService.getProfile();
        if (profile && profile.permissions) {
          setPermissions(profile.permissions);
        }
      } catch (error) {
        console.error("Failed to load permissions:", error);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const hasPermission = useCallback((action: PermissionAction) => {
    if (!action) return true;

    // 1. Exact match
    if (permissions.includes(action)) return true;

    // 2. Hierarchy Logic (e.g. USER_CREATE_ALL implies USER_CREATE_REGION)
    const actionStr = action.toString();
    if (actionStr.endsWith('_REGION') || actionStr.endsWith('_SELF')) {
      const base = actionStr.replace(/_REGION$|_SELF$/, '');
      if (permissions.includes(`${base}_ALL` as PermissionAction)) return true;

      if (actionStr.endsWith('_SELF') && permissions.includes(`${base}_REGIONAL` as PermissionAction)) return true;
      if (actionStr.endsWith('_SELF') && permissions.includes(`${base}_REGION` as PermissionAction)) return true;
    }

    // 3. Admin escape hatch: if user has USER_EDIT_ALL, they can generally see manage buttons
    if (actionStr.startsWith('USER_') && permissions.includes('USER_EDIT_ALL')) return true;
    if (actionStr.startsWith('STOCK_') && permissions.includes('STOCK_ADJUST_GLOBAL')) return true;
    if (actionStr.startsWith('LOAN_') && permissions.includes('LOAN_MANAGE_ALL')) return true;

    return false;
  }, [permissions]);

  return (
    <PermissionsContext.Provider value={{ permissions, hasPermission, isLoading, refreshPermissions: loadPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);
