import React, { useState, useEffect } from 'react';
import AdminHeader from '../AdminManagement/AdminHeader';
import AdminTable from '../AdminManagement/AdminTable';
import AddAdminModal from '../AdminManagement/AddAdminModal'; 
import { addDoc, collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
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

    return () => unsub(); // cleanup on unmount
  }, []);

  // Update lastLogin for a user (call this on login)
  const updateLastLogin = async (userId) => {
    try {
      await updateDoc(doc(db, "accounts", userId), {
        lastLogin: new Date()
      });
    } catch (error) {
      console.error("Error updating lastLogin:", error);
    }
  };

  // Filtering
  const filteredAdmins = admins.filter(
    (a) =>
      (a.fullname || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAdmins = filteredAdmins.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);

  // Actions
  const handleAddNew = () => setIsModalOpen(true);

  const handleAddAdmin = async (newAdmin) => {
    try {
      await addDoc(collection(db, "accounts"), {
        ...newAdmin,
        status: "active",
        createdAt: new Date(),
        lastLogin: null,
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding admin:", error);
    }
  };

  const handleEdit = (admin) => console.log("Edit admin:", admin);

  const handleDelete = (id) => {
    setAdmins((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Header with search + add */}
      <AdminHeader
        onAddNew={handleAddNew}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Table */}
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

      {/* Add Modal */}
      {isModalOpen && (
        <AddAdminModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddAdmin}
        />
      )}
    </div>
  );
};

export default AdminManagement;
