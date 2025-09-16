// components/AdminManagement/index.jsx (AdminManagement)
import React, { useState, useEffect, useCallback } from 'react';
import AdminHeader from '../AdminManagement/AdminHeader';
import AdminTable from '../AdminManagement/AdminTable';
import { useRole } from '../../contexts/RoleContext';
import AddAdminModal from '../AdminManagement/AddAdminModal'; 
import { addDoc, collection, onSnapshot, updateDoc, doc, deleteDoc, getDoc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = useRole();
  const [successDelete, setSuccessDelete] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    id: 'default_user',
    fullname: 'System User',
    username: 'system',
    email: 'system@example.com'
  });
  const itemsPerPage = 20;

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
    let q;
    try {
      q = query(
        collection(db, "accounts"),
        where("isDeleted", "==", false)
      );
    } catch {
      q = collection(db, "accounts");
    }
    
    const unsub = onSnapshot(q, 
      (snapshot) => {
        let data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // if fallback was used, filter deleted
        // note: q.type may not exist; safe filter always
        data = data.filter(item => item.isDeleted !== true);
        setAdmins(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching admins:", error);
        setLoading(false);
      }
    );
    
    return () => unsub();
  }, []);

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
        } catch (error) {
          console.error(`Failed to update status for ${admin.username}:`, error);
        }
      }
    });
  }, [admins]);

  useEffect(() => {
    if (!loading) checkInactiveAdmins();
  }, [loading, checkInactiveAdmins]);

  const filteredAdmins = admins.filter(
    (a) =>
      (a.fullname || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.username || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAdmins = filteredAdmins.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);

  const handleAddNew = () => {
    setEditAdmin(null);
    setIsModalOpen(true);
  };

  const handleAddOrEditAdmin = async (adminData, id) => {
    try {
      if (id) {
        const currentAdmin = admins.find(a => a.id === id);
        const updateData = {
          ...adminData,
          isDeleted: false,
          updatedAt: new Date(),
        };
        await updateDoc(doc(db, "accounts", id), updateData);
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
          isDeleted: false,
          createdAt: new Date(),
          lastLogin: null,
        };
        const docRef = await addDoc(collection(db, "accounts"), newAdminData);
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
      setIsModalOpen(false);
      setEditAdmin(null);
    } catch (error) {
      console.error("Error saving admin:", error);
      alert("Error saving admin: " + error.message);
    }
  };

  const handleEdit = (admin) => {
    setEditAdmin(admin);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      setSuccessDelete(true);
      const adminToDelete = admins.find(a => a.id === id);
      setTimeout(async () => {
        await updateDoc(doc(db, "accounts", id), {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: currentUser.id
        });
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
        setAdmins((prev) => prev.filter((a) => a.id !== id));
        setSuccessDelete(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to delete admin:", error);
      alert("Error deleting admin: " + error.message);
    }
  };

  const handleToggleRestriction = async (id, nextActive, targetRow) => {
    try {
      const prev = admins.find(a => a.id === id) || targetRow;
      const updateData = {
        status: nextActive ? 'active' : 'inactive',
        isRestricted: !nextActive,
        restrictedAt: nextActive ? null : serverTimestamp(),
        updatedAt: new Date()
      };
      await updateDoc(doc(db, "accounts", id), updateData);
      await addDoc(collection(db, "audit_logs"), {
        userId: currentUser.id,
        userName: currentUser.fullname,
        userEmail: currentUser.email,
        timestamp: new Date(),
        action: nextActive ? 'UNRESTRICT' : 'RESTRICT',
        collection: 'accounts',
        documentId: id,
        documentName: prev?.fullname || prev?.username || 'Unknown',
        description: nextActive ? 'Unrestricted admin account' : 'Restricted admin account',
        changes: { before: { status: prev?.status }, after: { status: updateData.status } }
      });
    } catch (e) {
      console.error('Failed to toggle restriction:', e);
      alert('Failed to update restriction: ' + (e.message || e));
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
        onToggleRestriction={handleToggleRestriction}
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