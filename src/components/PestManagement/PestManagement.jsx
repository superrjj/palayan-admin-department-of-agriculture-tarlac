// components/PestManagement/PestManagement.jsx
import React, { useState, useEffect } from 'react';
import PestHeader from './PestHeader';
import AddPestModal from './AddPestModal';
import { addDoc, collection, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/config";


const PestManagement = () => {
  const [pests, setPests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // eslint-disable-next-line no-unused-vars
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPest, setEditPest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successSave, setSuccessSave] = useState(false);
  const [successDelete, setSuccessDelete] = useState(false);
  const [saveAction, setSaveAction] = useState('');
  const itemsPerPage = 50;

  // states for custom delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPest, setSelectedPest] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "rice_local_pests"),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPests(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching pests:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filteredPests = pests.filter(p =>
    (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.scientificName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPests = filteredPests.slice(startIndex, startIndex + itemsPerPage);

  // eslint-disable-next-line no-unused-vars
  const totalPages = Math.ceil(filteredPests.length / itemsPerPage);

  const handleAddNew = () => {
    setEditPest(null);
    setIsModalOpen(true);
  };

  const handleAddOrEditPest = async (pestData, id) => {
    try {
      const dataToSave = {
        name: pestData.name || "",
        scientificName: pestData.scientificName || "",
        description: pestData.description || "",
        cause: pestData.cause || "",
        symptoms: pestData.symptoms || "",
        treatments: pestData.treatments || "",
        mainImageUrl: pestData.mainImageUrl || "",
        images: pestData.images || [],
      };

      if (id) {
        dataToSave.updatedAt = new Date();
        await updateDoc(doc(db, "rice_local_pests", id), dataToSave);
        setSaveAction('updated');

      } else {
        dataToSave.createdAt = new Date();
        await addDoc(collection(db, "rice_local_pests"), dataToSave);
        setSaveAction('added');

      }

      setIsModalOpen(false);
      setEditPest(null);
      setSuccessSave(true);
      setTimeout(() => setSuccessSave(false), 2000);

    } catch (err) {
      alert(`Failed to save pest: ${err.message}`);
    }
  };

  const handleEdit = (pest) => {
    setEditPest(pest);
    setIsModalOpen(true);
  };

  const performDelete = async (id) => {
    try {


      setSuccessDelete(true);
      await deleteDoc(doc(db, "rice_local_pests", id));


      setTimeout(() => setSuccessDelete(false), 2000);
    } catch (err) {
      setSuccessDelete(false);
      alert(`Failed to delete pest: ${err.message}`);
    }
  };

  const openDeleteModal = (pest) => {
    setSelectedPest({ id: pest.id, name: pest.name || 'Unnamed Pest' });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedPest) return;
    await performDelete(selectedPest.id);
    setShowDeleteModal(false);
    setSelectedPest(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedPest(null);
  };

  return (
    <div className="p-4 lg:p-6">
      <PestHeader
        onAddNew={handleAddNew}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {loading ? (
        <div className="text-center py-8">Loading pests...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {paginatedPests.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No pests found. Click "Add New Pest" to get started.
            </div>
          ) : (
            paginatedPests.map(pest => (
              <div key={pest.id} className="border rounded-lg p-4 shadow hover:shadow-md transition">
                {pest.mainImageUrl && (
                  <img 
                    src={pest.mainImageUrl} 
                    alt={pest.name} 
                    className="w-full h-40 object-cover rounded mb-3"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <h3 className="font-semibold text-lg">{pest.name || 'Unnamed Pest'}</h3>
                {pest.scientificName && (
                  <p className="text-sm italic text-gray-600">{pest.scientificName}</p>
                )}
                {pest.description && (
                  <p className="text-gray-600 mt-2 text-sm">{pest.description}</p>
                )}

                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <p>
                    <span className="font-medium">Created Date:</span>{" "}
                    {pest.createdAt?.toDate
                      ? pest.createdAt.toDate().toLocaleString()
                      : "N/A"}
                  </p>
                  <p>
                    <span className="font-medium">Last Updated:</span>{" "}
                    {pest.updatedAt?.toDate
                      ? pest.updatedAt.toDate().toLocaleString()
                      : "-"}
                  </p>
                </div>

                <div className="flex justify-between mt-3 space-x-2">
                  <button 
                    className="flex-1 bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition" 
                    onClick={() => handleEdit(pest)}
                  >
                    Edit
                  </button>
                  <button 
                    className="flex-1 bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition" 
                    onClick={() => openDeleteModal(pest)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isModalOpen && (
        <AddPestModal
          onClose={() => { 
            setIsModalOpen(false); 
            setEditPest(null); 
          }}
          onSave={handleAddOrEditPest}
          pestData={editPest}
        />
      )}

      {successSave && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-green-600">
              Pest {saveAction} successfully!
            </h3>
          </div>
        </div>
      )}

      {successDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-600">Pest deleted successfully!</h3>
          </div>
        </div>
      )}

      {showDeleteModal && selectedPest && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">Delete Pest</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to delete <span className="font-medium">{selectedPest.name}</span>? This action cannot be undone.
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PestManagement;
