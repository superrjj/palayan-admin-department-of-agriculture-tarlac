import React, { useState } from 'react';
import { Edit2, Trash2, Eye, EyeOff, UserCheck, Shield, Users } from 'lucide-react';

const AdminTable = ({ 
  admins, 
  loading, 
  onEdit, 
  onDelete, 
  currentPage, 
  totalPages, 
  setCurrentPage, 
  startIndex, 
  itemsPerPage, 
  filteredAdmins 
}) => {
  const [showPasswords, setShowPasswords] = useState({});

  const togglePasswordVisibility = (adminId) => {
    setShowPasswords(prev => ({
      ...prev,
      [adminId]: !prev[adminId]
    }));
  };

  const getRoleIcon = (role) => {
    return role === 'super admin' 
      ? <Shield className="w-4 h-4 text-red-500" /> 
      : <UserCheck className="w-4 h-4 text-blue-500" />;
  };

  const getRoleBadge = (role = 'admin') => {
    const baseClasses = "px-2 lg:px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1";
    const roleClasses = role === 'super admin' 
      ? "bg-red-100 text-red-800 border border-red-200" 
      : "bg-blue-100 text-blue-800 border border-blue-200";
    
    return (
      <span className={`${baseClasses} ${roleClasses}`}>
        {getRoleIcon(role)}
        <span className="hidden sm:inline">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Info</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credentials</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Security Questions</th>
              <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500">Loading admins...</p>
                  </div>
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <Users className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg">No admins found</p>
                    <p className="text-gray-400 text-sm">Add your first admin to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50 transition-all duration-200">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {admin.fullname?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{admin.fullname}</p>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-900 font-medium">{admin.username}</p>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500 font-mono">
                          {showPasswords[admin.id] ? admin.password : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(admin.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPasswords[admin.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(admin.role)}</td>
                  <td className="px-6 py-4">
                    <div className="space-y-2 max-w-xs">
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Q1:</span> {admin.securityQuestion1}
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Q2:</span> {admin.securityQuestion2}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => onEdit(admin)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 transform hover:scale-110"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(admin.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 transform hover:scale-110"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-gray-50 px-4 lg:px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex space-x-1 sm:space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Previous
              </button>
              <div className="hidden sm:flex space-x-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                      currentPage === i + 1
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="sm:hidden flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50">
                {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTable;
