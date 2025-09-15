import { useRole } from '../../contexts/RoleContext';
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Home, Wheat, Bug, Shield, Users, X, History, Menu, File } from 'lucide-react';

const normalizeRole = (role) =>
  (role || 'ADMIN').toString().trim().toUpperCase().replace(/\s+/g, '_');

// Single menu source
const baseMenu = [
  { path: '', label: 'Dashboard', icon: 'Home', roles: ['SYSTEM_ADMIN','ADMIN'] },
  { path: 'rice_varieties', label: 'Rice Varieties', icon: 'Wheat', roles: ['SYSTEM_ADMIN','ADMIN'] },
  { path: 'rice_pests', label: 'Pest', icon: 'Bug', roles: ['SYSTEM_ADMIN','ADMIN'] },
  { path: 'rice_diseases', label: 'Rice Disease', icon: 'Shield', roles: ['SYSTEM_ADMIN','ADMIN'] },
  { path: 'accounts', label: 'Accounts', icon: 'Users', roles: ['SYSTEM_ADMIN'] },
  { path: 'history_logs', label: 'History Logs', icon: 'History', roles: ['SYSTEM_ADMIN','ADMIN'] },
  { path: 'file_maintenance', label: 'File Maintenance', icon: 'File', roles: ['SYSTEM_ADMIN'] },
];

const Sidebar = ({ onNavigate, isSidebarOpen, setIsSidebarOpen }) => {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { userRole } = useRole();

  const role = normalizeRole(userRole);
  console.log('[Sidebar] role=', role);

  // Filter once by role
  const roleMenu = useMemo(() => {
    const items = baseMenu.filter(m => m.roles.includes(role));
    console.log('[Sidebar] menu after role filter =', items.map(i => i.path));
    return items;
  }, [role]);

  const iconMap = { Home, Wheat, Bug, Shield, Users, History, File };

  useEffect(() => {
    if (isSidebarOpen) setIsSidebarCollapsed(false);
  }, [isSidebarOpen]);

  const normalizePath = (p) => (p || '').replace(/\/+$/, '');
  const currentPath = normalizePath(location.pathname);

  return (
    <>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isSidebarCollapsed ? 'lg:w-16' : 'w-64'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-300">
          {!isSidebarCollapsed && (
            <div className="flex items-center space-x-7">
              <img src="/ic_palayan_no_bg.png" alt="Logo" className="h-11 w-11 object-contain" />
              <h1 className="text-xl font-bold text-green-700 flex items-center">PalaYan</h1>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:block text-gray-500 hover:text-gray-700 p-1 rounded"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="mt-8 px-2">
          {roleMenu.map((item) => {
            // FINAL GUARD: kahit may maling data, hindi irerender sa non-SYSTEM_ADMIN
            if (role !== 'SYSTEM_ADMIN' && (item.path === 'accounts' || item.path === 'file_maintenance')) {
              return null;
            }

            const IconComponent = iconMap[item.icon] || Home;
            const fullPath = normalizePath(`/dashboard/${item.path}`);
            const isActive = currentPath === fullPath;

            return (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`w-full flex items-center rounded-lg transition-colors
                  ${isSidebarCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3 text-left'}
                  ${isActive ? 'bg-green-100 text-green-700 font-medium hover:bg-green-200' : 'text-black hover:text-green-700 hover:bg-green-100'}
                  focus:outline-none focus:ring-0`}
                title={isSidebarCollapsed ? item.label : ''}
              >
                <IconComponent className={`h-5 w-5 ${!isSidebarCollapsed ? 'mr-3' : ''}`} />
                {!isSidebarCollapsed && item.label}
              </button>
            );
          })}
        </nav>

        {!isSidebarCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              PalaYan
              <br />
              Version 1.0.0
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;