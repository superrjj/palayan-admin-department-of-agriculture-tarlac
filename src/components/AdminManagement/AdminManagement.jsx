// src/components/AdminManagement/AdminManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import AdminHeader from '../AdminManagement/AdminHeader';
import AdminTable from '../AdminManagement/AdminTable';
import { useRole } from '../../contexts/RoleContext';
import AddAdminModal from '../AdminManagement/AddAdminModal';
import { addDoc, collection, onSnapshot, updateDoc, doc, getDoc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const INACTIVE_AFTER_DAYS = 7;

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

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [restrictOpen, setRestrictOpen] = useState(false);
  const [restrictTarget, setRestrictTarget] = useState(null);
  const [restrictInput, setRestrictInput] = useState('');
  const [restrictBusy, setRestrictBusy] = useState(false);

  // Sorting + Filters
  const [sortBy, setSortBy] = useState('name-asc');
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    createdRange: '',
    lastLoginRange: '',
  });

  // userId -> true if has activity logs
  const [activityByUserId, setActivityByUserId] = useState({});

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
    let qRef;
    try {
      qRef = query(collection(db, "accounts"), where("isDeleted", "==", false));
    } catch {
      qRef = collection(db, "accounts");
    }
    const unsub = onSnapshot(
      qRef,
      (snapshot) => {
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  // Build activity map (any audit_log with userId)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "audit_logs"),
      (snap) => {
        const next = {};
        snap.docs.forEach(d => {
          const uid = d.data()?.userId;
          if (uid) next[uid] = true;
        });
        setActivityByUserId(next);
      },
      (err) => console.error("Error listening to audit_logs:", err)
    );
    return () => unsub();
  }, []);

  const checkInactiveAdmins = useCallback(async () => {
  const now = Date.now();
  for (const admin of admins) {
    const lastLoginMs = admin?.lastLogin?.seconds
      ? admin.lastLogin.seconds * 1000
      : (admin?.lastLogin ? new Date(admin.lastLogin).getTime() : NaN);
    if (!Number.isFinite(lastLoginMs)) continue;

    const idleDays = Math.floor((now - lastLoginMs) / MS_IN_DAY);

    // After 7 days of no login, force status to inactive and clear restriction flags.
    if (idleDays >= INACTIVE_AFTER_DAYS && admin.status !== 'inactive') {
      try {
        await updateDoc(doc(db, "accounts", admin.id), {
          status: "inactive",
          isRestricted: false,         // ensure table won't show 'Restricted'
          restrictedAt: null,          // clear any previous restriction marker
          autoInactive: true,
          autoInactiveAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error(`Failed to auto-inactivate ${admin.username}:`, error);
      }
    }
  }
}, [admins]);

  useEffect(() => {
    if (!loading) checkInactiveAdmins();
  }, [loading, checkInactiveAdmins]);

  const getTimestampMs = (ts) => {
    if (!ts) return 0;
    if (typeof ts === 'number') return ts;
    if (ts?.toMillis) return ts.toMillis();
    if (ts?.toDate) return ts.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
    const parsed = Date.parse(ts);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const isWithinPreset = (ms, preset) => {
    if (!ms) return false;
    const d = new Date(ms);
    const now = new Date();

    const startOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const endOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59, 999);

    const startOfWeek = (dt) => {
      const day = dt.getDay();
      const monday = new Date(dt);
      monday.setHours(0,0,0,0);
      monday.setDate(dt.getDate() - ((day + 6) % 7));
      return monday;
    };
    const endOfWeek = (dt) => {
      const monday = startOfWeek(dt);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return endOfDay(sunday);
    };

    const startOfMonth = (dt) => new Date(dt.getFullYear(), dt.getMonth(), 1);
    const endOfMonth = (dt) => new Date(dt.getFullYear(), dt.getMonth() + 1, 0, 23, 59, 59, 999);

    const startOfLastMonth = (dt) => new Date(dt.getFullYear(), dt.getMonth() - 1, 1);
    const endOfLastMonth = (dt) => new Date(dt.getFullYear(), dt.getMonth(), 0, 23, 59, 59, 999);

    const startOfYear = (dt) => new Date(dt.getFullYear(), 0, 1);
    const endOfYear = (dt) => new Date(dt.getFullYear(), 11, 31, 23, 59, 59, 999);

    const between = (x, a, b) => x >= a.getTime() && x <= b.getTime();

    switch (preset) {
      case 'today':      return between(ms, startOfDay(now), endOfDay(now));
      case 'this_week':  return between(ms, startOfWeek(now), endOfWeek(now));
      case 'this_month': return between(ms, startOfMonth(now), endOfMonth(now));
      case 'last_month': return between(ms, startOfLastMonth(now), endOfLastMonth(now));
      case 'this_year':  return between(ms, startOfYear(now), endOfYear(now));
      case 'last_7':     return (Date.now() - ms) <= 7  * MS_IN_DAY;
      case 'last_14':    return (Date.now() - ms) <= 14 * MS_IN_DAY;
      case 'last_30':    return (Date.now() - ms) <= 30 * MS_IN_DAY;
      default:           return true;
    }
  };

  const filteredBySearch = admins.filter(
    (a) =>
      (a.fullname || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.username || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredByFilters = filteredBySearch.filter((a) => {
    if (filters.role && (a.role || '').toUpperCase() !== filters.role.toUpperCase()) return false;

    if (filters.status) {
      const status = (a.status || '').toLowerCase();
      if (status !== filters.status.toLowerCase()) return false;
    }

    if (filters.createdRange) {
      const createdMs = getTimestampMs(a.createdAt);
      if (!createdMs || !isWithinPreset(createdMs, filters.createdRange)) return false;
    }

    if (filters.lastLoginRange) {
      if (filters.lastLoginRange === 'never') {
        if (getTimestampMs(a.lastLogin)) return false;
      } else {
        const lastLoginMs = getTimestampMs(a.lastLogin);
        if (!lastLoginMs || !isWithinPreset(lastLoginMs, filters.lastLoginRange)) return false;
      }
    }

    return true;
  });

  const sortedAdmins = [...filteredByFilters].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return (a.fullname || a.username || '').localeCompare(b.fullname || b.username || '');
      case 'name-desc':
        return (b.fullname || b.username || '').localeCompare(a.fullname || a.username || '');
      case 'recent': {
        const aMs = getTimestampMs(a.createdAt);
        const bMs = getTimestampMs(b.createdAt);
        return bMs - aMs;
      }
      case 'oldest': {
        const aMs = getTimestampMs(a.createdAt);
        const bMs = getTimestampMs(b.createdAt);
        return aMs - bMs;
      }
      default:
        return 0;
    }
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAdmins = sortedAdmins.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(sortedAdmins.length / itemsPerPage);

  const handleAddNew = () => { setEditAdmin(null); setIsModalOpen(true); };

  const handleAddOrEditAdmin = async (adminData, id) => {
    try {
      if (id) {
        const currentAdmin = admins.find(a => a.id === id);
        const updateData = { ...adminData, isDeleted: false, updatedAt: new Date() };
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
          changes: { before: currentAdmin, after: updateData }
        });
      } else {
        const newAdminData = {
          ...adminData,
          status: "active",
          isDeleted: false,
          createdAt: new Date(),
          lastLogin: null,
          isRestricted: false
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
          changes: { before: null, after: newAdminData }
        });
      }
      setIsModalOpen(false);
      setEditAdmin(null);
    } catch (error) {
      console.error("Error saving admin:", error);
      alert("Error saving admin: " + error.message);
    }
  };

  const handleEdit = (admin) => { setEditAdmin(admin); setIsModalOpen(true); };

  const handleDelete = async (id) => {
    if (id === currentUser.id || activityByUserId[id]) return;
    const target = admins.find(a => a.id === id);
    if (!target) return;
    setConfirmTarget({ id, fullname: target.fullname || '' });
    setConfirmInput('');
    setConfirmOpen(true);
  };

  const confirmDeleteNow = async () => {
    if (!confirmTarget) return;
    setConfirmBusy(true);
    try {
      const id = confirmTarget.id;
      const adminToDelete = admins.find(a => a.id === id);
      if (id === currentUser.id || activityByUserId[id]) { setConfirmBusy(false); setConfirmOpen(false); return; }

      await updateDoc(doc(db, "accounts", id), { isDeleted: true, deletedAt: new Date(), deletedBy: currentUser.id });
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
        changes: { before: adminToDelete, after: null }
      });

      setAdmins(prev => prev.filter(a => a.id !== id));
      setConfirmBusy(false);
      setConfirmOpen(false);
      setSuccessDelete(true);
      setTimeout(() => setSuccessDelete(false), 1200);
    } catch (error) {
      console.error("Failed to delete admin:", error);
      setConfirmBusy(false);
    }
  };

  const handleToggleRestriction = async (id, nextActive, targetRow) => {
    if (id === currentUser.id && !nextActive) return;

    if (!nextActive) {
      const prev = admins.find(a => a.id === id) || targetRow;
      setRestrictTarget({ id, fullname: prev?.fullname || '', prev });
      setRestrictInput('');
      setRestrictOpen(true);
      return;
    }

    try {
      const prev = admins.find(a => a.id === id) || targetRow;
      const updateData = { status: 'active', isRestricted: false, restrictedAt: null, updatedAt: new Date() };
      await updateDoc(doc(db, "accounts", id), updateData);
      await addDoc(collection(db, "audit_logs"), {
        userId: currentUser.id,
        userName: currentUser.fullname,
        userEmail: currentUser.email,
        timestamp: new Date(),
        action: 'UNRESTRICT',
        collection: 'accounts',
        documentId: id,
        documentName: prev?.fullname || prev?.username || 'Unknown',
        description: 'Unrestricted admin account',
        changes: { before: { status: prev?.status, isRestricted: prev?.isRestricted }, after: updateData }
      });
    } catch (e) {
      console.error('Failed to toggle restriction:', e);
    }
  };

  const confirmRestrictNow = async () => {
    if (!restrictTarget) return;
    setRestrictBusy(true);
    try {
      const id = restrictTarget.id;
      const prev = restrictTarget.prev;

      const updateData = {
        status: 'restricted',
        isRestricted: true,
        restrictedAt: serverTimestamp(),
        updatedAt: new Date()
      };
      await updateDoc(doc(db, "accounts", id), updateData);
      await addDoc(collection(db, "audit_logs"), {
        userId: currentUser.id,
        userName: currentUser.fullname,
        userEmail: currentUser.email,
        timestamp: new Date(),
        action: 'RESTRICT',
        collection: 'accounts',
        documentId: id,
        documentName: prev?.fullname || prev?.username || 'Unknown',
        description: 'Restricted admin account',
        changes: { before: { status: prev?.status, isRestricted: prev?.isRestricted }, after: updateData }
      });

      setRestrictBusy(false);
      setRestrictOpen(false);
    } catch (e) {
      console.error('Failed to restrict account:', e);
      setRestrictBusy(false);
    }
  };

  const canConfirmDelete = !!confirmTarget && confirmInput.trim() === (confirmTarget.fullname || '').trim();
  const canConfirmRestrict = !!restrictTarget && restrictInput.trim() === (restrictTarget.fullname || '').trim();

  return (
    <div className="p-4 lg:p-6">
      <AdminHeader
        onAddNew={handleAddNew}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortBy={sortBy}
        setSortBy={setSortBy}
        filters={filters}
        setFilters={setFilters}
      />

      <AdminTable
        admins={paginatedAdmins}
        loading={loading}
        onEdit={(admin) => { setEditAdmin(admin); setIsModalOpen(true); }}
        onDelete={handleDelete}
        onToggleRestriction={handleToggleRestriction}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        currentUserId={currentUser.id}
        activityByUserId={activityByUserId}
      />

      {isModalOpen && (
        <AddAdminModal
          onClose={() => { setIsModalOpen(false); setEditAdmin(null); }}
          onSave={handleAddOrEditAdmin}
          adminData={editAdmin}
        />
      )}

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2 text-red-600">Confirm Delete</h3>
            <p className="text-sm text-gray-700">This action will remove the admin account. To confirm, type the full name exactly:</p>
            <div className="mt-3 p-3 bg-gray-50 rounded border text-sm text-gray-800">{confirmTarget?.fullname || '(no full name)'}</div>
            <input
              className="mt-3 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              placeholder="Type the full name exactly to confirm"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              disabled={confirmBusy}
            />
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { if (!confirmBusy) setConfirmOpen(false); }} className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-60" disabled={confirmBusy}>Cancel</button>
              <button onClick={confirmDeleteNow} disabled={!canConfirmDelete || confirmBusy} className={`px-3 py-2 text-sm rounded-md text-white ${canConfirmDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-red-400 cursor-not-allowed'}`}>
                {confirmBusy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {restrictOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2 text-amber-600">Confirm Restrict</h3>
            <p className="text-sm text-gray-700">Restricting will set the account status to restricted. To confirm, type the full name exactly:</p>
            <div className="mt-3 p-3 bg-gray-50 rounded border text-sm text-gray-800">{restrictTarget?.fullname || '(no full name)'}</div>
            <input
              className="mt-3 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              placeholder="Type the full name exactly to confirm"
              value={restrictInput}
              onChange={(e) => setRestrictInput(e.target.value)}
              disabled={restrictBusy}
            />
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { if (!restrictBusy) setRestrictOpen(false); }} className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-60" disabled={restrictBusy}>Cancel</button>
              <button onClick={confirmRestrictNow} disabled={!canConfirmRestrict || restrictBusy} className={`px-3 py-2 text-sm rounded-md text-white ${canConfirmRestrict ? 'bg-amber-600 hover:bg-amber-700' : 'bg-amber-400 cursor-not-allowed'}`}>
                {restrictBusy ? 'Restricting...' : 'Restrict'}
              </button>
            </div>
          </div>
        </div>
      )}

      {successDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
            <svg className="w-20 h-20 text-green-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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