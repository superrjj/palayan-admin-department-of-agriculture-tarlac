// src/contexts/RoleContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const RoleContext = createContext();

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
};

function normalizeRole(role) {
  if (!role) return 'ADMIN';
  return role.toString().trim().toUpperCase().replace(/\s+/g, '_');
}

export const RoleProvider = ({ children }) => {
  const [userRole, setUserRole] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const rolePermissions = {
    SYSTEM_ADMIN: {
      canAccessAdminManagement: true,
      canViewAllLogs: true,
      canAccessFileMaintenance: true,
      dashboard: true,
      riceVarieties: true,
      pest: true,
      riceDisease: true,
      accounts: true,
      historyLogs: { viewAll: true, viewOwn: true },
      fileMaintenance: true,
      menuItems: [
        { path: '', label: 'Dashboard', icon: 'Home' },
        { path: 'rice_varieties', label: 'Rice Varieties', icon: 'Wheat' },
        { path: 'rice_pests', label: 'Pest', icon: 'Bug' },
        { path: 'rice_diseases', label: 'Rice Disease', icon: 'Shield' },
        { path: 'accounts', label: 'Accounts', icon: 'Users' },
        { path: 'history_logs', label: 'History Logs', icon: 'History' },
        { path: 'file_maintenance', label: 'File Maintenance', icon: 'File' }
      ]
    },
    ADMIN: {
      canAccessAdminManagement: false,
      canViewAllLogs: false,
      canAccessFileMaintenance: false,
      dashboard: true,
      riceVarieties: true,
      pest: true,
      riceDisease: true,
      accounts: false,
      historyLogs: { viewAll: false, viewOwn: true },
      fileMaintenance: false,
      menuItems: [
        { path: '', label: 'Dashboard', icon: 'Home' },
        { path: 'rice_varieties', label: 'Rice Varieties', icon: 'Wheat' },
        { path: 'rice_pests', label: 'Pest', icon: 'Bug' },
        { path: 'rice_diseases', label: 'Rice Disease', icon: 'Shield' },
        { path: 'history_logs', label: 'History Logs', icon: 'History' }
      ]
    }
  };

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        setLoading(true);
        const adminToken = localStorage.getItem('admin_token');
        const sessionId = localStorage.getItem('session_id');

        if (adminToken && sessionId) {
          const userDoc = await getDoc(doc(db, 'accounts', adminToken));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.currentSession === sessionId && userData.status === 'active') {
              const normalizedRole = normalizeRole(userData.role || 'ADMIN');
              setUserRole(normalizedRole);
              setUserInfo({
                id: userData.id || adminToken,
                fullname: userData.fullname || 'Unknown User',
                username: userData.username || 'unknown',
                email: userData.email || 'unknown@example.com',
                role: normalizedRole
              });
            } else {
              setUserRole(null);
              setUserInfo(null);
            }
          } else {
            setUserRole(null);
            setUserInfo(null);
          }
        } else {
          setUserRole(null);
          setUserInfo(null);
        }
      } catch (error) {
        console.error('Error loading user role:', error);
        setUserRole(null);
        setUserInfo(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserRole();
  }, []);

  const hasPermission = (permission) => {
    if (!userRole) return false;
    const cleanRole = normalizeRole(userRole);
    if (!rolePermissions[cleanRole]) return false;

    if (permission.includes('.')) {
      const [parent, child] = permission.split('.');
      return Boolean(rolePermissions[cleanRole][parent] && rolePermissions[cleanRole][parent][child]);
    }
    return Boolean(rolePermissions[cleanRole][permission]);
  };

  const getMenuItems = () => {
    const cleanRole = normalizeRole(userRole);
    if (!cleanRole) return [];
    if (!rolePermissions[cleanRole]) return [];
    return rolePermissions[cleanRole].menuItems || [];
  };

  const isSystemAdmin = () => normalizeRole(userRole) === 'SYSTEM_ADMIN';
  const isAdmin = () => normalizeRole(userRole) === 'ADMIN';

  const reloadUserData = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('admin_token');
      const sessionId = localStorage.getItem('session_id');

      if (adminToken && sessionId) {
        const userDoc = await getDoc(doc(db, 'accounts', adminToken));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.currentSession === sessionId && userData.status === 'active') {
            const normalizedRole = normalizeRole(userData.role || 'ADMIN');
            setUserRole(normalizedRole);
            setUserInfo({
              id: userData.id || adminToken,
              fullname: userData.fullname || 'Unknown User',
              username: userData.username || 'unknown',
              email: userData.email || 'unknown@example.com',
              role: normalizedRole
            });
          } else {
            setUserRole(null);
            setUserInfo(null);
          }
        } else {
          setUserRole(null);
          setUserInfo(null);
        }
      } else {
        setUserRole(null);
        setUserInfo(null);
      }
    } catch (error) {
      console.error('Error reloading user data:', error);
      setUserRole(null);
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-reload if admin_token changes (e.g., after login)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'admin_token') reloadUserData();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [reloadUserData]);

  const value = {
    userRole,
    userInfo,
    loading,
    hasPermission,
    getMenuItems,
    isSystemAdmin,
    isAdmin,
    rolePermissions,
    reloadUserData
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};