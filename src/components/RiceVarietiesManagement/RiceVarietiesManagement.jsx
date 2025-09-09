import React, { useState, useEffect} from 'react';
import RiceVarietyHeader from '../RiceVarietiesManagement/RiceVarietyHeader';
import RiceVarietyTable from '../RiceVarietiesManagement/RiceVarietyTable';
import AddRiceVarietyModal from '../RiceVarietiesManagement/AddRiceVarietyModal';
import { addDoc, collection, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/config";


const RiceVarietiesManagement = () => {
  const [varieties, setVarieties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editVariety, setEditVariety] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successDelete, setSuccessDelete] = useState(false);
  const itemsPerPage = 50;

  // Realtime fetch rice varieties from Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "rice_seed_varieties"),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVarieties(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching rice varieties:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Filtering
  const filteredVarieties = varieties.filter(
    (v) =>
      (v.varietyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.yearRelease || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.location || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVarieties = filteredVarieties.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredVarieties.length / itemsPerPage);

  // Actions
  const handleAddNew = () => {
    setEditVariety(null);
    setIsModalOpen(true);
  };

  const handleAddOrEditVariety = async (varietyData, id) => {
    try {
      if (id) {
        await updateDoc(doc(db, "rice_seed_varieties", id), {
          ...varietyData,
          updatedAt: new Date(),
        });

        
      } else {
        await addDoc(collection(db, "rice_seed_varieties"), {
          ...varietyData,
          createdAt: new Date(),
        });

      }
      setIsModalOpen(false);
      setEditVariety(null);
    } catch (error) {
      console.error("Error saving rice variety:", error);
    }
  };

  const handleEdit = (variety) => {
    setEditVariety(variety);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
     
      setSuccessDelete(true);

      setTimeout(async () => {
        await deleteDoc(doc(db, "rice_seed_varieties", id));
        setVarieties((prev) => prev.filter((v) => v.id !== id));

        setSuccessDelete(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to delete rice variety:", error);
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <RiceVarietyHeader
        onAddNew={handleAddNew}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <RiceVarietyTable
        varieties={paginatedVarieties}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        startIndex={startIndex}
        itemsPerPage={itemsPerPage}
        filteredVarieties={filteredVarieties}
      />

      {isModalOpen && (
        <AddRiceVarietyModal
          onClose={() => { setIsModalOpen(false); setEditVariety(null); }}
          onSave={handleAddOrEditVariety}
          varietyData={editVariety}
        />
      )}

      {/* Success Delete Animation */}
      {successDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center animate-fadeIn scale-up">
            <svg className="w-20 h-20 text-green-500 mb-4 animate-bounce" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-lg font-semibold text-green-600">Rice variety deleted successfully!</h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiceVarietiesManagement;
