// components/Layout/Header.jsx
import React, { useState } from 'react';
import { Menu, Bell, Settings, LogOut, User, ChevronDown } from 'lucide-react';

const Header = ({ setIsSidebarOpen }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications] = useState(28); // Mock notification count

  return (
   <header className="bg-white shadow-sm border-b border-gray-200">
  <div className="flex items-center px-4 py-4">
    {/* LEFT: Menu button */}
    <button
      onClick={() => setIsSidebarOpen(true)}
      className="lg:hidden text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
    >
      <Menu className="h-6 w-6" />
    </button>

    {/* RIGHT: Notifications + Profile */}
    <div className="flex items-center space-x-4 ml-auto">
      {/* Notifications */}
      <div className="relative">
        <button className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 relative">
          <Bell className="h-5 w-5" />
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notifications}
            </span>
          )}
        </button>
      </div>

     {/* Profile Menu */}
        <div className="relative">
        <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-3 text-gray-700 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
        >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">J</span>
            </div>
            <div className="hidden sm:block text-left">
            <p className="text-sm font-medium">John Harvee Quirido</p>
            <p className="text-xs text-gray-500">Super Admin</p>
            </div>
            {/* Dropdown arrow */}
            <ChevronDown 
            className={`h-4 w-4 transition-transform duration-200 ${
                showProfileMenu ? 'rotate-180' : 'rotate-0'
            }`} 
            />
        </button>

        {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="py-2">
                <button className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full">
                <User className="h-4 w-4 mr-3" />
                Profile Settings
                </button>
                <button className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full">
                <Settings className="h-4 w-4 mr-3" />
                System Settings
                </button>
                <hr className="my-2" />
                <button className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
                <LogOut className="h-4 w-4 mr-3" />
                Logout
                </button>
            </div>
            </div>
        )}
        </div>

    </div>
  </div>
</header>


  );
};

export default Header;