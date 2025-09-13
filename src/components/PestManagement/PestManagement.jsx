import React, { useState, useEffect } from 'react';
import PestHeader from './PestHeader';
import AddPestModal from './AddPestModal';
import { addDoc, collection, onSnapshot, updateDoc, doc, deleteDoc, getDoc, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";

const PestManagement = () => {
  const [pests, setPests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPest, setEditPest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successDelete, setSuccessDelete] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    id: 'default_user',
    fullname: 'System User',
    username: 'system',
    email: 'system@example.com'
  });
  const itemsPerPage = 50;

  // states for custom delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPest, setSelectedPest] = useState(null);

  // Get current user from localStorage and Firestore
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const adminToken = localStorage.getItem("admin_token");
        const sessionId = localStorage.getItem("session_id");
        
        if (adminToken && sessionId) {
          const userDoc = await getDoc(doc(db, "accounts", adminToken));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Verify session
            if (userData.currentSession === sessionId) {
              setCurrentUser({
                id: userData.id || adminToken,
                fullname: userData.fullname || 'Unknown User',
                username: userData.username || 'unknown',
                email: userData.email || 'unknown@example.com'
              });
              console.log("Current user loaded:", userData.fullname);
            } else {
              console.log("Session mismatch, using default user");
            }
          } else {
            console.log("User document not found, using default user");
          }
        } else {
          console.log("No admin token or session, using default user");
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };
    getCurrentUser();
  }, []);

  // Realtime fetch pests from Firestore (only non-deleted)
  useEffect(() => {
    console.log("Setting up Firestore listener for pests...");
    
    // Try different query approaches
    let q;
    try {
      // First try: documents where isDeleted is explicitly false
      q = query(
        collection(db, "rice_local_pests"),
        where("isDeleted", "==", false)
      );
      console.log("Using query with isDeleted == false");
    } catch (error) {
      console.log("Query with isDeleted == false failed, trying alternative...");
      // Fallback: get all documents and filter in JavaScript
      q = collection(db, "rice_local_pests");
      console.log("Using fallback query (all documents)");
    }
    
    const unsub = onSnapshot(q, 
      (snapshot) => {
        console.log("Snapshot received, docs count:", snapshot.docs.length);
        
        let data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // If we used the fallback query, filter out deleted items
        if (q.type === 'collection') {
          data = data.filter(item => item.isDeleted !== true);
          console.log("Filtered out deleted items, remaining:", data.length);
        }
        
        console.log("Final pests count:", data.length);
        console.log("Pests data:", data);
        
        setPests(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching pests:", error);
        setLoading(false);
      }
    );
    
    return () => {
      console.log("Cleaning up Firestore listener");
      unsub();
    };
  }, []);

  // Filtering
  const filteredPests = pests.filter(p =>
    (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.scientificName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPests = filteredPests.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredPests.length / itemsPerPage);

  // Actions
  const handleAddNew = () => {
    setEditPest(null);
    setIsModalOpen(true);
  };

  const handleAddOrEditPest = async (pestData, id) => {
    try {
      console.log("Current user when saving:", currentUser);
      console.log("Pest data to save:", pestData);
      
      if (id) {
        // Get the current data before updating
        const currentPest = pests.find(p => p.id === id);
        
        const updateData = {
          name: pestData.name || "",
          scientificName: pestData.scientificName || "",
          description: pestData.description || "",
          cause: pestData.cause || "",
          symptoms: pestData.symptoms || "",
          treatments: pestData.treatments || "",
          mainImageUrl: pestData.mainImageUrl || "",
          images: pestData.images || [],
          isDeleted: false, // Ensure it's not deleted
          updatedAt: new Date(),
        };
        
        console.log("Updating pest with data:", updateData);
        
        await updateDoc(doc(db, "rice_local_pests", id), updateData);

        // Log the update action
        await addDoc(collection(db, "audit_logs"), {
          userId: currentUser.id,
          userName: currentUser.fullname,
          userEmail: currentUser.email,
          timestamp: new Date(),
          action: 'UPDATE',
          collection: 'rice_local_pests',
          documentId: id,
          documentName: pestData.name || 'Unknown',
          description: 'Updated rice pest',
          changes: {
            before: currentPest,
            after: updateData
          }
        });
        
      } else {
        const newPestData = {
          name: pestData.name || "",
          scientificName: pestData.scientificName || "",
          description: pestData.description || "",
          cause: pestData.cause || "",
          symptoms: pestData.symptoms || "",
          treatments: pestData.treatments || "",
          mainImageUrl: pestData.mainImageUrl || "",
          images: pestData.images || [],
          isDeleted: false, // Explicitly set as not deleted
          createdAt: new Date(),
        };

        console.log("Creating new pest with data:", newPestData);

        const docRef = await addDoc(collection(db, "rice_local_pests"), newPestData);
        
        console.log("New pest created with ID:", docRef.id);

        // Log the create action
        await addDoc(collection(db, "audit_logs"), {
          userId: currentUser.id,
          userName: currentUser.fullname,
          userEmail: currentUser.email,
          timestamp: new Date(),
          action: 'CREATE',
          collection: 'rice_local_pests',
          documentId: docRef.id,
          documentName: pestData.name || 'Unknown',
          description: 'Added new rice pest',
          changes: {
            before: null,
            after: newPestData
          }
        });
      }
      
      console.log("Pest saved successfully");
      setIsModalOpen(false);
      setEditPest(null);
    } catch (error) {
      console.error("Error saving rice pest:", error);
      alert("Error saving rice pest: " + error.message);
    }
  };

  const handleEdit = (pest) => {
    console.log("Editing pest:", pest);
    setEditPest(pest);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      console.log("Deleting pest with ID:", id);
      setSuccessDelete(true);

      // Get the pest data before soft delete
      const pestToDelete = pests.find(p => p.id === id);
      console.log("Pest to delete:", pestToDelete);

      setTimeout(async () => {
        console.log("Current user when deleting:", currentUser);
        
        // Soft delete - update with isDeleted flag instead of actual delete
        await updateDoc(doc(db, "rice_local_pests", id), {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: currentUser.id
        });
        
        console.log("Pest soft deleted successfully");
        
        // Log the delete action
        await addDoc(collection(db, "audit_logs"), {
          userId: currentUser.id,
          userName: currentUser.fullname,
          userEmail: currentUser.email,
          timestamp: new Date(),
          action: 'DELETE',
          collection: 'rice_local_pests',
          documentId: id,
          documentName: pestToDelete?.name || 'Unknown',
          description: 'Deleted rice pest',
          changes: {
            before: pestToDelete,
            after: null
          }
        });

        // Remove from local state
        setPests((prev) => prev.filter((p) => p.id !== id));
        setSuccessDelete(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to delete rice pest:", error);
      alert("Error deleting rice pest: " + error.message);
    }
  };

  const openDeleteModal = (pest) => {
    setSelectedPest({ id: pest.id, name: pest.name || 'Unnamed Pest' });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedPest) return;
    await handleDelete(selectedPest.id);
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

      {/* Success Delete Animation */}
      {successDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center animate-fadeIn scale-up">
            <svg className="w-20 h-20 text-green-500 mb-4 animate-bounce" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-lg font-semibold text-green-600">Rice pest deleted successfully!</h3>
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
