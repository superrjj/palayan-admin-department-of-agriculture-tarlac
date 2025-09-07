import React from 'react';
import { Edit2, Trash2, UserCheck, Shield, Users } from 'lucide-react';

const AdminTable = ({ 
  admins, 
  loading, 
  onEdit, 
  onDelete, 
  currentPage, 
  totalPages, 
  setCurrentPage 
}) => {

  const getRoleIcon = (role) => role === 'super admin'
    ? <Shield className="w-4 h-4 text-red-500" />
    : <UserCheck className="w-4 h-4 text-blue-500" />;

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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Full Name</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Created Date</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
              <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                  Loading admins...
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <Users className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg">No admins found</p>
                  </div>
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50 transition-all">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{admin.fullname}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{admin.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{admin.username}</td>
                  <td className="px-6 py-4">{getRoleBadge(admin.role)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        (admin.status?.toLowerCase() === 'active' || admin.status === true)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {(admin.status?.toLowerCase() === 'active' || admin.status === true)
                        ? 'Active'
                        : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {admin.createdAt?.toDate
                      ? admin.createdAt.toDate().toLocaleString()
                      : admin.createdAt
                      ? new Date(admin.createdAt).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {admin.lastLogin?.toDate
                      ? admin.lastLogin.toDate().toLocaleString()
                      : admin.lastLogin
                      ? new Date(admin.lastLogin).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => onEdit(admin)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(admin.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
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
        <div className="bg-gray-50 px-4 lg:px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminTable;
