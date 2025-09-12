// components/Layout/Sidebar.jsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Home, Wheat, Bug, Shield, Users, X, History } from 'lucide-react';

const Sidebar = ({ onNavigate, isSidebarOpen, setIsSidebarOpen }) => {
  const location = useLocation();

  const menuItems = [
    { id: '', label: 'Dashboard', icon: Home },   
    { id: 'rice_varieties', label: 'Rice Varieties', icon: Wheat },
    { id: 'rice_pests', label: 'Pest Management', icon: Bug },
    { id: 'rice_diseases', label: 'Disease Management', icon: Shield },
    { id: 'accounts', label: 'Admin Management', icon: Users },
    { id: 'history_logs', label: 'History Management', icon: History},
  ];

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
        } fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-300">
          <div className="flex items-center space-x-7">
          <img 
            src="ic_palayan_no_bg.png" 
            alt="Logo" 
            className="h-11 w-11 object-contain"/>
            <h1 className="text-xl font-bold text-green-700 flex items-center">PalaYan</h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Menu */}
        <nav className="mt-8 px-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const fullPath = `/admin_dashboard/${item.id}`;
            const isActive = location.pathname === fullPath;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors
                  ${
                    isActive
                      ? 'bg-green-100 text-green-700 font-medium hover:bg-green-200'
                      : 'text-black hover:text-green-700 hover:bg-green-100'
                  } focus:outline-none focus:ring-0`}
              >
                <IconComponent className="h-5 w-5 mr-3" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            PalaYan
            <br />
            Version 1.0.0
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
