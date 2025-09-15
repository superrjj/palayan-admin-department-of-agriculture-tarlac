import React, { useState, useEffect } from "react";
import { useRole } from "../../contexts/RoleContext";
import { 
  Upload, 
  Download, 
  FileText, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  FolderOpen,
  File,
  Archive
} from "lucide-react";

const FileMaintenance = () => {
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const { hasPermission } = useRole();

  // Mock data - replace with actual API calls
  useEffect(() => {
    const mockFiles = [
      {
        id: 1,
        name: "rice_varieties_backup.json",
        type: "json",
        size: "2.5 MB",
        uploadDate: "2025-01-15",
        status: "active"
      },
      {
        id: 2,
        name: "pest_data_export.csv",
        type: "csv",
        size: "1.8 MB",
        uploadDate: "2025-01-14",
        status: "archived"
      },
      {
        id: 3,
        name: "disease_reports.pdf",
        type: "pdf",
        size: "3.2 MB",
        uploadDate: "2025-01-13",
        status: "active"
      },
      {
        id: 4,
        name: "system_logs.txt",
        type: "txt",
        size: "850 KB",
        uploadDate: "2025-01-12",
        status: "active"
      }
    ];
    setFiles(mockFiles);
  }, []);

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || file.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleFileSelect = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map(file => file.id));
    }
  };

  const handleDelete = (fileId) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
    setSelectedFiles(prev => prev.filter(id => id !== fileId));
  };

  const handleBulkDelete = () => {
    setFiles(prev => prev.filter(file => !selectedFiles.includes(file.id)));
    setSelectedFiles([]);
  };

  const handleDownload = (file) => {
    // Mock download functionality
    console.log(`Downloading ${file.name}`);
    // Implement actual download logic here
  };

  const handleUpload = () => {
    // Mock upload functionality
    console.log("Uploading files:", uploadFiles);
    setShowUploadModal(false);
    setUploadFiles([]);
    // Implement actual upload logic here
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'csv': return <FileText className="w-5 h-5 text-green-500" />;
      case 'json': return <FileText className="w-5 h-5 text-yellow-500" />;
      case 'txt': return <FileText className="w-5 h-5 text-gray-500" />;
      default: return <File className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'archived': return <Archive className="w-4 h-4 text-yellow-500" />;
      case 'deleted': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">File Maintenance</h1>
          <p className="text-gray-600">Manage system files, backups, and data exports</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Files</span>
          </button>
          <button
            onClick={() => setIsLoading(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="all">All Types</option>
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="pdf">PDF</option>
          <option value="txt">TXT</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedFiles.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedFiles.length} file(s) selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkDelete}
                className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Files Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Upload Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFiles.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(file.id)}
                      onChange={() => handleFileSelect(file.id)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getFileIcon(file.type)}
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {file.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {file.size}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {file.uploadDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(file.status)}
                      <span className="ml-1 text-sm text-gray-900 capitalize">
                        {file.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleDownload(file)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => console.log(`View ${file.name}`)}
                      className="text-green-600 hover:text-green-900"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Upload Files</h3>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Drag and drop files here or click to browse</p>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setUploadFiles(Array.from(e.target.files))}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="mt-2 inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                >
                  Choose Files
                </label>
              </div>
              {uploadFiles.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Selected files:</p>
                  <ul className="text-sm text-gray-600">
                    {uploadFiles.map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredFiles.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
          <p className="text-gray-500">
            {searchTerm || filterType !== "all" 
              ? "Try adjusting your search or filter criteria"
              : "Upload some files to get started"
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default FileMaintenance;
