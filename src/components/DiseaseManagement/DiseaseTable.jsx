// components/DiseaseManagement/DiseaseTable.jsx
import React from 'react';
import { Edit2, Trash2, Shield } from 'lucide-react';

const DiseaseTable = ({ 
  diseases, 
  loading, 
  onEdit, 
  onDelete, 
  currentPage, 
  totalPages, 
  setCurrentPage 
}) => {

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Disease Name</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Scientific Name</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Cause</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Symptoms</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Treatments</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Created Date</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Updated Date</th>
              <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                  Loading diseases...
                </td>
              </tr>
            ) : diseases.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                  No diseases found
                </td>
              </tr>
            ) : (
              diseases.map((disease) => (
                <tr key={disease.id} className="hover:bg-gray-50 transition-all">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{disease.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{disease.scientificName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{disease.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{disease.cause}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{disease.symptoms}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{disease.treatments}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {disease.createdAt?.toDate
                      ? disease.createdAt.toDate().toLocaleString()
                      : disease.createdAt
                      ? new Date(disease.createdAt).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {disease.updatedAt?.toDate
                      ? disease.updatedAt.toDate().toLocaleString()
                      : disease.updatedAt
                      ? new Date(disease.updatedAt).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => onEdit(disease)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(disease.id)}
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

export default DiseaseTable;
