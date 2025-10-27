import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import PestHeader from './PestHeader';
import AddPestModal from './AddPestModal';
import { addDoc, collection, onSnapshot, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Eye, Edit, Trash, X, Calendar, CheckCircle, AlertCircle } from "lucide-react";

const PestManagement = () => {
  const [pests, setPests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPest, setEditPest] = useState(null);
  const [loading, setLoading] = useState(true);

  const [sortBy, setSortBy] = useState('name-asc');

  useEffect(() => {
    if (!sortBy) setSortBy('name-asc');
  }, [sortBy, setSortBy]);


  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, name }
  const [confirmInput, setConfirmInput] = useState('');
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [viewPest, setViewPest] = useState(null);

  const [currentUser, setCurrentUser] = useState({
    id: 'default_user',
    fullname: 'System User',
    username: 'system',
    email: 'system@example.com'
  });

  const [toast, setToast] = useState(null); // { ok: boolean, msg: string }
  const showToast = (ok, msg, ms = 1800) => {
    setToast({ ok, msg });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), ms);
  };

  const itemsPerPage = 50;

  // Focus/highlight when navigated from History
  const location = useLocation();
  const focusId = location.state?.focusId;
  const [pendingFocusId, setPendingFocusId] = useState(null);
  const focusedRef = useRef(null);

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
  }, [focusId, pendingFocusId, pests]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "rice_local_pests"),
      snapshot => {
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(item => item.isDeleted !== true);
        setPests(data);
        setLoading(false);
      },
      error => {
        console.error("Error fetching pests:", error);
        setLoading(false);
        showToast(false, "Error loading pests. Please try again.");
      }
    );
    return () => unsub();
  }, []);

  const getTimestampMs = (ts) => {
    if (!ts) return 0;
    if (typeof ts === 'number') return ts;
    if (ts.toMillis) return ts.toMillis();
    if (ts.toDate) return ts.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
    return 0;
  };

  const filteredPests = pests
    .filter(p =>
      (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.scientificName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

  const sortedPests = [...filteredPests].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return (a.name || '').localeCompare(b.name || '');
      case 'name-desc':
        return (b.name || '').localeCompare(a.name || '');
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
  const paginatedPests = sortedPests.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(sortedPests.length / itemsPerPage);

  const handleAddNew = () => {
    setEditPest(null);
    setIsModalOpen(true);
  };

  const closePestModal = () => {
    setIsModalOpen(false);
    setEditPest(null);
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
        const prevSnap = await getDoc(doc(db, "rice_local_pests", id));
        const before = prevSnap.exists() ? { id, ...prevSnap.data() } : null;

        const next = { ...dataToSave, isDeleted: false, updatedAt: new Date() };
        await updateDoc(doc(db, "rice_local_pests", id), next);

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
          changes: { before, after: { id, ...next } }
        });

        showToast(true, "Pest updated successfully");
        setPendingFocusId(id);
      } else {
        const next = { ...dataToSave, isDeleted: false, createdAt: new Date() };
        const docRef = await addDoc(collection(db, "rice_local_pests"), next);

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
          changes: { before: null, after: { id: docRef.id, ...next } }
        });

        showToast(true, "Pest added successfully");
        setPendingFocusId(docRef.id);
      }

      setIsModalOpen(false);
      setEditPest(null);
    } catch (error) {
      console.error("Error saving rice pest:", error);
      showToast(false, "Error saving rice pest: " + error.message, 2600);
    }
  };

  const handleEdit = (pest) => {
    setEditPest(pest);
    setIsModalOpen(true);
  };

  const openDeleteModal = (pest) => {
    setConfirmTarget({ id: pest.id, name: pest.name || 'Unnamed Pest' });
    setConfirmInput('');
    setConfirmOpen(true);
  };

  const confirmDeleteNow = async () => {
    if (!confirmTarget) return;
    setConfirmBusy(true);
    try {
      const id = confirmTarget.id;

      const before = pests.find(p => p.id === id) || (await (async () => {
        const snap = await getDoc(doc(db, "rice_local_pests", id));
        return snap.exists() ? { id, ...snap.data() } : null;
      })());

      await updateDoc(doc(db, "rice_local_pests", id), {
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
        collection: 'rice_local_pests',
        documentId: id,
        documentName: before?.name || 'Unnamed Pest',
        description: 'Deleted rice pest',
        changes: { before, after: null }
      });

      setPests(prev => prev.filter(p => p.id !== id));

      setConfirmBusy(false);
      setConfirmOpen(false);
      setConfirmTarget(null);
      setConfirmInput('');
      showToast(true, "Pest removed successfully");
    } catch (error) {
      console.error("Error deleting rice pest:", error);
      showToast(false, "Error deleting rice pest: " + error.message, 2600);
      setConfirmBusy(false);
    }
  };

  const cancelDelete = () => {
    if (confirmBusy) return;
    setConfirmOpen(false);
    setConfirmTarget(null);
    setConfirmInput('');
  };

  const canConfirmDelete = !!confirmTarget && confirmInput.trim() === (confirmTarget.name || '').trim();

  return (
    <div className="p-4 lg:p-6">
      <PestHeader
        onAddNew={handleAddNew}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortBy={sortBy}
        setSortBy={setSortBy}
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
                ref={focusId === pest.id ? focusedRef : null}
                className="border rounded-lg p-4 shadow-md bg-white hover:shadow-xl hover:-translate-y-1 transition-transform duration-300 relative flex flex-col h-full"
              >
                {pest.mainImageUrl && (
                  <img 
                    src={pest.mainImageUrl} 
                    alt={pest.name} 
                    className="w-full h-40 object-cover rounded mb-3"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
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

                <div className="mt-auto" />

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
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={closePestModal}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <AddPestModal
              onClose={closePestModal}
              onSave={handleAddOrEditPest}
              pestData={editPest}
            />
          </div>
        </div>
      )}

      {confirmOpen && confirmTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => { if (!confirmBusy) cancelDelete(); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                Delete Pest
              </h2>
              <button
                onClick={cancelDelete}
                className="text-gray-400 hover:text-red-500 transition"
                disabled={confirmBusy}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Trash className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Deletion</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This action cannot be undone. To confirm, type the pest name exactly:
                </p>
                <div className="w-full p-3 bg-gray-50 rounded border text-sm text-gray-800 mb-3">
                  {confirmTarget.name}
                </div>

                <input
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  placeholder="Type the pest name exactly to confirm"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canConfirmDelete && !confirmBusy) confirmDeleteNow();
                  }}
                  disabled={confirmBusy}
                />

                {!canConfirmDelete && confirmInput.length > 0 && (
                  <div className="text-xs text-red-600 mt-2 w-full text-left">The text does not match.</div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={cancelDelete}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                disabled={confirmBusy}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteNow}
                disabled={!canConfirmDelete || confirmBusy}
                className={`px-4 py-1.5 rounded-lg text-white font-medium shadow-md transition disabled:opacity-50 flex items-center gap-2 ${
                  canConfirmDelete ? 'bg-gradient-to-r from-red-600 to-red-500 hover:opacity-90' : 'bg-red-400 cursor-not-allowed'
                }`}
              >
                <Trash className="w-4 h-4" />
                {confirmBusy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewPest && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setViewPest(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                View Pest Details
              </h2>
              <button
                onClick={() => setViewPest(null)}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{viewPest.name || "Unnamed Pest"}</h3>
                  {viewPest.scientificName && (
                    <p className="text-sm italic text-gray-600 mb-3">{viewPest.scientificName}</p>
                  )}
                </div>

                {viewPest.mainImageUrl && (
                  <div className="mb-4">
                    <img
                      src={viewPest.mainImageUrl}
                      alt={viewPest.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}

                <div className="space-y-3 text-gray-700">
                  {viewPest.description && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-1">Description</h4>
                      <p className="text-sm text-justify leading-relaxed">
                        {viewPest.description}
                      </p>
                    </div>
                  )}
                  
                  {viewPest.cause && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-1">Cause</h4>
                      <p className="text-sm text-justify leading-relaxed">
                        {viewPest.cause}
                      </p>
                    </div>
                  )}
                  
                  {viewPest.symptoms && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-1">Symptoms</h4>
                      <p className="text-sm text-justify leading-relaxed">
                        {viewPest.symptoms}
                      </p>
                    </div>
                  )}
                  
                  {viewPest.treatments && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-1">Treatments</h4>
                      <p className="text-sm text-justify leading-relaxed">
                        {viewPest.treatments}
                      </p>
                    </div>
                  )}

                  <div className="border-t pt-3 mt-4">
                    <div className="flex flex-col text-gray-500 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3"/>
                        <span><strong>Created:</strong> {viewPest.createdAt?.toDate ? viewPest.createdAt.toDate().toLocaleString() : "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3"/>
                        <span><strong>Updated:</strong> {viewPest.updatedAt?.toDate ? viewPest.updatedAt.toDate().toLocaleString() : "-"}</span>
                      </div>
                    </div>
                  </div>

                  {viewPest.images && viewPest.images.length > 0 && (
                    <div className="border-t pt-3 mt-4">
                      <h4 className="font-medium text-gray-800 mb-2">Additional Images</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {viewPest.images.map((img, idx) => (
                          <img 
                            key={idx} 
                            src={img} 
                            alt={`img-${idx}`} 
                            className="w-full h-20 object-cover rounded border" 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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

export default PestManagement;