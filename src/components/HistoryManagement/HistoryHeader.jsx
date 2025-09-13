import React from 'react';
import { Search, Filter, Calendar, User, Database, RefreshCw, Download, History } from 'lucide-react';

const HistoryHeader = ({ 
  searchTerm, 
  setSearchTerm, 
  selectedAction, 
  setSelectedAction,
  selectedCollection, 
  setSelectedCollection,
  selectedUser, 
  setSelectedUser,
  dateRange, 
  setDateRange,
  onRefresh,
  onExport,
  isLoading,
  totalLogs,
  filteredLogs,
  users = [],
  collections = [],
  actions = []
}) => {
  
  const formatCollectionName = (collection) => {
    switch (collection) {
      case 'accounts': return 'User Accounts';
      case 'rice_local_diseases': return 'Rice Diseases';
      case 'rice_local_pests': return 'Rice Pests';
      case 'rice_local_varieties': return 'Rice Varieties';
      default: return collection;
    }
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200 rounded-t-xl mb-6">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-6 space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-lg">
                <History className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">History</h1>
                <p className="text-gray-600 text-sm lg:text-base">View system activity history</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 mb-6 lg:mb-8 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="ALL">All Actions</option>
              {actions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          {/* Collection Filter */}
          <div>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="ALL">All Collections</option>
              {collections.map(collection => (
                <option key={collection} value={collection}>
                  {formatCollectionName(collection)}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="ALL">All Users</option>
              {users.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          {/* Date Filter & Actions */}
          <div className="flex gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">Last Week</option>
              <option value="MONTH">Last Month</option>
            </select>
            
            <div className="flex gap-2">
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={onExport}
                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                title="Export CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {filteredLogs || 0} of {totalLogs || 0} history logs
          </p>
        </div>
      </div>
    </>
  );
};

export default HistoryHeader;