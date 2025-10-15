import React, { useState } from "react";
import {
  Eye,
  X,
  Calendar,
  MapPin,
  BarChart2,
  Edit2,
  Trash2,
  Layers,
  Wheat,
  CheckCircle2,
  Code,
  XCircle,
  CalendarClock,
  Split, 
  Sprout, Crown, Ruler, Earth, Sun
} from "lucide-react";

const YesNo = ({ v }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
      v ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    }`}
    title={v ? "Recommended in Tarlac" : "Not recommended in Tarlac"}
  >
    {v ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
    {v ? "Yes" : "No"}
  </span>
);

// Green pill styling for values (applies to all rows in the detail card)
const DataPill = ({ value, suffix = "" }) => {
  const has = value !== undefined && value !== null && String(value).trim() !== "";
  return (
    <span
      className={`ml-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
        has ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {has ? `${Array.isArray(value) ? value.join(", ") : value}${suffix}` : "—"}
    </span>
  );
};

const RiceVarietyTable = ({
  varieties,
  loading,
  onEdit,
  onDelete,
  currentPage,
  totalPages,
  setCurrentPage,
  focusId,
  focusedRef,
}) => {
  const [selectedVariety, setSelectedVariety] = useState(null);

  return (
    <div className="relative">
      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                  Variety Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                  Release Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                  Breeding Code
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                  Breeder Origin
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                  Year Release
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                  Location
                </th>
                {/* NEW: Recommended in Tarlac column */}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                  Recommended in Tarlac
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    Loading rice varieties...
                  </td>
                </tr>
              ) : varieties.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Wheat className="w-16 h-16 text-gray-300 mb-4" />
                      <p className="text-gray-500 text-lg">No rice variety found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                varieties.map((variety) => (
                  <tr
                    key={variety.id}
                    ref={focusId === variety.id ? focusedRef : null}
                    tabIndex={focusId === variety.id ? 0 : -1}
                    className={`transition-all ${focusId === variety.id ? 'ring-0' : ''} hover:bg-gray-50`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {variety.varietyName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{variety.releaseName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{variety.breedingCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{variety.breederOrigin}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{variety.yearRelease}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{variety.location}</td>
                    {/* NEW: Yes/No badge */}
                    <td className="px-6 py-4 text-sm">
                      <YesNo v={!!variety.recommendedInTarlac} />
                    </td>
                    <td className="px-6 py-4 flex justify-center space-x-2">
                      <button
                        onClick={() => setSelectedVariety(variety)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(variety)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(variety.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                        title="Delete"
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

      {/* Pop-up Card */}
      {selectedVariety && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-t-2xl p-6 flex justify-between items-center text-white">
              <div>
                <h2 className="text-2xl font-bold">{selectedVariety.varietyName}</h2>
                <p className="text-sm text-white/90">{selectedVariety.releaseName}</p>
              </div>
              <button
                onClick={() => setSelectedVariety(null)}
                className="p-2 hover:bg-white/20 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content with icons (all values use green data pills) */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">
                  <span className="text-gray-800">Year Release:</span>
                </span>
                <DataPill value={selectedVariety.yearRelease} />
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">
                  <span  className="text-gray-800">Location:</span >
                </span>
                <DataPill value={selectedVariety.location} />
              </div>

              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">
                  <span  className="text-gray-800">Average Yield:</span>
                </span>
                <DataPill value={selectedVariety.averageYield} suffix=" t/ha" />
              </div>

              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">
                  <span className="text-gray-800">Max Yield:</span>
                </span>
                <DataPill value={selectedVariety.maxYield} suffix=" t/ha" />
              </div>

              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">
                  <span className="text-gray-800">Breeding Code:</span>
                </span>
                <DataPill value={selectedVariety.breedingCode} />
              </div>


              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">
                  <span className="text-gray-800">Breeder Origin:</span>
                </span>
                <DataPill value={selectedVariety.breederOrigin} />
              </div>

              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">
                  <span className="text-gray-800">Maturity Days:</span>
                </span>
                <DataPill value={selectedVariety.maturityDays} />
              </div>

              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">
                  <span className="text-gray-800">Plant Height:</span>
                </span>
                <DataPill value={selectedVariety.plantHeight} />
              </div>

              <div className="flex items-center gap-2">
                <Split className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">
                  <span className="text-gray-800">Tillers:</span>
                </span>
                <DataPill value={selectedVariety.tillers} />
              </div>

              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">
                  <span className="text-gray-800">Season:</span>
                </span>
                <DataPill
                  value={
                    Array.isArray(selectedVariety.season)
                      ? selectedVariety.season
                      : selectedVariety.season || ""
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <Sprout className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">
                  <span className="text-gray-800">Planting Method:</span>
                </span>
                <DataPill value={selectedVariety.plantingMethod} />
              </div>

              <div className="flex items-center gap-2 sm:col-span-2">
                <Earth className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">
                  <span className="text-gray-800">Environment:</span>
                </span>
                <DataPill
                  value={
                    Array.isArray(selectedVariety.environment)
                      ? selectedVariety.environment
                      : selectedVariety.environment || ""
                  }
                />
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">Recommended in Tarlac:</span>
                <YesNo v={!!selectedVariety.recommendedInTarlac} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiceVarietyTable;