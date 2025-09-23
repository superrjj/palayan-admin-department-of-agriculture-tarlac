import React, { useState, useEffect } from 'react';
import DiseaseHeader from './DiseaseHeader';
import AddDiseaseModal from './AddDiseaseModal';
import { addDoc, collection, onSnapshot, updateDoc, doc, deleteDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Eye, Edit, Trash, X, Calendar } from "lucide-react";

const DiseaseManagement = () => {
  const [diseases, setDiseases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDisease, setEditDisease] = useState(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line no-unused-vars
  const [successSave, setSuccessSave] = useState(false);

  // eslint-disable-next-line no-unused-vars
  const [successDelete, setSuccessDelete] = useState(false);

  // eslint-disable-next-line no-unused-vars
  const [saveAction, setSaveAction] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [viewDisease, setViewDisease] = useState(null);

  // NEW: type-to-confirm input state
  const [confirmText, setConfirmText] = useState('');

  // current user for audit logs 
  const [currentUser, setCurrentUser] = useState({
    id: 'default_user',
    fullname: 'System User',
    username: 'system',
    email: 'system@example.com'
  });

  const itemsPerPage = 50;

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const adminToken = localStorage.getItem("admin_token");
        const sessionId = localStorage.getItem("session_id");
        if (adminToken && sessionId) {
          const userDoc = await getDoc(doc(db, "accounts", adminToken));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.currentSession === sessionId) {
              setCurrentUser({
                id: userData.id || adminToken,
                fullname: userData.fullname || 'Unknown User',
                username: userData.username || 'unknown',
                email: userData.email || 'unknown@example.com'
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };
    getCurrentUser();
  }, []);

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
  // eslint-disable-next-line no-unused-vars
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
        // capture previous state for audit
        const prevSnap = await getDoc(doc(db, "rice_local_diseases", id));
        const before = prevSnap.exists() ? { id, ...prevSnap.data() } : null;

        dataToSave.updatedAt = new Date();
        await updateDoc(doc(db, "rice_local_diseases", id), dataToSave);

        // audit log: UPDATE
        await addDoc(collection(db, "audit_logs"), {
          userId: currentUser.id,
          userName: currentUser.fullname,
          userEmail: currentUser.email,
          timestamp: new Date(),
          action: 'UPDATE',
          collection: 'rice_local_diseases',
          documentId: id,
          documentName: dataToSave.name || 'Unnamed Disease',
          description: 'Updated disease record',
          changes: {
            before,
            after: { id, ...dataToSave }
          }
        });

        setSaveAction('updated');
      } else {
        dataToSave.createdAt = new Date();
        const docRef = await addDoc(collection(db, "rice_local_diseases"), dataToSave);

        // audit log: CREATE
        await addDoc(collection(db, "audit_logs"), {
          userId: currentUser.id,
          userName: currentUser.fullname,
          userEmail: currentUser.email,
          timestamp: new Date(),
          action: 'CREATE',
          collection: 'rice_local_diseases',
          documentId: docRef.id,
          documentName: dataToSave.name || 'Unnamed Disease',
          description: 'Added new disease record',
          changes: {
            before: null,
            after: { id: docRef.id, ...dataToSave }
          }
        });

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

      // capture full doc for audit before deleting
      const before = diseases.find(d => d.id === id) || (await (async () => {
        const snap = await getDoc(doc(db, "rice_local_diseases", id));
        return snap.exists() ? { id, ...snap.data() } : null;
      })());

      await deleteDoc(doc(db, "rice_local_diseases", id));

      // audit log: DELETE
      await addDoc(collection(db, "audit_logs"), {
        userId: currentUser.id,
        userName: currentUser.fullname,
        userEmail: currentUser.email,
        timestamp: new Date(),
        action: 'DELETE',
        collection: 'rice_local_diseases',
        documentId: id,
        documentName: before?.name || 'Unnamed Disease',
        description: 'Deleted disease record',
        changes: {
          before,
          after: null
        }
      });

      setTimeout(() => setSuccessDelete(false), 2000);
    } catch (err) {
      setSuccessDelete(false);
      alert(`Failed to delete disease: ${err.message}`);
    }
  };

  const openDeleteModal = (disease) => {
    setSelectedDisease({ id: disease.id, name: disease.name || 'Unnamed Disease' });
    setConfirmText('');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedDisease) return;
    await performDelete(selectedDisease.id);
    setShowDeleteModal(false);
    setSelectedDisease(null);
    setConfirmText('');
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedDisease(null);
    setConfirmText('');
  };

  const isConfirmMatch = (selectedDisease?.name || '') === confirmText;

  return (
    <div className="p-4 lg:p-6">
      <DiseaseHeader
        onAddNew={handleAddNew}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {loading ? (
        <div className="text-center py-8">Loading rice diseases...</div>
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
              {disease.description && (
              <p 
                className="text-gray-600 mt-2 text-sm overflow-hidden"
                style={{ 
                  textAlign: 'justify', 
                  textJustify: 'inter-word',
                  hyphens: 'auto',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: '1.4em',
                  maxHeight: '4.2em'
                }}
              >
                {disease.description}
              </p>
            )}

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

      {/* Delete Confirm Modal with type-to-confirm */}
      {showDeleteModal && selectedDisease && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Trash className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="mt-3 text-lg font-semibold text-gray-800">Delete Disease</h3>
              <p className="text-sm text-gray-600 mt-1">
                This action cannot be undone. To confirm, type the disease name exactly:
              </p>
              <p className="mt-2 text-sm">
                <span className="text-gray-500">Disease name:</span>{' '}
                <span className="font-semibold text-gray-800">{selectedDisease.name}</span>
              </p>

              <div className="mt-3 w-full">
                <input
                  autoFocus
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isConfirmMatch) confirmDelete();
                  }}
                  placeholder={`Type "${selectedDisease.name}" to confirm`}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                    isConfirmMatch ? 'border-red-300 focus:ring-red-400' : 'border-gray-300 focus:ring-gray-200'
                  }`}
                />
                {!isConfirmMatch && confirmText.length > 0 && (
                  <p className="mt-1 text-xs text-red-600">The text does not match the disease name.</p>
                )}
              </div>

              <div className="mt-4 w-full flex justify-end gap-2">
                <button
                  onClick={cancelDelete}
                  className="px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={!isConfirmMatch}
                  className={`px-3 py-2 rounded-md text-white text-sm flex items-center gap-2 ${
                    isConfirmMatch ? 'bg-red-600 hover:bg-red-700' : 'bg-red-400 cursor-not-allowed opacity-70'
                  }`}
                >
                  <Trash className="w-4 h-4" />
                  Delete
                </button>
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
              {viewDisease.description && (
              <p>
                <strong>Description:</strong> 
                <span 
                  className="block mt-1"
                  style={{ 
                    textAlign: 'justify', 
                    textJustify: 'inter-word',
                    hyphens: 'auto'
                  }}
                >
                  {viewDisease.description}
                </span>
              </p>
            )}
            {viewDisease.cause && (
              <p>
                <strong>Cause:</strong> 
                <span 
                  className="block mt-1"
                  style={{ 
                    textAlign: 'justify', 
                    textJustify: 'inter-word',
                    hyphens: 'auto'
                  }}
                >
                  {viewDisease.cause}
                </span>
              </p>
            )}
            {viewDisease.symptoms && (
              <p>
                <strong>Symptoms:</strong> 
                <span 
                  className="block mt-1"
                  style={{ 
                    textAlign: 'justify', 
                    textJustify: 'inter-word',
                    hyphens: 'auto'
                  }}
                >
                  {viewDisease.symptoms}
                </span>
              </p>
            )}
            {viewDisease.treatments && (
              <p>
                <strong>Treatments:</strong> 
                <span 
                  className="block mt-1"
                  style={{ 
                    textAlign: 'justify', 
                    textJustify: 'inter-word',
                    hyphens: 'auto'
                  }}
                >
                  {viewDisease.treatments}
                </span>
              </p>
            )}

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