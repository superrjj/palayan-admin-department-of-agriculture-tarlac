import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, ArrowUpDown, ChevronDown } from 'lucide-react';

const PestHeader = ({
  onAddNew,
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
}) => {
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search e.g pest name, scientific name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm lg:text-base"
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
  

            {/* Add New Button */}
            <button
              onClick={onAddNew}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 transform hover:scale-105 shadow-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Pest</span>
            </button>
          </div>
        </div>

      </div>
    </>
  );
};

export default PestHeader;