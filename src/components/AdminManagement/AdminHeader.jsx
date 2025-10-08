// src/components/AdminManagement/AdminHeader.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, ArrowUpDown, Filter, ChevronDown } from 'lucide-react';

const AdminHeader = ({
  onAddNew,
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  filters,
  setFilters,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const sortRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSort(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetFilters = () => setFilters({
    role: '',
    status: '',
    createdRange: '',
    lastLoginRange: '',
  });

  const getSortLabel = (value) => {
    switch(value) {
      case 'name-asc': return 'Sort by Ascending';
      case 'name-desc': return ' Sort by Descending';
      case 'recent': return 'Recently Added';
      case 'oldest': return 'Oldest Added';
      default: return 'Sort By';
    }
  };

  return (
    <>
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 mb-6 lg:mb-8 border border-gray-100">
        {/* Search and Actions Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search e.g name, email, username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm lg:text-base"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Sort Dropdown Button */}
            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => setShowSort(v => !v)}
                className="px-10 py-3 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
                aria-haspopup="listbox"
                aria-expanded={showSort}
              >
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                <span>{getSortLabel(sortBy)}</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showSort ? 'rotate-180' : 'rotate-0'}`}
                />
              </button>

              {/* Sort Dropdown Menu (animated) */}
              <div
                className={`absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10 origin-top transition-all duration-200
                  ${showSort ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
                role="listbox"
              >
                <div className="py-1">
                  <button
                    onClick={() => { setSortBy('name-asc'); setShowSort(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${sortBy === 'name-asc' ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}
                    role="option"
                    aria-selected={sortBy === 'name-asc'}
                  >
                    Sort by Ascending
                  </button>
                  <button
                    onClick={() => { setSortBy('name-desc'); setShowSort(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${sortBy === 'name-desc' ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}
                    role="option"
                    aria-selected={sortBy === 'name-desc'}
                  >
                    Sort by Descending
                  </button>
                  <button
                    onClick={() => { setSortBy('recent'); setShowSort(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${sortBy === 'recent' ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}
                    role="option"
                    aria-selected={sortBy === 'recent'}
                  >
                    Recently Added
                  </button>
                  <button
                    onClick={() => { setSortBy('oldest'); setShowSort(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${sortBy === 'oldest' ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}
                    role="option"
                    aria-selected={sortBy === 'oldest'}
                  >
                    Oldest Added
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                showFilters 
                  ? 'bg-green-600 text-white border border-green-600' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
              aria-expanded={showFilters}
              aria-controls="accounts-filters-panel"
            >
              <Filter className="w-4 h-4" />
              <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : 'rotate-0'}`} />
            </button>

            {/* Add New Button */}
            <button
              onClick={onAddNew}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 transform hover:scale-105 shadow-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Account</span>
            </button>
          </div>
        </div>

        {/* Filters Panel - Shows when toggled */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Role</label>
                <select
                  value={filters.role || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Roles</option>
                  <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="restricted">Restricted</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Date Created */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Date Created</label>
                <select
                  value={filters.createdRange || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, createdRange: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Dates</option>
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="last_7">Last 7 Days</option>
                  <option value="last_30">Last 30 Days</option>
                  <option value="this_year">This Year</option>
                </select>
              </div>

              {/* Last Login */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Last Login</label>
                <select
                  value={filters.lastLoginRange || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, lastLoginRange: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Any time</option>
                  <option value="last_7">Last 7 Days</option>
                  <option value="last_14">Last 14 Days</option>
                  <option value="last_30">Last 30 Days</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="this_year">This Year</option>
                  <option value="never">Never logged in</option>
                </select>
              </div>
            </div>

            {/* Reset */}
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 text-sm font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminHeader;