import React, { useState, useEffect } from 'react';
import DiseaseHeader from './DiseaseHeader';
import AddDiseaseModal from './AddDiseaseModal';
import { addDoc, collection, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Eye, Edit, Trash, X, Calendar } from "lucide-react";

const DiseaseManagement = () => {
  const [diseases, setDiseases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDisease, setEditDisease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successSave, setSuccessSave] = useState(false);
  const [successDelete, setSuccessDelete] = useState(false);
  const [saveAction, setSaveAction] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [viewDisease, setViewDisease] = useState(null);

  const itemsPerPage = 50;

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "rice_local_diseases"),
      snapshot => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDiseases(data);
        setLoading(false);
      },
      error => {
        console.error("Error fetching diseases:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filteredDiseases = diseases.filter(d =>
    (d.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.scientificName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDiseases = filteredDiseases.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredDiseases.length / itemsPerPage);

  const handleAddNew = () => {
    setEditDisease(null);
    setIsModalOpen(true);
  };

  const handleAddOrEditDisease = async (diseaseData, id) => {
    try {
      const dataToSave = {
        name: diseaseData.name || "",
        scientificName: diseaseData.scientificName || "",
        description: diseaseData.description || "",
        cause: diseaseData.cause || "",
        symptoms: diseaseData.symptoms || "",
        treatments: diseaseData.treatments || "",
        mainImageUrl: diseaseData.mainImageUrl || "",
        images: diseaseData.images || [],
      };

      if (id) {
        dataToSave.updatedAt = new Date();
        await updateDoc(doc(db, "rice_local_diseases", id), dataToSave);
        setSaveAction('updated');
      } else {
        dataToSave.createdAt = new Date();
        await addDoc(collection(db, "rice_local_diseases"), dataToSave);
        setSaveAction('added');
      }

      setIsModalOpen(false);
      setEditDisease(null);
      setSuccessSave(true);
      setTimeout(() => setSuccessSave(false), 2000);

    } catch (err) {
      alert(`Failed to save disease: ${err.message}`);
    }
  };

  const handleEdit = (disease) => {
    setEditDisease(disease);
    setIsModalOpen(true);
  };

  const performDelete = async (id) => {
    try {
      setSuccessDelete(true);
      await deleteDoc(doc(db, "rice_local_diseases", id));
      setTimeout(() => setSuccessDelete(false), 2000);
    } catch (err) {
      setSuccessDelete(false);
      alert(`Failed to delete disease: ${err.message}`);
    }
  };

  const openDeleteModal = (disease) => {
    setSelectedDisease({ id: disease.id, name: disease.name || 'Unnamed Disease' });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedDisease) return;
    await performDelete(selectedDisease.id);
    setShowDeleteModal(false);
    setSelectedDisease(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedDisease(null);
  };

  return (
    <div className="p-4 lg:p-6">
      <DiseaseHeader
        onAddNew={handleAddNew}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {loading ? (
        <div className="text-center py-8">Loading diseases...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {paginatedDiseases.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No diseases found. Click "Add New Disease" to get started.
            </div>
          ) : (
            paginatedDiseases.map(disease => (
               <div 
              key={disease.id} 
              className="border rounded-lg p-4 shadow-md bg-white hover:shadow-xl hover:-translate-y-1 transition-transform duration-300 relative"
            >
              {disease.mainImageUrl && (
                <img 
                  src={disease.mainImageUrl} 
                  alt={disease.name} 
                  className="w-full h-40 object-cover rounded mb-3"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <h3 className="font-semibold text-lg">{disease.name || 'Unnamed Disease'}</h3>
              {disease.scientificName && <p className="text-sm italic text-gray-600">{disease.scientificName}</p>}
              {disease.description && <p className="text-gray-600 mt-2 text-sm">{disease.description}</p>}

              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <p><span className="font-medium">Created Date:</span> {disease.createdAt?.toDate ? disease.createdAt.toDate().toLocaleString() : "N/A"}</p>
                <p><span className="font-medium">Last Updated:</span> {disease.updatedAt?.toDate ? disease.updatedAt.toDate().toLocaleString() : "-"}</p>
              </div>

              {/* Clickable icons */}
           <div className="flex justify-center gap-2 mt-3">
            <button
              onClick={() => setViewDisease(disease)}
              className="flex items-center justify-center gap-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition"
            >
              <Eye className="w-4 h-4" /> View
            </button>

            <button
              onClick={() => handleEdit(disease)}
              className="flex items-center justify-center gap-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>

            <button
              onClick={() => openDeleteModal(disease)}
              className="flex items-center justify-center gap-1 bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition"
            >
              <Trash className="w-4 h-4" /> Delete
            </button>
          </div>

            </div>
            ))
          )}
        </div>
      )}

      {isModalOpen && (
        <AddDiseaseModal
          onClose={() => { setIsModalOpen(false); setEditDisease(null); }}
          onSave={handleAddOrEditDisease}
          diseaseData={editDisease}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && selectedDisease && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">Delete Disease</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to delete <span className="font-medium">{selectedDisease.name}</span>? This action cannot be undone.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={cancelDelete}
                    className="px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 text-sm flex items-center gap-2"
                  >
                    <Trash className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Disease Card */}
      {viewDisease && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-start pt-20 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewDisease(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            <h2 className="text-2xl font-bold mb-4">{viewDisease.name || "Unnamed Disease"}</h2>

            {viewDisease.mainImageUrl && (
              <img
                src={viewDisease.mainImageUrl}
                alt={viewDisease.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}

            <div className="space-y-3 text-gray-700">
              {viewDisease.scientificName && <p><strong>Scientific Name:</strong> {viewDisease.scientificName}</p>}
              {viewDisease.description && <p><strong>Description:</strong> {viewDisease.description}</p>}
              {viewDisease.cause && <p><strong>Cause:</strong> {viewDisease.cause}</p>}
              {viewDisease.symptoms && <p><strong>Symptoms:</strong> {viewDisease.symptoms}</p>}
              {viewDisease.treatments && <p><strong>Treatments:</strong> {viewDisease.treatments}</p>}

              <div className="flex flex-col text-gray-500 text-sm mt-2 space-y-1">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4"/> Created: {viewDisease.createdAt?.toDate ? viewDisease.createdAt.toDate().toLocaleString() : "-"}</div>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4"/> Updated: {viewDisease.updatedAt?.toDate ? viewDisease.updatedAt.toDate().toLocaleString() : "-"}</div>
              </div>

              {viewDisease.images && viewDisease.images.length > 0 && (
                <div className="mt-3">
                  <strong>Images:</strong>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {viewDisease.images.map((img, idx) => (
                      <img key={idx} src={img} alt={`img-${idx}`} className="w-full h-24 object-cover rounded" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiseaseManagement;
