import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const RoleContext = createContext();

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};

// 🔑 Normalization function
function normalizeRole(role) {
  if (!role) return "ADMIN";
  return role.toString().trim().toUpperCase().replace(/\s+/g, "_");
}

export const RoleProvider = ({ children }) => {
  const [userRole, setUserRole] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Define role permissions
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
      historyLogs: {
        viewAll: true,
        viewOwn: true
      },
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
      historyLogs: {
        viewAll: false,
        viewOwn: true
      },
      fileMaintenance: false,
      menuItems: [
        { path: '', label: 'Dashboard', icon: 'Home' },
        { path: 'rice_varieties', label: 'Rice Varieties Management', icon: 'Wheat' },
        { path: 'rice_pests', label: 'Pest Management', icon: 'Bug' },
        { path: 'rice_diseases', label: 'Disease Management', icon: 'Shield' },
        { path: 'history_logs', label: 'History Management (Own Logs)', icon: 'History' }
      ]
    }
  };

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        setUserRole(null);
        setUserInfo(null);
        setLoading(true);

        const adminToken = localStorage.getItem("admin_token");
        const sessionId = localStorage.getItem("session_id");

        console.log("=== ROLE CONTEXT RELOAD ===");
        console.log("adminToken:", adminToken);
        console.log("sessionId:", sessionId);

        if (adminToken && sessionId) {
          const userDoc = await getDoc(doc(db, "accounts", adminToken));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("User data from database:", userData);

            if (userData.currentSession === sessionId && userData.status === 'active') {
              const rawRole = userData.role || 'ADMIN';
              const normalizedRole = normalizeRole(rawRole);

              console.log("=== ROLE LOADING DEBUG ===");
              console.log("Raw userData.role from database:", userData.role);
              console.log("Normalized userRole:", normalizedRole);
              console.log("normalizedRole === 'SYSTEM_ADMIN':", normalizedRole === 'SYSTEM_ADMIN');
              console.log("normalizedRole === 'ADMIN':", normalizedRole === 'ADMIN');
              console.log("=== END ROLE LOADING DEBUG ===");

              setUserRole(normalizedRole);
              setUserInfo({
                id: userData.id || adminToken,
                fullname: userData.fullname || 'Unknown User',
                username: userData.username || 'unknown',
                email: userData.email || 'unknown@example.com',
                role: normalizedRole
              });

              setTimeout(() => {
                console.log("Role set, triggering re-render");
              }, 100);
            } else {
              console.log("Session mismatch or user inactive - clearing user data");
              setUserRole(null);
              setUserInfo(null);
            }
          } else {
            console.log("User document not found - clearing user data");
            setUserRole(null);
            setUserInfo(null);
          }
        } else {
          console.log("No admin token or session - clearing user data");
          setUserRole(null);
          setUserInfo(null);
        }
      } catch (error) {
        console.error("Error loading user role:", error);
        setUserRole(null);
        setUserInfo(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserRole();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      console.log("Window focused, checking role data...");
      const adminToken = localStorage.getItem("admin_token");
      const sessionId = localStorage.getItem("session_id");

      if (adminToken && sessionId && userRole) {
        console.log("Refreshing role data on focus");
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [userRole]);

  const hasPermission = (permission) => {
    if (!userRole) {
      console.log("hasPermission: No userRole, returning false");
      return false;
    }
    const cleanRole = normalizeRole(userRole);
    if (!rolePermissions[cleanRole]) {
      console.log("hasPermission: Role not found in permissions:", cleanRole);
      return false;
    }

    let hasAccess = false;
    if (permission.includes('.')) {
      const [parent, child] = permission.split('.');
      hasAccess = rolePermissions[cleanRole][parent] && rolePermissions[cleanRole][parent][child];
    } else {
      hasAccess = rolePermissions[cleanRole][permission] || false;
    }

    console.log("hasPermission:", permission, "for role", cleanRole, "=", hasAccess);
    return hasAccess;
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
    console.log("Manually reloading user data...");
    setUserRole(null);
    setUserInfo(null);
    setLoading(true);

    try {
      const adminToken = localStorage.getItem("admin_token");
      const sessionId = localStorage.getItem("session_id");

      if (adminToken && sessionId) {
        const userDoc = await getDoc(doc(db, "accounts", adminToken));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.currentSession === sessionId && userData.status === 'active') {
            const rawRole = userData.role || 'ADMIN';
            const normalizedRole = normalizeRole(rawRole);
            setUserRole(normalizedRole);
            setUserInfo({
              id: userData.id || adminToken,
              fullname: userData.fullname || 'Unknown User',
              username: userData.username || 'unknown',
              email: userData.email || 'unknown@example.com',
              role: normalizedRole
            });
            setTimeout(() => {
              console.log("Reload - Role reloaded successfully");
            }, 100);
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
      console.error("Error reloading user data:", error);
      setUserRole(null);
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const validateCurrentRole = () => {
    if (!userRole) return false;
    const cleanRole = normalizeRole(userRole);
    const hasValidRole = rolePermissions[cleanRole] !== undefined;
    if (!hasValidRole) {
      reloadUserData();
      return false;
    }
    return true;
  };

  const value = {
    userRole,
    userInfo,
    loading,
    hasPermission,
    getMenuItems,
    isSystemAdmin,
    isAdmin,
    rolePermissions,
    reloadUserData,
    validateCurrentRole
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};
