// components/DiseaseManagement/DiseaseHeader.jsx
import React from 'react';
import { Search, Plus, Shield } from 'lucide-react';

const DiseaseHeader = ({ onAddNew, searchTerm, setSearchTerm }) => {
  return (
    <>
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200 rounded-t-xl mb-6">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-6 space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-green-600 to-emerald-500 rounded-lg">
                <Shield className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Diseases</h1>
                <p className="text-gray-600 text-sm lg:text-base">Manage rice diseases</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 mb-6 lg:mb-8 border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search diseases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm lg:text-base"
            />
          </div>
          <button
            onClick={onAddNew}
            className="w-full md:w-auto bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white px-4 lg:px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 transform hover:scale-105 shadow-lg text-sm lg:text-base font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Disease</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default DiseaseHeader;
