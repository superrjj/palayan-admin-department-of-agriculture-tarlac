import React, { useState, useEffect } from 'react';
import PestHeader from './PestHeader';
import AddPestModal from './AddPestModal';
import { addDoc, collection, onSnapshot, updateDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Eye, Edit, Trash, X, Calendar } from "lucide-react";

const PestManagement = () => {
  const [pests, setPests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPest, setEditPest] = useState(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line no-unused-vars
  const [successSave, setSuccessSave] = useState(false);

  // eslint-disable-next-line no-unused-vars
  const [successDelete, setSuccessDelete] = useState(false);

  // eslint-disable-next-line no-unused-vars
  const [saveAction, setSaveAction] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPest, setSelectedPest] = useState(null);
  const [viewPest, setViewPest] = useState(null);

  // current user for audit logs (mirrors AdminManagement)
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
      collection(db, "rice_local_pests"),
      snapshot => {
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(item => item.isDeleted !== true); // include missing or false
        setPests(data);
        setLoading(false);
      },
      error => {
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
        // capture previous state for audit
        const prevSnap = await getDoc(doc(db, "rice_local_pests", id));
        const before = prevSnap.exists() ? { id, ...prevSnap.data() } : null;

        const next = { ...dataToSave, isDeleted: false, updatedAt: new Date() };
        await updateDoc(doc(db, "rice_local_pests", id), next);

        // audit log: UPDATE
        await addDoc(collection(db, "audit_logs"), {
          userId: currentUser.id,
          userName: currentUser.fullname,
          userEmail: currentUser.email,
          timestamp: new Date(),
          action: 'UPDATE',
          collection: 'rice_local_pests',
          documentId: id,
          documentName: dataToSave.name || 'Unnamed Pest',
          description: 'Updated rice pest',
          changes: {
            before,
            after: { id, ...next }
          }
        });

        setSaveAction('updated');
      } else {
        const next = { ...dataToSave, isDeleted: false, createdAt: new Date() };
        const docRef = await addDoc(collection(db, "rice_local_pests"), next);

        // audit log: CREATE
        await addDoc(collection(db, "audit_logs"), {
          userId: currentUser.id,
          userName: currentUser.fullname,
          userEmail: currentUser.email,
          timestamp: new Date(),
          action: 'CREATE',
          collection: 'rice_local_pests',
          documentId: docRef.id,
          documentName: dataToSave.name || 'Unnamed Pest',
          description: 'Added new rice pest',
          changes: {
            before: null,
            after: { id: docRef.id, ...next }
          }
        });

        setSaveAction('added');
      }

      setIsModalOpen(false);
      setEditPest(null);
      setSuccessSave(true);
      setTimeout(() => setSuccessSave(false), 2000);
    } catch (error) {
      alert("Error saving rice pest: " + error.message);
    }
  };

  const handleEdit = (pest) => {
    setEditPest(pest);
    setIsModalOpen(true);
  };

  const performDelete = async (id) => {
    try {
      setSuccessDelete(true);

      // capture full doc for audit before soft delete
      const before = pests.find(p => p.id === id) || (await (async () => {
        const snap = await getDoc(doc(db, "rice_local_pests", id));
        return snap.exists() ? { id, ...snap.data() } : null;
      })());

      // soft delete
      await updateDoc(doc(db, "rice_local_pests", id), {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: currentUser.id
      });

      // audit log: DELETE
      await addDoc(collection(db, "audit_logs"), {
        userId: currentUser.id,
        userName: currentUser.fullname,
        userEmail: currentUser.email,
        timestamp: new Date(),
        action: 'DELETE',
        collection: 'rice_local_pests',
        documentId: id,
        documentName: before?.name || 'Unnamed Pest',
        description: 'Deleted rice pest',
        changes: {
          before,
          after: null
        }
      });

      setPests(prev => prev.filter(p => p.id !== id));
      setTimeout(() => setSuccessDelete(false), 1000);
    } catch (error) {
      setSuccessDelete(false);
      alert("Error deleting rice pest: " + error.message);
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
              <div 
                key={pest.id} 
                className="border rounded-lg p-4 shadow-md bg-white hover:shadow-xl hover:-translate-y-1 transition-transform duration-300 relative"
              >
                {pest.mainImageUrl && (
                  <img 
                    src={pest.mainImageUrl} 
                    alt={pest.name} 
                    className="w-full h-40 object-cover rounded mb-3"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <h3 className="font-semibold text-lg">{pest.name || 'Unnamed Pest'}</h3>
                {pest.scientificName && <p className="text-sm italic text-gray-600">{pest.scientificName}</p>}
                {pest.description && (
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
                    {pest.description}
                  </p>
                )}

                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <p><span className="font-medium">Created Date:</span> {pest.createdAt?.toDate ? pest.createdAt.toDate().toLocaleString() : "N/A"}</p>
                  <p><span className="font-medium">Last Updated:</span> {pest.updatedAt?.toDate ? pest.updatedAt.toDate().toLocaleString() : "-"}</p>
                </div>

                <div className="flex justify-center gap-2 mt-3">
                  <button
                    onClick={() => setViewPest(pest)}
                    className="flex items-center justify-center gap-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition"
                  >
                    <Eye className="w-4 h-4" /> View
                  </button>
                  <button
                    onClick={() => handleEdit(pest)}
                    className="flex items-center justify-center gap-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(pest)}
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
        <AddPestModal
          onClose={() => { setIsModalOpen(false); setEditPest(null); }}
          onSave={handleAddOrEditPest}
          pestData={editPest}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && selectedPest && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <X className="w-8 h-8 text-red-600" />
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
                    <Trash className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Pest Card */}
      {viewPest && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-start pt-20 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewPest(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            <h2 className="text-2xl font-bold mb-4">{viewPest.name || "Unnamed Pest"}</h2>

            {viewPest.mainImageUrl && (
              <img
                src={viewPest.mainImageUrl}
                alt={viewPest.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}

            <div className="space-y-3 text-gray-700">
              {viewPest.scientificName && <p><strong>Scientific Name:</strong> {viewPest.scientificName}</p>}
              {viewPest.description && (
                <p>
                  <strong>Description:</strong>
                  <span className="block mt-1" style={{ textAlign: 'justify', textJustify: 'inter-word', hyphens: 'auto' }}>
                    {viewPest.description}
                  </span>
                </p>
              )}
              {viewPest.cause && (
                <p>
                  <strong>Cause:</strong>
                  <span className="block mt-1" style={{ textAlign: 'justify', textJustify: 'inter-word', hyphens: 'auto' }}>
                    {viewPest.cause}
                  </span>
                </p>
              )}
              {viewPest.symptoms && (
                <p>
                  <strong>Symptoms:</strong>
                  <span className="block mt-1" style={{ textAlign: 'justify', textJustify: 'inter-word', hyphens: 'auto' }}>
                    {viewPest.symptoms}
                  </span>
                </p>
              )}
              {viewPest.treatments && (
                <p>
                  <strong>Treatments:</strong>
                  <span className="block mt-1" style={{ textAlign: 'justify', textJustify: 'inter-word', hyphens: 'auto' }}>
                    {viewPest.treatments}
                  </span>
                </p>
              )}

              <div className="flex flex-col text-gray-500 text-sm mt-2 space-y-1">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4"/> Created: {viewPest.createdAt?.toDate ? viewPest.createdAt.toDate().toLocaleString() : "-"}</div>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4"/> Updated: {viewPest.updatedAt?.toDate ? viewPest.updatedAt.toDate().toLocaleString() : "-"}</div>
              </div>

              {viewPest.images && viewPest.images.length > 0 && (
                <div className="mt-3">
                  <strong>Images:</strong>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {viewPest.images.map((img, idx) => (
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

export default PestManagement;