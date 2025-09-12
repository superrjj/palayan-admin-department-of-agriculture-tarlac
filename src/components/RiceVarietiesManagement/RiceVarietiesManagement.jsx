import React, { useState, useEffect} from 'react';
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
  const itemsPerPage = 50;

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
        
        let data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
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

  const handleDelete = async (id) => {
    try {
      console.log("Deleting variety with ID:", id);
      setSuccessDelete(true);

      // Get the variety data before soft delete
      const varietyToDelete = varieties.find(v => v.id === id);
      console.log("Variety to delete:", varietyToDelete);

      setTimeout(async () => {
        console.log("Current user when deleting:", currentUser);
        
        // Soft delete - update with isDeleted flag instead of actual delete
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
        setSuccessDelete(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to delete rice variety:", error);
      alert("Error deleting rice variety: " + error.message);
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