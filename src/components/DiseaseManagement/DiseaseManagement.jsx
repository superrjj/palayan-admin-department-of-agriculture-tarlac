// DiseaseManagement.jsx
import React, { useState, useEffect } from 'react';
import DiseaseHeader from './DiseaseHeader';
import AddDiseaseModal from './AddDiseaseModal';
import { addDoc, collection, onSnapshot, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Eye, Edit, Trash, X, Calendar, CheckCircle, AlertCircle } from "lucide-react";

const normalizeAffectedParts = (v) =>
  Array.isArray(v)
    ? v
    : (typeof v === 'string' && v.trim())
      ? v.split(',').map(s => s.trim()).filter(Boolean)
      : [];

const DiseaseManagement = () => {
  const [diseases, setDiseases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDisease, setEditDisease] = useState(null);
  const [loading, setLoading] = useState(true);

  // Delete confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, name }
  const [confirmInput, setConfirmInput] = useState('');
  const [confirmBusy, setConfirmBusy] = useState(false);

  // View modal
  const [viewDisease, setViewDisease] = useState(null);

  // Toast (like Pest)
  const [toast, setToast] = useState(null); // { ok: boolean, msg: string }
  const showToast = (ok, msg, ms = 1800) => {
    setToast({ ok, msg });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), ms);
  };

  // sorting + filters (like Pest)
  const [sortBy, setSortBy] = useState('name-asc');
  useEffect(() => {
    if (!sortBy) setSortBy('name-asc');
  }, [sortBy, setSortBy]);

  const [filters, setFilters] = useState({
    yearRange: '',
    season: '',
    plantingMethod: '',
    environment: '',
    location: '',
    recommendedInTarlac: '',
  });

  // current user (for audit logs)
  const [currentUser, setCurrentUser] = useState({
    id: 'default_user',
    fullname: 'System User',
    username: 'system',
    email: 'system@example.com'
  });

  const itemsPerPage = 50;

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
    const unsub = onSnapshot(
      collection(db, "rice_local_diseases"),
      snapshot => {
        const data = snapshot.docs
          .map(snap => {
            const d = { id: snap.id, ...snap.data() };
            return {
              ...d,
              affectedParts: normalizeAffectedParts(d.affectedParts),
            };
          })
          .filter(item => item.isDeleted !== true);
        setDiseases(data);
        setLoading(false);
      },
      error => {
        console.error("Error fetching diseases:", error);
        setLoading(false);
        showToast(false, "Error loading diseases. Please try again.");
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

  const filteredDiseases = diseases.filter(d =>
    (d.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.localName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.scientificName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedDiseases = [...filteredDiseases].sort((a, b) => {
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
  const paginatedDiseases = sortedDiseases.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(sortedDiseases.length / itemsPerPage);

  const handleAddNew = () => {
    setEditDisease(null);
    setIsModalOpen(true);
  };

  const closeDiseaseModal = () => {
    setIsModalOpen(false);
    setEditDisease(null);
  };

  const handleAddOrEditDisease = async (diseaseData, id) => {
    try {
      const dataToSave = {
        name: diseaseData.name || "",
        localName: diseaseData.localName || "",
        scientificName: diseaseData.scientificName || "",
        description: diseaseData.description || "",
        cause: diseaseData.cause || "",
        symptoms: diseaseData.symptoms || "",
        treatments: diseaseData.treatments || "",
        affectedParts: normalizeAffectedParts(diseaseData.affectedParts),
        mainImageUrl: diseaseData.mainImageUrl || "",
        images: diseaseData.images || [],
      };

      if (id) {
        const prevSnap = await getDoc(doc(db, "rice_local_diseases", id));
        const before = prevSnap.exists() ? { id, ...prevSnap.data(), affectedParts: normalizeAffectedParts(prevSnap.data().affectedParts) } : null;

        const next = { ...dataToSave, isDeleted: false, updatedAt: new Date() };
        await updateDoc(doc(db, "rice_local_diseases", id), next);

        await addDoc(collection(db, "audit_logs"), {
          userId: currentUser.id,
          userName: currentUser.fullname,
          userEmail: currentUser.email,
          timestamp: new Date(),
          action: 'UPDATE',
          collection: 'rice_local_diseases',
          documentId: id,
          documentName: dataToSave.name || 'Unnamed Disease',
          description: 'Updated disease record',
          changes: { before, after: { id, ...next } }
        });

        showToast(true, "Disease updated successfully");
      } else {
        const next = { ...dataToSave, isDeleted: false, createdAt: new Date() };
        const docRef = await addDoc(collection(db, "rice_local_diseases"), next);

        await addDoc(collection(db, "audit_logs"), {
          userId: currentUser.id,
          userName: currentUser.fullname,
          userEmail: currentUser.email,
          timestamp: new Date(),
          action: 'CREATE',
          collection: 'rice_local_diseases',
          documentId: docRef.id,
          documentName: dataToSave.name || 'Unnamed Disease',
          description: 'Added new disease record',
          changes: { before: null, after: { id: docRef.id, ...next } }
        });

        showToast(true, "Disease added successfully");
      }

      setIsModalOpen(false);
      setEditDisease(null);
    } catch (error) {
      console.error("Error saving disease:", error);
      showToast(false, "Error saving disease: " + error.message, 2600);
    }
  };

  const handleEdit = (disease) => {
    setEditDisease({
      ...disease,
      affectedParts: normalizeAffectedParts(disease.affectedParts),
    });
    setIsModalOpen(true);
  };

  // Open confirm dialog (type the disease name)
  const openDeleteModal = (disease) => {
    setConfirmTarget({ id: disease.id, name: disease.name || 'Unnamed Disease' });
    setConfirmInput('');
    setConfirmOpen(true);
  };

  // Soft delete (like Pest)
  const confirmDeleteNow = async () => {
    if (!confirmTarget) return;
    setConfirmBusy(true);
    try {
      const id = confirmTarget.id;

      const before = diseases.find(d => d.id === id) || (await (async () => {
        const snap = await getDoc(doc(db, "rice_local_diseases", id));
        return snap.exists() ? { id, ...snap.data(), affectedParts: normalizeAffectedParts(snap.data().affectedParts) } : null;
      })());

      await updateDoc(doc(db, "rice_local_diseases", id), {
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
        collection: 'rice_local_diseases',
        documentId: id,
        documentName: before?.name || 'Unnamed Disease',
        description: 'Deleted disease record',
        changes: { before, after: null }
      });

      setDiseases(prev => prev.filter(d => d.id !== id));

      setConfirmBusy(false);
      setConfirmOpen(false);
      setConfirmTarget(null);
      setConfirmInput('');
      showToast(true, "Disease removed successfully");
    } catch (error) {
      console.error("Error deleting disease:", error);
      showToast(false, "Error deleting disease: " + error.message, 2600);
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
      <DiseaseHeader
        onAddNew={handleAddNew}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortBy={sortBy}
        setSortBy={setSortBy}
        filters={filters}
        setFilters={setFilters}
      />

      {loading ? (
        <div className="text-center py-8">Loading rice diseases...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {paginatedDiseases.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No diseases found. Click "Add New Disease" to get started.
            </div>
          ) : (
            paginatedDiseases.map(disease => (
              <div
                key={disease.id}
                className="border rounded-lg p-4 shadow-md bg-white hover:shadow-xl hover:-translate-y-1 transition-transform duration-300 relative flex flex-col h-full"
              >
                {disease.mainImageUrl && (
                  <img
                    src={disease.mainImageUrl}
                    alt={disease.name}
                    className="w-full h-40 object-cover rounded mb-3"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <h3 className="font-semibold text-lg">{disease.name || 'Unnamed Disease'}</h3>
                {disease.localName && <p className="text-sm text-gray-700">{disease.localName}</p>}
                {disease.scientificName && <p className="text-sm italic text-gray-600">{disease.scientificName}</p>}
                {disease.description && (
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
                    {disease.description}
                  </p>
                )}

                {Array.isArray(disease.affectedParts) && disease.affectedParts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {disease.affectedParts.map((p, idx) => (
                      <span key={`${p}-${idx}`} className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <p><span className="font-medium">Created Date:</span> {disease.createdAt?.toDate ? disease.createdAt.toDate().toLocaleString() : "N/A"}</p>
                  <p><span className="font-medium">Last Updated:</span> {disease.updatedAt?.toDate ? disease.updatedAt.toDate().toLocaleString() : "-"}</p>
                </div>

                <div className="mt-auto" />

                <div className="flex justify-center gap-2 mt-3">
                  <button
                    onClick={() => setViewDisease(disease)}
                    className="flex items-center justify-center gap-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition"
                  >
                    <Eye className="w-4 h-4" /> View
                  </button>
                  <button
                    onClick={() => handleEdit(disease)}
                    className="flex items-center justify-center gap-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(disease)}
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
          onClick={closeDiseaseModal}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <AddDiseaseModal
              onClose={closeDiseaseModal}
              onSave={handleAddOrEditDisease}
              diseaseData={editDisease}
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
            {/* Fixed Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                Delete Disease
              </h2>
              <button
                onClick={cancelDelete}
                className="text-gray-400 hover:text-red-500 transition"
                disabled={confirmBusy}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Trash className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Deletion</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This action cannot be undone. To confirm, type the disease name exactly:
                </p>
                <div className="w-full p-3 bg-gray-50 rounded border text-sm text-gray-800 mb-3">
                  {confirmTarget.name}
                </div>

                <input
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  placeholder="Type the disease name exactly to confirm"
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

            {/* Fixed Footer */}
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

      {viewDisease && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setViewDisease(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* Fixed Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                View Disease Details
              </h2>
              <button
                onClick={() => setViewDisease(null)}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{viewDisease.name || "Unnamed Disease"}</h3>
                  {viewDisease.localName && (
                    <p className="text-sm text-gray-700 mb-1"><strong>Local Name:</strong> {viewDisease.localName}</p>
                  )}
                  {viewDisease.scientificName && (
                    <p className="text-sm italic text-gray-600 mb-3">{viewDisease.scientificName}</p>
                  )}
                </div>

                {viewDisease.mainImageUrl && (
                  <div className="mb-4">
                    <img
                      src={viewDisease.mainImageUrl}
                      alt={viewDisease.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}

                <div className="space-y-3 text-gray-700">
                  {viewDisease.description && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-1">Description</h4>
                      <p className="text-sm text-justify leading-relaxed">
                        {viewDisease.description}
                      </p>
                    </div>
                  )}

                  {viewDisease.cause && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-1">Cause</h4>
                      <p className="text-sm text-justify leading-relaxed">
                        {viewDisease.cause}
                      </p>
                    </div>
                  )}

                  {viewDisease.symptoms && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-1">Symptoms</h4>
                      <p className="text-sm text-justify leading-relaxed">
                        {viewDisease.symptoms}
                      </p>
                    </div>
                  )}

                  {viewDisease.treatments && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-1">Treatments</h4>
                      <p className="text-sm text-justify leading-relaxed">
                        {viewDisease.treatments}
                      </p>
                    </div>
                  )}

                  {Array.isArray(viewDisease.affectedParts) && viewDisease.affectedParts.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-1">Affected Part(s)</h4>
                      <div className="flex flex-wrap gap-2">
                        {viewDisease.affectedParts.map((p, idx) => (
                          <span key={`${p}-${idx}`} className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-3 mt-4">
                    <div className="flex flex-col text-gray-500 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3"/>
                        <span><strong>Created:</strong> {viewDisease.createdAt?.toDate ? viewDisease.createdAt.toDate().toLocaleString() : "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3"/>
                        <span><strong>Updated:</strong> {viewDisease.updatedAt?.toDate ? viewDisease.updatedAt.toDate().toLocaleString() : "-"}</span>
                      </div>
                    </div>
                  </div>

                  {viewDisease.images && viewDisease.images.length > 0 && (
                    <div className="border-t pt-3 mt-4">
                      <h4 className="font-medium text-gray-800 mb-2">Additional Images</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {viewDisease.images.map((img, idx) => (
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

export default DiseaseManagement;