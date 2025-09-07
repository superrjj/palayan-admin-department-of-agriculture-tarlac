import React, { useState, useEffect } from 'react';
import DiseaseHeader from '../DiseaseManagement/DiseaseHeader';
import DiseaseTable from '../DiseaseManagement/DiseaseTable';
import AddDiseaseModal from '../DiseaseManagement/AddDiseaseModal';
import { addDoc, collection, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase/config";

const DiseaseManagement = () => {
  const [diseases, setDiseases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDisease, setEditDisease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successDelete, setSuccessDelete] = useState(false);
  const [successSave, setSuccessSave] = useState(false); // NEW: Success state for save
  const [saveAction, setSaveAction] = useState(''); // NEW: Track if it's add or edit
  const itemsPerPage = 50;

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "rice_local_diseases"),
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

  const filteredDiseases = diseases.filter(
    (d) =>
      (d.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.description || "").toLowerCase().includes(searchTerm.toLowerCase())
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
      // If imageFile is already a URL (string), use it directly
      // If imageFile is a File object, upload it first
      let mainImageUrl = diseaseData.mainImageUrl || "";
      
      if (diseaseData.imageFile) {
        if (diseaseData.imageFile instanceof File) {
          // Upload new file
          const storageRef = ref(storage, `rice_disease/${diseaseData.name}/${Date.now()}_main`);
          const uploadTask = uploadBytesResumable(storageRef, diseaseData.imageFile);
          mainImageUrl = await new Promise((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              null,
              (err) => reject(err),
              async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
            );
          });
        } else if (typeof diseaseData.imageFile === 'string') {
          // Already a URL, use it directly
          mainImageUrl = diseaseData.imageFile;
        }
      }

      const dataToSave = {
        name: diseaseData.name,
        scientificName: diseaseData.scientificName,
        description: diseaseData.description,
        cause: diseaseData.cause,
        symptoms: diseaseData.symptoms,
        treatments: diseaseData.treatments,
        mainImageUrl,
        images: diseaseData.images || [],
        updatedAt: id ? new Date() : undefined,
        createdAt: id ? undefined : new Date(),
      };

      // Remove undefined fields
      Object.keys(dataToSave).forEach(key => 
        dataToSave[key] === undefined && delete dataToSave[key]
      );

      if (id) {
        await updateDoc(doc(db, "rice_local_diseases", id), dataToSave);
        console.log("Disease updated successfully");
        setSaveAction('updated'); // NEW: Set action type
      } else {
        await addDoc(collection(db, "rice_local_diseases"), dataToSave);
        console.log("Disease added successfully");
        setSaveAction('added'); // NEW: Set action type
      } 

      setIsModalOpen(false);
      setEditDisease(null);
      
      // NEW: Show success dialog
      setSuccessSave(true);
      setTimeout(() => {
        setSuccessSave(false);
      }, 1000);
      
    } catch (error) {
      console.error("Error saving disease:", error);
      alert("Error saving disease. Please try again.");
    }
  };

  const handleEdit = (disease) => {
    setEditDisease(disease);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      setSuccessDelete(true);
      setTimeout(async () => {
        await deleteDoc(doc(db, "rice_local_diseases", id));
        setDiseases((prev) => prev.filter((d) => d.id !== id));
        setSuccessDelete(false);
      }, 1000);
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

      {/* Success Save Dialog */}
      {successSave && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center animate-bounce">
            <svg className="w-20 h-20 text-green-500 mb-4 animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-lg font-semibold text-green-600">
              Disease {saveAction} successfully!
            </h3>
          </div>
        </div>
      )}

      {/* Success Delete Dialog */}
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