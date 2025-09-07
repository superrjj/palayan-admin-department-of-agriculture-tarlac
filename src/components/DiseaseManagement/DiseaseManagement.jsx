// components/DiseaseManagement/DiseaseManagement.jsx
import React, { useState, useEffect } from 'react';
import DiseaseHeader from './DiseaseHeader';
import AddDiseaseModal from './AddDiseaseModal';
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
  const [successSave, setSuccessSave] = useState(false);
  const [successDelete, setSuccessDelete] = useState(false);
  const [saveAction, setSaveAction] = useState('');
  const itemsPerPage = 50;

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "rice_local_diseases"),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  const filteredDiseases = diseases.filter(d =>
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
    console.log("=== SAVE DISEASE DEBUG ===");
    console.log("Disease Data Received:", diseaseData);
    console.log("ID:", id);
    console.log("Is Edit Mode:", !!id);

    try {
      // Prepare the data to save
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

      console.log("Data to save:", dataToSave);

      if (id) {
        // Update existing document
        console.log("Updating document with ID:", id);
        dataToSave.updatedAt = new Date();
        
        await updateDoc(doc(db, "rice_local_diseases", id), dataToSave);
        console.log("✅ Document updated successfully!");
        setSaveAction('updated');
      } else {
        // Add new document
        console.log("Adding new document...");
        dataToSave.createdAt = new Date();
        
        const docRef = await addDoc(collection(db, "rice_local_diseases"), dataToSave);
        console.log("✅ Document added successfully with ID:", docRef.id);
        setSaveAction('added');
      }

      setIsModalOpen(false);
      setEditDisease(null);
      setSuccessSave(true);
      setTimeout(() => setSuccessSave(false), 2000);

    } catch (err) {
      console.error("❌ Error saving disease:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      alert(`Failed to save disease: ${err.message}`);
    }
  };

  const handleEdit = (disease) => {
    console.log("Editing disease:", disease);
    setEditDisease(disease);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    console.log("Deleting disease with ID:", id);
    try {
      setSuccessDelete(true);
      await deleteDoc(doc(db, "rice_local_diseases", id));
      console.log("✅ Disease deleted successfully");
      setTimeout(() => setSuccessDelete(false), 2000);
    } catch (err) {
      console.error("❌ Failed to delete disease:", err);
      setSuccessDelete(false);
      alert(`Failed to delete disease: ${err.message}`);
    }
  };

  // Debug: Log current state
  console.log("Current diseases:", diseases.length);
  console.log("Loading:", loading);

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
              <div key={disease.id} className="border rounded-lg p-4 shadow hover:shadow-md transition">
                {disease.mainImageUrl && (
                  <img 
                    src={disease.mainImageUrl} 
                    alt={disease.name} 
                    className="w-full h-40 object-cover rounded mb-3"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <h3 className="font-semibold text-lg">{disease.name || 'Unnamed Disease'}</h3>
                {disease.scientificName && (
                  <p className="text-sm italic text-gray-600">{disease.scientificName}</p>
                )}
                {disease.description && (
                  <p className="text-gray-600 mt-2 text-sm">{disease.description}</p>
                )}
                <div className="flex justify-between mt-3 space-x-2">
                  <button 
                    className="flex-1 bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition" 
                    onClick={() => handleEdit(disease)}
                  >
                    Edit
                  </button>
                  <button 
                    className="flex-1 bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition" 
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this disease?')) {
                        handleDelete(disease.id);
                      }
                    }}
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
        <AddDiseaseModal
          onClose={() => { 
            setIsModalOpen(false); 
            setEditDisease(null); 
          }}
          onSave={handleAddOrEditDisease}
          diseaseData={editDisease}
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
              Disease {saveAction} successfully!
            </h3>
          </div>
        </div>
      )}

      {successDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-600">Disease deleted successfully!</h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiseaseManagement;