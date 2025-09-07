import React, { useState, useEffect, useCallback } from 'react';
import AdminHeader from '../AdminManagement/AdminHeader';
import AdminTable from '../AdminManagement/AdminTable';
import AddAdminModal from '../AdminManagement/AddAdminModal'; 
import { addDoc, collection, onSnapshot, updateDoc, doc , deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successDelete, setSuccessDelete] = useState(false);
  const itemsPerPage = 50;

  // Realtime fetch admins from Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "accounts"),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
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

  // Update lastLogin for a user
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
      if (id) {
        await updateDoc(doc(db, "accounts", id), {
          ...adminData,
          updatedAt: new Date(),
        });
      } else {
        await addDoc(collection(db, "accounts"), {
          ...adminData,
          status: "active",
          createdAt: new Date(),
          lastLogin: null,
        });
      }
      setIsModalOpen(false);
      setEditAdmin(null);
    } catch (error) {
      console.error("Error saving admin:", error);
    }
  };

  const handleEdit = (admin) => {
    setEditAdmin(admin);
    setIsModalOpen(true);
  };

    const handleDelete = async (id) => {
      try {
        // Delete from Firestore
        await deleteDoc(doc(db, "accounts", id));

        // Update UI
        setAdmins((prev) => prev.filter((a) => a.id !== id));

        // Show success animation
        setSuccessDelete(true);
        setTimeout(() => setSuccessDelete(false), 3000);

        console.log(`Admin ${id} has been deleted.`);
      } catch (error) {
        console.error("Failed to delete admin:", error);
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
          <h3 className="text-lg font-semibold text-green-600">Account deleted successfully!</h3>
        </div>
      </div>
    )}
    
    </div>
  );
};

export default AdminManagement;
