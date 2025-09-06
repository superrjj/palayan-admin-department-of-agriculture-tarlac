// components/PestManagement/PestManagement.jsx
import React, { useState } from 'react';
import { Plus, Search, Eye, Edit, Trash2 } from 'lucide-react';

const PestManagement = ({ mockData }) => {
  const [pests] = useState(mockData.pests);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredPests = pests.filter(pest =>
    pest.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'High': return 'text-red-600 bg-red-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Pest Management</h1>
        <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors">
          <Plus className="h-4 w-4 mr-2" />
          Add New Pest
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search pests..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPests.map((pest) => (
            <div key={pest.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{pest.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(pest.severity)}`}>
                  {pest.severity}
                </span>
              </div>
              
              <div className="mb-4 space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-800">Scientific Name:</span> 
                  <span className="italic ml-1">{pest.scientific}</span>
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-800">Symptoms:</span> 
                  <span className="ml-1">{pest.symptoms}</span>
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-800">Cause:</span> 
                  <span className="ml-1">{pest.cause}</span>
                </p>
              </div>
              
              <div className="flex space-x-2">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center transition-colors">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </button>
                <button className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center transition-colors">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center transition-colors">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredPests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No pests found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PestManagement;