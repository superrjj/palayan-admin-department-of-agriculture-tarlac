import React, { useState, useEffect } from 'react';
import RiceVarietyHeader from '../RiceVarietiesManagement/RiceVarietyHeader';
import RiceVarietyTable from '../RiceVarietiesManagement/RiceVarietyTable';
import AddRiceVarietyModal from '../RiceVarietiesManagement/AddRiceVarietyModal';
import { addDoc, collection, onSnapshot, updateDoc, doc, deleteDoc, getDoc, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";

const RiceVarietiesManagement = () => {
  const [varieties, setVarieties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editVariety, setEditVariety] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successDelete, setSuccessDelete] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    id: 'default_user',
    fullname: 'System User',
    username: 'system',
    email: 'system@example.com'
  });
  const itemsPerPage = 20;

  // NEW: Confirm Delete Dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, varietyName }
  const [confirmInput, setConfirmInput] = useState('');
  const [confirmBusy, setConfirmBusy] = useState(false);

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

  // Realtime fetch rice varieties from Firestore (only non-deleted)
  useEffect(() => {
    console.log("Setting up Firestore listener for rice varieties...");
    
    // Try different query approaches
    let q;
    try {
      // First try: documents where isDeleted is explicitly false
      q = query(
        collection(db, "rice_seed_varieties"),
        where("isDeleted", "==", false)
      );
      console.log("Using query with isDeleted == false");
    } catch (error) {
      console.log("Query with isDeleted == false failed, trying alternative...");
      // Fallback: get all documents and filter in JavaScript
      q = collection(db, "rice_seed_varieties");
      console.log("Using fallback query (all documents)");
    }
    
    const unsub = onSnapshot(q, 
      (snapshot) => {
        console.log("Snapshot received, docs count:", snapshot.docs.length);
        
        let data = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        
        // If we used the fallback query, filter out deleted items
        if (q.type === 'collection') {
          data = data.filter(item => item.isDeleted !== true);
          console.log("Filtered out deleted items, remaining:", data.length);
        }
        
        console.log("Final varieties count:", data.length);
        console.log("Varieties data:", data);
        
        setVarieties(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching rice varieties:", error);
        setLoading(false);
      }
    );
    
    return () => {
      console.log("Cleaning up Firestore listener");
      unsub();
    };
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
      console.log("Current user when saving:", currentUser);
      console.log("Variety data to save:", varietyData);
      
      if (id) {
        // Get the current data before updating
        const currentVariety = varieties.find(v => v.id === id);
        
        const updateData = {
          ...varietyData,
          isDeleted: false, // Ensure it's not deleted
          updatedAt: new Date(),
        };
        
        console.log("Updating variety with data:", updateData);
        
        await updateDoc(doc(db, "rice_seed_varieties", id), updateData);

        // Log the update action
        await addDoc(collection(db, "audit_logs"), {
          userId: currentUser.id,
          userName: currentUser.fullname,
          userEmail: currentUser.email,
          timestamp: new Date(),
          action: 'UPDATE',
          collection: 'rice_seed_varieties',
          documentId: id,
          documentName: varietyData.varietyName || 'Unknown',
          description: 'New updated rice variety',
          changes: {
            before: currentVariety,
            after: updateData
          }
        });
        
      } else {
        const newVarietyData = {
          ...varietyData,
          isDeleted: false, // Explicitly set as not deleted
          createdAt: new Date(),
        };

        console.log("Creating new variety with data:", newVarietyData);

        const docRef = await addDoc(collection(db, "rice_seed_varieties"), newVarietyData);
        
        console.log("New variety created with ID:", docRef.id);

        // Log the create action
        await addDoc(collection(db, "audit_logs"), {
          userId: currentUser.id,
          userName: currentUser.fullname,
          userEmail: currentUser.email,
          timestamp: new Date(),
          action: 'CREATE',
          collection: 'rice_seed_varieties',
          documentId: docRef.id,
          documentName: varietyData.varietyName || 'Unknown',
          description: 'New added rice variety',
          changes: {
            before: null,
            after: newVarietyData
          }
        });
      }
      
      console.log("Variety saved successfully");
      setIsModalOpen(false);
      setEditVariety(null);
    } catch (error) {
      console.error("Error saving rice variety:", error);
      alert("Error saving rice variety: " + error.message);
    }
  };

  const handleEdit = (variety) => {
    console.log("Editing variety:", variety);
    setEditVariety(variety);
    setIsModalOpen(true);
  };

  // Open confirm dialog instead of deleting immediately
  const handleDelete = async (id) => {
    const target = varieties.find(v => v.id === id);
    if (!target) return;
    setConfirmTarget({ id, varietyName: target.varietyName || '' });
    setConfirmInput('');
    setConfirmOpen(true);
  };

  // Execute the existing soft delete after confirmation
  const confirmDeleteNow = async () => {
    if (!confirmTarget) return;
    setConfirmBusy(true);
    try {
      const id = confirmTarget.id;
      const varietyToDelete = varieties.find(v => v.id === id);
      console.log("Deleting variety with ID:", id, "->", varietyToDelete);

      // Soft delete
      await updateDoc(doc(db, "rice_seed_varieties", id), {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: currentUser.id
      });
      
      console.log("Variety soft deleted successfully");
      
      // Log the delete action
      await addDoc(collection(db, "audit_logs"), {
        userId: currentUser.id,
        userName: currentUser.fullname,
        userEmail: currentUser.email,
        timestamp: new Date(),
        action: 'DELETE',
        collection: 'rice_seed_varieties',
        documentId: id,
        documentName: varietyToDelete?.varietyName || 'Unknown',
        description: 'Deleted rice variety',
        changes: {
          before: varietyToDelete,
          after: null
        }
      });

      // Remove from local state
      setVarieties((prev) => prev.filter((v) => v.id !== id));

      // Close confirm dialog, show success animation
      setConfirmBusy(false);
      setConfirmOpen(false);
      setSuccessDelete(true);
      setTimeout(() => setSuccessDelete(false), 1200);
    } catch (error) {
      console.error("Failed to delete rice variety:", error);
      alert("Error deleting rice variety: " + error.message);
      setConfirmBusy(false);
    }
  };

  const canConfirmDelete = !!confirmTarget && confirmInput.trim() === (confirmTarget.varietyName || '').trim();

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

      {/* Confirm Delete Dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2 text-red-600">Confirm Delete</h3>
            <p className="text-sm text-gray-700">
              This action will remove the rice variety from the list. To confirm, type the variety name exactly:
            </p>
            <div className="mt-3 p-3 bg-gray-50 rounded border text-sm text-gray-800">
              {confirmTarget?.varietyName || '(no name)'}
            </div>
            <input
              className="mt-3 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              placeholder="Type the variety name exactly to confirm"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              disabled={confirmBusy}
            />
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => { if (!confirmBusy) setConfirmOpen(false); }}
                className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
                disabled={confirmBusy}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteNow}
                disabled={!canConfirmDelete || confirmBusy}
                className={`px-3 py-2 text-sm rounded-md text-white ${canConfirmDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-red-400 cursor-not-allowed'}`}
              >
                {confirmBusy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
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