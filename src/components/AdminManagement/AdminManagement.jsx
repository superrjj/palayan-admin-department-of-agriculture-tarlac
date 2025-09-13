import React, { useState, useEffect, useCallback } from 'react';
import AdminHeader from '../AdminManagement/AdminHeader';
import AdminTable from '../AdminManagement/AdminTable';
import AddAdminModal from '../AdminManagement/AddAdminModal'; 
import { addDoc, collection, onSnapshot, updateDoc, doc, deleteDoc, getDoc, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
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

  // Realtime fetch admins from Firestore (only non-deleted)
  useEffect(() => {
    console.log("Setting up Firestore listener for admins...");
    
    // Try different query approaches
    let q;
    try {
      // First try: documents where isDeleted is explicitly false
      q = query(
        collection(db, "accounts"),
        where("isDeleted", "==", false)
      );
      console.log("Using query with isDeleted == false");
    } catch (error) {
      console.log("Query with isDeleted == false failed, trying alternative...");
      // Fallback: get all documents and filter in JavaScript
      q = collection(db, "accounts");
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
        
        console.log("Final admins count:", data.length);
        console.log("Admins data:", data);
        
        setAdmins(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching admins:", error);
        setLoading(false);
      }
    );
    
    return () => {
      console.log("Cleaning up Firestore listener");
      unsub();
    };
  }, []);

  // Update lastLogin for a user
  // eslint-disable-next-line no-unused-vars
  const updateLastLogin = async (userId) => {
    try {
      await updateDoc(doc(db, "accounts", userId), {
        lastLogin: new Date()
      });
    } catch (error) {
      console.error("Error updating lastLogin:", error);
    }
  };

  // Check inactive admins (1 week no login)
  const checkInactiveAdmins = useCallback(async () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    admins.forEach(async (admin) => {
      if (!admin.lastLogin) return; 
      const lastLogin = admin.lastLogin.seconds 
        ? new Date(admin.lastLogin.seconds * 1000) 
        : new Date(admin.lastLogin);
      if (lastLogin < oneWeekAgo && admin.status !== "inactive") {
        try {
          await updateDoc(doc(db, "accounts", admin.id), {
            status: "inactive"
          });
          console.log(`Admin ${admin.username} marked as inactive`);
        } catch (error) {
          console.error(`Failed to update status for ${admin.username}:`, error);
        }
      }
    });
  }, [admins]);

  useEffect(() => {
    if (!loading) checkInactiveAdmins();
  }, [loading, checkInactiveAdmins]);

  // Filtering
  const filteredAdmins = admins.filter(
    (a) =>
      (a.fullname || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.username || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAdmins = filteredAdmins.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);

  // Actions
  const handleAddNew = () => {
    setEditAdmin(null);
    setIsModalOpen(true);
  };

  const handleAddOrEditAdmin = async (adminData, id) => {
    try {
      console.log("Current user when saving:", currentUser);
      console.log("Admin data to save:", adminData);
      
      if (id) {
        // Get the current data before updating
        const currentAdmin = admins.find(a => a.id === id);
        
        const updateData = {
          ...adminData,
          isDeleted: false, // Ensure it's not deleted
          updatedAt: new Date(),
        };
        
        console.log("Updating admin with data:", updateData);
        
        await updateDoc(doc(db, "accounts", id), updateData);

        // Log the update action
        await addDoc(collection(db, "audit_logs"), {
          userId: currentUser.id,
          userName: currentUser.fullname,
          userEmail: currentUser.email,
          timestamp: new Date(),
          action: 'UPDATE',
          collection: 'accounts',
          documentId: id,
          documentName: adminData.fullname || adminData.username || 'Unknown',
          description: 'Updated admin account',
          changes: {
            before: currentAdmin,
            after: updateData
          }
        });
        
      } else {
        const newAdminData = {
          ...adminData,
          status: "active",
          isDeleted: false, // Explicitly set as not deleted
          createdAt: new Date(),
          lastLogin: null,
        };

        console.log("Creating new admin with data:", newAdminData);

        const docRef = await addDoc(collection(db, "accounts"), newAdminData);
        
        console.log("New admin created with ID:", docRef.id);

        // Log the create action
        await addDoc(collection(db, "audit_logs"), {
          userId: currentUser.id,
          userName: currentUser.fullname,
          userEmail: currentUser.email,
          timestamp: new Date(),
          action: 'CREATE',
          collection: 'accounts',
          documentId: docRef.id,
          documentName: adminData.fullname || adminData.username || 'Unknown',
          description: 'Added new admin account',
          changes: {
            before: null,
            after: newAdminData
          }
        });
      }
      
      console.log("Admin saved successfully");
      setIsModalOpen(false);
      setEditAdmin(null);
    } catch (error) {
      console.error("Error saving admin:", error);
      alert("Error saving admin: " + error.message);
    }
  };

  const handleEdit = (admin) => {
    console.log("Editing admin:", admin);
    setEditAdmin(admin);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      console.log("Deleting admin with ID:", id);
      setSuccessDelete(true);

      // Get the admin data before soft delete
      const adminToDelete = admins.find(a => a.id === id);
      console.log("Admin to delete:", adminToDelete);

      setTimeout(async () => {
        console.log("Current user when deleting:", currentUser);
        
        // Soft delete - update with isDeleted flag instead of actual delete
        await updateDoc(doc(db, "accounts", id), {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: currentUser.id
        });
        
        console.log("Admin soft deleted successfully");
        
        // Log the delete action
        await addDoc(collection(db, "audit_logs"), {
          userId: currentUser.id,
          userName: currentUser.fullname,
          userEmail: currentUser.email,
          timestamp: new Date(),
          action: 'DELETE',
          collection: 'accounts',
          documentId: id,
          documentName: adminToDelete?.fullname || adminToDelete?.username || 'Unknown',
          description: 'Deleted admin account',
          changes: {
            before: adminToDelete,
            after: null
          }
        });

        // Remove from local state
        setAdmins((prev) => prev.filter((a) => a.id !== id));
        setSuccessDelete(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to delete admin:", error);
      alert("Error deleting admin: " + error.message);
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <AdminHeader
        onAddNew={handleAddNew}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <AdminTable
        admins={paginatedAdmins}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        startIndex={startIndex}
        itemsPerPage={itemsPerPage}
        filteredAdmins={filteredAdmins}
      />

      {isModalOpen && (
        <AddAdminModal
          onClose={() => { setIsModalOpen(false); setEditAdmin(null); }}
          onSave={handleAddOrEditAdmin}
          adminData={editAdmin}
        />
      )}

      {/* Success Delete Animation */}
      {successDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center animate-fadeIn scale-up">
            <svg className="w-20 h-20 text-green-500 mb-4 animate-bounce" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-lg font-semibold text-green-600">Admin account deleted successfully!</h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
