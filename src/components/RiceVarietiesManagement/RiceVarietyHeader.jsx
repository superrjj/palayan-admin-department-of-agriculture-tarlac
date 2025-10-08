import React, { useState } from 'react';
import { Search, Plus, Wheat, ArrowUpDown, Filter, ChevronDown } from 'lucide-react';
import { useRiceEnums } from '../../hooks/useRiceEnums';

const RiceVarietyHeader = ({
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

  // Get enums from your file maintenance
  const { seasons, plantingMethods, environments, yearReleases } = useRiceEnums();
  const enumsLoading = !seasons.length && !plantingMethods.length && !environments.length && !yearReleases.length;

  const setYearRange = (key) => setFilters(prev => ({ ...prev, yearRange: prev.yearRange === key ? '' : key }));
  const setSingle = (key, value) => setFilters(prev => ({ ...prev, [key]: prev[key] === value ? '' : value }));
  const resetFilters = () => setFilters({
    yearRange: '',
    season: '',
    plantingMethod: '',
    environment: '',
    location: '',
    recommendedInTarlac: '',
  });

  const getSortLabel = (value) => {
    switch(value) {
      case 'name-asc': return 'A → Z (Variety Name)';
      case 'name-desc': return 'Z → A (Variety Name)';
      case 'year-desc': return 'Newest First (Year Released)';
      case 'year-asc': return 'Oldest First (Year Released)';
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search e.g variety name, year release, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm lg:text-base"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Sort Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSort(v => !v)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
              >
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                <span>{getSortLabel(sortBy)}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {/* Sort Dropdown Menu */}
              {showSort && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={() => { setSortBy('name-asc'); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${sortBy === 'name-asc' ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}
                    >
                      A → Z (Variety Name)
                    </button>
                    <button
                      onClick={() => { setSortBy('name-desc'); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${sortBy === 'name-desc' ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}
                    >
                      Z → A (Variety Name)
                    </button>
                    <button
                      onClick={() => { setSortBy('year-desc'); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${sortBy === 'year-desc' ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}
                    >
                      Newest First (Year Released)
                    </button>
                    <button
                      onClick={() => { setSortBy('year-asc'); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${sortBy === 'year-asc' ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}
                    >
                      Oldest First (Year Released)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                showFilters 
                  ? 'bg-green-600 text-white border border-green-600' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
            </button>

            {/* Add New Button */}
            <button
              onClick={onAddNew}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 transform hover:scale-105 shadow-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add New</span>
            </button>
          </div>
        </div>

        {/* Filters Panel - Shows when toggled */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Year Released - Individual Years */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">🗓️ Year Released</label>
                <select
                  value={filters.yearRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, yearRange: e.target.value }))}
                  disabled={enumsLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">{enumsLoading ? 'Loading years…' : 'All Years'}</option>
                  {yearReleases.map(year => (
                    <option key={year} value={String(year)}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Season */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">🌤️ Season</label>
                <select
                  value={filters.season}
                  onChange={(e) => setFilters(prev => ({ ...prev, season: e.target.value }))}
                  disabled={enumsLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">{enumsLoading ? 'Loading seasons…' : 'All Seasons'}</option>
                  {seasons.map(season => (
                    <option key={season} value={season}>{season}</option>
                  ))}
                </select>
              </div>

              {/* Planting Method */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">🌱 Planting Method</label>
                <select
                  value={filters.plantingMethod}
                  onChange={(e) => setFilters(prev => ({ ...prev, plantingMethod: e.target.value }))}
                  disabled={enumsLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">{enumsLoading ? 'Loading methods…' : 'All Methods'}</option>
                  {plantingMethods.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>

              {/* Environment */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">🌍 Environment</label>
                <select
                  value={filters.environment}
                  onChange={(e) => setFilters(prev => ({ ...prev, environment: e.target.value }))}
                  disabled={enumsLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">{enumsLoading ? 'Loading environments…' : 'All Environments'}</option>
                  {environments.map(env => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">📍 Location</label>
                <input
                  type="text"
                  value={filters.location || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Recommended + Reset */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-2">📍 Recommendation</label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.recommendedInTarlac === 'yes'}
                      onChange={(e) => setFilters(prev => ({ ...prev, recommendedInTarlac: e.target.checked ? 'yes' : '' }))}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span>Recommended in Tarlac</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 text-sm font-medium"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RiceVarietyHeader;