import React from 'react';
import { Edit2, Trash2, Wheat } from 'lucide-react';

const RiceVarietyTable = ({
  varieties,
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
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Variety Name</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Release Name</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Year Release</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Breeding Code</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Maturity Days</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Max Yield</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Plant Height</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Tillers</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Season</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Planting Method</th>
              <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="12" className="px-6 py-12 text-center text-gray-500">
                  Loading rice varieties...
                </td>
              </tr>
            ) : varieties.length === 0 ? (
              <tr>
                <td colSpan="12" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <Wheat className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg">No rice variety found</p>
                  </div>
                </td>
              </tr>
            ) : (
              varieties.map((variety) => (
                <tr key={variety.id} className="hover:bg-gray-50 transition-all">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{variety.varietyName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{variety.releaseName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{variety.yearRelease}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{variety.breedingCode}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{variety.maturityDays}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{variety.maxYield}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{variety.plantHeight}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{variety.tillers}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{variety.location}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{variety.season}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{variety.plantingMethod}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => onEdit(variety)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(variety.id)}
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

export default RiceVarietyTable;
