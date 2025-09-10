// src/components/Layout/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Menu, Settings, LogOut, User, ChevronDown } from 'lucide-react';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const Header = ({ setIsSidebarOpen }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const menuRef = useRef(null); // ref lang sa dropdown
  const buttonRef = useRef(null); // ref sa toggle button

  useEffect(() => {
    const fetchUserData = async () => {
      const userId = localStorage.getItem('admin_token');
      if (userId) {
        const userDoc = await getDoc(doc(db, 'accounts', userId));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      }
    };
    fetchUserData();
  }, []);

  // Close menu kapag nag-click kahit saang parte ng screen maliban sa menu at toggle button
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (fullname) => {
    if (!fullname) return '';
    const names = fullname.split(' ');
    const initials = names.map((n) => n[0].toUpperCase());
    return initials[0] + (initials.length > 1 ? initials[initials.length - 1] : '');
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      localStorage.removeItem('admin_token');
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
      navigate('/admin_login');
    }, 1500);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center px-4 py-4">
        {/* Menu button */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Profile Menu */}
        <div className="flex items-center space-x-4 ml-auto">
          <div className="relative">
            <button
              ref={buttonRef} // ref sa toggle button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-3 text-green-700 hover:text-green-900 p-2 rounded-lg hover:bg-green-100"
            >
              <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {getInitials(userData?.fullname || 'User')}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                {userData ? (
                  <>
                    <p className="text-sm font-medium">{userData.fullname}</p>
                    <p className="text-xs text-gray-500">{userData.role}</p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-gray-400 animate-pulse">Loading...</p>
                )}
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  showProfileMenu ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>

            {showProfileMenu && (
              <div
                ref={menuRef} // ref lang sa dropdown
                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
              >
                <div className="py-2">
                  <button
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profile Settings
                  </button>
                  <button
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    System Settings
                  </button>
                  <hr className="my-2" />
                  <button
                    onClick={() => { setShowLogoutConfirm(true); setShowProfileMenu(false); }}
                    className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 text-center shadow-2xl">
            <h4 className="text-lg font-semibold text-gray-800 mb-5">
              Are you sure you want to logout?
            </h4>

            {isLoggingOut ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin"></div>
                <span className="text-gray-700 font-medium">Logging out...</span>
              </div>
            ) : (
              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
