// components/DiseaseManagement/DiseaseManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import DiseaseHeader from '../DiseaseManagement/DiseaseHeader';
import DiseaseTable from '../DiseaseManagement/DiseaseTable';
import AddDiseaseModal from '../DiseaseManagement/AddDiseaseModal'; 
import { addDoc, collection, onSnapshot, updateDoc, doc , deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

const DiseaseManagement = () => {
  const [diseases, setDiseases] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDisease, setEditDisease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successDelete, setSuccessDelete] = useState(false);
  const itemsPerPage = 50;

  // Realtime fetch diseases from Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "diseases"),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDiseases(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching diseases:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Filtering
  const filteredDiseases = diseases.filter(
    (d) =>
      (d.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDiseases = filteredDiseases.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredDiseases.length / itemsPerPage);

  // Actions
  const handleAddNew = () => {
    setEditDisease(null);
    setIsModalOpen(true);
  };

  const handleAddOrEditDisease = async (diseaseData, id) => {
    try {
      if (id) {
        await updateDoc(doc(db, "diseases", id), {
          ...diseaseData,
          updatedAt: new Date(),
        });
      } else {
        await addDoc(collection(db, "diseases"), {
          ...diseaseData,
          createdAt: new Date(),
        });
      }
      setIsModalOpen(false);
      setEditDisease(null);
    } catch (error) {
      console.error("Error saving disease:", error);
    }
  };

  const handleEdit = (disease) => {
    setEditDisease(disease);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      // Show success animation first
      setSuccessDelete(true);

      setTimeout(async () => {
        // Delete from Firestore
        await deleteDoc(doc(db, "diseases", id));

        // Update UI
        setDiseases((prev) => prev.filter((d) => d.id !== id));

        // Hide animation
        setSuccessDelete(false);

        console.log(`Disease ${id} has been deleted.`);
      }, 1000); // 1 second delay para makita dialog first
    } catch (error) {
      console.error("Failed to delete disease:", error);
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <DiseaseHeader
        onAddNew={handleAddNew}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <DiseaseTable
        diseases={paginatedDiseases}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        startIndex={startIndex}
        itemsPerPage={itemsPerPage}
        filteredDiseases={filteredDiseases}
      />

      {isModalOpen && (
        <AddDiseaseModal
          onClose={() => { setIsModalOpen(false); setEditDisease(null); }}
          onSave={handleAddOrEditDisease}
          diseaseData={editDisease}
        />
      )}

      {/* Success Delete Animation */}
      {successDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center animate-fadeIn scale-up">
            <svg className="w-20 h-20 text-green-500 mb-4 animate-bounce" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-lg font-semibold text-green-600">Disease deleted successfully!</h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiseaseManagement;
