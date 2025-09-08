import React, { useState } from "react";
import { Eye, X, Calendar, MapPin, BarChart2, Edit2, Trash2, Layers } from "lucide-react";

const RiceVarietyTable = ({ varieties, loading, onEdit, onDelete, currentPage, totalPages, setCurrentPage }) => {
  const [selectedVariety, setSelectedVariety] = useState(null);

  return (
    <div className="relative">
      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Variety Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Release Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Breeding Code
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Year Release
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Location
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    Loading rice varieties...
                  </td>
                </tr>
              ) : varieties.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Eye className="w-16 h-16 text-gray-300 mb-4" />
                      <p className="text-gray-500 text-lg">No rice variety found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                varieties.map((variety) => (
                  <tr key={variety.id} className="hover:bg-gray-50 transition-all">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{variety.varietyName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{variety.releaseName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{variety.breedingCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{variety.yearRelease}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{variety.location}</td>
                    <td className="px-6 py-4 flex justify-center space-x-2">
                      <button
                        onClick={() => setSelectedVariety(variety)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Creative Pop-up Card */}
      {selectedVariety && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-t-2xl p-6 flex justify-between items-center text-white">
              <h2 className="text-2xl font-bold">{selectedVariety.varietyName}</h2>
              <button
                onClick={() => setSelectedVariety(null)}
                className="p-2 hover:bg-white/20 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content with icons */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <span><strong>Year Release:</strong> {selectedVariety.yearRelease}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-600" />
                <span><strong>Location:</strong> {selectedVariety.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-green-600" />
                <span><strong>Max Yield:</strong> {selectedVariety.maxYield}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-green-600" />
                <span><strong>Release Name:</strong> {selectedVariety.releaseName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-green-600" />
                <span><strong>Breeding Code:</strong> {selectedVariety.breedingCode}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-green-600" />
                <span><strong>Maturity Days:</strong> {selectedVariety.maturityDays}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-green-600" />
                <span><strong>Plant Height:</strong> {selectedVariety.plantHeight}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-green-600" />
                <span><strong>Tillers:</strong> {selectedVariety.tillers}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-green-600" />
                <span><strong>Season:</strong> {selectedVariety.season}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-green-600" />
                <span><strong>Planting Method:</strong> {selectedVariety.plantingMethod}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-green-600" />
                <span><strong>Environment:</strong> {selectedVariety.environment}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiceVarietyTable;
