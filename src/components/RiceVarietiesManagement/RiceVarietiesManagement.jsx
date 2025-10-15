import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import RiceVarietyHeader from '../RiceVarietiesManagement/RiceVarietyHeader';
import RiceVarietyTable from '../RiceVarietiesManagement/RiceVarietyTable';
import AddRiceVarietyModal from '../RiceVarietiesManagement/AddRiceVarietyModal';
import { addDoc, collection, onSnapshot, updateDoc, doc, getDoc, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import { AlertCircle, CheckCircle } from "lucide-react";

const RiceVarietiesManagement = () => {
  const [varieties, setVarieties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editVariety, setEditVariety] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState({
    id: 'default_user',
    fullname: 'System User',
    username: 'system',
    email: 'system@example.com'
  });
  const itemsPerPage = 20;

  // Focus/highlight when navigated from History or after add/update
  const location = useLocation();
  const focusId = location.state?.focusId;
  const [pendingFocusId, setPendingFocusId] = useState(null);
  const focusedRef = useRef(null);

  // Confirm Delete Dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Sort dropdown + filters state
  const [sortBy, setSortBy] = useState('name-asc'); // name-asc | name-desc | year-desc | year-asc
  const [filters, setFilters] = useState({
    yearRange: '',
    season: '',
    plantingMethod: '',
    environment: '',
    location: '',
    recommendedInTarlac: '',
  });

  // Toast
  const [toast, setToast] = useState(null); // { ok: boolean, msg: string }
  const showToast = (ok, msg, ms = 1800) => {
    setToast({ ok, msg });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), ms);
  };

  // Modal close handlers
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditVariety(null);
  };

  // Simple backdrop click handler
  const handleBackdropClick = () => {
    handleModalClose();
  };

  // Get current user
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
    const targetId = focusId || pendingFocusId;
    if (!targetId) return;
    const t = setTimeout(() => {
      const el = focusedRef.current;
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('outline', 'outline-2', 'outline-amber-500', 'bg-amber-50', 'animate-pulse');
        if (typeof el.focus === 'function') el.focus({ preventScroll: true });
        setTimeout(() => el.classList.remove('animate-pulse'), 1200);
        setTimeout(() => {
          el.classList.remove('outline', 'outline-2', 'outline-amber-500', 'bg-amber-50');
        }, 2400);
      }
    }, 80);
    return () => clearTimeout(t);
  }, [focusId, pendingFocusId, varieties]);

  // Realtime fetch rice varieties from Firestore (only non-deleted)
  useEffect(() => {
    let q;
    try {
      q = query(
        collection(db, "rice_seed_varieties"),
        where("isDeleted", "==", false)
      );
    } catch (error) {
      q = collection(db, "rice_seed_varieties");
    }

    const unsub = onSnapshot(q,
      (snapshot) => {
        let data = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        if (q.type === 'collection') {
          data = data.filter(item => item.isDeleted !== true);
        }
        setVarieties(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching rice varieties:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Helpers
  const normalizeStr = (v) => String(v ?? '').toLowerCase().trim();
  const toNumber = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const seasonMatches = (recordSeason, selected) => {
    if (!selected) return true;
    const arr = Array.isArray(recordSeason) ? recordSeason : (recordSeason ? [recordSeason] : []);
    if (selected === 'Both') {
      const s = new Set(arr.map(x => normalizeStr(x)));
      return s.has('dry') && s.has('wet') || s.has('both');
    }
    return arr.map(x => normalizeStr(x)).includes(normalizeStr(selected));
  };

  const environmentMatches = (recordEnv, selected) => {
    if (!selected || selected === 'All') return true;
    const arr = Array.isArray(recordEnv) ? recordEnv : (recordEnv ? [recordEnv] : []);
    return arr.map(x => normalizeStr(x)).includes(normalizeStr(selected));
  };

  const matchesFilters = (v) => {
    if (filters.yearRange && String(v.yearRelease) !== String(filters.yearRange)) return false;
    if (!seasonMatches(v.season, filters.season)) return false;
    if (filters.plantingMethod && normalizeStr(filters.plantingMethod) !== normalizeStr(v.plantingMethod || '')) return false;
    if (!environmentMatches(v.environment, filters.environment)) return false;
    if (filters.location && !normalizeStr(v.location).includes(normalizeStr(filters.location))) return false;
    if (filters.recommendedInTarlac === 'yes' && !v.recommendedInTarlac) return false;
    return true;
  };

  const matchesSearch = (v) => {
    const term = normalizeStr(searchTerm);
    if (!term) return true;
    return (
      normalizeStr(v.varietyName).includes(term) ||
      normalizeStr(v.yearRelease).includes(term) ||
      normalizeStr(v.location).includes(term)
    );
  };

  // Compute list
  const filteredVarieties = varieties.filter(v => matchesFilters(v) && matchesSearch(v));

  const sortedVarieties = [...filteredVarieties].sort((a, b) => {
    const an = normalizeStr(a.varietyName);
    const bn = normalizeStr(b.varietyName);
    const ay = toNumber(a.yearRelease) ?? -Infinity;
    const by = toNumber(b.yearRelease) ?? -Infinity;

    if (sortBy === 'name-asc') return an.localeCompare(bn, undefined, { numeric: true, sensitivity: 'base' });
    if (sortBy === 'name-desc') return bn.localeCompare(an, undefined, { numeric: true, sensitivity: 'base' });
    if (sortBy === 'year-desc') return by - ay;
    if (sortBy === 'year-asc') return ay - by;
    return 0;
  });

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVarieties = sortedVarieties.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(sortedVarieties.length / itemsPerPage);

  // Actions
  const handleAddNew = () => {
    setEditVariety(null);
    setIsModalOpen(true);
  };

  const handleAddOrEditVariety = async (varietyData, id) => {
    try {
      if (id) {
        const currentVariety = varieties.find(v => v.id === id);
        const updateData = {
          ...varietyData,
          isDeleted: false,
          updatedAt: new Date(),
        };
        await updateDoc(doc(db, "rice_seed_varieties", id), updateData);
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
          changes: { before: currentVariety, after: updateData }
        });
        showToast(true, "Rice variety updated successfully");
        setPendingFocusId(id);
      } else {
        const newVarietyData = {
          ...varietyData,
          isDeleted: false,
          createdAt: new Date(),
        };
        const docRef = await addDoc(collection(db, "rice_seed_varieties"), newVarietyData);
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
          changes: { before: null, after: newVarietyData }
        });
        showToast(true, "New rice variety added successfully");
        setPendingFocusId(docRef.id);
      }
      handleModalClose();
    } catch (error) {
      console.error("Error saving rice variety:", error);
      showToast(false, "Error saving rice variety: " + error.message, 2600);
    }
  };

  const handleEdit = (variety) => {
    setEditVariety(variety);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const target = varieties.find(v => v.id === id);
    if (!target) return;
    setConfirmTarget({ id, varietyName: target.varietyName || '' });
    setConfirmInput('');
    setConfirmOpen(true);
  };

  const confirmDeleteNow = async () => {
    if (!confirmTarget) return;
    setConfirmBusy(true);
    try {
      const id = confirmTarget.id;
      const varietyToDelete = varieties.find(v => v.id === id);
      await updateDoc(doc(db, "rice_seed_varieties", id), {
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
        collection: 'rice_seed_varieties',
        documentId: id,
        documentName: varietyToDelete?.varietyName || 'Unknown',
        description: 'Deleted rice variety',
        changes: { before: varietyToDelete, after: null }
      });
      setVarieties((prev) => prev.filter((v) => v.id !== id));
      setConfirmBusy(false);
      setConfirmOpen(false);
      showToast(true, "Rice variety deleted successfully");
    } catch (error) {
      console.error("Failed to delete rice variety:", error);
      showToast(false, "Error deleting rice variety: " + error.message, 2600);
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
        sortBy={sortBy}
        setSortBy={setSortBy}
        filters={filters}
        setFilters={setFilters}
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
        focusId={focusId || pendingFocusId}
        focusedRef={focusedRef}
      />

      {isModalOpen && (
        <div
          onClick={handleBackdropClick}
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
        >
          <div onClick={(e) => e.stopPropagation()}>
            <AddRiceVarietyModal
              onClose={handleModalClose}
              onSave={handleAddOrEditVariety}
              varietyData={editVariety}
            />
          </div>
        </div>
      )}

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
              className="mt-3 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
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

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow text-white flex items-center gap-2 ${toast.ok ? "bg-green-600" : "bg-red-600"}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm">{toast.msg}</span>
        </div>
      )}
    </div>
  );
};

export default RiceVarietiesManagement;